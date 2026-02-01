import type { RepoAnalysis } from "../types.js";
import { resolveAndFetch } from "./client.js";
import { TECH_QUERIES } from "./queries.js";

export interface FetchedDocs {
  techDocs: Record<string, string>;
  crossDocs: Record<string, string>;
  metadata: {
    techCount: number;
    snippetCount: number;
    failedTechs: string[];
    warning?: string;
  };
}

/** Collect all detected tech identifiers from analysis */
function collectTechs(analysis: RepoAnalysis): string[] {
  const techs: string[] = [];

  if (analysis.framework) {
    techs.push(analysis.framework.name);
  }

  const d = analysis.detected;
  const fields: (keyof typeof d)[] = [
    "orm", "auth", "validation", "css", "testing",
    "stateManagement", "dataFetching", "formLibrary", "apiStyle",
    "i18n", "payments", "realtime", "email", "cms", "jobs",
    "uiComponents",
  ];

  for (const field of fields) {
    const value = d[field];
    if (typeof value === "string") {
      techs.push(value);
    }
  }

  return [...new Set(techs)];
}

/** Run promises with concurrency limit */
async function pMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function next(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => next());
  await Promise.all(workers);
  return results;
}

export async function fetchAllDocs(analysis: RepoAnalysis): Promise<FetchedDocs> {
  const techs = collectTechs(analysis);
  const techDocs: Record<string, string> = {};
  const crossDocs: Record<string, string> = {};
  const failedTechs: string[] = [];
  let snippetCount = 0;

  // Fetch per-tech docs
  const techTasks = techs
    .filter((t) => t in TECH_QUERIES)
    .map((tech) => ({
      tech,
      query: TECH_QUERIES[tech],
    }));

  await pMap(
    techTasks,
    async ({ tech, query }) => {
      const allQueries = query.queries.join(". ");
      const docs = await resolveAndFetch(query.libraryName, allQueries);
      if (docs) {
        techDocs[tech] = docs;
        snippetCount++;
      } else {
        failedTechs.push(tech);
      }
    },
    5
  );

  // Fetch cross-tech docs
  const crossTasks: { key: string; libraryName: string; query: string }[] = [];

  for (const tech of techs) {
    const mapping = TECH_QUERIES[tech];
    if (!mapping?.crossQueries) continue;

    for (const [otherTech, crossQuery] of Object.entries(mapping.crossQueries)) {
      if (techs.includes(otherTech)) {
        const key = `${tech}+${otherTech}`;
        const reverseKey = `${otherTech}+${tech}`;
        if (!(reverseKey in crossDocs) && !crossTasks.some((t) => t.key === reverseKey)) {
          crossTasks.push({ key, libraryName: mapping.libraryName, query: crossQuery });
        }
      }
    }
  }

  await pMap(
    crossTasks,
    async ({ key, libraryName, query }) => {
      const docs = await resolveAndFetch(libraryName, query);
      if (docs) {
        crossDocs[key] = docs;
        snippetCount++;
      }
    },
    5
  );

  // Track techs with no mapping at all
  for (const tech of techs) {
    if (!(tech in TECH_QUERIES) && !failedTechs.includes(tech)) {
      failedTechs.push(tech);
    }
  }

  return {
    techDocs,
    crossDocs,
    metadata: {
      techCount: Object.keys(techDocs).length,
      snippetCount,
      failedTechs,
      ...(failedTechs.length > 0 && {
        warning: `No documentation found for: ${failedTechs.join(", ")}`,
      }),
    },
  };
}
