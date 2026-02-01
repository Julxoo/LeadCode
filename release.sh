#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}━━━ LeadCode Release ━━━${NC}"
echo ""

# --- Pre-flight checks ---

# Check we're on main
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo -e "${RED}Error: You must be on the main branch (currently on $BRANCH)${NC}"
  exit 1
fi

# Check working tree is clean
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Error: Working tree is not clean. Commit or stash your changes first.${NC}"
  echo ""
  git status --short
  exit 1
fi

# Check we're up to date with remote
git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ]; then
  echo -e "${RED}Error: Local branch is not in sync with origin/main. Pull or push first.${NC}"
  exit 1
fi

# Check npm login
if ! npm whoami &>/dev/null; then
  echo -e "${RED}Error: Not logged in to npm. Run 'npm login' first.${NC}"
  exit 1
fi

NPM_USER=$(npm whoami)
CURRENT_VERSION=$(node -p "require('./package.json').version")

echo -e "  npm user:        ${GREEN}$NPM_USER${NC}"
echo -e "  current version: ${GREEN}$CURRENT_VERSION${NC}"
echo -e "  branch:          ${GREEN}$BRANCH${NC}"
echo ""

# --- Build & verify ---

echo -e "${YELLOW}Building...${NC}"
npm run build
echo -e "${GREEN}Build OK${NC}"
echo ""

# --- Choose bump type ---

echo "What type of release?"
echo ""
echo "  1) patch  — bugfix, no breaking change       (0.1.1 → 0.1.2)"
echo "  2) minor  — new feature, backward compatible  (0.1.2 → 0.2.0)"
echo "  3) major  — breaking change                   (0.2.0 → 1.0.0)"
echo ""
read -p "Choose [1/2/3]: " CHOICE

case $CHOICE in
  1) BUMP="patch" ;;
  2) BUMP="minor" ;;
  3) BUMP="major" ;;
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

# Compute new version (dry run)
NEW_VERSION=$(npm version $BUMP --no-git-tag-version --dry-run 2>/dev/null | tr -d 'v')
# Reset if dry-run modified anything
git checkout -- package.json 2>/dev/null || true

echo ""
echo -e "  ${CYAN}$CURRENT_VERSION${NC} → ${GREEN}$NEW_VERSION${NC} ($BUMP)"
echo ""

# --- Confirm ---

read -p "Proceed with release v$NEW_VERSION? [y/N]: " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo ""

# --- Bump version (updates package.json, no git commit/tag) ---

npm version $BUMP --no-git-tag-version > /dev/null
echo -e "${GREEN}Version bumped to $NEW_VERSION${NC}"

# --- Update CHANGELOG ---

TODAY=$(date +%Y-%m-%d)

# Check if CHANGELOG.md exists
if [ -f "CHANGELOG.md" ]; then
  if grep -q "## \[Unreleased\]" CHANGELOG.md; then
    sed -i '' "s/## \[Unreleased\]/## [$NEW_VERSION] - $TODAY/" CHANGELOG.md
  else
    # Insert before the first ## [...] line only (using awk to avoid sed multi-match)
    awk -v ver="## [$NEW_VERSION] - $TODAY" 'BEGIN{done=0} /^## \[/ && !done {print ver; print ""; print "### Changed"; print ""; print "- TODO: describe your changes here"; print ""; done=1} {print}' CHANGELOG.md > CHANGELOG.tmp && mv CHANGELOG.tmp CHANGELOG.md
  fi
else
  echo -e "${YELLOW}No CHANGELOG.md found — skipping changelog update${NC}"
fi

# --- Let user edit changelog ---

echo ""
echo -e "${YELLOW}Opening CHANGELOG.md for you to document this release...${NC}"
echo -e "${YELLOW}Replace the TODO line with your actual changes, then save and close.${NC}"
echo ""
read -p "Press Enter to open in your editor..."

# Use EDITOR env var, fallback to vim, then nano
EDIT=${EDITOR:-${VISUAL:-vim}}
$EDIT CHANGELOG.md

# --- Rebuild (in case source changed) ---

npm run build

# --- Commit, tag, push ---

echo ""
echo -e "${YELLOW}Staging changes...${NC}"
git add package.json CHANGELOG.md

# Also stage dist/ if it's tracked
if git ls-files --error-unmatch dist/ &>/dev/null 2>&1; then
  git add dist/
fi

echo -e "${YELLOW}Creating commit...${NC}"
git commit -m "release: v$NEW_VERSION"

echo -e "${YELLOW}Creating tag v$NEW_VERSION...${NC}"
git tag "v$NEW_VERSION"

echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push origin main --tags

# --- Publish to npm ---

echo ""
echo -e "${YELLOW}Publishing to npm...${NC}"
npm publish

# --- Done ---

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Released v$NEW_VERSION successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  npm:    https://www.npmjs.com/package/leadcode"
echo -e "  github: https://github.com/Julxoo/LeadCode/releases/tag/v$NEW_VERSION"
echo ""
