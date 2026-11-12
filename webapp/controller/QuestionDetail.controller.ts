import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
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
import * as Formatter from "../model/Formatter";

interface QuestionRouteArgs {
  subjectId: string;
  topicId: string;
  questionId: string;
}

interface Question {
  id: string;
  title: string;
}

/**
 * @namespace performance.review.controller
 */
export default class QuestionDetail extends BaseController {
  public formatter = Formatter;

  private subjectId = "";
  private topicId = "";
  private questions: Question[] = [];
  private questionIndex = -1;

  public onInit(): void {
    this.getView()?.setModel(new JSONModel({ solutionVisible: false }), "ui");
    this.getRouter().getRoute("question")?.attachPatternMatched(this.onRouteMatched, this);
  }

  // Every Previous/Next click re-creates this view fresh (see manifest.json's
  // clearControlAggregation), so this fires once per question -- exactly when we
  // want to move focus (and, as a side effect, the scroll position) back to the top.
  public onAfterRendering(): void {
    // UI5's FocusHandler tries to restore focus to the previously focused control
    // (e.g. the Previous/Next button just clicked) shortly after rendering; this runs
    // after that, so it wins and moves focus (and the scroll position) back to the top.
    setTimeout(() => {
      const domRef = this.getView()?.byId("questionPanel")?.getDomRef() as HTMLElement | null;
      if (domRef) {
        if (!domRef.hasAttribute("tabindex")) {
          domRef.setAttribute("tabindex", "-1");
        }
        domRef.focus();
      }
    }, 100);
  }

  private onRouteMatched(event: Route$PatternMatchedEvent): void {
    const { subjectId, topicId, questionId } = event.getParameter("arguments") as QuestionRouteArgs;
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

          loadTopicModel(subjectId, topicRef.file)
            .then((topicModel) => {
              const questions = (topicModel.getData() as { questions: Question[] }).questions;
              const questionIndex = questions.findIndex((q) => q.id === questionId);
              if (questionIndex === -1) {
                this.showNotFound();
                return;
              }

              this.questions = questions;
              this.questionIndex = questionIndex;

              this.getView()?.setModel(topicModel, "topic");
              this.getView()?.bindElement({ path: `/questions/${questionIndex}`, model: "topic" });
              this.getView()?.setModel(
                new JSONModel({
                  hasPrevious: questionIndex > 0,
                  hasNext: questionIndex < questions.length - 1
                }),
                "nav"
              );
              (this.getView()?.getModel("ui") as JSONModel).setProperty("/solutionVisible", false);

              this.setHeader(
                [
                  { text: subject.title, subjectId },
                  { text: topicRef.title, subjectId, topicId }
                ],
                questions[questionIndex].title
              );
            })
            // A single question has no meaningful partial state without its data,
            // unlike the Questions list, which can show an empty-state message instead.
            .catch(() => this.showNotFound());
        })
        .catch(() => this.showNotFound());
    });
  }

  public onToggleSolution(): void {
    const uiModel = this.getView()?.getModel("ui") as JSONModel;
    uiModel.setProperty("/solutionVisible", !uiModel.getProperty("/solutionVisible"));
  }

  public onPrevious(): void {
    this.navToQuestion(this.questionIndex - 1);
  }

  public onNext(): void {
    this.navToQuestion(this.questionIndex + 1);
  }

  private navToQuestion(index: number): void {
    const question = this.questions[index];
    if (!question) {
      return;
    }
    this.navTo("question", {
      subjectId: this.subjectId,
      topicId: this.topicId,
      questionId: question.id
    });
  }
}
