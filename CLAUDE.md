# Performance Review

An interview-prep app built with SAPUI5 (TypeScript). It shows subjects (JavaScript, SAPUI5, SAP BTP, OData), each split into groups, topics and questions with answers. Content comes from the skill-matrix docs in `docs/*.docx`. The app is data-driven: a new subject is new JSON under `webapp/model/data/`, with no code changes.

## Commands
- `npm start` runs the dev server on port 8080. Don't start or stop it unless asked.
- `npm run ts-typecheck`, `npm run lint` and `npm run ui5lint` are the checks.
- `node scripts/check-links.js webapp/model/data/<subject>` checks every URL in a subject's data. Run it after editing data.
- `node scripts/check-examples.js <path-to-topic.json>` runs the JavaScript examples of a topic file.

## Working rules
- **No git actions.** Never commit, push or open PRs, and don't put commit steps in plans. The user handles git. Leave changes uncommitted and summarize them.
- **No UI verification.** Don't launch the app or take screenshots to check UI changes. Running typecheck or lint is fine. After UI edits, tell the user what to look at.
- **Keep project knowledge in this repo.** Don't save rules, notes or memories outside the project folder, for example in `~/.claude/projects/.../memory`. Add durable rules to this file or to `.claude/rules/`. Put temporary helper files in the session scratchpad and delete them when done.
- **Content must be sourced.** Every answer must come from an allowed official source that was actually opened. See the content rules below.

## Detailed rules
@.claude/rules/content-sources.md
@.claude/rules/data-format.md
