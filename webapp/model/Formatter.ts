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
