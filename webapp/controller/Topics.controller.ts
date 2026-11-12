import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import { ListItemBase$PressEvent } from "sap/m/ListItemBase";
import SearchField, {
  SearchField$LiveChangeEvent,
  SearchField$SearchEvent,
  SearchField$SuggestEvent
} from "sap/m/SearchField";
import JSONModel from "sap/ui/model/json/JSONModel";
import BaseController from "./BaseController";
import { loadSubjects, loadSubjectIndex, Subject, TopicRef } from "../model/DataRepository";
import * as Formatter from "../model/Formatter";
import { search, SearchResult } from "../model/Search";
import { loadSearchIndex } from "../model/SearchIndex";

/** A search result shaped for the suggestion list and the results list. */
interface SearchRow {
  key: string;
  topicId: string;
  questionId: string;
  title: string;
  topicTitle: string;
  /** Text around the hit; empty when the match is in the title. */
  snippet: string;
  icon: string;
}

const MAX_SUGGESTIONS = 8;

interface SubjectRouteArgs {
  subjectId: string;
}

/**
 * @namespace performance.review.controller
 */
export default class Topics extends BaseController {
  public formatter = Formatter;

  private subjectId = "";

  public onInit(): void {
    this.getView()?.setModel(new JSONModel(this.emptySearchState()), "search");
    this.getRouter().getRoute("subject")?.attachPatternMatched(this.onRouteMatched, this);
  }

  private onRouteMatched(event: Route$PatternMatchedEvent): void {
    const { subjectId } = event.getParameter("arguments") as SubjectRouteArgs;
    this.subjectId = subjectId;
    this.resetSearch();

    loadSubjects().then((subjectsModel) => {
      const subjects = subjectsModel.getData() as Subject[];
      const subject = subjects.find((s) => s.id === subjectId);
      if (!subject) {
        this.showNotFound();
        return;
      }

      // The subject's title is already known here, independent of whether the
      // index file below also happens to load successfully.
      this.setHeader([], subject.title);

      loadSubjectIndex(subjectId)
        .then((indexModel) => {
          this.getView()?.setModel(indexModel, "index");
          this.getView()?.bindElement({ path: "/", model: "index" });
        })
        .catch(() => this.showNotFound());
    });
  }

  public onTopicPress(event: ListItemBase$PressEvent): void {
    const topic = event.getSource().getBindingContext("index")?.getObject() as TopicRef;
    this.navTo("topic", { subjectId: this.subjectId, topicId: topic.id });
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  /** Typing: show the best matches (question titles first) as suggestions. */
  public onSuggest(event: SearchField$SuggestEvent): void {
    const field = event.getSource();
    const query = event.getParameter("suggestValue") ?? "";
    this.runSearch(query).then((rows) => {
      // Ignore answers for a query the user has already typed past.
      if (field.getValue() !== query) {
        return;
      }
      this.getSearchModel().setProperty("/suggestions", rows.slice(0, MAX_SUGGESTIONS));
      field.suggest();
    });
  }

  /** Enter / search icon: open a picked suggestion, otherwise list every match. */
  public onSearch(event: SearchField$SearchEvent): void {
    const picked = event.getParameter("suggestionItem");
    if (picked) {
      const [topicId, questionId] = picked.getKey().split("/");
      this.openQuestion(topicId, questionId);
      return;
    }

    const query = event.getParameter("query") ?? "";
    if (event.getParameter("clearButtonPressed") || !query.trim()) {
      this.hideResults();
      return;
    }

    this.runSearch(query).then((rows) => {
      const model = this.getSearchModel();
      model.setProperty("/results", rows);
      model.setProperty("/resultsHeader", this.getText("searchResultsTitle").replace("{0}", String(rows.length)));
      model.setProperty("/resultsVisible", true);
    });
  }

  public onSearchLiveChange(event: SearchField$LiveChangeEvent): void {
    if (!(event.getParameter("newValue") ?? "").trim()) {
      this.hideResults();
    }
  }

  public onSearchResultPress(event: ListItemBase$PressEvent): void {
    const row = event.getSource().getBindingContext("search")?.getObject() as SearchRow;
    this.openQuestion(row.topicId, row.questionId);
  }

  private runSearch(query: string): Promise<SearchRow[]> {
    return loadSearchIndex(this.subjectId)
      .then((entries) => search(entries, query).map((result) => this.toRow(result)))
      .catch(() => []);
  }

  private toRow(result: SearchResult): SearchRow {
    const inTitle = result.matchedIn === "title";
    return {
      key: `${result.topicId}/${result.questionId}`,
      topicId: result.topicId,
      questionId: result.questionId,
      title: result.title,
      topicTitle: result.topicTitle,
      snippet: result.snippet,
      icon: inTitle ? "sap-icon://question-mark" : "sap-icon://document-text"
    };
  }

  private openQuestion(topicId: string, questionId: string): void {
    this.navTo("question", { subjectId: this.subjectId, topicId, questionId });
  }

  private hideResults(): void {
    const model = this.getSearchModel();
    model.setProperty("/results", []);
    model.setProperty("/resultsVisible", false);
  }

  private resetSearch(): void {
    this.getSearchModel().setData(this.emptySearchState());
    (this.byId("questionSearch") as SearchField | undefined)?.setValue("");
  }

  private emptySearchState(): object {
    return { suggestions: [], results: [], resultsVisible: false, resultsHeader: "" };
  }

  private getSearchModel(): JSONModel {
    return this.getView()?.getModel("search") as JSONModel;
  }
}
