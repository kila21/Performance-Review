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

export const SCROLL_TOP_CHANNEL = "app";
export const SCROLL_TOP_EVENT = "scrollToTop";

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
      // eslint-disable-next-line no-console
      console.warn(`Route "${routeName}" is not defined yet.`);
      return;
    }
    router.navTo(routeName, parameters, replace);
  }

  protected getAppViewModel(): JSONModel {
    return this.getOwnerComponent()?.getModel("appView") as JSONModel;
  }

  protected setHeader(crumbs: Crumb[], title: string): void {
    const model = this.getAppViewModel();
    model.setProperty("/crumbs", crumbs);
    model.setProperty("/title", title);
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

  /** Asks the shell to scroll its content back to the top. */
  protected scrollToTop(): void {
    this.getOwnerComponent()?.getEventBus().publish(SCROLL_TOP_CHANNEL, SCROLL_TOP_EVENT);
  }
}
