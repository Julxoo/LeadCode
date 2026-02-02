import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { XMLParser } from "fast-xml-parser";
import type { DetectedStack, FrameworkInfo, RecognizedTech, StructureInfo } from "../../types.js";
import type { EcosystemAdapter, EcosystemFilePatterns } from "../ecosystem.js";
import { ECOSYSTEM_PATTERNS } from "../constants.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Deps = Record<string, string>;

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Check if any dep key starts with the given groupId:artifactId */
function has(ga: string, deps: Deps, devDeps: Deps): boolean {
  return Object.keys(deps).some(k => k === ga || k.startsWith(ga + ":"))
    || Object.keys(devDeps).some(k => k === ga || k.startsWith(ga + ":"));
}

function ver(ga: string, deps: Deps, devDeps: Deps): string | null {
  const all = { ...deps, ...devDeps };
  for (const [k, v] of Object.entries(all)) {
    if (k === ga || k.startsWith(ga + ":")) {
      if (!v || v === "*" || v.startsWith("$")) return null;
      const match = v.match(/\d+\.\d+(?:\.\d+)?/);
      return match ? match[0] : v;
    }
  }
  return null;
}

/** Ensure a value is an array */
function asArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/** Try to parse a Makefile or justfile for script-like commands */
async function parseScriptFile(projectPath: string): Promise<Record<string, string>> {
  const scripts: Record<string, string> = {};

  for (const name of ["justfile", "Justfile"]) {
    const path = join(projectPath, name);
    if (await fileExists(path)) {
      const content = await readFile(path, "utf-8");
      const targetRegex = /^(\w[\w-]*)\s*:/gm;
      let m: RegExpExecArray | null;
      while ((m = targetRegex.exec(content)) !== null) {
        scripts[m[1]] = `just ${m[1]}`;
      }
      return scripts;
    }
  }

  const makefilePath = join(projectPath, "Makefile");
  if (await fileExists(makefilePath)) {
    const content = await readFile(makefilePath, "utf-8");
    const targetRegex = /^([a-zA-Z][\w-]*)\s*:/gm;
    let m: RegExpExecArray | null;
    while ((m = targetRegex.exec(content)) !== null) {
      scripts[m[1]] = `make ${m[1]}`;
    }
  }

  return scripts;
}

// ---------------------------------------------------------------------------
// Maven pom.xml parser
// ---------------------------------------------------------------------------

interface MavenDep {
  groupId?: string;
  artifactId?: string;
  version?: string;
  scope?: string;
}

function parsePomXml(xmlContent: string): {
  projectName: string;
  projectVersion: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  engines: Record<string, string>;
  workspaces: string[] | null;
} {
  const parser = new XMLParser({ ignoreAttributes: true });
  const parsed = parser.parse(xmlContent);
  const project = parsed.project ?? parsed;

  const groupId = project.groupId ?? project.parent?.groupId ?? "unknown";
  const artifactId = project.artifactId ?? "unknown";
  const projectName = `${groupId}:${artifactId}`;
  const projectVersion = project.version ?? project.parent?.version ?? "0.0.0";

  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};

  const deps = asArray<MavenDep>(project.dependencies?.dependency);
  for (const dep of deps) {
    if (!dep.groupId || !dep.artifactId) continue;
    const key = `${dep.groupId}:${dep.artifactId}`;
    const version = dep.version ?? "*";
    if (dep.scope === "test") {
      devDependencies[key] = version;
    } else {
      dependencies[key] = version;
    }
  }

  // Also check dependencyManagement
  const managedDeps = asArray<MavenDep>(project.dependencyManagement?.dependencies?.dependency);
  for (const dep of managedDeps) {
    if (!dep.groupId || !dep.artifactId) continue;
    const key = `${dep.groupId}:${dep.artifactId}`;
    if (!(key in dependencies) && !(key in devDependencies)) {
      const version = dep.version ?? "*";
      if (dep.scope === "test") {
        devDependencies[key] = version;
      } else {
        dependencies[key] = version;
      }
    }
  }

  // Engines
  const engines: Record<string, string> = {};
  const props = project.properties ?? {};
  const javaVersion = props["java.version"] ?? props["maven.compiler.source"] ?? props["maven.compiler.release"];
  if (javaVersion) engines.java = String(javaVersion);

  // Workspaces (modules)
  const modules = asArray<string>(project.modules?.module);
  const workspaces = modules.length > 0 ? modules : null;

  return { projectName, projectVersion, dependencies, devDependencies, engines, workspaces };
}

