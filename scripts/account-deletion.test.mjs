import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
const source = ts.transpileModule(fs.readFileSync(new URL('../lib/backend.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const problem = (status, code) => json(status, { code, detail: code });
const auth = () => json(200, { accessToken: 'new-access', refreshToken: 'new-refresh', expiresIn: 600, user: { name: 'Test' } });
const accepted = () => json(202, { status: 'PENDING_DELETION', requestedAt: '2026-10-12T12:00:00Z', scheduledFor: '2026-10-22T12:00:00Z', message: 'Agendada' });

function backend(responses) {
  const calls = [];
  const loaded = { exports: {} };
  vm.runInNewContext(source, {
    exports: loaded.exports, module: loaded,
    require: name => name === 'server-only' ? {} : name === 'next/headers' ? {} : require(name),
    process: { env: { DNA_API_URL: 'http://backend.test', DEMO_MODE: 'true' } },
    Headers, Response, AbortSignal,
    fetch: async (url, init) => {
      calls.push({ url, ...init });
      assert.ok(responses.length > 0, `Unexpected request: ${url}`);
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next;
    },
  });
  return { api: loaded.exports, calls };
}
const request = (cookie = 'dna_access=access; dna_refresh=refresh') => new NextRequest('http://frontend.test/api/auth/account-deletion', { headers: { cookie } });
const credentials = { login: 'person@example.com', password: 'correct' };

test('incorrect current password is sent only once and leaves valid cookies untouched', async () => {
  const { api, calls } = backend([problem(401, 'INVALID_CREDENTIALS')]);
  const response = await api.requestAccountDeletion(request(), 'wrong');
  assert.equal(response.status, 401);
  assert.equal(calls.length, 1);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal((await response.json()).code, 'INVALID_CREDENTIALS');
});

test('scheduling returns the server deadline and clears every session cookie', async () => {
  const { api, calls } = backend([accepted()]);
  const response = await api.requestAccountDeletion(request(), 'correct');
  assert.equal(response.status, 202);
  assert.equal((await response.json()).scheduledFor, '2026-10-22T12:00:00Z');
  for (const name of ['dna_access', 'dna_refresh', 'dna_demo']) {
    assert.equal(response.cookies.get(name).value, '');
    assert.equal(response.cookies.get(name).maxAge, 0);
  }
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(calls[0].headers.get('Authorization'), 'Bearer access');
});

test('expired access token is refreshed once, then renewed cookies are removed on acceptance', async () => {
  const { api, calls } = backend([new Response(null, { status: 401 }), auth(), accepted()]);
  const response = await api.requestAccountDeletion(request(), 'correct');
  assert.equal(response.status, 202);
  assert.equal(calls.length, 3);
  assert.match(calls[1].url, /auth\/refresh$/);
  assert.equal(calls[2].headers.get('Authorization'), 'Bearer new-access');
  assert.equal(response.cookies.get('dna_access').value, '');
});

test('wrong password after a necessary refresh preserves the renewed session without another retry', async () => {
  const { api, calls } = backend([new Response(null, { status: 401 }), auth(), problem(401, 'INVALID_CREDENTIALS')]);
  const response = await api.requestAccountDeletion(request(), 'wrong');
  assert.equal(response.status, 401);
  assert.equal(calls.length, 3);
  assert.equal(response.cookies.get('dna_access').value, 'new-access');
});

test('failed refresh returns explicit session error and never resends the deletion request', async () => {
  const { api, calls } = backend([new Response(null, { status: 401 }), problem(403, 'ACCOUNT_UNAVAILABLE')]);
  const response = await api.requestAccountDeletion(request(), 'correct');
  assert.equal((await response.json()).code, 'SESSION_REQUIRED');
  assert.equal(calls.length, 2);
  assert.equal(response.cookies.get('dna_access').maxAge, 0);
});

test('demo and missing sessions do not reach the deletion backend', async () => {
  const { api, calls } = backend([]);
  assert.equal((await api.requestAccountDeletion(request('dna_demo=1'), 'correct')).status, 403);
  assert.equal((await api.requestAccountDeletion(request(''), 'correct')).status, 401);
  assert.equal(calls.length, 0);
});

test('business errors and an ambiguous network failure never become success or remove a valid session', async () => {
  for (const failure of [problem(400, 'INVALID_INPUT'), problem(409, 'ACCOUNT_UNAVAILABLE'), problem(429, 'ACCOUNT_DELETION_RATE_LIMITED'), new Error('timeout')]) {
    const { api, calls } = backend([failure]);
    const response = await api.requestAccountDeletion(request(), 'correct');
    assert.ok(response.status >= 400);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(calls.length, 1);
  }
});

test('initial login with a pending deletion returns confirmation requirement without cancelling or creating cookies', async () => {
  const { api, calls } = backend([problem(403, 'ACCOUNT_PENDING_DELETION')]);
  const response = await api.loginWithBackend(credentials);
  assert.equal((await response.json()).code, 'ACCOUNT_PENDING_DELETION');
  assert.equal(calls.length, 1);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('explicit confirmation validates login, cancels without Bearer, then logs in with new tokens', async () => {
  const { api, calls } = backend([problem(403, 'ACCOUNT_PENDING_DELETION'), new Response(null, { status: 204 }), auth()]);
  const response = await api.loginWithBackend({ ...credentials, confirmAccountDeletionCancellation: true });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 3);
  assert.deepEqual(JSON.parse(calls[0].body), credentials);
  assert.match(calls[1].url, /account-deletion\/cancel$/);
  assert.equal(calls[1].headers.has('Authorization'), false);
  assert.deepEqual(JSON.parse(calls[1].body), { login: credentials.login, currentPassword: credentials.password });
  assert.equal(response.cookies.get('dna_access').value, 'new-access');
});

test('other blocked accounts and wrong credentials never trigger cancellation even when confirmation is supplied', async () => {
  for (const failure of [problem(403, 'ACCOUNT_UNAVAILABLE'), problem(401, 'INVALID_CREDENTIALS'), problem(403, 'EMAIL_NOT_VERIFIED')]) {
    const { api, calls } = backend([failure]);
    const response = await api.loginWithBackend({ ...credentials, confirmAccountDeletionCancellation: true });
    assert.ok(response.status >= 400);
    assert.equal(calls.length, 1);
    assert.equal(response.headers.get('set-cookie'), null);
  }
});

test('cancellation losing the deadline race does not create a session', async () => {
  const { api, calls } = backend([problem(403, 'ACCOUNT_PENDING_DELETION'), problem(409, 'ACCOUNT_DELETION_NOT_CANCELLABLE')]);
  const response = await api.loginWithBackend({ ...credentials, confirmAccountDeletionCancellation: true });
  assert.equal(response.status, 409);
  assert.equal(calls.length, 2);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('failure to log in after confirmed cancellation accurately reports the partial result', async () => {
  for (const failure of [new Error('network'), problem(429, 'RATE_LIMITED')]) {
    const { api } = backend([problem(403, 'ACCOUNT_PENDING_DELETION'), new Response(null, { status: 204 }), failure]);
    const response = await api.loginWithBackend({ ...credentials, confirmAccountDeletionCancellation: true });
    assert.equal((await response.json()).code, 'ACCOUNT_DELETION_CANCELLED_LOGIN_REQUIRED');
    assert.equal(response.headers.get('set-cookie'), null);
  }
});

test('normal active login never calls cancellation', async () => {
  const { api, calls } = backend([auth()]);
  assert.equal((await api.loginWithBackend(credentials)).status, 200);
  assert.equal(calls.length, 1);
});

test('invalid login JSON is rejected before any backend request', async () => {
  const { api, calls } = backend([]);
  for (const payload of [null, {}, { login: 'email', password: '' }, { login: 'x'.repeat(255), password: 'valid' }]) {
    assert.equal((await api.loginWithBackend(payload)).status, 400);
  }
  assert.equal(calls.length, 0);
});

test('session broadcast redirects other tabs without replacing the sender confirmation page', () => {
  const channels = new Set();
  class Channel {
    constructor(name) { this.name = name; channels.add(this); }
    postMessage(data) {
      for (const channel of channels) {
        if (channel !== this && channel.name === this.name) channel.onmessage?.({ data });
      }
    }
    close() { channels.delete(this); }
  }
  const code = ts.transpileModule(fs.readFileSync(new URL('../lib/session-transition.ts', import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  function tab(id) {
    const loaded = { exports: {} };
    const redirects = [];
    const removed = [];
    vm.runInNewContext(code, {
      module: loaded, exports: loaded.exports, BroadcastChannel: Channel,
      crypto: { randomUUID: () => id },
      window: { location: { replace: url => redirects.push(url) }, addEventListener() {}, removeEventListener() {} },
      localStorage: { removeItem: key => removed.push(key) }, sessionStorage: { removeItem: key => removed.push(key) },
    });
    return { ...loaded.exports, redirects, removed };
  }
  const sender = tab('sender');
  const other = tab('other');
  const cleanupSender = sender.listenForSessionEnd();
  const cleanupOther = other.listenForSessionEnd();
  sender.beginSessionEnd();
  sender.notifySessionEnded();
  assert.deepEqual(sender.redirects, []);
  assert.deepEqual(other.redirects, ['/entrar']);
  assert.deepEqual(other.removed, ['dna:award-processing', 'dna:award-notice']);
  cleanupSender();
  cleanupOther();
  assert.equal(channels.size, 0);
});

test('a 401 body arriving during session termination cannot redirect over the deletion confirmation', async () => {
  const code = ts.transpileModule(fs.readFileSync(new URL('../lib/client-api.ts', import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  let ending = false;
  let deliverBody;
  let bodyRequested;
  const bodyReady = new Promise(resolve => { bodyRequested = resolve; });
  const redirects = [];
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports, Headers, DOMException,
    require: name => name === '@/lib/session-transition'
      ? { isSessionEnding: () => ending, sessionRevision: () => ending ? 1 : 0 }
      : { applyTeamDisplayOverrides: data => data },
    window: { location: { replace: url => redirects.push(url) } },
    fetch: async () => ({ status: 401, ok: false, json: () => {
      bodyRequested();
      return new Promise(resolve => { deliverBody = resolve; });
    } }),
  });
  const result = loaded.exports.clientApi('/api/me');
  await bodyReady;
  ending = true;
  deliverBody({ code: 'SESSION_REQUIRED' });
  await assert.rejects(result, error => error.name === 'AbortError');
  assert.deepEqual(redirects, []);
});
