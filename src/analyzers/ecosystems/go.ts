import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
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

/** Check if any dep key contains the given module path (Go uses full paths) */
function hasMod(mod: string, deps: Deps, devDeps: Deps): boolean {
  return Object.keys(deps).some(k => k === mod || k.startsWith(mod + "/"))
    || Object.keys(devDeps).some(k => k === mod || k.startsWith(mod + "/"));
}

/** Get version for a Go module path */
function verMod(mod: string, deps: Deps, devDeps: Deps): string | null {
  const all = { ...deps, ...devDeps };
  for (const [k, v] of Object.entries(all)) {
    if (k === mod || k.startsWith(mod + "/")) {
      if (!v || v === "*") return null;
      const match = v.match(/\d+\.\d+(?:\.\d+)?/);
      return match ? match[0] : v;
    }
  }
  return null;
}

/** Parse go.mod file content into module name, go version, and dependencies */
function parseGoMod(content: string): {
  moduleName: string;
  goVersion: string;
  dependencies: Record<string, string>;
} {
  const dependencies: Record<string, string> = {};
  let moduleName = "unknown";
  let goVersion = "";

  const lines = content.split("\n");
  let inRequireBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // module declaration
    const moduleMatch = trimmed.match(/^module\s+(.+)$/);
    if (moduleMatch) {
      moduleName = moduleMatch[1].trim();
      continue;
    }

    // go version
    const goMatch = trimmed.match(/^go\s+(\d+\.\d+(?:\.\d+)?)$/);
    if (goMatch) {
      goVersion = goMatch[1];
      continue;
    }

    // require block start/end
    if (trimmed === "require (") {
      inRequireBlock = true;
      continue;
    }
    if (trimmed === ")" && inRequireBlock) {
      inRequireBlock = false;
      continue;
    }

    // Single-line require
    const singleMatch = trimmed.match(/^require\s+(\S+)\s+(\S+)/);
    if (singleMatch) {
      dependencies[singleMatch[1]] = singleMatch[2];
      continue;
    }

    // Inside require block
    if (inRequireBlock) {
      const depMatch = trimmed.match(/^(\S+)\s+(\S+)/);
      if (depMatch && !depMatch[1].startsWith("//")) {
        dependencies[depMatch[1]] = depMatch[2];
      }
    }
  }

  return { moduleName, goVersion, dependencies };
}

/** Parse go.work file for workspace members */
async function parseGoWork(projectPath: string): Promise<string[] | null> {
  const workPath = join(projectPath, "go.work");
  if (!(await fileExists(workPath))) return null;

  const content = await readFile(workPath, "utf-8");
  const members: string[] = [];
  let inUseBlock = false;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (trimmed === "use (") {
      inUseBlock = true;
      continue;
    }
    if (trimmed === ")" && inUseBlock) {
      inUseBlock = false;
      continue;
    }

    // Single-line use
    const singleMatch = trimmed.match(/^use\s+(\S+)/);
    if (singleMatch) {
      members.push(singleMatch[1]);
      continue;
    }

    if (inUseBlock && trimmed && !trimmed.startsWith("//")) {
      members.push(trimmed);
    }
  }

  return members.length > 0 ? members : null;
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
// Detection rules
// ---------------------------------------------------------------------------

interface Rule {
  modules: string[];
  name: string;
  category: string;
}

const RULES: Rule[] = [
  // ORM / Database
  { modules: ["gorm.io/gorm"], name: "gorm", category: "orm" },
  { modules: ["entgo.io/ent"], name: "ent", category: "orm" },
  { modules: ["github.com/jmoiron/sqlx"], name: "sqlx", category: "database" },
  { modules: ["go.mongodb.org/mongo-driver"], name: "mongo-driver", category: "database" },
  { modules: ["github.com/redis/go-redis", "github.com/go-redis/redis"], name: "go-redis", category: "database" },
  { modules: ["github.com/jackc/pgx"], name: "pgx", category: "database" },

  // Testing
  { modules: ["github.com/stretchr/testify"], name: "testify", category: "testing" },
  { modules: ["github.com/onsi/ginkgo"], name: "ginkgo", category: "testing" },
  { modules: ["github.com/onsi/gomega"], name: "gomega", category: "testing" },
  { modules: ["github.com/golang/mock", "go.uber.org/mock"], name: "gomock", category: "testing" },

  // CLI
  { modules: ["github.com/spf13/cobra"], name: "cobra", category: "cli" },
  { modules: ["github.com/urfave/cli"], name: "urfave-cli", category: "cli" },

  // Config
  { modules: ["github.com/spf13/viper"], name: "viper", category: "config" },
  { modules: ["github.com/joho/godotenv"], name: "godotenv", category: "config" },
  { modules: ["github.com/kelseyhightower/envconfig"], name: "envconfig", category: "config" },

  // Logging
  { modules: ["go.uber.org/zap"], name: "zap", category: "logging" },
  { modules: ["github.com/sirupsen/logrus"], name: "logrus", category: "logging" },
  { modules: ["github.com/rs/zerolog"], name: "zerolog", category: "logging" },

  // Validation
  { modules: ["github.com/go-playground/validator"], name: "go-validator", category: "validation" },

  // Auth
  { modules: ["github.com/golang-jwt/jwt"], name: "golang-jwt", category: "auth" },
  { modules: ["github.com/coreos/go-oidc"], name: "go-oidc", category: "auth" },
  { modules: ["golang.org/x/oauth2"], name: "oauth2", category: "auth" },

  // API / gRPC
  { modules: ["google.golang.org/grpc"], name: "grpc-go", category: "api" },
  { modules: ["google.golang.org/protobuf"], name: "protobuf", category: "api" },
  { modules: ["github.com/99designs/gqlgen"], name: "gqlgen", category: "api" },

  // HTTP client
  { modules: ["github.com/go-resty/resty"], name: "resty", category: "http-client" },

  // Observability
  { modules: ["go.opentelemetry.io/otel"], name: "opentelemetry", category: "observability" },
  { modules: ["github.com/prometheus/client_golang"], name: "prometheus", category: "observability" },

  // Migration
  { modules: ["github.com/golang-migrate/migrate"], name: "golang-migrate", category: "migration" },
  { modules: ["github.com/pressly/goose"], name: "goose", category: "migration" },
];