// ---------------------------------------------------------------------------
// Gradle parser (regex-based)
// ---------------------------------------------------------------------------

function parseGradleFile(content: string): {
  projectName: string;
  projectVersion: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  engines: Record<string, string>;
} {
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  const engines: Record<string, string> = {};

  // Project name & version
  const groupMatch = content.match(/group\s*[=:]\s*['"]([^'"]+)['"]/);
  const versionMatch = content.match(/version\s*[=:]\s*['"]([^'"]+)['"]/);
  const projectName = groupMatch ? groupMatch[1] : "unknown";
  const projectVersion = versionMatch ? versionMatch[1] : "0.0.0";

  // Dependencies: implementation 'group:artifact:version' or implementation("group:artifact:version")
  // Also: api, compileOnly, runtimeOnly, testImplementation, testCompileOnly, testRuntimeOnly
  const depRegex = /(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testCompileOnly|testRuntimeOnly)\s*[\(]?\s*['"]([^'"]+)['"]\s*[\)]?/g;
  let m: RegExpExecArray | null;
  while ((m = depRegex.exec(content)) !== null) {
    const parts = m[1].split(":");
    if (parts.length >= 2) {
      const key = `${parts[0]}:${parts[1]}`;
      const version = parts[2] ?? "*";
      const isTest = m[0].startsWith("test");
      if (isTest) {
        devDependencies[key] = version;
      } else {
        dependencies[key] = version;
      }
    }
  }

  // Also match Kotlin DSL: implementation(libs.xxx) or platform() — skip these
  // Match sourceCompatibility or JavaVersion
  const srcCompatMatch = content.match(/sourceCompatibility\s*[=:]\s*['"]?(\S+?)['"]?\s/);
  if (srcCompatMatch) {
    const val = srcCompatMatch[1].replace("JavaVersion.VERSION_", "").replace(/_/g, ".");
    engines.java = val;
  }
  const javaVersionMatch = content.match(/JavaVersion\.VERSION_(\d+)/);
  if (javaVersionMatch && !engines.java) {
    engines.java = javaVersionMatch[1];
  }

  return { projectName, projectVersion, dependencies, devDependencies, engines };
}

async function parseSettingsGradle(projectPath: string): Promise<string[] | null> {
  for (const name of ["settings.gradle.kts", "settings.gradle"]) {
    const path = join(projectPath, name);
    if (await fileExists(path)) {
      const content = await readFile(path, "utf-8");
      const modules: string[] = [];
      const includeRegex = /include\s*[\(]?\s*['"]([^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = includeRegex.exec(content)) !== null) {
        modules.push(m[1].replace(/^:/, ""));
      }
      return modules.length > 0 ? modules : null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Detection rules
// ---------------------------------------------------------------------------

interface Rule {
  packages: string[];
  name: string;
  category: string;
}

const RULES: Rule[] = [
  // ORM / Database
  { packages: ["org.hibernate:hibernate-core", "org.hibernate.orm:hibernate-core"], name: "hibernate", category: "orm" },
  { packages: ["org.springframework.data:spring-data-jpa"], name: "spring-data-jpa", category: "orm" },
  { packages: ["org.mybatis:mybatis", "org.mybatis.spring.boot:mybatis-spring-boot-starter"], name: "mybatis", category: "orm" },
  { packages: ["org.jooq:jooq"], name: "jooq", category: "orm" },
  { packages: ["org.flywaydb:flyway-core"], name: "flyway", category: "migration" },
  { packages: ["org.liquibase:liquibase-core"], name: "liquibase", category: "migration" },

  // Database drivers
  { packages: ["org.postgresql:postgresql"], name: "postgresql", category: "database" },
  { packages: ["com.mysql:mysql-connector-j", "mysql:mysql-connector-java"], name: "mysql", category: "database" },
  { packages: ["org.mongodb:mongodb-driver-sync", "org.mongodb:mongodb-driver-reactivestreams"], name: "mongodb", category: "database" },
  { packages: ["redis.clients:jedis"], name: "jedis", category: "database" },
  { packages: ["io.lettuce:lettuce-core"], name: "lettuce", category: "database" },

  // Testing
  { packages: ["org.junit.jupiter:junit-jupiter", "org.junit.jupiter:junit-jupiter-api"], name: "junit5", category: "testing" },
  { packages: ["junit:junit"], name: "junit4", category: "testing" },
  { packages: ["org.mockito:mockito-core", "org.mockito:mockito-junit-jupiter"], name: "mockito", category: "testing" },
  { packages: ["org.assertj:assertj-core"], name: "assertj", category: "testing" },
  { packages: ["io.rest-assured:rest-assured"], name: "rest-assured", category: "testing" },
  { packages: ["org.testcontainers:testcontainers"], name: "testcontainers", category: "testing" },

  // Auth / Security
  { packages: ["org.springframework.boot:spring-boot-starter-security", "org.springframework.security:spring-security-core"], name: "spring-security", category: "auth" },
  { packages: ["io.jsonwebtoken:jjwt", "io.jsonwebtoken:jjwt-api"], name: "jjwt", category: "auth" },
  { packages: ["org.keycloak:keycloak-core", "org.keycloak:keycloak-spring-boot-starter"], name: "keycloak", category: "auth" },

  // Validation
  { packages: ["jakarta.validation:jakarta.validation-api", "javax.validation:validation-api"], name: "bean-validation", category: "validation" },

  // Serialization
  { packages: ["com.fasterxml.jackson.core:jackson-databind"], name: "jackson", category: "serialization" },
  { packages: ["com.google.code.gson:gson"], name: "gson", category: "serialization" },

  // Logging
  { packages: ["org.slf4j:slf4j-api"], name: "slf4j", category: "logging" },
  { packages: ["ch.qos.logback:logback-classic"], name: "logback", category: "logging" },
  { packages: ["org.apache.logging.log4j:log4j-core"], name: "log4j2", category: "logging" },

  // API
  { packages: ["io.grpc:grpc-core", "io.grpc:grpc-netty"], name: "grpc-java", category: "api" },
  { packages: ["io.swagger.core.v3:swagger-core", "io.swagger.core.v3:swagger-annotations"], name: "swagger", category: "api" },
  { packages: ["org.springdoc:springdoc-openapi-starter-webmvc-ui", "org.springdoc:springdoc-openapi-ui"], name: "springdoc", category: "api" },
  { packages: ["com.graphql-java:graphql-java"], name: "graphql-java", category: "api" },

  // Build / Quality
  { packages: ["org.projectlombok:lombok"], name: "lombok", category: "bundler" },
  { packages: ["org.mapstruct:mapstruct"], name: "mapstruct", category: "bundler" },
  { packages: ["com.google.errorprone:error_prone_core"], name: "error-prone", category: "linter" },
  { packages: ["com.google.dagger:dagger"], name: "dagger", category: "bundler" },

  // Observability
  { packages: ["io.micrometer:micrometer-core"], name: "micrometer", category: "observability" },
  { packages: ["io.opentelemetry:opentelemetry-api"], name: "opentelemetry", category: "observability" },

  // HTTP client
  { packages: ["org.apache.httpcomponents.client5:httpclient5", "org.apache.httpcomponents:httpclient"], name: "httpclient", category: "http-client" },
  { packages: ["com.squareup.okhttp3:okhttp"], name: "okhttp", category: "http-client" },

  // Template
  { packages: ["org.thymeleaf:thymeleaf"], name: "thymeleaf", category: "template" },
  { packages: ["org.freemarker:freemarker"], name: "freemarker", category: "template" },

  // Jobs
  { packages: ["org.quartz-scheduler:quartz"], name: "quartz", category: "jobs" },
  { packages: ["org.springframework.kafka:spring-kafka"], name: "spring-kafka", category: "jobs" },
];

const NOISE_PREFIXES = [
  "org.apache.maven",
  "org.codehaus.mojo",
  "org.sonatype",
  "org.jetbrains.kotlin:kotlin-stdlib",
  "org.jetbrains.kotlin:kotlin-reflect",
  "org.jetbrains:annotations",
  "javax.annotation:javax.annotation-api",
  "jakarta.annotation:jakarta.annotation-api",
  "com.google.guava:guava",
  "commons-io:commons-io",
  "org.apache.commons:commons-lang3",
  "org.apache.commons:commons-collections4",
];

const FRAMEWORK_PACKAGES = [
  "org.springframework.boot:spring-boot-starter-web",
  "org.springframework.boot:spring-boot-starter-webflux",
  "io.quarkus:quarkus-core",
  "io.quarkus:quarkus-resteasy",
  "io.micronaut:micronaut-core",
  "io.micronaut:micronaut-http-server",
  "io.vertx:vertx-core",
  "io.vertx:vertx-web",
  "io.javalin:javalin",
];

// ---------------------------------------------------------------------------
// JavaAdapter
// ---------------------------------------------------------------------------

export class JavaAdapter implements EcosystemAdapter {
  ecosystem = "java" as const;

  getFilePatterns(): EcosystemFilePatterns {
    const patterns = ECOSYSTEM_PATTERNS.java;
    return {
      sourceExtensions: patterns.sourceExtensions,
      ignoreDirs: patterns.ignoreDirs,
      manifestFiles: ["pom.xml", "build.gradle", "build.gradle.kts"],
    };
  }

  async parseDependencies(projectPath: string): Promise<{
    projectName: string;
    projectVersion: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    peerDependencies: Record<string, string>;
    scripts: Record<string, string>;
    engines: Record<string, string>;
    packageManager: string | null;
    workspaces: string[] | null;
  }> {
    // Try pom.xml first
    const pomPath = join(projectPath, "pom.xml");
    if (await fileExists(pomPath)) {
      return this.parseMaven(projectPath, pomPath);
    }

    // Try build.gradle.kts then build.gradle
    for (const name of ["build.gradle.kts", "build.gradle"]) {
      const gradlePath = join(projectPath, name);
      if (await fileExists(gradlePath)) {
        return this.parseGradle(projectPath, gradlePath);
      }
    }

    throw new Error(`No Java/Kotlin manifest found in ${projectPath} (tried pom.xml, build.gradle.kts, build.gradle)`);
  }

  private async parseMaven(
    projectPath: string,
    pomPath: string,
  ): ReturnType<EcosystemAdapter["parseDependencies"]> {
    const raw = await readFile(pomPath, "utf-8");
    const { projectName, projectVersion, dependencies, devDependencies, engines, workspaces } = parsePomXml(raw);

    const scripts: Record<string, string> = {};
    // Detect wrapper
    if (await fileExists(join(projectPath, "mvnw"))) {
      scripts.build = "./mvnw package";
      scripts.test = "./mvnw test";
      scripts.clean = "./mvnw clean";
    } else {
      scripts.build = "mvn package";
      scripts.test = "mvn test";
      scripts.clean = "mvn clean";
    }

    // Override with Makefile/justfile if present
    const fileScripts = await parseScriptFile(projectPath);
    Object.assign(scripts, fileScripts);

    return {
      projectName,
      projectVersion,
      dependencies,
      devDependencies,
      peerDependencies: {},
      scripts,
      engines,
      packageManager: "maven",
      workspaces,
    };
  }

  private async parseGradle(
    projectPath: string,
    gradlePath: string,
  ): ReturnType<EcosystemAdapter["parseDependencies"]> {
    const raw = await readFile(gradlePath, "utf-8");
    const { projectName, projectVersion, dependencies, devDependencies, engines } = parseGradleFile(raw);

    const scripts: Record<string, string> = {};
    if (await fileExists(join(projectPath, "gradlew"))) {
      scripts.build = "./gradlew build";
      scripts.test = "./gradlew test";
      scripts.clean = "./gradlew clean";
    } else {
      scripts.build = "gradle build";
      scripts.test = "gradle test";
      scripts.clean = "gradle clean";
    }

    const fileScripts = await parseScriptFile(projectPath);
    Object.assign(scripts, fileScripts);

    const workspaces = await parseSettingsGradle(projectPath);

    // Try to get project name from settings.gradle if not found
    let finalName = projectName;
    if (finalName === "unknown") {
      for (const name of ["settings.gradle.kts", "settings.gradle"]) {
        const settingsPath = join(projectPath, name);
        if (await fileExists(settingsPath)) {
          const content = await readFile(settingsPath, "utf-8");
          const rootMatch = content.match(/rootProject\.name\s*=\s*['"]([^'"]+)['"]/);
          if (rootMatch) {
            finalName = rootMatch[1];
            break;
          }
        }
      }
    }

    return {
      projectName: finalName,
      projectVersion,
      dependencies,
      devDependencies,
      peerDependencies: {},
      scripts,
      engines,
      packageManager: "gradle",
      workspaces,
    };
  }

  detectFramework(
    deps: Deps,
    devDeps: Deps,
    _structure: StructureInfo,
  ): FrameworkInfo | null {
    const frameworks: Array<{ packages: string[]; name: string }> = [
      { packages: ["org.springframework.boot:spring-boot-starter-web", "org.springframework.boot:spring-boot-starter-webflux"], name: "spring-boot" },
      { packages: ["io.quarkus:quarkus-core", "io.quarkus:quarkus-resteasy"], name: "quarkus" },
      { packages: ["io.micronaut:micronaut-core", "io.micronaut:micronaut-http-server"], name: "micronaut" },
      { packages: ["io.vertx:vertx-core", "io.vertx:vertx-web"], name: "vert.x" },
      { packages: ["io.javalin:javalin"], name: "javalin" },
    ];

    for (const fw of frameworks) {
      for (const pkg of fw.packages) {
        if (has(pkg, deps, devDeps)) {
          return { name: fw.name, version: ver(pkg, deps, devDeps) ?? "unknown" };
        }
      }
    }
    return null;
  }

  detectStack(
    deps: Deps,
    devDeps: Deps,
    _structure?: StructureInfo,
  ): DetectedStack {
    const all = { ...deps, ...devDeps };
    const recognized: Record<string, RecognizedTech> = {};
    const matchedPackages = new Set<string>();

    for (const rule of RULES) {
      if (recognized[rule.name]) continue;

      const matchingPkgs = rule.packages.filter(p =>
        Object.keys(all).some(k => k === p)
      );
      if (matchingPkgs.length === 0) continue;

      recognized[rule.name] = {
        name: rule.name,
        version: ver(rule.packages[0], deps, devDeps),
        category: rule.category,
      };

      for (const p of matchingPkgs) matchedPackages.add(p);
    }

    // Mark framework packages
    for (const fwPkg of FRAMEWORK_PACKAGES) {
      if (Object.keys(all).some(k => k === fwPkg)) {
        matchedPackages.add(fwPkg);
      }
    }

    const unrecognized: string[] = [];
    for (const pkg of Object.keys(all)) {
      if (matchedPackages.has(pkg)) continue;
      if (NOISE_PREFIXES.some(prefix => pkg === prefix || pkg.startsWith(prefix + ":"))) continue;
      unrecognized.push(pkg);
    }

    return { recognized, unrecognized };
  }
}
