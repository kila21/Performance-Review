import { loadSubjectIndex, loadTopicModel, SubjectIndex } from "./DataRepository";
import { RawQuestion, SearchEntry, toSearchEntry } from "./Search";

const cache = new Map<string, Promise<SearchEntry[]>>();

/**
 * Loads every topic file of a subject (in parallel, through the cached loaders in
 * DataRepository) and flattens all questions into search entries. Built once per
 * subject; a topic file that fails to load is skipped instead of failing the search.
 */
export function loadSearchIndex(subjectId: string): Promise<SearchEntry[]> {
  let promise = cache.get(subjectId);
  if (!promise) {
    promise = buildIndex(subjectId).catch((error) => {
      cache.delete(subjectId);
      throw error;
    });
    cache.set(subjectId, promise);
  }
  return promise;
}

async function buildIndex(subjectId: string): Promise<SearchEntry[]> {
  const index = (await loadSubjectIndex(subjectId)).getData() as SubjectIndex;
  const topics = index.groups.flatMap((group) => group.topics);

  const perTopic = await Promise.all(
    topics.map(async (topic) => {
      try {
        const model = await loadTopicModel(subjectId, topic.file);
        const questions = (model.getData() as { questions?: RawQuestion[] }).questions ?? [];
        return questions.map((q) => toSearchEntry(topic.id, topic.title, q));
      } catch {
        return [];
      }
    })
  );
  return perTopic.flat();
}
