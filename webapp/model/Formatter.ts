export function questionCountText(count: number, pattern: string): string {
  if (!pattern) {
    return String(count ?? "");
  }
  return pattern.replace("{0}", String(count));
}

const LINE_HEIGHT_PX = 19;
const PADDING_PX = 24;

/** A height that comfortably fits all lines of the given code, so the editor never needs an inner scrollbar. */
export function codeEditorHeight(code: string): string {
  const lineCount = (code ?? "").split("\n").length;
  return `${lineCount * LINE_HEIGHT_PX + PADDING_PX}px`;
}

// ---------------------------------------------------------------------------
// Prose formatting: turns the plain-text descriptions from the JSON data into
// readable HTML for sap.m.FormattedText -- short paragraphs, a bold lead
// sentence, and code-like tokens (parseInt(str), Object.keys, //, for...of, ...)
// rendered as inline code.
// ---------------------------------------------------------------------------

const CODE_TOKEN = new RegExp(
  [
    // calls and member access: parseInt(str), Object.keys(obj), remove(), console.log
    String.raw`(?<![\w$])[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\([^()\s]*(?:\s[^()\s]+)*\)`,
    String.raw`(?<![\w$.])(?!e\.g\b|i\.e\b)[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+(?![\w$])`,
    // loop forms: for...of, for...in, do...while
    String.raw`\b(?:for|do)\.\.\.(?:of|in|while)\b`,
    // camelCase identifiers: textContent, appendChild, localStorage
    String.raw`\b[a-z]+[A-Z][A-Za-z0-9]*\b`,
    // symbol-only tokens standing on their own: //  /*  */  /**  ===  =>  &&
    String.raw`(?<=^|[\s(])(?:\.\.\.|[/*=!<>&|?:+\-%^~]{2,4})(?=$|[\s,.;:)])`,
    // special values that read better as code
    String.raw`\b(?:null|undefined|NaN|typeof|instanceof)\b`
  ].join("|"),
  "g"
);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escapes the text and wraps code-like tokens in <code>. */
function inlineHtml(text: string): string {
  let html = "";
  let last = 0;
  for (const match of text.matchAll(CODE_TOKEN)) {
    const start = match.index ?? 0;
    html += escapeHtml(text.slice(last, start));
    html += `<code class="prCode">${escapeHtml(match[0])}</code>`;
    last = start + match[0].length;
  }
  return html + escapeHtml(text.slice(last));
}

function splitSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z"(])/)
    .filter(Boolean);
}

const MAX_PARAGRAPH_CHARS = 260;

/** Description text as HTML: a bold lead sentence, then short paragraphs. */
export function proseHtml(text: string): string {
  const sentences = splitSentences(text ?? "");
  if (!sentences.length) {
    return "";
  }

  const [lead, ...rest] = sentences;
  const paragraphs: string[] = [];
  let current = "";
  for (const sentence of rest) {
    if (current && current.length + sentence.length > MAX_PARAGRAPH_CHARS) {
      paragraphs.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) {
    paragraphs.push(current);
  }

  return (
    `<p class="prLead"><strong>${inlineHtml(lead)}</strong></p>` +
    paragraphs.map((p) => `<p>${inlineHtml(p)}</p>`).join("")
  );
}

/** A single line of text (key point, example title, task) with inline code. */
export function inlineTextHtml(text: string): string {
  return inlineHtml(text ?? "");
}
