#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const util = require('util');

function runCode(code) {
  const logs = [];
  const sandboxConsole = {
    log: (...args) => {
      logs.push(args.map((a) => util.inspect(a, { depth: 4, breakLength: 100 })).join(' '));
    }
  };
  const context = { console: sandboxConsole };
  vm.createContext(context);
  try {
    vm.runInContext(code, context, { timeout: 2000 });
  } catch (err) {
    logs.push(`THROWN ERROR: ${err.message}`);
  }
  return logs;
}

function printBlock(label, code) {
  const logs = runCode(code);
  console.log(`\n--- ${label} ---`);
  console.log(code);
  console.log('>>> actual console.log output:');
  if (logs.length === 0) {
    console.log('  (no console.log calls)');
  } else {
    logs.forEach((line, i) => console.log(`  [${i}] ${line}`));
  }
}

function main() {
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
    (q.examples || []).forEach((ex, i) => {
      printBlock(`example ${i + 1}: ${ex.title}`, ex.code);
    });
    if (q.assignment && q.assignment.solution) {
      printBlock('assignment solution', q.assignment.solution);
    }
  }
}

main();
