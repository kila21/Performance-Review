import UIComponent from "sap/ui/core/UIComponent";

/**
 * @namespace performance.review
 */
export default class Component extends UIComponent {
  public static metadata = {
    interfaces: ["sap.ui.core.IAsyncContentCreation"],
    manifest: "json"
  };

  public init(): void {
    super.init();
    this.getRouter().initialize();
  }
}
