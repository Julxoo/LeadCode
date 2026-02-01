const BASE_URL = "https://context7.com/api/v2";
const REQUEST_TIMEOUT = 15_000;
const MAX_RETRIES = 2;

export interface LibrarySearchResult {
  id: string;
  name: string;
  description?: string;
  totalSnippets: number;
  trustScore?: string;
  versions?: string[];
}

export interface DocSnippet {
  title: string;
  content: string;
  source: string;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  const apiKey = process.env.CONTEXT7_API_KEY;
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(url, {
        headers: getHeaders(),
        signal: controller.signal,
      });

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? "2");
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }
      }

      if (res.status === 202 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Max retries exceeded");
}

export async function searchLibrary(
  libraryName: string,
  query: string
): Promise<LibrarySearchResult[]> {
  const params = new URLSearchParams({ libraryName, query });
  const url = `${BASE_URL}/libs/search?${params}`;

  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results ?? []);
  } catch {
    return [];
  }
}

export async function fetchDocs(
  libraryId: string,
  query: string
): Promise<string> {
  const params = new URLSearchParams({ libraryId, query, type: "txt" });
  const url = `${BASE_URL}/context?${params}`;

  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

export async function resolveAndFetch(
  libraryName: string,
  query: string
): Promise<string> {
  const results = await searchLibrary(libraryName, query);
  if (results.length === 0) return "";

  // Pick best match: highest snippet count with good trust
  const best = results.sort((a, b) => b.totalSnippets - a.totalSnippets)[0];
  return fetchDocs(best.id, query);
}
