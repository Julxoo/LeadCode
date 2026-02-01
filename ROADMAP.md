# LeadCode — Roadmap

## V1 — Setup projet existant (current)

Analyse un projet existant, génère un CLAUDE.md concis avec des conventions actionnables.

**Flow :** `analyze-repo → Context7 → WebSearch → synthèse Claude → generate-claude-md`

**Ce qui est fait :**
- Détection du stack complet (framework, ORM, auth, CSS, testing, state, i18n, payments, etc.)
- Analyse des patterns du code (ratio client/server, path aliases, barrel files)
- Docs officielles via Context7 (conventions par tech)
- Best practices communautaires via WebSearch (architecture, gotchas, breaking changes)
- Synthèse cross-stack unifiée (comment toutes les techs fonctionnent ensemble)
- Template CLAUDE.md compact et structuré selon les guidelines Anthropic
- Resource MCP tech-queries (mapping tech → Context7 queries)
- Prompts : setup-project, update-project, validate-project
- i18n (FR/EN)

---

## V2 — Enrichissement docs/ (next)

Génère un dossier `docs/` avec des best practices approfondies par tech, en plus du CLAUDE.md.

**Principe :** Le CLAUDE.md reste court (~100-150 lignes, règles essentielles). Les docs détaillées vont dans `docs/` — Claude les lit à la demande (progressive disclosure).

**Structure cible :**
```
CLAUDE.md                  ← règles essentielles, compact
docs/
  architecture.md          ← structure projet, patterns, décisions
  next.md                  ← conventions Next.js approfondies
  prisma.md                ← conventions ORM approfondies
  styling.md               ← Tailwind + shadcn conventions
  testing.md               ← stratégie de test, patterns
  ...
```

**Ce qu'il faut faire :**
- Nouveau tool `generate-docs` qui crée le dossier docs/
- Queries Context7 + WebSearch plus approfondies (exemples de code, patterns avancés, anti-patterns)
- Le CLAUDE.md pointe vers docs/ : "Pour les conventions détaillées de Next.js, voir docs/next.md"
- Chaque doc fait ~200-400 lignes avec des exemples concrets
- update-project régénère aussi les docs/

---

## V3 — Setup nouveau projet (future)

Aide à bootstrapper un nouveau projet from scratch : recommandations de stack, scaffolding, configuration initiale.

**Flow :**
```
User : "je veux créer un SaaS avec auth, payments, i18n"
  ↓
LeadCode recommande un stack (Next.js + Prisma + Stripe + next-intl + ...)
  ↓
Context7 + WebSearch : best practices pour ce stack en 2026
  ↓
Génère : CLAUDE.md + docs/ + structure de dossiers recommandée
  ↓
Optionnel : scaffold les fichiers de config (next.config, tailwind, prisma schema, etc.)
```

**Ce qu'il faut faire :**
- Nouveau tool `recommend-stack` : prend les besoins utilisateur, recommande un stack
- Nouveau prompt `create-project` : orchestre le flow complet
- Templates de scaffold par stack (Next.js + Prisma, Next.js + Drizzle, etc.)
- Le CLAUDE.md généré inclut les conventions dès le départ
- Les docs/ sont générées avec les patterns recommandés pour ce stack

---

## Idées futures (non planifiées)

- **Auto-update** : hook post-install qui détecte les changements de deps et propose de mettre à jour le CLAUDE.md
- **Monorepo** : support des workspaces (un CLAUDE.md par package + un root)
- **Custom rules** : l'utilisateur peut ajouter ses propres règles qui survivent aux régénérations
- **Team conventions** : import de conventions d'équipe depuis un repo partagé
- **CI integration** : validate-claude-md dans la CI pour détecter les drifts
