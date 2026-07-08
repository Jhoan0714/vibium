/**
 * CLI Tests: Storage export/restore
 * Verifies `vibium storage` / `vibium storage restore` round-trip
 * localStorage and sessionStorage correctly.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { execSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { VIBIUM } = require('../helpers');

let serverProcess, baseURL, statePath;

before(async () => {
  serverProcess = spawn('node', [path.join(__dirname, '../helpers/test-server.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  baseURL = await new Promise((resolve) => {
    serverProcess.stdout.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
  execSync(`${VIBIUM} go ${baseURL}/`, { encoding: 'utf-8', timeout: 30000 });
  statePath = path.join(os.tmpdir(), `vibium-storage-test-${Date.now()}.json`);
});

after(() => {
  if (statePath && fs.existsSync(statePath)) fs.unlinkSync(statePath);
  if (serverProcess) serverProcess.kill();
});

describe('CLI: storage export/restore', () => {
  test('export produces a real nested JSON object, not a double-encoded string', () => {
    execSync(`${VIBIUM} eval "localStorage.setItem('user', 'user_vibium')"`, {
      encoding: 'utf-8',
      timeout: 30000,
    });
    execSync(`${VIBIUM} eval "sessionStorage.setItem('session_id', 'session_vibium')"`, {
      encoding: 'utf-8',
      timeout: 30000,
    });

    execSync(`${VIBIUM} storage -o ${statePath}`, { encoding: 'utf-8', timeout: 30000 });
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

    // Guard
    assert.strictEqual(
      typeof state.storage,
      'object',
      '"storage" must be a nested object, not a double-encoded string'
    );
    assert.strictEqual(state.storage.localStorage.user, 'user_vibium');
    assert.strictEqual(state.storage.sessionStorage.session_id, 'session_vibium');
  });

  test('restore round-trip repopulates localStorage and sessionStorage', () => {
    execSync(`${VIBIUM} eval "localStorage.clear(); sessionStorage.clear();"`, {
      encoding: 'utf-8',
      timeout: 30000,
    });

    // Sanity check: confirm storage is actually empty before restoring
    const before = execSync(`${VIBIUM} eval "localStorage.getItem('user')"`, {
      encoding: 'utf-8',
      timeout: 30000,
    }).trim();
    assert.strictEqual(before, 'null');

    const result = execSync(`${VIBIUM} storage restore ${statePath}`, {
      encoding: 'utf-8',
      timeout: 30000,
    });
    assert.match(result, /restored/i, 'Should confirm storage was restored');

    const user = execSync(`${VIBIUM} eval "localStorage.getItem('user')"`, {
      encoding: 'utf-8',
      timeout: 30000,
    }).trim();
    const sessionId = execSync(`${VIBIUM} eval "sessionStorage.getItem('session_id')"`, {
      encoding: 'utf-8',
      timeout: 30000,
    }).trim();

    assert.strictEqual(user, 'user_vibium', 'localStorage should be restored');
    assert.strictEqual(sessionId, 'session_vibium', 'sessionStorage should be restored');
  });
});
