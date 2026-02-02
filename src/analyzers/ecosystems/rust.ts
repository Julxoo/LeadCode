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

function has(name: string, deps: Deps, devDeps: Deps): boolean {
  return name in deps || name in devDeps;
}

function ver(name: string, deps: Deps, devDeps: Deps): string | null {
  const v = deps[name] ?? devDeps[name];
  if (!v || v === "*") return null;
  const match = v.match(/\d+\.\d+(?:\.\d+)?/);
  return match ? match[0] : v;
}

/** Extract version string from a Cargo dependency spec (string or table) */
function extractCargoVersion(spec: unknown): string {
  if (typeof spec === "string") return spec;
  if (typeof spec === "object" && spec !== null) {
    const version = (spec as Record<string, unknown>).version;
    if (typeof version === "string") return version;
  }
  return "*";
}

/** Parse a Cargo dependency table into Record<string, string> */
function parseCargoDeps(table: Record<string, unknown> | undefined): Record<string, string> {
  if (!table) return {};
  const deps: Record<string, string> = {};
  for (const [name, spec] of Object.entries(table)) {
    const raw = extractCargoVersion(spec);
    const match = raw.match(/\d+\.\d+(?:\.\d+)?/);
    deps[name] = match ? match[0] : raw.replace(/[\^~>=<]/g, "").trim() || "*";
  }
  return deps;
}

/** Try to parse a Makefile or justfile for script-like commands */
async function parseScriptFile(projectPath: string): Promise<Record<string, string>> {
  const scripts: Record<string, string> = {};

  // Try justfile first (simpler format)
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

  // Try Makefile
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
  packages: string[];
  name: string;
  category: string;
  versionFrom?: string;
}

const RULES: Rule[] = [
  // ORM / Database
  { packages: ["diesel"], name: "diesel", category: "orm" },
  { packages: ["sea-orm"], name: "sea-orm", category: "orm" },
  { packages: ["sqlx"], name: "sqlx", category: "database" },
  { packages: ["rusqlite"], name: "rusqlite", category: "database" },
  { packages: ["mongodb"], name: "mongodb", category: "database" },
  { packages: ["redis"], name: "redis", category: "database" },
  { packages: ["deadpool-postgres", "deadpool-redis", "deadpool"], name: "deadpool", category: "database" },

  // Serialization
  { packages: ["serde"], name: "serde", category: "serialization" },
  { packages: ["serde_json"], name: "serde-json", category: "serialization" },

  // Async runtime
  { packages: ["tokio"], name: "tokio", category: "async-runtime" },
  { packages: ["async-std"], name: "async-std", category: "async-runtime" },

  // Auth
  { packages: ["jsonwebtoken"], name: "jsonwebtoken", category: "auth" },
  { packages: ["oauth2"], name: "oauth2", category: "auth" },
  { packages: ["argon2"], name: "argon2", category: "auth" },

  // Validation
  { packages: ["validator"], name: "validator", category: "validation" },

  // Testing
  { packages: ["criterion"], name: "criterion", category: "testing" },
  { packages: ["mockall"], name: "mockall", category: "testing" },
  { packages: ["wiremock"], name: "wiremock", category: "testing" },
  { packages: ["proptest"], name: "proptest", category: "testing" },
  { packages: ["insta"], name: "insta", category: "testing" },

  // Error handling
  { packages: ["anyhow"], name: "anyhow", category: "error-handling" },
  { packages: ["thiserror"], name: "thiserror", category: "error-handling" },
  { packages: ["eyre", "color-eyre"], name: "eyre", category: "error-handling" },

  // CLI
  { packages: ["clap"], name: "clap", category: "cli" },
  { packages: ["structopt"], name: "structopt", category: "cli" },

  // Logging
  { packages: ["tracing"], name: "tracing", category: "logging" },
  { packages: ["log"], name: "log", category: "logging" },
  { packages: ["env_logger"], name: "env_logger", category: "logging" },

  // Config
  { packages: ["config"], name: "config", category: "config" },
  { packages: ["dotenvy"], name: "dotenvy", category: "config" },

  // Template
  { packages: ["askama"], name: "askama", category: "template" },
  { packages: ["tera"], name: "tera", category: "template" },
  { packages: ["handlebars"], name: "handlebars", category: "template" },

  // HTTP client
  { packages: ["reqwest"], name: "reqwest", category: "http-client" },

  // gRPC / API
  { packages: ["tonic"], name: "tonic", category: "api" },
  { packages: ["prost"], name: "prost", category: "api" },
];

