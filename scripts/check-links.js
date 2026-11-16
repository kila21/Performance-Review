#!/usr/bin/env node
'use strict';

/**
 * Checks every URL in the BTP data files (topic "resources" in index.json,
 * question "sources" and "resources" in the topic files) and lists broken ones.
 *
 * Usage: node scripts/check-links.js [path-to-subject-folder]
 *        (default: webapp/model/data/btp)
 *
 * - help.sap.com is a JavaScript app that answers HTTP 200 for any path, so a 200
 *   proves nothing there. For https://help.sap.com/docs/<product>/<deliverable>/<topic>.html
 *   URLs the script asks the portal's content API whether that exact page exists.
 *   If the API itself can't be reached, the URL is reported as "unverifiable".
 * - Internal SAP links (pages.github.tools.sap) are listed as "internal, skipped".
 * - Exit code 1 if any URL is broken.
 */

const fs = require('fs');
const path = require('path');

const TIMEOUT_MS = 20000;
const CONCURRENCY = 6;
const USER_AGENT = 'Mozilla/5.0 (link-check)';
const INTERNAL_HOSTS = ['pages.github.tools.sap'];
const HELP_VERSIONS = ['Cloud', 'CLOUD', '2.0', ''];

// ---------------------------------------------------------------------------
// Collect URLs with the places they are used
// ---------------------------------------------------------------------------

function collectUrls(dir) {
  const uses = new Map(); // url -> [ "file: id" ]
  const add = (url, where) => {
    if (!url) {
      return;
    }
    if (!uses.has(url)) {
      uses.set(url, []);
    }
    uses.get(url).push(where);
  };

  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  for (const group of index.groups) {
    for (const topic of group.topics) {
      for (const r of topic.resources || []) {
        add(r.url, `index.json: topic ${topic.id}`);
      }
      const topicFile = path.join(dir, topic.file);
      if (!fs.existsSync(topicFile)) {
        continue;
      }
      const data = JSON.parse(fs.readFileSync(topicFile, 'utf8'));
      for (const q of data.questions || []) {
        for (const s of q.sources || []) {
          add(s.url, `${topic.file}: ${q.id} (source)`);
        }
        for (const r of q.resources || []) {
          add(r.url, `${topic.file}: ${q.id} (resource)`);
        }
      }
    }
  }
  return uses;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function request(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url) {
  const response = await request(url, 'GET');
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const HELP_DOC = /^https:\/\/help\.sap\.com\/docs\/([^/]+)\/([0-9a-f]{32})\/([0-9a-f]{32}\.html)$/;

/** Uses the SAP Help Portal content API to confirm that this exact page exists. */
async function checkHelpPortal(url) {
  const match = HELP_DOC.exec(url);
  if (!match) {
    return { status: 'unverifiable', detail: 'help.sap.com URL not in /docs/<product>/<deliverable>/<topic>.html form' };
  }
  const [, product, deliverable, topic] = match;

  let meta = null;
  const versions = [...HELP_VERSIONS];
  try {
    for (let i = 0; i < versions.length && !meta; i++) {
      const params = new URLSearchParams({ product_url: product, deliverable_url: deliverable, topic_url: topic, language: 'en-US' });
      if (versions[i]) {
        params.set('version', versions[i]);
      }
      const json = await getJson(`https://help.sap.com/http.svc/deliverableMetadata?${params}`);
      if (json && json.data && json.data.deliverable) {
        meta = json.data.deliverable;
      } else if (json && json.latestVersion) {
        const hint = /version=([^&]+)/.exec(json.latestVersion);
        if (hint && !versions.includes(decodeURIComponent(hint[1]))) {
          versions.push(decodeURIComponent(hint[1]));
        }
      }
    }
    if (!meta) {
      return { status: 'broken', detail: 'deliverable or topic not found in the SAP Help Portal' };
    }
    const params = new URLSearchParams({
      deliverable_id: meta.id,
      buildNo: meta.buildNo,
      file_path: topic,
      language: 'en-US',
      state: 'PRODUCTION'
    });
    const page = await getJson(`https://help.sap.com/http.svc/pagecontent?${params}`);
    const data = page && page.data;
    if (!data || data.fallback || !data.currentPage || (data.currentPage.u && data.currentPage.u !== topic)) {
      return { status: 'broken', detail: 'topic not found (portal served a fallback page)' };
    }
    return { status: 'ok', detail: data.currentPage.t };
  } catch (err) {
    return { status: 'unverifiable', detail: `content API not reachable: ${err.message}` };
  }
}

async function checkGeneric(url) {
  try {
    let response = await request(url, 'HEAD');
    if (response.status === 405 || response.status === 403 || response.status === 501 || response.status >= 500) {
      response = await request(url, 'GET'); // some servers reject HEAD
    }
    if (response.status >= 400) {
      return { status: 'broken', detail: `HTTP ${response.status}` };
    }
    return { status: 'ok', detail: `HTTP ${response.status}` };
  } catch (err) {
    const reason = err.name === 'AbortError' ? `timeout after ${TIMEOUT_MS} ms` : err.message;
    return { status: 'broken', detail: reason };
  }
}

async function checkUrl(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return { status: 'broken', detail: 'not a valid URL' };
  }
  if (INTERNAL_HOSTS.includes(host)) {
    return { status: 'internal', detail: 'SAP-internal link, skipped' };
  }
  if (host === 'help.sap.com') {
    return checkHelpPortal(url);
  }
  return checkGeneric(url);
}

async function runPool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return results;
}

// ---------------------------------------------------------------------------

async function main() {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'webapp', 'model', 'data', 'btp'));
  const uses = collectUrls(dir);
  const urls = [...uses.keys()];
  console.log(`Checking ${urls.length} unique URLs in ${path.relative(process.cwd(), dir) || dir} ...`);

  const results = await runPool(urls, checkUrl);
  const byStatus = { ok: [], broken: [], unverifiable: [], internal: [] };
  urls.forEach((url, i) => byStatus[results[i].status].push({ url, ...results[i] }));

  const print = (label, list) => {
    if (!list.length) {
      return;
    }
    console.log(`\n${label} (${list.length}):`);
    for (const item of list) {
      console.log(`  ${item.url}\n    -> ${item.detail}`);
      for (const where of uses.get(item.url)) {
        console.log(`       used in ${where}`);
      }
    }
  };

  print('BROKEN', byStatus.broken);
  print('UNVERIFIABLE', byStatus.unverifiable);
  print('INTERNAL, SKIPPED', byStatus.internal);
  console.log(
    `\nSummary: ${byStatus.ok.length} ok, ${byStatus.broken.length} broken, ` +
      `${byStatus.unverifiable.length} unverifiable, ${byStatus.internal.length} internal (skipped).`
  );
  process.exit(byStatus.broken.length ? 1 : 0);
}

main();
