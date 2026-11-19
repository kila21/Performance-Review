# Content sources

The app is interview prep the user must be able to trust, so every answer is based on official sources only.

## Allowed sources
- **All SAP subjects (SAPUI5, BTP, OData and future ones):** help.sap.com, SAP-docs on GitHub, developers.sap.com, cap.cloud.sap, the SAPUI5 SDK (sapui5.hana.ondemand.com / ui5.sap.com), SAP GitHub repos and npm READMEs, SAP-authored blogs on community.sap.com, and the SAP Architecture Center.
- **OData only:** the official spec sites odata.org and docs.oasis-open.org are allowed as well (user decision, 2026-11-19).
- Never cite SAP-internal links (sap.sharepoint.com, wiki.wdf.sap.corp, pages.github.tools.sap) or retired ones (wiki.scn.sap.com), even when a `docs/*.docx` lists them.

## Rules
- Every URL in `sources` or `resources` must be a full URL that was actually opened in the session. Never build URLs from short IDs, and never claim a page says something it couldn't be opened to confirm.
- Write answers from the opened pages, not from memory. Re-check details such as status codes, attribute names and version-specific features against the source.
- help.sap.com pages are rendered by JavaScript, so a plain fetch proves nothing. Read and verify them through the portal content API:
  1. `https://help.sap.com/http.svc/deliverableMetadata?product_url=<product>&deliverable_url=<deliverable>&topic_url=<topic>.html&language=en-US&version=<v>` (try `Cloud`, `Latest` or empty for `<v>`; a 404 reply names the right version in `latestVersion`)
  2. `https://help.sap.com/http.svc/pagecontent?deliverable_id=<id>&buildNo=<buildNo>&file_path=<topic>.html&language=en-US&state=PRODUCTION`
  3. To find pages, use the search endpoint `https://help.sap.com/http.svc/elasticsearch?q=<terms>&product=<product>&area=content&language=en-US&state=PRODUCTION`.
  If the API fails, fall back to the SAP-docs GitHub file.
- If no allowed source covers a topic, add a placeholder question (`"pending": true` plus `resources`) instead of answering it.
- Run `node scripts/check-links.js webapp/model/data/<subject>` after every data change. It must report 0 broken.