const NOISE_EXACT = new Set([
  "proc-macro2", "quote", "syn", "unicode-ident", "unicode-xid",
  "unicode-normalization", "unicode-bidi", "unicode-segmentation",
  "libc", "cc", "autocfg", "memchr", "lazy_static", "once_cell",
  "cfg-if", "bitflags", "num-traits", "num-integer", "num-cpus",
  "parking_lot", "parking_lot_core", "lock_api", "scopeguard",
  "smallvec", "tinyvec", "arrayvec", "bytes", "byteorder",
  "itoa", "ryu", "dtoa", "percent-encoding", "form_urlencoded",
  "url", "http", "http-body", "httparse", "mime",
  "pin-project", "pin-project-lite", "pin-utils",
  "futures", "futures-core", "futures-util", "futures-sink",
  "futures-channel", "futures-io", "futures-task", "futures-macro",
  "mio", "socket2", "signal-hook", "signal-hook-registry",
  "crossbeam", "crossbeam-utils", "crossbeam-channel", "crossbeam-deque",
  "crossbeam-epoch", "crossbeam-queue",
  "rand", "rand_core", "rand_chacha", "getrandom",
  "regex", "regex-syntax", "aho-corasick",
  "base64", "hex", "sha2", "sha1", "md-5", "digest", "generic-array",
  "typenum", "crypto-common", "block-buffer", "subtle",
  "chrono", "time", "humantime",
  "indexmap", "hashbrown", "ahash",
  "strum", "strum_macros", "derive_more", "paste",
  "thiserror-impl", "serde_derive",
]);

const NOISE_PREFIXES = ["windows-", "winapi-"];

const FRAMEWORK_PACKAGES = new Set([
  "actix-web", "axum", "rocket", "warp", "tide", "poem", "hyper",
]);

// ---------------------------------------------------------------------------
// RustAdapter
// ---------------------------------------------------------------------------

export class RustAdapter implements EcosystemAdapter {
  ecosystem = "rust" as const;

  getFilePatterns(): EcosystemFilePatterns {
    const patterns = ECOSYSTEM_PATTERNS.rust;
    return {
      sourceExtensions: patterns.sourceExtensions,
      ignoreDirs: patterns.ignoreDirs,
      manifestFiles: ["Cargo.toml"],
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
    const cargoPath = join(projectPath, "Cargo.toml");
    const raw = await readFile(cargoPath, "utf-8");
    const toml = parseTOML(raw) as Record<string, unknown>;

    const pkg = (toml.package ?? {}) as Record<string, unknown>;
    const workspace = (toml.workspace ?? null) as Record<string, unknown> | null;

    const projectName = (pkg.name as string) ?? "unknown";
    const projectVersion = (pkg.version as string) ?? "0.0.0";

    const dependencies = parseCargoDeps(toml.dependencies as Record<string, unknown> | undefined);
    const devDependencies = parseCargoDeps(toml["dev-dependencies"] as Record<string, unknown> | undefined);
    const buildDependencies = parseCargoDeps(toml["build-dependencies"] as Record<string, unknown> | undefined);

    // Scripts from Makefile/justfile
    const scripts = await parseScriptFile(projectPath);

    // Engines
    const engines: Record<string, string> = {};
    if (typeof pkg["rust-version"] === "string") {
      engines.rust = pkg["rust-version"] as string;
    }
    if (typeof pkg.edition === "string") {
      engines.edition = pkg.edition as string;
    }

    // Workspaces
    let workspaces: string[] | null = null;
    if (workspace) {
      const members = workspace.members;
      if (Array.isArray(members)) {
        workspaces = members as string[];
      }
    }

    return {
      projectName,
      projectVersion,
      dependencies,
      devDependencies,
      peerDependencies: buildDependencies,
      scripts,
      engines,
      packageManager: "cargo",
      workspaces,
    };
  }

  detectFramework(
    deps: Deps,
    devDeps: Deps,
    _structure: StructureInfo,
  ): FrameworkInfo | null {
    const frameworks: Array<{ pkg: string; name: string }> = [
      { pkg: "actix-web", name: "actix-web" },
      { pkg: "axum", name: "axum" },
      { pkg: "rocket", name: "rocket" },
      { pkg: "warp", name: "warp" },
      { pkg: "tide", name: "tide" },
      { pkg: "poem", name: "poem" },
      { pkg: "hyper", name: "hyper" },
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
