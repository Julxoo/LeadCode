import { analyzeDependencies } from "./dist/analyzers/dependencies.js";
import { analyzeStructure } from "./dist/analyzers/structure.js";
import { detectFramework, detectStack } from "./dist/analyzers/detection.js";
import { analyzePatterns } from "./dist/analyzers/patterns.js";
import { resolveAndFetch, TECH_QUERIES } from "./dist/context7/index.js";
import { generateClaudeMd } from "./dist/templates/claude-md.js";
import { writeFileSync } from "fs";

const projectPath = "/Users/julestoussenel/code/personel/portfolio";

// Step 1: analyze
const pkg = await analyzeDependencies(projectPath);
const structure = await analyzeStructure(projectPath);
const framework = detectFramework(pkg.dependencies, pkg.devDependencies, structure);
const detected = detectStack(pkg.dependencies, pkg.devDependencies);
detected.runtime = structure.detectedRuntime;
const patterns = await analyzePatterns(projectPath);
const analysis = { projectPath, projectName: pkg.name, framework, dependencies: pkg.dependencies, devDependencies: pkg.devDependencies, scripts: pkg.scripts, structure, detected };

// Step 2: fetch docs
const techs = [];
if (analysis.framework) techs.push(analysis.framework.name);
const fields = ["orm","auth","validation","css","testing","stateManagement","dataFetching","formLibrary","apiStyle","i18n","payments","realtime","email","cms","jobs","uiComponents"];
for (const f of fields) {
  const val = detected[f];
  if (typeof val === "string") techs.push(val);
}
const uniqueTechs = [...new Set(techs)];
console.log("Techs to fetch:", uniqueTechs);

const techDocs = {};
const crossDocs = {};
const failedTechs = [];

for (const tech of uniqueTechs) {
  const mapping = TECH_QUERIES[tech];
  if (mapping === undefined) { failedTechs.push(tech); continue; }
  console.log(`Fetching ${tech} (${mapping.libraryName})...`);
  const docs = await resolveAndFetch(mapping.libraryName, mapping.queries.join(". "));
  if (docs) {
    techDocs[tech] = docs;
    console.log(`  -> ${docs.length} chars`);
  } else {
    failedTechs.push(tech);
    console.log(`  -> FAILED`);
  }
}

for (const tech of uniqueTechs) {
  const mapping = TECH_QUERIES[tech];
  if (mapping === undefined || mapping.crossQueries === undefined) continue;
  for (const [other, query] of Object.entries(mapping.crossQueries)) {
    if (uniqueTechs.indexOf(other) === -1) continue;
    const key = tech + "+" + other;
    const rev = other + "+" + tech;
    if (crossDocs[key] || crossDocs[rev]) continue;
    console.log(`Fetching cross: ${key}...`);
    const docs = await resolveAndFetch(mapping.libraryName, query);
    if (docs) {
      crossDocs[key] = docs;
      console.log(`  -> ${docs.length} chars`);
    }
  }
}

const fetchedDocs = {
  techDocs,
  crossDocs,
  metadata: { techCount: Object.keys(techDocs).length, snippetCount: Object.keys(techDocs).length + Object.keys(crossDocs).length, failedTechs }
};

console.log("\nSummary:");
console.log("Tech docs:", Object.keys(techDocs));
console.log("Cross docs:", Object.keys(crossDocs));
console.log("Failed:", failedTechs);

// Step 3: generate
const content = generateClaudeMd(analysis, fetchedDocs, {}, patterns);
writeFileSync(projectPath + "/CLAUDE.md", content, "utf-8");
console.log("\nCLAUDE.md written, length:", content.length, "chars");
