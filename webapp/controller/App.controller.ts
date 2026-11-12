import JSONModel from "sap/ui/model/json/JSONModel";
import { IconTabBar$SelectEvent } from "sap/m/IconTabBar";
import { Link$PressEvent } from "sap/m/Link";
import { Switch$ChangeEvent } from "sap/m/Switch";
import BaseController, { Crumb, QuestionNav, QuestionRouteArgs } from "./BaseController";
import { loadSubjects, Subject } from "../model/DataRepository";
import { loadSearchIndex } from "../model/SearchIndex";

const SELF_TEST_STORAGE_KEY = "performanceReview.selfTest";

/** Storage can be unavailable (private mode, blocked site data) -- never let that break the app. */
function readSelfTest(): boolean {
  try {
    return localStorage.getItem(SELF_TEST_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeSelfTest(on: boolean): void {
  try {
    localStorage.setItem(SELF_TEST_STORAGE_KEY, String(on));
  } catch {
    // Not persisted; the switch still works for this session.
  }
}

/**
 * True when a key press is meant for the focused control, not for page navigation:
 * text fields / code editors, and widgets that use arrow keys themselves (tabs, lists, sliders).
 */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest?.(
    "input, textarea, select, [contenteditable=''], [contenteditable='true'], " +
      "[role='tablist'], [role='listbox'], [role='menu'], [role='slider'], [role='radiogroup'], [role='tree']"
  );
}

/**
 * @namespace performance.review.controller
 */
export default class App extends BaseController {
  public onInit(): void {
    const appViewModel = new JSONModel({
      subjectId: "",
      crumbs: [],
      title: "",
      position: "",
      nav: null,
      selfTest: readSelfTest()
    });
    this.getOwnerComponent()?.setModel(appViewModel, "appView");

    loadSubjects().then((subjectsModel) => {
      this.getView()?.setModel(subjectsModel, "subjects");
    });

    const router = this.getRouter();

    router.getRoute("root")?.attachPatternMatched(this.onRootMatched, this);

    router.attachRoutePatternMatched((event) => {
      const args = event.getParameter("arguments") as { subjectId?: string; questionId?: string };
      if (args.subjectId) {
        appViewModel.setProperty("/subjectId", args.subjectId);
      }
      this.currentQuestionId = args.questionId ?? "";
    }, this);

    // A hash that matches no route at all (e.g. too many/too few segments).
    router.attachBypassed(() => this.showNotFound(), this);

    document.addEventListener("keydown", this.onKeyDown);
  }

  public onExit(): void {
    document.removeEventListener("keydown", this.onKeyDown);
  }

  private currentQuestionId = "";

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

  // ---------------------------------------------------------------------------
  // Self-test mode
  // ---------------------------------------------------------------------------

  public onSelfTestChange(event: Switch$ChangeEvent): void {
    // The switch is two-way bound to appView>/selfTest; only persistence is left.
    writeSelfTest(!!event.getParameter("state"));
  }

  // ---------------------------------------------------------------------------
  // Previous / Next (footer buttons and arrow keys)
  // ---------------------------------------------------------------------------

  public onPrevious(): void {
    this.goTo("previous");
  }

  public onNext(): void {
    this.goTo("next");
  }

  private goTo(direction: keyof QuestionNav): void {
    const nav = this.getAppViewModel().getProperty("/nav") as QuestionNav | null;
    const target = nav?.[direction];
    if (target) {
      this.navTo("question", { ...target });
    }
  }

  /** Arrow function so it can be added and removed as the same listener reference. */
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isTypingTarget(event.target)) {
      return;
    }
    if (event.key === "ArrowLeft") {
      this.goTo("previous");
    } else if (event.key === "ArrowRight") {
      this.goTo("next");
    }
  };

  // ---------------------------------------------------------------------------
  // Random question
  // ---------------------------------------------------------------------------

  public onRandomQuestion(): void {
    const subjectId = this.getAppViewModel().getProperty("/subjectId") as string;
    const subjectPromise = subjectId
      ? Promise.resolve(subjectId)
      : loadSubjects().then((model) => (model.getData() as Subject[])[0]?.id ?? "");

    subjectPromise
      .then((id) => loadSearchIndex(id).then((entries) => ({ id, entries })))
      .then(({ id, entries }) => {
        // Never "randomly" land on the question that is already open.
        const candidates = entries.filter((e) => e.questionId !== this.currentQuestionId);
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        if (pick) {
          const args: QuestionRouteArgs = { subjectId: id, topicId: pick.topicId, questionId: pick.questionId };
          this.navTo("question", { ...args });
        }
      })
      .catch(() => {
        // No data to pick from; the button simply does nothing.
      });
  }
}
