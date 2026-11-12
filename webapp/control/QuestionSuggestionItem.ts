import SuggestionItem from "sap/m/SuggestionItem";
import RenderManager from "sap/ui/core/RenderManager";

interface SuggestionParent {
  getId: () => string;
  getSuggestionItems?: () => SuggestionItem[];
}

/** Writes text with the first occurrence of the search term in bold (like the base control). */
function renderHighlighted(rm: RenderManager, text: string, search: string): void {
  const index = search ? text.toUpperCase().indexOf(search.toUpperCase()) : -1;
  if (index === -1) {
    rm.text(text);
    return;
  }
  rm.text(text.slice(0, index));
  rm.openStart("b").openEnd();
  rm.text(text.slice(index, index + search.length));
  rm.close("b");
  rm.text(text.slice(index + search.length));
}

/**
 * A SearchField suggestion laid out as a row: icon, question title on the left
 * (truncated with "…" if too long), and the `description` -- used for the topic
 * name -- aligned to the right. Keyboard/selection/ARIA behave like the base item.
 *
 * @namespace performance.review.control
 */
export default class QuestionSuggestionItem extends SuggestionItem {
  // SuggestionItem.render is documented as overridable by subclasses.
  public render(rm: RenderManager, item: SuggestionItem, search?: string, selected?: boolean): void {
    const parent = item.getParent() as unknown as SuggestionParent | null;
    const items = parent?.getSuggestionItems?.() ?? [];

    rm.openStart("li", item)
      .class("sapMSuLI")
      .class("sapMSelectListItem")
      .class("sapMSelectListItemBase")
      .class("sapMSelectListItemBaseHoverable")
      .class("prSuggestion");
    rm.accessibilityState({
      role: "option",
      posinset: items.indexOf(item) + 1,
      setsize: items.length,
      selected: !!selected
    });
    if (selected) {
      rm.class("sapMSelectListItemBaseSelected");
      // Same as the base item: point the SearchField's <input> at the active option.
      if (parent) {
        document.getElementById(`${parent.getId()}-I`)?.setAttribute("aria-activedescendant", item.getId());
      }
    }
    rm.openEnd();

    const icon = item.getIcon();
    if (icon) {
      rm.icon(icon, ["sapMSuggestionItemIcon", "prSuggestionIcon"]);
    }

    rm.openStart("span").class("prSuggestionTitle").openEnd();
    renderHighlighted(rm, item.getText(), search ?? "");
    rm.close("span");

    const description = item.getDescription();
    if (description) {
      rm.openStart("span").class("prSuggestionTopic").openEnd();
      rm.text(description);
      rm.close("span");
    }

    rm.close("li");
  }
}
