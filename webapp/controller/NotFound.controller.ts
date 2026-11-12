import BaseController from "./BaseController";
import { loadSubjects, Subject } from "../model/DataRepository";

/**
 * @namespace performance.review.controller
 */
export default class NotFound extends BaseController {
  public onBackToOverview(): void {
    loadSubjects().then((subjectsModel) => {
      const subjects = subjectsModel.getData() as Subject[];
      if (subjects.length > 0) {
        this.navTo("subject", { subjectId: subjects[0].id }, true);
      }
    });
  }
}
