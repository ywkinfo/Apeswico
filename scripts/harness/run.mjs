#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const manifestPath = path.join(scriptDir, 'manifest.json');
const statePath = path.join(repoRoot, '.omx', 'state', 'harness-state.json');
const lockPath = path.join(repoRoot, '.omx', 'state', 'harness-state.lock');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tempPath, filePath);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function loadManifest() {
  const manifest = readJson(manifestPath);
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.tasks)) {
    throw new Error('manifest is malformed');
  }
  return manifest;
}

function loadState() {
  if (!fs.existsSync(statePath)) {
    return defaultState();
  }

  try {
    const state = readJson(statePath);
    if (!state || state.version !== 1 || !Array.isArray(state.completedTaskIds)) {
      throw new Error('state is malformed');
    }
    return state;
  } catch (error) {
    console.warn(`Harness state unreadable, starting fresh: ${error.message}`);
    return defaultState();
  }
}

function defaultState() {
  return {
    version: 1,
    activeTaskId: null,
    completedTaskIds: [],
    updatedAt: new Date().toISOString()
  };
}

function withLock(fn) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const deadline = Date.now() + 5000;

  while (true) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      try {
        return fn();
      } finally {
        fs.closeSync(fd);
        fs.rmSync(lockPath, { force: true });
      }
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
      if (Date.now() > deadline) {
        throw new Error('timed out waiting for harness state lock');
      }
      sleep(50);
    }
  }
}

function saveState(state) {
  writeJsonAtomic(statePath, {
    ...state,
    updatedAt: new Date().toISOString()
  });
}

function updateState(mutator) {
  return withLock(() => {
    const current = loadState();
    const next = mutator(current);
    saveState(next);
    return next;
  });
}

function completedSet(state) {
  return new Set(state.completedTaskIds);
}

function runCommand(command) {
  const result = spawnSync(command, {
    cwd: repoRoot,
    shell: true,
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result.status ?? 0;
}

function isReady(task, done) {
  return (task.dependsOn || []).every((dependency) => done.has(dependency));
}

function nextTask(manifest, state) {
  const done = completedSet(state);
  const order = new Map(manifest.tasks.map((task, index) => [task.id, index]));
  const tasks = [...manifest.tasks].sort((a, b) => {
    if (a.stage !== b.stage) return a.stage - b.stage;
    return order.get(a.id) - order.get(b.id);
  });

  return tasks.find((task) => !done.has(task.id) && isReady(task, done)) || null;
}

function statusFor(task, done) {
  if (done.has(task.id)) return 'done';
  return isReady(task, done) ? 'ready' : 'blocked';
}

function printTask(task) {
  console.log(`Task: ${task.id}`);
  console.log(`Owner: ${task.owner}`);
  console.log(`Stage: ${task.stage}`);
  if (task.dependsOn?.length) {
    console.log(`Depends on: ${task.dependsOn.join(', ')}`);
  }
  if (task.outputs?.length) {
    console.log(`Outputs: ${task.outputs.join(', ')}`);
  }
  if (task.doneWhen?.length) {
    console.log('Done when:');
    for (const line of task.doneWhen) {
      console.log(`  - ${line}`);
    }
  }
  if (task.verify?.length) {
    console.log('Verify:');
    for (const line of task.verify) {
      console.log(`  - ${line}`);
    }
  }
}

function printUsage() {
  console.log([
    'Usage:',
    '  node scripts/harness/run.mjs next',
    '  node scripts/harness/run.mjs list',
    '  node scripts/harness/run.mjs auto',
    '  node scripts/harness/run.mjs done <task-id>',
    '  node scripts/harness/run.mjs state',
    '  node scripts/harness/run.mjs reset'
  ].join('\n'));
}

function missingOutputs(task) {
  return (task.outputs || []).filter((relativePath) => !fs.existsSync(path.join(repoRoot, relativePath)));
}

function verifyTask(task) {
  for (const command of task.verify || []) {
    const status = runCommand(command);
    if (status !== 0) {
      return { ok: false, command, status };
    }
  }
  return { ok: true };
}

function markTaskDone(taskId) {
  updateState((current) => {
    const nextCompleted = new Set(current.completedTaskIds);
    nextCompleted.add(taskId);
    return {
      ...current,
      activeTaskId: null,
      completedTaskIds: [...nextCompleted]
    };
  });
}

function autoAdvance(manifest) {
  let progressed = false;
  const maxSteps = manifest.tasks.length + 5;

  for (let step = 0; step < maxSteps; step += 1) {
    const state = loadState();
    const done = completedSet(state);
    const task = nextTask(manifest, state);

    if (!task) {
      if (!progressed) {
        console.log('All manifest tasks are complete.');
      }
      return;
    }

    const missing = missingOutputs(task);
    if (missing.length > 0) {
      console.log(`Stopped at ${task.id}: missing outputs`);
      for (const relativePath of missing) {
        console.log(`  - ${relativePath}`);
      }
      console.log(`Next ready task: ${task.id} [${statusFor(task, done)}]`);
      return;
    }

    const verification = verifyTask(task);
    if (!verification.ok) {
      console.log(`Stopped at ${task.id}: verify command failed`);
      console.log(`  - command: ${verification.command}`);
      console.log(`  - status: ${verification.status}`);
      return;
    }

    markTaskDone(task.id);
    console.log(`Auto-completed: ${task.id}`);
    progressed = true;
  }

  throw new Error('auto advance exceeded safety limit');
}

const command = process.argv[2] || 'next';

try {
  const manifest = loadManifest();
  const state = loadState();
  const done = completedSet(state);

  switch (command) {
    case 'next': {
      const task = nextTask(manifest, state);
      if (!task) {
        console.log('All manifest tasks are complete.');
        process.exit(0);
      }
      printTask(task);
      console.log(`Status: ${statusFor(task, done)}`);
      console.log(`Suggested command: node scripts/harness/run.mjs auto`);
      break;
    }
    case 'list': {
      for (const task of manifest.tasks) {
        console.log(`${task.id} [${statusFor(task, done)}] stage=${task.stage}`);
      }
      break;
    }
    case 'auto': {
      autoAdvance(manifest);
      break;
    }
    case 'done': {
      const taskId = process.argv[3];
      if (!taskId) {
        throw new Error('missing task id');
      }
      if (!manifest.tasks.some((task) => task.id === taskId)) {
        throw new Error(`unknown task: ${taskId}`);
      }
      markTaskDone(taskId);
      console.log(`Marked complete: ${taskId}`);
      break;
    }
    case 'state': {
      console.log(JSON.stringify(state, null, 2));
      break;
    }
    case 'reset': {
      updateState(() => ({
        version: 1,
        activeTaskId: null,
        completedTaskIds: []
      }));
      console.log('Harness state reset.');
      break;
    }
    default:
      printUsage();
      process.exitCode = 1;
  }
} catch (error) {
  console.error(`Harness error: ${error.message}`);
  process.exitCode = 1;
}
