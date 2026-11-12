import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import { ListItemBase$PressEvent } from "sap/m/ListItemBase";
import BaseController from "./BaseController";
import { loadSubjects, loadSubjectIndex, Subject, TopicRef } from "../model/DataRepository";
import * as Formatter from "../model/Formatter";

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
    this.getRouter().getRoute("subject")?.attachPatternMatched(this.onRouteMatched, this);
  }

  private onRouteMatched(event: Route$PatternMatchedEvent): void {
    const { subjectId } = event.getParameter("arguments") as SubjectRouteArgs;
    this.subjectId = subjectId;

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
}