const NOISE_PREFIXES = [
  "golang.org/x/sys",
  "golang.org/x/text",
  "golang.org/x/net",
  "golang.org/x/crypto",
  "golang.org/x/sync",
  "golang.org/x/time",
  "golang.org/x/exp",
  "golang.org/x/tools",
  "golang.org/x/mod",
  "golang.org/x/term",
  "golang.org/x/xerrors",
  "github.com/google/go-cmp",
  "github.com/davecgh/go-spew",
  "github.com/pmezard/go-difflib",
  "github.com/stretchr/objx",
  "github.com/kr/pretty",
  "github.com/kr/text",
  "github.com/rogpeppe/go-internal",
  "github.com/cpuguy83/go-md2man",
  "github.com/russross/blackfriday",
  "github.com/inconshreveable/mousetrap",
];

const FRAMEWORK_MODULES = [
  "github.com/gin-gonic/gin",
  "github.com/labstack/echo",
  "github.com/gofiber/fiber",
  "github.com/go-chi/chi",
  "github.com/gorilla/mux",
  "github.com/julienschmidt/httprouter",
];

// ---------------------------------------------------------------------------
// GoAdapter
// ---------------------------------------------------------------------------

export class GoAdapter implements EcosystemAdapter {
  ecosystem = "go" as const;

  getFilePatterns(): EcosystemFilePatterns {
    const patterns = ECOSYSTEM_PATTERNS.go;
    return {
      sourceExtensions: patterns.sourceExtensions,
      ignoreDirs: patterns.ignoreDirs,
      manifestFiles: ["go.mod"],
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
    const goModPath = join(projectPath, "go.mod");
    const raw = await readFile(goModPath, "utf-8");
    const { moduleName, goVersion, dependencies } = parseGoMod(raw);

    const scripts = await parseScriptFile(projectPath);
    const workspaces = await parseGoWork(projectPath);

    const engines: Record<string, string> = {};
    if (goVersion) engines.go = goVersion;

    return {
      projectName: moduleName,
      projectVersion: "0.0.0",
      dependencies,
      devDependencies: {},
      peerDependencies: {},
      scripts,
      engines,
      packageManager: "go",
      workspaces,
    };
  }

  detectFramework(
    deps: Deps,
    devDeps: Deps,
    _structure: StructureInfo,
  ): FrameworkInfo | null {
    const frameworks: Array<{ mod: string; name: string }> = [
      { mod: "github.com/gin-gonic/gin", name: "gin" },
      { mod: "github.com/labstack/echo", name: "echo" },
      { mod: "github.com/gofiber/fiber", name: "fiber" },
      { mod: "github.com/go-chi/chi", name: "chi" },
      { mod: "github.com/gorilla/mux", name: "gorilla-mux" },
      { mod: "github.com/julienschmidt/httprouter", name: "httprouter" },
    ];

    for (const fw of frameworks) {
      if (hasMod(fw.mod, deps, devDeps)) {
        return { name: fw.name, version: verMod(fw.mod, deps, devDeps) ?? "unknown" };
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
    const matchedModules = new Set<string>();

    for (const rule of RULES) {
      if (recognized[rule.name]) continue;

      const matchingMods = rule.modules.filter(m =>
        Object.keys(all).some(k => k === m || k.startsWith(m + "/"))
      );
      if (matchingMods.length === 0) continue;

      // Find the actual dep key for version extraction
      const version = verMod(rule.modules[0], deps, devDeps);
      recognized[rule.name] = {
        name: rule.name,
        version,
        category: rule.category,
      };

      // Mark matched module keys
      for (const mod of rule.modules) {
        for (const k of Object.keys(all)) {
          if (k === mod || k.startsWith(mod + "/")) {
            matchedModules.add(k);
          }
        }
      }
    }

    // Mark framework modules
    for (const fwMod of FRAMEWORK_MODULES) {
      for (const k of Object.keys(all)) {
        if (k === fwMod || k.startsWith(fwMod + "/")) {
          matchedModules.add(k);
        }
      }
    }

    const unrecognized: string[] = [];
    for (const pkg of Object.keys(all)) {
      if (matchedModules.has(pkg)) continue;
      if (NOISE_PREFIXES.some(prefix => pkg === prefix || pkg.startsWith(prefix + "/"))) continue;
      unrecognized.push(pkg);
    }

    return { recognized, unrecognized };
  }
}
