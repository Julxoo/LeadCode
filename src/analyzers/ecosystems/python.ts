import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseTOML } from "smol-toml";
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

/** Extract package name and version from a PEP 508 dependency string */
function parsePep508(dep: string): [string, string] {
  const trimmed = dep.trim();
  // "requests>=2.28.0,<3" or "django[argon2]>=4.2" or "flask"
  const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:\[.*?\])?\s*(.*)$/);
  if (!match) return [trimmed, "*"];
  const name = match[1].toLowerCase().replace(/-/g, "-");
  const versionSpec = match[2].trim();
  // Extract first version number from spec
  const verMatch = versionSpec.match(/\d+\.\d+(?:\.\d+)?/);
  return [name, verMatch ? verMatch[0] : versionSpec || "*"];
}

/** Parse requirements.txt content into deps */
function parseRequirementsTxt(content: string): Record<string, string> {
  const deps: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;
    const [name, version] = parsePep508(trimmed);
    if (name) deps[name] = version;
  }
  return deps;
}

/** Detect package manager from lockfiles */
async function detectPackageManager(projectPath: string): Promise<string | null> {
  if (await fileExists(join(projectPath, "poetry.lock"))) return "poetry";
  if (await fileExists(join(projectPath, "uv.lock"))) return "uv";
  if (await fileExists(join(projectPath, "Pipfile.lock"))) return "pipenv";
  if (await fileExists(join(projectPath, "pdm.lock"))) return "pdm";
  return "pip";
}

// ---------------------------------------------------------------------------
// Detection rules
// ---------------------------------------------------------------------------

function has(name: string, deps: Deps, devDeps: Deps): boolean {
  return name in deps || name in devDeps;
}

function ver(name: string, deps: Deps, devDeps: Deps): string | null {
  const v = deps[name] ?? devDeps[name];
  if (!v || v === "*") return null;
  const match = v.match(/\d+\.\d+(?:\.\d+)?/);
  return match ? match[0] : v;
}

interface Rule {
  packages: string[];
  name: string;
  category: string;
  versionFrom?: string;
}

const RULES: Rule[] = [
  // ORM
  { packages: ["sqlalchemy"], name: "sqlalchemy", category: "orm" },
  { packages: ["tortoise-orm"], name: "tortoise", category: "orm" },
  { packages: ["peewee"], name: "peewee", category: "orm" },
  { packages: ["sqlmodel"], name: "sqlmodel", category: "orm" },
  { packages: ["mongoengine"], name: "mongoengine", category: "orm" },
  { packages: ["odmantic"], name: "odmantic", category: "orm" },

  // Database drivers
  { packages: ["psycopg2", "psycopg2-binary", "psycopg"], name: "psycopg", category: "database" },
  { packages: ["asyncpg"], name: "asyncpg", category: "database" },
  { packages: ["pymongo"], name: "pymongo", category: "database" },
  { packages: ["redis"], name: "redis", category: "database" },
  { packages: ["motor"], name: "motor", category: "database" },
  { packages: ["aioredis"], name: "aioredis", category: "database" },
  { packages: ["aiomysql", "pymysql"], name: "mysql", category: "database" },

  // Auth
  { packages: ["django-allauth"], name: "django-allauth", category: "auth" },
  { packages: ["python-jose", "pyjwt", "authlib"], name: "jwt", category: "auth" },
  { packages: ["passlib"], name: "passlib", category: "auth" },
  { packages: ["djangorestframework-simplejwt"], name: "drf-simplejwt", category: "auth" },

  // Validation
  { packages: ["pydantic"], name: "pydantic", category: "validation" },
  { packages: ["marshmallow"], name: "marshmallow", category: "validation" },
  { packages: ["cerberus"], name: "cerberus", category: "validation" },
  { packages: ["attrs"], name: "attrs", category: "validation" },

  // Testing
  { packages: ["pytest"], name: "pytest", category: "testing" },
  { packages: ["hypothesis"], name: "hypothesis", category: "testing" },
  { packages: ["factory-boy"], name: "factory-boy", category: "testing" },
  { packages: ["faker"], name: "faker", category: "testing" },
  { packages: ["pytest-cov"], name: "pytest-cov", category: "testing" },
  { packages: ["tox"], name: "tox", category: "testing" },
  { packages: ["nox"], name: "nox", category: "testing" },

  // API
  { packages: ["djangorestframework"], name: "drf", category: "api" },
  { packages: ["graphene", "strawberry-graphql", "ariadne"], name: "graphql", category: "api" },
  { packages: ["grpcio"], name: "grpc", category: "api" },
  { packages: ["django-ninja"], name: "django-ninja", category: "api" },

  // Jobs / Queue
  { packages: ["celery"], name: "celery", category: "jobs" },
  { packages: ["dramatiq"], name: "dramatiq", category: "jobs" },
  { packages: ["rq"], name: "rq", category: "jobs" },
  { packages: ["huey"], name: "huey", category: "jobs" },

  // Migration
  { packages: ["alembic"], name: "alembic", category: "migration" },

  // Linter / Formatter
  { packages: ["ruff"], name: "ruff", category: "linter" },
  { packages: ["black"], name: "black", category: "formatter" },
  { packages: ["flake8"], name: "flake8", category: "linter" },
  { packages: ["isort"], name: "isort", category: "formatter" },
  { packages: ["pylint"], name: "pylint", category: "linter" },

  // Type checker
  { packages: ["mypy"], name: "mypy", category: "type-checker" },
  { packages: ["pyright"], name: "pyright", category: "type-checker" },

  // HTTP client
  { packages: ["httpx"], name: "httpx", category: "http-client" },
  { packages: ["requests"], name: "requests", category: "http-client" },

  // Template
  { packages: ["jinja2"], name: "jinja2", category: "template" },
  { packages: ["mako"], name: "mako", category: "template" },

  // Email
  { packages: ["django-anymail"], name: "anymail", category: "email" },

  // Server
  { packages: ["uvicorn"], name: "uvicorn", category: "server" },
  { packages: ["gunicorn"], name: "gunicorn", category: "server" },
  { packages: ["hypercorn"], name: "hypercorn", category: "server" },

  // Config
  { packages: ["python-dotenv"], name: "dotenv", category: "config" },
  { packages: ["pydantic-settings"], name: "pydantic-settings", category: "config" },
  { packages: ["dynaconf"], name: "dynaconf", category: "config" },

  // Admin
  { packages: ["django-admin-interface"], name: "django-admin-interface", category: "admin" },

  // CORS
  { packages: ["django-cors-headers"], name: "django-cors-headers", category: "middleware" },

  // Caching
  { packages: ["django-redis"], name: "django-redis", category: "caching" },

  // Payments
  { packages: ["stripe"], name: "stripe", category: "payments" },
];

