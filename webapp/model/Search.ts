/**
 * Pure search logic over all questions of a subject. No UI5 dependencies, so it
 * can be unit-tested in plain Node. Loading the entries lives in SearchIndex.ts.
 */

export type MatchField = "title" | "description" | "keyPoints" | "examples" | "assignment";

export interface SearchEntry {
  topicId: string;
  topicTitle: string;
  questionId: string;
  title: string;
  /** Original text per field (for snippets). */
  fields: Record<Exclude<MatchField, "title">, string>;
}

export interface SearchResult {
  topicId: string;
  topicTitle: string;
  questionId: string;
  title: string;
  matchedIn: MatchField;
  /** Text around the first hit; empty for title matches. */
  snippet: string;
}

export interface RawQuestion {
  id: string;
  title: string;
  description?: string;
  keyPoints?: string[];
  examples?: { title?: string; code?: string }[];
  assignment?: { task?: string; starterCode?: string; solution?: string } | null;
}

/** Builds a search entry from one question of a topic file. */
export function toSearchEntry(topicId: string, topicTitle: string, q: RawQuestion): SearchEntry {
  return {
    topicId,
    topicTitle,
    questionId: q.id,
    title: q.title,
    fields: {
      description: q.description ?? "",
      keyPoints: (q.keyPoints ?? []).join("\n"),
      examples: (q.examples ?? []).map((e) => `${e.title ?? ""}\n${e.code ?? ""}`).join("\n"),
      assignment: q.assignment ? [q.assignment.task, q.assignment.starterCode].filter(Boolean).join("\n") : ""
    }
  };
}

const FIELD_ORDER: Exclude<MatchField, "title">[] = ["description", "keyPoints", "examples", "assignment"];
const MIN_QUERY_LENGTH = 2;
const SNIPPET_RADIUS = 40;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

interface Hit {
  /** Index in the normalized text where the first query word / phrase was found. */
  index: number;
  length: number;
  phrase: boolean;
}

/** Phrase match first; otherwise every word must appear somewhere (AND). */
function findHit(haystack: string, phrase: string, words: string[]): Hit | null {
  const phraseIndex = haystack.indexOf(phrase);
  if (phraseIndex !== -1) {
    return { index: phraseIndex, length: phrase.length, phrase: true };
  }
  if (words.length < 2 || !words.every((w) => haystack.includes(w))) {
    return null;
  }
  return { index: haystack.indexOf(words[0]), length: words[0].length, phrase: false };
}

function isWordStart(text: string, index: number): boolean {
  return index === 0 || !/[a-z0-9_$]/.test(text[index - 1]);
}

function makeSnippet(original: string, hit: Hit): string {
  const text = original.replace(/\s+/g, " ").trim();
  const hitEnd = hit.index + hit.length;
  let start = Math.max(0, hit.index - SNIPPET_RADIUS);
  let end = Math.min(text.length, hitEnd + SNIPPET_RADIUS);
  // Don't cut words in half at the edges -- but never trim into the hit itself.
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space !== -1 && space < hit.index) {
      start = space + 1;
    }
  }
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space >= hitEnd) {
      end = space;
    }
  }
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

/**
 * Ranked search. Tiers: title phrase, title all-words, description, key points,
 * examples, assignment. Inside the title tiers, matches at a word start win;
 * otherwise the original data order is kept.
 */
export function search(entries: SearchEntry[], query: string, limit = Infinity): SearchResult[] {
  const phrase = normalize(query ?? "");
  if (phrase.length < MIN_QUERY_LENGTH) {
    return [];
  }
  const words = phrase.split(" ");

  const scored: { result: SearchResult; score: number; order: number }[] = [];
  entries.forEach((entry, order) => {
    const titleHit = findHit(normalize(entry.title), phrase, words);
    if (titleHit) {
      const tier = titleHit.phrase ? 0 : 1;
      const wordStart = isWordStart(normalize(entry.title), titleHit.index) ? 0 : 0.5;
      scored.push({
        result: { ...pick(entry), matchedIn: "title", snippet: "" },
        score: tier + wordStart,
        order
      });
      return;
    }

    for (let i = 0; i < FIELD_ORDER.length; i++) {
      const field = FIELD_ORDER[i];
      const original = entry.fields[field];
      const hit = original ? findHit(normalize(original), phrase, words) : null;
      if (hit) {
        scored.push({
          result: { ...pick(entry), matchedIn: field, snippet: makeSnippet(original, hit) },
          score: 2 + i + (hit.phrase ? 0 : 0.5),
          order
        });
        return;
      }
    }
  });

  return scored
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .slice(0, limit)
    .map((s) => s.result);
}

function pick(entry: SearchEntry): Omit<SearchResult, "matchedIn" | "snippet"> {
  return {
    topicId: entry.topicId,
    topicTitle: entry.topicTitle,
    questionId: entry.questionId,
    title: entry.title
  };
}
