import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import Router from "sap/ui/core/routing/Router";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";

export interface Crumb {
  text: string;
  subjectId: string;
  topicId?: string;
}

export interface QuestionRouteArgs {
  subjectId: string;
  topicId: string;
  questionId: string;
}

/** Previous / next question of the current one; null at either end of the topic. */
export interface QuestionNav {
  previous: QuestionRouteArgs | null;
  next: QuestionRouteArgs | null;
}

/**
 * @namespace performance.review.controller
 */
export default abstract class BaseController extends Controller {
  protected getRouter(): Router {
    return UIComponent.getRouterFor(this);
  }

  protected navTo(routeName: string, parameters?: Record<string, string>, replace = false): void {
    const router = this.getRouter();
    if (!router.getRoute(routeName)) {
      console.warn(`Route "${routeName}" is not defined yet.`);
      return;
    }
    router.navTo(routeName, parameters, replace);
  }

  protected getAppViewModel(): JSONModel {
    return this.getOwnerComponent()?.getModel("appView") as JSONModel;
  }

  /** `position` is an optional counter shown at the right of the header, e.g. "3 / 6". */
  protected setHeader(crumbs: Crumb[], title: string, position = ""): void {
    const model = this.getAppViewModel();
    model.setProperty("/crumbs", crumbs);
    model.setProperty("/title", title);
    model.setProperty("/position", position);
    // Only the question page has previous/next; every other page clears it.
    model.setProperty("/nav", null);
  }

  /** Enables the shell footer's Previous / Next buttons and the arrow-key shortcuts. */
  protected setQuestionNav(nav: QuestionNav): void {
    this.getAppViewModel().setProperty("/nav", nav);
  }

  protected getText(key: string): string {
    const resourceModel = this.getOwnerComponent()?.getModel("i18n") as ResourceModel;
    const bundle = resourceModel?.getResourceBundle() as ResourceBundle;
    return bundle?.getText(key) ?? key;
  }

  protected showNotFound(): void {
    this.setHeader([], this.getText("notFoundTitle"));
    this.getRouter().getTargets()?.display("notFound");
  }
}