const NOISE_EXACT = new Set([
  "setuptools", "wheel", "pip", "build", "twine", "flit", "flit-core",
  "hatchling", "hatch-vcs", "pdm", "pdm-backend", "pdm-pep517",
  "poetry-core", "poetry-plugin-export",
  "typing-extensions", "mypy-extensions",
  "importlib-metadata", "importlib-resources",
  "six", "future", "backports",
  "packaging", "distlib", "filelock", "platformdirs", "virtualenv",
  "certifi", "charset-normalizer", "idna", "urllib3",
]);

const NOISE_PREFIXES = ["types-"];

const FRAMEWORK_PACKAGES = new Set([
  "django", "flask", "fastapi", "starlette", "litestar",
  "sanic", "tornado", "pyramid", "bottle", "aiohttp",
]);

// ---------------------------------------------------------------------------
// PythonAdapter
// ---------------------------------------------------------------------------

export class PythonAdapter implements EcosystemAdapter {
  ecosystem = "python" as const;

  getFilePatterns(): EcosystemFilePatterns {
    const patterns = ECOSYSTEM_PATTERNS.python;
    return {
      sourceExtensions: patterns.sourceExtensions,
      ignoreDirs: patterns.ignoreDirs,
      manifestFiles: ["pyproject.toml", "requirements.txt", "setup.py", "Pipfile"],
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
    const packageManager = await detectPackageManager(projectPath);

    // Try pyproject.toml first
    const pyprojectPath = join(projectPath, "pyproject.toml");
    if (await fileExists(pyprojectPath)) {
      return this.parsePyproject(pyprojectPath, packageManager);
    }

    // Try requirements.txt
    const reqPath = join(projectPath, "requirements.txt");
    if (await fileExists(reqPath)) {
      const content = await readFile(reqPath, "utf-8");
      const deps = parseRequirementsTxt(content);
      // Check for requirements-dev.txt or dev-requirements.txt
      let devDeps: Record<string, string> = {};
      for (const devFile of ["requirements-dev.txt", "dev-requirements.txt", "requirements_dev.txt"]) {
        const devPath = join(projectPath, devFile);
        if (await fileExists(devPath)) {
          const devContent = await readFile(devPath, "utf-8");
          devDeps = parseRequirementsTxt(devContent);
          break;
        }
      }
      return {
        projectName: projectPath.split("/").pop() ?? "unknown",
        projectVersion: "0.0.0",
        dependencies: deps,
        devDependencies: devDeps,
        peerDependencies: {},
        scripts: {},
        engines: {},
        packageManager,
        workspaces: null,
      };
    }

    // Try Pipfile
    const pipfilePath = join(projectPath, "Pipfile");
    if (await fileExists(pipfilePath)) {
      return this.parsePipfile(pipfilePath, packageManager);
    }

    // Try setup.py (basic regex)
    const setupPath = join(projectPath, "setup.py");
    if (await fileExists(setupPath)) {
      return this.parseSetupPy(setupPath, projectPath, packageManager);
    }

    throw new Error(`No Python manifest found in ${projectPath} (tried pyproject.toml, requirements.txt, Pipfile, setup.py)`);
  }

  private async parsePyproject(
    filePath: string,
    packageManager: string | null,
  ): ReturnType<EcosystemAdapter["parseDependencies"]> {
    const raw = await readFile(filePath, "utf-8");
    const toml = parseTOML(raw) as Record<string, unknown>;

    const project = (toml.project ?? {}) as Record<string, unknown>;
    const tool = (toml.tool ?? {}) as Record<string, unknown>;
    const poetry = (tool.poetry ?? {}) as Record<string, unknown>;

    // Project name and version
    const projectName = (project.name as string) ?? (poetry.name as string) ?? "unknown";
    const projectVersion = (project.version as string) ?? (poetry.version as string) ?? "0.0.0";

    // Dependencies
    let dependencies: Record<string, string> = {};
    let devDependencies: Record<string, string> = {};

    // PEP 621 format: project.dependencies is string[]
    if (Array.isArray(project.dependencies)) {
      for (const dep of project.dependencies as string[]) {
        const [name, version] = parsePep508(dep);
        dependencies[name] = version;
      }
    }

    // PEP 621 optional-dependencies (often contains dev/test groups)
    const optDeps = project["optional-dependencies"] as Record<string, string[]> | undefined;
    if (optDeps) {
      for (const [group, deps] of Object.entries(optDeps)) {
        const target = ["dev", "test", "testing", "lint", "development"].includes(group)
          ? devDependencies
          : dependencies;
        for (const dep of deps) {
          const [name, version] = parsePep508(dep);
          target[name] = version;
        }
      }
    }

    // Poetry format: tool.poetry.dependencies is Record<string, string | object>
    if (poetry.dependencies && typeof poetry.dependencies === "object" && !Array.isArray(poetry.dependencies)) {
      const poetryDeps = poetry.dependencies as Record<string, unknown>;
      for (const [name, spec] of Object.entries(poetryDeps)) {
        if (name === "python") continue;
        const version = typeof spec === "string" ? spec : (typeof spec === "object" && spec !== null ? ((spec as Record<string, unknown>).version as string) ?? "*" : "*");
        const verMatch = version.match(/\d+\.\d+(?:\.\d+)?/);
        dependencies[name.toLowerCase()] = verMatch ? verMatch[0] : version.replace(/[\^~>=<]/g, "").trim();
      }
    }

    // Poetry dev deps
    const poetryDevDeps = (poetry["dev-dependencies"] as Record<string, unknown>) ?? {};
    const poetryGroups = (poetry.group as Record<string, unknown>) ?? {};
    const poetryDevGroup = (poetryGroups.dev as Record<string, unknown>) ?? {};
    const poetryDevGroupDeps = (poetryDevGroup.dependencies as Record<string, unknown>) ?? {};

    for (const devSource of [poetryDevDeps, poetryDevGroupDeps]) {
      for (const [name, spec] of Object.entries(devSource)) {
        const version = typeof spec === "string" ? spec : "*";
        const verMatch = version.match(/\d+\.\d+(?:\.\d+)?/);
        devDependencies[name.toLowerCase()] = verMatch ? verMatch[0] : version.replace(/[\^~>=<]/g, "").trim();
      }
    }

    // Scripts
    const scripts: Record<string, string> = {};
    const projectScripts = (project.scripts ?? {}) as Record<string, string>;
    for (const [name, cmd] of Object.entries(projectScripts)) {
      scripts[name] = cmd;
    }
    const poetryScripts = (poetry.scripts ?? {}) as Record<string, string>;
    for (const [name, cmd] of Object.entries(poetryScripts)) {
      scripts[name] = cmd;
    }

    // Engines (requires-python)
    const engines: Record<string, string> = {};
    if (typeof project["requires-python"] === "string") {
      engines.python = project["requires-python"] as string;
    }

    return {
      projectName,
      projectVersion,
      dependencies,
      devDependencies,
      peerDependencies: {},
      scripts,
      engines,
      packageManager,
      workspaces: null,
    };
  }

  private async parsePipfile(
    filePath: string,
    packageManager: string | null,
  ): ReturnType<EcosystemAdapter["parseDependencies"]> {
    const raw = await readFile(filePath, "utf-8");
    const toml = parseTOML(raw) as Record<string, unknown>;

    const packages = (toml.packages ?? {}) as Record<string, unknown>;
    const devPackages = (toml["dev-packages"] ?? {}) as Record<string, unknown>;

    const parsePipfileDeps = (pkgs: Record<string, unknown>): Record<string, string> => {
      const deps: Record<string, string> = {};
      for (const [name, spec] of Object.entries(pkgs)) {
        const version = typeof spec === "string" ? spec : "*";
        const verMatch = version.match(/\d+\.\d+(?:\.\d+)?/);
        deps[name.toLowerCase()] = verMatch ? verMatch[0] : version === "*" ? "*" : version;
      }
      return deps;
    };

    const projectPath = filePath.replace(/\/Pipfile$/, "");

    return {
      projectName: projectPath.split("/").pop() ?? "unknown",
      projectVersion: "0.0.0",
      dependencies: parsePipfileDeps(packages),
      devDependencies: parsePipfileDeps(devPackages),
      peerDependencies: {},
      scripts: {},
      engines: {},
      packageManager: packageManager ?? "pipenv",
      workspaces: null,
    };
  }

  private async parseSetupPy(
    filePath: string,
    projectPath: string,
    packageManager: string | null,
  ): ReturnType<EcosystemAdapter["parseDependencies"]> {
    const content = await readFile(filePath, "utf-8");
    const deps: Record<string, string> = {};

    // Extract install_requires list
    const match = content.match(/install_requires\s*=\s*\[([\s\S]*?)\]/);
    if (match) {
      const items = match[1].match(/['"]([^'"]+)['"]/g);
      if (items) {
        for (const item of items) {
          const clean = item.replace(/['"]/g, "");
          const [name, version] = parsePep508(clean);
          deps[name] = version;
        }
      }
    }

    // Extract name
    const nameMatch = content.match(/name\s*=\s*['"]([^'"]+)['"]/);
    const versionMatch = content.match(/version\s*=\s*['"]([^'"]+)['"]/);

    return {
      projectName: nameMatch ? nameMatch[1] : projectPath.split("/").pop() ?? "unknown",
      projectVersion: versionMatch ? versionMatch[1] : "0.0.0",
      dependencies: deps,
      devDependencies: {},
      peerDependencies: {},
      scripts: {},
      engines: {},
      packageManager,
      workspaces: null,
    };
  }

  detectFramework(
    deps: Deps,
    devDeps: Deps,
    _structure: StructureInfo,
  ): FrameworkInfo | null {
    const frameworks: Array<{ pkg: string; name: string }> = [
      { pkg: "django", name: "django" },
      { pkg: "flask", name: "flask" },
      { pkg: "fastapi", name: "fastapi" },
      { pkg: "starlette", name: "starlette" },
      { pkg: "litestar", name: "litestar" },
      { pkg: "sanic", name: "sanic" },
      { pkg: "tornado", name: "tornado" },
      { pkg: "pyramid", name: "pyramid" },
      { pkg: "bottle", name: "bottle" },
      { pkg: "aiohttp", name: "aiohttp" },
    ];

    for (const fw of frameworks) {
      if (has(fw.pkg, deps, devDeps)) {
        return { name: fw.name, version: ver(fw.pkg, deps, devDeps) ?? "unknown" };
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

      const matchingPkgs = rule.packages.filter(p => p in all);
      if (matchingPkgs.length === 0) continue;

      if (matchingPkgs.every(p => matchedPackages.has(p))) continue;

      const versionPkg = rule.versionFrom ?? rule.packages[0];
      recognized[rule.name] = {
        name: rule.name,
        version: ver(versionPkg, deps, devDeps),
        category: rule.category,
      };

      for (const p of rule.packages) {
        if (p in all) matchedPackages.add(p);
      }
    }

    const unrecognized: string[] = [];
    for (const pkg of Object.keys(all)) {
      if (matchedPackages.has(pkg)) continue;
      if (NOISE_EXACT.has(pkg)) continue;
      if (NOISE_PREFIXES.some(prefix => pkg.startsWith(prefix))) continue;
      if (FRAMEWORK_PACKAGES.has(pkg)) continue;
      unrecognized.push(pkg);
    }

    return { recognized, unrecognized };
  }
}
