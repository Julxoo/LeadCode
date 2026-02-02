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

function has(name: string, deps: Deps, devDeps: Deps): boolean {
  return name in deps || name in devDeps;
}

function ver(name: string, deps: Deps, devDeps: Deps): string | null {
  const v = deps[name] ?? devDeps[name];
  if (!v || v === "*") return null;
  const match = v.match(/\d+\.\d+(?:\.\d+)?/);
  return match ? match[0] : v.replace(/[\^~>=<]/g, "").trim() || null;
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
  // ===== ORM / Database =====
  { packages: ["doctrine/orm", "doctrine/dbal"], name: "doctrine", category: "orm" },
  { packages: ["illuminate/database"], name: "eloquent", category: "orm" },
  { packages: ["cycle/orm"], name: "cycle-orm", category: "orm" },
  { packages: ["propel/propel"], name: "propel", category: "orm" },

  // Database drivers / clients
  { packages: ["predis/predis"], name: "predis", category: "database" },
  { packages: ["mongodb/mongodb"], name: "mongodb", category: "database" },
  { packages: ["phpredis/phpredis"], name: "phpredis", category: "database" },

  // ===== Migration =====
  { packages: ["doctrine/migrations"], name: "doctrine-migrations", category: "migration" },
  { packages: ["phinx/phinx", "robmorgan/phinx"], name: "phinx", category: "migration" },

  // ===== Testing =====
  { packages: ["phpunit/phpunit"], name: "phpunit", category: "testing" },
  { packages: ["pestphp/pest"], name: "pest", category: "testing" },
  { packages: ["phpspec/phpspec"], name: "phpspec", category: "testing" },
  { packages: ["codeception/codeception"], name: "codeception", category: "testing" },
  { packages: ["mockery/mockery"], name: "mockery", category: "testing" },
  { packages: ["phpstan/phpstan"], name: "phpstan", category: "linter" },
  { packages: ["vimeo/psalm"], name: "psalm", category: "linter" },
  { packages: ["squizlabs/php_codesniffer"], name: "phpcs", category: "linter" },
  { packages: ["friendsofphp/php-cs-fixer"], name: "php-cs-fixer", category: "formatter" },
  { packages: ["laravel/pint"], name: "pint", category: "formatter" },
  { packages: ["rector/rector"], name: "rector", category: "linter" },
  { packages: ["brianium/paratest"], name: "paratest", category: "testing" },
  { packages: ["laravel/dusk"], name: "dusk", category: "testing" },

  // ===== Auth / Security =====
  { packages: ["laravel/sanctum"], name: "sanctum", category: "auth" },
  { packages: ["laravel/passport"], name: "passport", category: "auth" },
  { packages: ["tymon/jwt-auth"], name: "jwt-auth", category: "auth" },
  { packages: ["lcobucci/jwt"], name: "lcobucci-jwt", category: "auth" },
  { packages: ["laravel/socialite"], name: "socialite", category: "auth" },
  { packages: ["laravel/fortify"], name: "fortify", category: "auth" },
  { packages: ["laravel/breeze"], name: "breeze", category: "auth" },
  { packages: ["laravel/jetstream"], name: "jetstream", category: "auth" },
  { packages: ["symfony/security-bundle"], name: "symfony-security", category: "auth" },
  { packages: ["symfony/security-csrf"], name: "symfony-csrf", category: "auth" },

  // ===== Validation =====
  { packages: ["respect/validation"], name: "respect-validation", category: "validation" },
  { packages: ["rakit/validation"], name: "rakit-validation", category: "validation" },
  { packages: ["symfony/validator"], name: "symfony-validator", category: "validation" },

  // ===== Template =====
  { packages: ["twig/twig"], name: "twig", category: "template" },

  // ===== API =====
  { packages: ["api-platform/core"], name: "api-platform", category: "api" },
  { packages: ["league/fractal"], name: "fractal", category: "api" },
  { packages: ["webonyx/graphql-php"], name: "graphql-php", category: "api" },
  { packages: ["grpc/grpc"], name: "grpc-php", category: "api" },
  { packages: ["nelmio/api-doc-bundle"], name: "nelmio-api-doc", category: "api" },
  { packages: ["knuckleswtf/scribe"], name: "scribe", category: "api" },
  { packages: ["spatie/laravel-data"], name: "laravel-data", category: "api" },
  { packages: ["spatie/laravel-query-builder"], name: "laravel-query-builder", category: "api" },
  { packages: ["laravel/octane"], name: "octane", category: "server" },

  // ===== HTTP client =====
  { packages: ["guzzlehttp/guzzle"], name: "guzzle", category: "http-client" },
  { packages: ["symfony/http-client"], name: "symfony-http-client", category: "http-client" },

  // ===== Jobs / Queue / Messaging =====
  { packages: ["php-amqplib/php-amqplib"], name: "amqp", category: "jobs" },
  { packages: ["laravel/horizon"], name: "horizon", category: "jobs" },
  { packages: ["symfony/messenger"], name: "symfony-messenger", category: "jobs" },
  { packages: ["enqueue/enqueue-bundle"], name: "enqueue", category: "jobs" },

  // ===== Logging =====
  { packages: ["monolog/monolog"], name: "monolog", category: "logging" },

  // ===== Config / Environment =====
  { packages: ["vlucas/phpdotenv"], name: "phpdotenv", category: "config" },
  { packages: ["symfony/dotenv"], name: "symfony-dotenv", category: "config" },

  // ===== Admin =====
  { packages: ["laravel/nova"], name: "nova", category: "admin" },
  { packages: ["filament/filament"], name: "filament", category: "admin" },
  { packages: ["easycorp/easyadmin-bundle"], name: "easyadmin", category: "admin" },
  { packages: ["sonata-project/admin-bundle"], name: "sonata-admin", category: "admin" },

  // ===== Payments =====
  { packages: ["stripe/stripe-php"], name: "stripe", category: "payments" },
  { packages: ["laravel/cashier"], name: "cashier", category: "payments" },
  { packages: ["laravel/cashier-paddle"], name: "cashier-paddle", category: "payments" },

  // ===== Email =====
  { packages: ["symfony/mailer"], name: "symfony-mailer", category: "email" },
  { packages: ["phpmailer/phpmailer"], name: "phpmailer", category: "email" },
  { packages: ["mailgun/mailgun-php"], name: "mailgun", category: "email" },

  // ===== Observability =====
  { packages: ["sentry/sentry-laravel", "sentry/sentry-symfony", "sentry/sentry"], name: "sentry", category: "observability" },
  { packages: ["laravel/telescope"], name: "telescope", category: "observability" },
  { packages: ["barryvdh/laravel-debugbar"], name: "debugbar", category: "observability" },
  { packages: ["symfony/web-profiler-bundle"], name: "symfony-profiler", category: "observability" },

  // ===== Serialization =====
  { packages: ["symfony/serializer"], name: "symfony-serializer", category: "serialization" },
  { packages: ["jms/serializer"], name: "jms-serializer", category: "serialization" },

  // ===== Caching =====
  { packages: ["symfony/cache"], name: "symfony-cache", category: "caching" },

  // ===== Middleware / CORS =====
  { packages: ["laravel/cors", "fruitcake/laravel-cors"], name: "laravel-cors", category: "middleware" },
  { packages: ["nelmio/cors-bundle"], name: "nelmio-cors", category: "middleware" },

  // ===== Frontend integration =====
  { packages: ["livewire/livewire"], name: "livewire", category: "ui-components" },
  { packages: ["inertiajs/inertia-laravel"], name: "inertia", category: "ui-components" },

  // ===== Symfony components (important standalone usage) =====
  { packages: ["symfony/console"], name: "symfony-console", category: "cli" },
  { packages: ["symfony/form"], name: "symfony-form", category: "forms" },
  { packages: ["symfony/workflow"], name: "symfony-workflow", category: "state" },
  { packages: ["symfony/event-dispatcher"], name: "symfony-events", category: "middleware" },
  { packages: ["symfony/notifier"], name: "symfony-notifier", category: "email" },
  { packages: ["symfony/scheduler"], name: "symfony-scheduler", category: "jobs" },

  // ===== Spatie ecosystem (Laravel) =====
  { packages: ["spatie/laravel-permission"], name: "laravel-permission", category: "auth" },
  { packages: ["spatie/laravel-medialibrary"], name: "laravel-medialibrary", category: "file-upload" },
  { packages: ["spatie/laravel-activitylog"], name: "laravel-activitylog", category: "logging" },
  { packages: ["spatie/laravel-backup"], name: "laravel-backup", category: "deployment" },
  { packages: ["spatie/laravel-translatable"], name: "laravel-translatable", category: "i18n" },
  { packages: ["spatie/laravel-sluggable"], name: "laravel-sluggable", category: "orm" },
  { packages: ["spatie/laravel-settings"], name: "laravel-settings", category: "config" },

  // ===== i18n =====
  { packages: ["symfony/translation"], name: "symfony-translation", category: "i18n" },

  // ===== File storage =====
  { packages: ["league/flysystem"], name: "flysystem", category: "file-upload" },
  { packages: ["intervention/image"], name: "intervention-image", category: "file-upload" },

  // ===== Realtime =====
  { packages: ["beyondcode/laravel-websockets", "pusher/pusher-php-server"], name: "laravel-websockets", category: "realtime" },
  { packages: ["laravel/reverb"], name: "reverb", category: "realtime" },

  // ===== CMS =====
  { packages: ["statamic/cms"], name: "statamic", category: "cms" },

  // ===== Search =====
  { packages: ["laravel/scout"], name: "scout", category: "database" },
  { packages: ["meilisearch/meilisearch-php"], name: "meilisearch", category: "database" },
  { packages: ["algolia/algoliasearch-client-php"], name: "algolia", category: "database" },
  { packages: ["elasticsearch/elasticsearch"], name: "elasticsearch", category: "database" },
];

