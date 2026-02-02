# Roadmap : Support Multi-Ecosysteme

> LeadCode doit fonctionner quel que soit le langage/ecosysteme du projet analyse.

## Phases d'implementation

### Phase 1 : Abstraction — Interface EcosystemAdapter ✅
- [x] Creer `src/analyzers/ecosystem.ts` avec l'interface `EcosystemAdapter` et la fonction `detectEcosystem()`
- [x] Adapter `src/types.ts` : types generiques (`detectedRuntime` elargi, `schemaFiles`, `ecosystem` dans RepoAnalysis)
- [x] Adapter `src/analyzers/constants.ts` : IGNORE_DIRS et SOURCE_EXTS par ecosysteme (`ECOSYSTEM_PATTERNS`)
- [x] Adapter `src/analyzers/structure.ts` : ajouter `schemaFiles` dans le retour
- [x] Adapter `src/tools/analyze-repo.ts` : remplacer check `package.json` par `detectEcosystem()`
- [x] Build OK — zero erreurs

### Phase 2 : Refactor JS — Extraire l'adapter JavaScript ✅
- [x] Creer `src/analyzers/ecosystems/javascript.ts` (classe `JavaScriptAdapter` avec parseDependencies, detectFramework, detectStack, RULES)
- [x] Adapter `dependencies.ts` → facade qui delegue a l'adapter
- [x] Adapter `detection.ts` → facade qui delegue a l'adapter
- [x] Adapter `ecosystem.ts` → `getEcosystemAdapter("javascript")` retourne `new JavaScriptAdapter()`
- [x] Adapter `analyze-repo.ts` → utilise `getEcosystemAdapter()` au lieu d'imports directs
- [x] Build OK + tests manuels OK (adapter JS fonctionne, Python throw correctement)
- [ ] TODO Phase ulterieure : `structure.ts` checks conditionnels, `patterns.ts` patterns conditionnels

### Phase 3 : Adapter les tools et le template ✅
- [x] `src/tools/analyze-repo.ts` : deja fait en Phase 1-2
- [x] `src/tools/validate-claude-md.ts` : utilise `detectEcosystem` + `getEcosystemAdapter`
- [x] `src/templates/claude-md.ts` : `scriptPrefix()` dynamique, infra flags JS conditionnels, `schemaFiles` generique
- [x] `src/index.ts` : prompts generalises (plus de "package.json" hardcode)
- [x] Build OK

### Phase 4 : Adapter Python ✅
- [x] Installer `smol-toml` pour parser TOML
- [x] Creer `src/analyzers/ecosystems/python.ts` (`PythonAdapter`)
- [x] Parser : `pyproject.toml` (PEP 621 + Poetry), `requirements.txt`, `Pipfile`, `setup.py`
- [x] Detection package manager : poetry, uv, pipenv, pdm, pip
- [x] Detection framework : Django, Flask, FastAPI, Starlette, Litestar, Sanic, Tornado, Pyramid, Bottle, Aiohttp
- [x] Detection stack : ~60 regles (ORM, database, auth, validation, testing, API, jobs, migration, linter, formatter, type-checker, http-client, template, email, server, config, admin, middleware, caching, payments)
- [x] Enregistrer `PythonAdapter` dans `ecosystem.ts`
- [x] Build OK + test sur projet pyproject.toml FastAPI → detecte framework + 11 techs correctement
- [ ] TODO Phase ulterieure : patterns Python (print(), import style, stdlib)

### Phase 5 : Adapter Rust ✅
- [x] Creer `src/analyzers/ecosystems/rust.ts` (`RustAdapter`)
- [x] Parser : `Cargo.toml` (deps, dev-deps, build-deps, workspace, rust-version, edition)
- [x] Detection framework : Actix-web, Axum, Rocket, Warp, Tide, Poem, Hyper
- [x] Detection stack : Diesel, SeaORM, SQLx, Serde, Tokio, Clap, etc. (~35 regles)
- [x] Scripts : Makefile/justfile parsing
- [x] Categories ajoutees dans `claude-md.ts` (serialization, async-runtime, error-handling, cli, etc.)
- [x] Build OK
- [ ] TODO Phase ulterieure : patterns Rust (`println!()`, `use std::`, `crate::`, modules)

### Phase 6 : Adapter Go ✅
- [x] Creer `src/analyzers/ecosystems/go.ts` (`GoAdapter`)
- [x] Parser : `go.mod` (module, go version, require block) + `go.work` (workspaces)
- [x] Detection framework : Gin, Echo, Fiber, Chi, Gorilla/mux, httprouter
- [x] Detection stack : GORM, ent, sqlx, testify, Cobra, Viper, zap, etc. (~25 regles)
- [x] Scripts : Makefile/justfile parsing
- [x] Matching par module path (github.com/foo/bar) avec prefix matching
- [x] Build OK
- [ ] TODO Phase ulterieure : patterns Go (`fmt.Println()`, Go stdlib, package structure)

### Phase 7 : Adapter Java/Kotlin ✅
- [x] Installer `fast-xml-parser` pour pom.xml
- [x] Creer `src/analyzers/ecosystems/java.ts` (`JavaAdapter`)
- [x] Parser Maven : `pom.xml` (dependencies, dependencyManagement, properties, modules)
- [x] Parser Gradle : `build.gradle` / `build.gradle.kts` (regex) + `settings.gradle` (workspaces)
- [x] Detection framework : Spring Boot, Quarkus, Micronaut, Vert.x, Javalin
- [x] Detection stack : Hibernate, JUnit5, Mockito, Lombok, MapStruct, Jackson, Flyway, etc. (~35 regles)
- [x] Scripts : mvnw/gradlew detection + Makefile/justfile fallback
- [x] Build OK

### Phase 8 : Adapter PHP ✅
- [x] Creer `src/analyzers/ecosystems/php.ts` (`PhpAdapter`)
- [x] Parser : `composer.json` (require, require-dev, scripts, php engine)
- [x] Detection framework : Laravel, Symfony, Slim, CodeIgniter, CakePHP
- [x] Detection stack : Doctrine, Eloquent, PHPUnit, Pest, Twig, Guzzle, Monolog, etc. (~50 regles)
- [x] Build OK

### Phase 9 : Adapter Ruby
- [ ] Creer `src/analyzers/ecosystems/ruby.ts`
- [ ] Parser : `Gemfile`, `*.gemspec`
- [ ] Detection framework : Rails, Sinatra, Hanami, Grape
- [ ] Detection stack : ActiveRecord, RSpec, Sidekiq, Devise, etc. (~25 regles)

### Phase 10 : Projets multi-ecosysteme
- [ ] Support des projets hybrides (ex: frontend JS + backend Python)
- [ ] Fusion des analyses de plusieurs adapters dans un seul `RepoAnalysis`
- [ ] Cross-stack conventions multi-langage dans le template

## Notes
- Chaque phase est implementable independamment
- Phase 1-3 = fondations, phase 4+ = ajout d'ecosystemes
- Apres chaque phase : build + verification que le JS existant ne regresse pas
