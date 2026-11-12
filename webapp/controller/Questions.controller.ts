import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import { ListItemBase$PressEvent } from "sap/m/ListItemBase";
import JSONModel from "sap/ui/model/json/JSONModel";
import BaseController from "./BaseController";
import {
  loadSubjects,
  loadSubjectIndex,
  loadTopicModel,
  findTopicRef,
  Subject,
  SubjectIndex
} from "../model/DataRepository";

interface TopicRouteArgs {
  subjectId: string;
  topicId: string;
}

interface Question {
  id: string;
}

/**
 * @namespace performance.review.controller
 */
export default class Questions extends BaseController {
  private subjectId = "";
  private topicId = "";

  public onInit(): void {
    this.getRouter().getRoute("topic")?.attachPatternMatched(this.onRouteMatched, this);
  }

  private onRouteMatched(event: Route$PatternMatchedEvent): void {
    const { subjectId, topicId } = event.getParameter("arguments") as TopicRouteArgs;
    this.subjectId = subjectId;
    this.topicId = topicId;

    loadSubjects().then((subjectsModel) => {
      const subjects = subjectsModel.getData() as Subject[];
      const subject = subjects.find((s) => s.id === subjectId);
      if (!subject) {
        this.showNotFound();
        return;
      }

      loadSubjectIndex(subjectId)
        .then((indexModel) => {
          const index = indexModel.getData() as SubjectIndex;
          const topicRef = findTopicRef(index, topicId);
          if (!topicRef) {
            this.showNotFound();
            return;
          }

          // The topic's title is already known from the index, so the breadcrumb/title
          // can be set right away -- it must not depend on whether the question file
          // below also happens to load successfully.
          this.getView()?.setModel(new JSONModel(topicRef), "topicMeta");
          this.setHeader([{ text: subject.title, subjectId }], topicRef.title);

          loadTopicModel(subjectId, topicRef.file)
            .then((topicModel) => {
              this.getView()?.setModel(topicModel, "topic");
              this.getView()?.bindElement({ path: "/", model: "topic" });
            })
            .catch(() => {
              this.getView()?.setModel(new JSONModel({ questions: [] }), "topic");
              this.getView()?.bindElement({ path: "/", model: "topic" });
            });
        })
        .catch(() => this.showNotFound());
    });
  }

  public onQuestionPress(event: ListItemBase$PressEvent): void {
    const question = event.getSource().getBindingContext("topic")?.getObject() as Question;
    this.navTo("question", {
      subjectId: this.subjectId,
      topicId: this.topicId,
      questionId: question.id
    });
  }
}
