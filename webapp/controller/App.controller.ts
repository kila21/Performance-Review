import JSONModel from "sap/ui/model/json/JSONModel";
import { IconTabBar$SelectEvent } from "sap/m/IconTabBar";
import { Link$PressEvent } from "sap/m/Link";
import BaseController, { Crumb } from "./BaseController";
import { loadSubjects, Subject } from "../model/DataRepository";

/**
 * @namespace performance.review.controller
 */
export default class App extends BaseController {
  public onInit(): void {
    const appViewModel = new JSONModel({
      subjectId: "",
      crumbs: [],
      title: "",
      position: ""
    });
    this.getOwnerComponent()?.setModel(appViewModel, "appView");

    loadSubjects().then((subjectsModel) => {
      this.getView()?.setModel(subjectsModel, "subjects");
    });

    const router = this.getRouter();

    router.getRoute("root")?.attachPatternMatched(this.onRootMatched, this);

    router.attachRoutePatternMatched((event) => {
      const args = event.getParameter("arguments") as { subjectId?: string };
      if (args.subjectId) {
        appViewModel.setProperty("/subjectId", args.subjectId);
      }
    }, this);

    // A hash that matches no route at all (e.g. too many/too few segments).
    router.attachBypassed(() => this.showNotFound(), this);
  }

  private onRootMatched(): void {
    loadSubjects().then((subjectsModel) => {
      const subjects = subjectsModel.getData() as Subject[];
      if (subjects.length > 0) {
        this.navTo("subject", { subjectId: subjects[0].id }, true);
      }
    });
  }

  public onSubjectSelect(event: IconTabBar$SelectEvent): void {
    const subjectId = event.getParameter("key");
    if (subjectId) {
      this.navTo("subject", { subjectId });
    }
  }

  public onCrumbPress(event: Link$PressEvent): void {
    const crumb = event.getSource().getBindingContext("appView")?.getObject() as Crumb;
    if (crumb.topicId) {
      this.navTo("topic", { subjectId: crumb.subjectId, topicId: crumb.topicId });
    } else {
      this.navTo("subject", { subjectId: crumb.subjectId });
    }
  }
}