const NOISE_EXACT = new Set([
  "php",
  // ext-* are noise entries (filtered separately too)
  "ext-json", "ext-mbstring", "ext-openssl", "ext-pdo", "ext-xml",
  "ext-ctype", "ext-curl", "ext-dom", "ext-fileinfo", "ext-filter",
  "ext-hash", "ext-iconv", "ext-intl", "ext-tokenizer", "ext-xmlwriter",
  "ext-bcmath", "ext-gd", "ext-zip", "ext-sodium", "ext-simplexml",
  "ext-pdo_mysql", "ext-pdo_pgsql", "ext-pdo_sqlite",
  // Composer internals
  "composer/installers", "composer-plugin-api", "composer/semver",
  // PSR interfaces
  "psr/log", "psr/http-message", "psr/container", "psr/cache",
  "psr/event-dispatcher", "psr/simple-cache", "psr/http-client",
  "psr/http-factory", "psr/http-server-handler", "psr/http-server-middleware",
  "psr/clock", "psr/link",
  // Polyfills
  "symfony/polyfill-mbstring", "symfony/polyfill-ctype", "symfony/polyfill-intl-normalizer",
  "symfony/polyfill-intl-grapheme", "symfony/polyfill-php80", "symfony/polyfill-php81",
  "symfony/polyfill-php82", "symfony/polyfill-php83", "symfony/polyfill-php84",
  "symfony/polyfill-intl-icu", "symfony/polyfill-intl-idn",
  "symfony/polyfill-uuid",
  // Low-level deps that are always pulled transitively
  "symfony/deprecation-contracts", "symfony/service-contracts",
  "symfony/event-dispatcher-contracts", "symfony/http-kernel",
  "symfony/http-foundation", "symfony/routing", "symfony/dependency-injection",
  "symfony/config", "symfony/filesystem", "symfony/finder",
  "symfony/string", "symfony/var-dumper", "symfony/var-exporter",
  "symfony/property-access", "symfony/property-info",
  "symfony/options-resolver", "symfony/mime", "symfony/error-handler",
  "symfony/process", "symfony/yaml", "symfony/expression-language",
  // Doctrine internals
  "doctrine/annotations", "doctrine/cache", "doctrine/collections",
  "doctrine/common", "doctrine/event-manager", "doctrine/inflector",
  "doctrine/instantiator", "doctrine/lexer", "doctrine/persistence",
  // Laravel internals
  "illuminate/support", "illuminate/contracts", "illuminate/collections",
  "illuminate/conditionable", "illuminate/macroable", "illuminate/pipeline",
  "illuminate/container", "illuminate/events", "illuminate/bus",
  // Misc common utility packages
  "nesbot/carbon", "ramsey/uuid", "league/commonmark",
  "nikic/php-parser", "phpoption/phpoption", "graham-campbell/result-type",
  "webmozart/assert", "brick/math",
  "dragonmantank/cron-expression",
  "egulias/email-validator",
  "dflydev/dot-access-data",
  "nunomaduro/termwind", "nunomaduro/collision",
  "laravel/serializable-closure", "laravel/prompts",
  "laravel/tinker",
]);

