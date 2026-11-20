# Data format

All content lives in `webapp/model/data/` and is loaded by `webapp/model/DataRepository.ts`.

## Adding a subject
1. Add `{ "id": "<subject>", "title": "<Title>" }` to `webapp/model/data/subjects.json`.
2. Create `webapp/model/data/<subject>/index.json` and one JSON file per topic.
3. Cover only the levels the user asks for. So far that is Elementary and Basic from the subject's `docs/*.docx` matrix.

## index.json
```json
{
  "id": "odata",
  "title": "OData",
  "groups": [
    {
      "id": "v2-batch-group",
      "title": "OData V2: Batch processing",
      "topics": [
        {
          "id": "v2-batch",
          "title": "Batch processing",
          "file": "v2-batch.json",
          "questionCount": 4,
          "resources": [{ "type": "Specification", "title": "...", "url": "https://..." }]
        }
      ]
    }
  ]
}
```
- Group IDs and topic IDs must all be unique within a subject. When a group has the same name as its only topic, add `-group` to the group ID (`dwc-group`, `v2-batch-group`).
- `questionCount` must equal the number of questions in the topic file.
- Resource `type` values in use: `Documentation`, `Specification`, `API`, `Tutorial`, `Guideline`, `Package README`, `Architecture Center`, `video`.

## Topic file
```json
{
  "topicId": "v2-batch",
  "title": "Batch processing",
  "questions": [
    {
      "id": "what-is-batch",
      "level": "elementary",
      "title": "What is batch processing in OData V2...?",
      "description": "Plain-text answer...",
      "keyPoints": ["...", "..."],
      "examples": [{ "title": "...", "language": "text", "code": "..." }],
      "assignment": null,
      "sources": [{ "title": "...", "url": "https://..." }]
    }
  ]
}
```
- `level` is `elementary`, `basic` or `advanced`.
- A placeholder question uses `"pending": true` and `resources` (title and url) instead of an answer.
- `examples[].language` is a CodeEditor mode: `javascript`, `typescript`, `json`, `xml`, `yaml`, `sh`, `html`, `properties`, `ini`, `sql`, `text`. Use `text` for raw HTTP requests and responses.
- `assignment` is `null` or `{ task, starterCode, solution }`. Assignment code is shown as JavaScript.
- `focus` (optional) is one plain-text sentence saying what the question asks. It is shown as a "What the question asks" banner above the answer, also in self-test mode.
- `notes` (optional) is a list of `{ "title": "...", "text": "..." }` highlighted callouts shown after the description, for background such as "What is EDM?". `text` follows the description rules below.
- `termLists` (optional) is a list of `{ "title": "...", "items": [{ "term": "...", "definition": "...", "example": "..." }] }` groups, shown as term cards in an "At a glance" panel. Use it for glossaries and type lists. `example` is optional and shown as code.
- `responses` (optional) is a list of `{ "title", "request", "status", "contentType", "note", "language", "body" }` shown as a "What the service returns" panel right after the examples. `request` is the request line(s), plus headers such as `Accept: application/json` on their own lines. `status` is like `200 OK` and is shown green for 2xx and red for 4xx/5xx. `language` is a CodeEditor mode, as for examples. Leave `body` (and `contentType`) empty for bodiless answers such as 204. Bodies from a demo service must be copied from a live call; mark anything taken from the spec instead in the `note`.
- `versionDiff` (optional, OData) is a list of `{ "aspect": "...", "v2": "...", "v4": "..." }` rows. It is shown as an "OData V2 vs V4" table after the examples, only when the list is non-empty. Add it only where the versions really differ. Every V4 fact needs a source, and the V4 pages used go into the question's `sources`. Plain text only; use `-` when a version has no equivalent.
- In OData examples, use the versioned demo services: `https://services.odata.org/V2/OData/OData.svc` and `/V2/Northwind/Northwind.svc` for V2, `/V4/...` for V4. The unversioned `services.odata.org/OData/OData.svc` serves OData V3. Examples that claim to show a demo service must match its live `$metadata`.

## Writing descriptions
`description` is plain text. `proseHtml` in `webapp/model/Formatter.ts` bolds the first sentence, splits the rest into short paragraphs and marks code-like tokens (`Edm.String`, `camelCase`, `fn()`) as inline code. Because of that:
- Write a clear first sentence. It becomes the bold lead.
- Sentences are split on `. ` before a capital letter, so avoid `e.g.` or `i.e.` followed by a capital letter.
- Don't use Markdown or HTML. It is shown as escaped text.
