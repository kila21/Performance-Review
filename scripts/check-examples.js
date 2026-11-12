#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const util = require('util');

async function runCode(code) {
  const logs = [];
  const sandboxConsole = {
    log: (...args) => {
      logs.push(args.map((a) => util.inspect(a, { depth: 4, breakLength: 100 })).join(' '));
    }
  };
  const context = {
    console: sandboxConsole,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Promise
  };
  vm.createContext(context);
  try {
    vm.runInContext(code, context, { timeout: 2000 });
  } catch (err) {
    logs.push(`THROWN ERROR: ${err.message}`);
  }
  // Give any scheduled timers / promise callbacks a chance to run and log,
  // so examples using setTimeout/async/await are captured too.
  await new Promise((resolve) => setTimeout(resolve, 300));
  return logs;
}

async function printBlock(label, code) {
  const logs = await runCode(code);
  console.log(`\n--- ${label} ---`);
  console.log(code);
  console.log('>>> actual console.log output:');
  if (logs.length === 0) {
    console.log('  (no console.log calls)');
  } else {
    logs.forEach((line, i) => console.log(`  [${i}] ${line}`));
  }
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/check-examples.js <path-to-topic.json>');
    process.exit(1);
  }

  const fullPath = path.resolve(file);
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  console.log(`Checking examples in: ${data.title} (${data.topicId})`);

  for (const q of data.questions) {
    console.log(`\n================ ${q.id}: ${q.title} ================`);
    for (let i = 0; i < (q.examples || []).length; i++) {
      const ex = q.examples[i];
      await printBlock(`example ${i + 1}: ${ex.title}`, ex.code);
    }
    if (q.assignment && q.assignment.solution) {
      await printBlock('assignment solution', q.assignment.solution);
    }
  }

  // Force exit even if an example left a stray interval/timer running.
  process.exit(0);
}

main();