const NOISE_PREFIXES = ["ext-", "symfony/polyfill-"];

const FRAMEWORK_PACKAGES = new Set([
  "laravel/framework",
  "symfony/framework-bundle", "symfony/symfony",
  "slim/slim", "slim/psr7",
  "codeigniter4/framework",
  "cakephp/cakephp",
  "yiisoft/yii2",
]);

// ---------------------------------------------------------------------------
// PhpAdapter
// ---------------------------------------------------------------------------

export class PhpAdapter implements EcosystemAdapter {
  ecosystem = "php" as const;

  getFilePatterns(): EcosystemFilePatterns {
    const patterns = ECOSYSTEM_PATTERNS.php;
    return {
      sourceExtensions: patterns.sourceExtensions,
      ignoreDirs: patterns.ignoreDirs,
      manifestFiles: ["composer.json"],
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
    const composerPath = join(projectPath, "composer.json");
    const raw = await readFile(composerPath, "utf-8");
    const json = JSON.parse(raw) as Record<string, unknown>;

    const projectName = (json.name as string) ?? projectPath.split("/").pop() ?? "unknown";
    const projectVersion = (json.version as string) ?? "0.0.0";

    const require = (json.require ?? {}) as Record<string, string>;
    const requireDev = (json["require-dev"] ?? {}) as Record<string, string>;

    // Separate PHP engine constraint and ext-* extensions
    const engines: Record<string, string> = {};
    const dependencies: Record<string, string> = {};

    for (const [name, version] of Object.entries(require)) {
      if (name === "php") {
        engines.php = version;
      } else if (name.startsWith("ext-")) {
        // Track notable extensions (not all — just the ones that signal tech choices)
        const notable = ["ext-redis", "ext-mongodb", "ext-imagick", "ext-gd", "ext-swoole", "ext-grpc", "ext-amqp"];
        if (notable.includes(name)) {
          engines[name] = version;
        }
      } else {
        dependencies[name] = version;
      }
    }

    // Scripts from composer.json — use `composer <name>` as key
    const scripts: Record<string, string> = {};
    const composerScripts = (json.scripts ?? {}) as Record<string, unknown>;
    for (const [name, cmd] of Object.entries(composerScripts)) {
      // Skip hook scripts (post-install-cmd, pre-update-cmd, etc.)
      if (name.startsWith("post-") || name.startsWith("pre-")) continue;
      if (typeof cmd === "string") {
        scripts[`composer ${name}`] = cmd;
      } else if (Array.isArray(cmd)) {
        // Filter out @-references and class methods for display, keep shell commands
        const shellCmds = (cmd as unknown[]).filter(c => typeof c === "string" && !String(c).startsWith("@"));
        if (shellCmds.length > 0) {
          scripts[`composer ${name}`] = shellCmds.join(" && ");
        }
      }
    }

    // Detect artisan (Laravel) and add common commands
    if (await fileExists(join(projectPath, "artisan"))) {
      scripts["php artisan serve"] = "Start development server";
      scripts["php artisan migrate"] = "Run database migrations";
      scripts["php artisan test"] = "Run tests";
      scripts["php artisan tinker"] = "Interactive REPL";
    }

    // Detect Symfony console
    if (await fileExists(join(projectPath, "bin", "console"))) {
      scripts["php bin/console server:start"] = "Start development server";
      scripts["php bin/console cache:clear"] = "Clear cache";
      scripts["php bin/console doctrine:migrations:migrate"] = "Run migrations";
      scripts["php bin/console debug:router"] = "Show routes";
    }

    return {
      projectName,
      projectVersion,
      dependencies,
      devDependencies: requireDev,
      peerDependencies: {},
      scripts,
      engines,
      packageManager: "composer",
      workspaces: null,
    };
  }

  detectFramework(
    deps: Deps,
    devDeps: Deps,
    structure: StructureInfo,
  ): FrameworkInfo | null {
    // Laravel — check for variant
    if (has("laravel/framework", deps, devDeps)) {
      const version = ver("laravel/framework", deps, devDeps) ?? "unknown";
      let variant: string | undefined;

      // Detect variant: API-only vs full-stack with Inertia vs Livewire vs Blade
      if (has("inertiajs/inertia-laravel", deps, devDeps)) {
        variant = "inertia";
      } else if (has("livewire/livewire", deps, devDeps)) {
        variant = "livewire";
      }

      return { name: "laravel", version, variant };
    }

    // Symfony — check for variant
    if (has("symfony/framework-bundle", deps, devDeps) || has("symfony/symfony", deps, devDeps)) {
      const version = ver("symfony/framework-bundle", deps, devDeps)
        ?? ver("symfony/symfony", deps, devDeps) ?? "unknown";
      let variant: string | undefined;

      if (has("api-platform/core", deps, devDeps)) {
        variant = "api-platform";
      } else if (has("twig/twig", deps, devDeps)) {
        variant = "full-stack";
      } else {
        variant = "api";
      }

      return { name: "symfony", version, variant };
    }

    // Other frameworks
    const others: Array<{ pkg: string; name: string }> = [
      { pkg: "slim/slim", name: "slim" },
      { pkg: "codeigniter4/framework", name: "codeigniter" },
      { pkg: "cakephp/cakephp", name: "cakephp" },
      { pkg: "yiisoft/yii2", name: "yii2" },
    ];

    for (const fw of others) {
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

      const versionPkg = rule.versionFrom ?? matchingPkgs[0];
      recognized[rule.name] = {
        name: rule.name,
        version: ver(versionPkg, deps, devDeps),
        category: rule.category,
      };

      for (const p of rule.packages) {
        if (p in all) matchedPackages.add(p);
      }
    }

    // Mark framework packages
    for (const fwPkg of FRAMEWORK_PACKAGES) {
      if (fwPkg in all) matchedPackages.add(fwPkg);
    }

    const unrecognized: string[] = [];
    for (const pkg of Object.keys(all)) {
      if (matchedPackages.has(pkg)) continue;
      if (NOISE_EXACT.has(pkg)) continue;
      if (NOISE_PREFIXES.some(prefix => pkg.startsWith(prefix))) continue;
      unrecognized.push(pkg);
    }

    return { recognized, unrecognized };
  }
}
