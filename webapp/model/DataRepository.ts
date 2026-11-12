import JSONModel from "sap/ui/model/json/JSONModel";

export interface Subject {
  id: string;
  title: string;
}

export interface TopicResource {
  type: string;
  title: string;
  url: string;
}

export interface TopicRef {
  id: string;
  title: string;
  file: string;
  questionCount: number;
  resources: TopicResource[];
}

export interface TopicGroup {
  id: string;
  title: string;
  topics: TopicRef[];
}

export interface SubjectIndex {
  id: string;
  title: string;
  groups: TopicGroup[];
}

const DATA_ROOT = sap.ui.require.toUrl("performance/review/model/data");

async function fetchJsonModel(url: string): Promise<JSONModel> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load "${url}" (${response.status})`);
  }
  const model = new JSONModel();
  model.setData(await response.json());
  return model;
}

let subjectsPromise: Promise<JSONModel> | undefined;

/** Loads subjects.json once; every later call reuses the same cached promise. */
export function loadSubjects(): Promise<JSONModel> {
  if (!subjectsPromise) {
    subjectsPromise = fetchJsonModel(`${DATA_ROOT}/subjects.json`).catch((error) => {
      subjectsPromise = undefined;
      throw error;
    });
  }
  return subjectsPromise;
}

const indexCache = new Map<string, Promise<JSONModel>>();

/** Loads a subject's index.json once per subjectId; cached for the lifetime of the app. */
export function loadSubjectIndex(subjectId: string): Promise<JSONModel> {
  let promise = indexCache.get(subjectId);
  if (!promise) {
    promise = fetchJsonModel(`${DATA_ROOT}/${subjectId}/index.json`).catch((error) => {
      indexCache.delete(subjectId);
      throw error;
    });
    indexCache.set(subjectId, promise);
  }
  return promise;
}

const topicCache = new Map<string, Promise<JSONModel>>();

/** Loads a topic's question file once per subjectId/file; cached so the same file is never fetched twice. */
export function loadTopicModel(subjectId: string, file: string): Promise<JSONModel> {
  const key = `${subjectId}/${file}`;
  let promise = topicCache.get(key);
  if (!promise) {
    promise = fetchJsonModel(`${DATA_ROOT}/${subjectId}/${file}`).catch((error) => {
      topicCache.delete(key);
      throw error;
    });
    topicCache.set(key, promise);
  }
  return promise;
}

export function findTopicRef(index: SubjectIndex, topicId: string): TopicRef | undefined {
  for (const group of index.groups) {
    const found = group.topics.find((topic) => topic.id === topicId);
    if (found) {
      return found;
    }
  }
  return undefined;
}
