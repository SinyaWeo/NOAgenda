/**
 * Real-browser smoke test of the production stack (see e2e/README.md).
 * Run it through e2e/run.sh, which starts the stack and sets the variables below.
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'https://localhost:8443';
const MP = process.env.MAILPIT_URL || 'http://127.0.0.1:8126';
// Command prefix that runs a command inside the backend container, e.g. "docker compose ... exec -T backend"
const BACKEND_EXEC = process.env.BACKEND_EXEC;
const ARTIFACTS = process.env.ARTIFACTS_DIR || path.resolve('artifacts');
fs.mkdirSync(ARTIFACTS, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'noagenda-e2e-'));
const run = Math.random().toString(16).slice(2, 8);
const USER = `ui${run}`, EMAIL = `${USER}@example.com`, PW = 'browser test pass 1';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : `  ${extra}`)); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, locale: 'en-US', timezoneId: 'Europe/Prague', viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const problems = [];
const watch = (p) => {
  p.on('console', (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to|violates the following/i.test(t)) problems.push('CSP: ' + t.slice(0, 200));
  });
  p.on('pageerror', (e) => problems.push('pageerror: ' + String(e).slice(0, 200)));
};
watch(page);

// On any failure keep evidence: a screenshot of every open page goes to the artifacts folder.
async function snapshot(tag) {
  let i = 0;
  for (const c of browser.contexts()) {
    for (const p of c.pages()) {
      await p.screenshot({ path: path.join(ARTIFACTS, `${tag}-${i++}.png`), fullPage: true }).catch(() => {});
    }
  }
}
const onFatal = async (err) => {
  console.error('FAIL (unexpected error): ' + (err?.message ?? err));
  await snapshot('error');
  await browser.close().catch(() => {});
  process.exit(1);
};
process.on('unhandledRejection', onFatal);
process.on('uncaughtException', onFatal);
page.setDefaultTimeout(15000);

const mails = async () => (await (await fetch(`${MP}/api/v1/messages?limit=200`)).json()).messages;
async function mailText(to, subject, wait = 10000) {
  const end = Date.now() + wait;
  while (Date.now() < end) {
    const m = (await mails()).find((x) => x.To[0].Address === to && x.Subject.includes(subject));
    if (m) return (await (await fetch(`${MP}/api/v1/message/${m.ID}`)).json()).Text;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}
const visible = async (sel) => page.locator(sel).first().isVisible().catch(() => false);
const text = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');

// ---------- guard + redirect-back
await page.goto(BASE + '/tasks');
await page.waitForURL(/\/user\/login/);
ok('a protected page redirects to sign-in', page.url().includes('/user/login'));
ok('...and remembers where you were', decodeURIComponent(page.url()).includes('redirect=/tasks'), page.url());

// ---------- legal pages
await page.goto(BASE + '/terms');
let t = await text();
ok('terms page renders with the configured operator', t.includes('Terms of Service') && t.includes('Example Ltd'), t.slice(0, 120));
ok('...and no longer shows the "template" banner', !t.includes('Template, not yet configured'));
await page.goto(BASE + '/privacy');
t = await text();
ok('privacy page renders and mentions deletion + export', t.includes('Privacy Policy') && t.includes('Data export') && t.includes('7-day'), '');

// ---------- register (consent required) + verify email
const cfg = await (await fetch(`${BASE}/api/auth/config`)).json();
ok('the API advertises that registration needs an invite code (without revealing it)', cfg.inviteRequired === true && cfg.registrationEnabled === true && !JSON.stringify(cfg).includes('e2e-invite-code'));
const noCode = await fetch(`${BASE}/api/users`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'nc' + run, email: `nc${run}@example.com`, password: PW }) });
ok('registering through the API without the code is refused', noCode.status === 403);
await page.goto(BASE + '/user/register');
await page.waitForSelector('#reg-invite');
ok('the register page asks for the invite code', true);
await page.fill('#reg-username', USER);
await page.fill('#reg-email', EMAIL);
await page.fill('#reg-password', PW);
ok('create-account button is disabled until the terms box is ticked', await page.locator('button[type=submit]').isDisabled());
await page.locator('label[for=reg-terms]').click({ position: { x: 2, y: 2 } }).catch(() => {});
if (await page.locator('button[type=submit]').isDisabled()) await page.check('#reg-terms');
ok('ticking the box enables it', !(await page.locator('button[type=submit]').isDisabled()));
await page.fill('#reg-invite', 'not-the-code');
await page.click('button[type=submit]');
await page.waitForFunction(() => document.body.innerText.includes('valid invite code'));
ok('a wrong invite code is refused with a clear message', true);
await page.fill('#reg-invite', 'e2e-invite-code');
await page.click('button[type=submit]');
await page.waitForFunction(() => document.body.innerText.includes('Check your email'));
ok('registration tells the user to check their email', true);
const verifyMail = await mailText(EMAIL, 'Confirm');
const link = verifyMail?.match(/https:\/\/localhost:8443\/user\/verify-email\?token=[0-9a-f]+/)?.[0];
ok('the verification email links to the public site', !!link, String(verifyMail).slice(0, 150));
await page.goto(link);
await page.waitForFunction(() => document.body.innerText.includes('Email confirmed') || document.body.innerText.includes('Link not valid'));
ok('opening the link confirms the address', (await text()).includes('Email confirmed'));

// ---------- sign in, unverified/verified handling and redirect-back
await page.goto(BASE + '/tasks');
await page.waitForURL(/\/user\/login/);
await page.fill('#login-username', USER);
await page.fill('#login-password', 'wrong password!!');
await page.click('button[type=submit]');
await page.waitForFunction(() => document.body.innerText.includes('Invalid credentials'));
ok('wrong password shows the generic message', true);
await page.fill('#login-password', PW);
await page.click('button[type=submit]');
await page.waitForURL(/\/tasks(\?|$)/);
ok('after signing in you land on the page you asked for', new URL(page.url()).pathname === '/tasks', page.url());
ok('the app shell is rendered (sidebar + main landmark)', (await visible('nav[aria-label="Main"]')) && (await visible('main#main-content')));

// ---------- project + task + comment + subtask + attachment
await page.goto(BASE + '/projects/new');
await page.fill('#proj-name', 'UI Project');
await page.fill('#proj-desc', 'made in the browser');
await page.click('button[type=submit]');
await page.waitForURL(/\/projects\/\d+$/);
ok('project created from the UI', true);
const projectId = page.url().split('/').pop();

const LONG = 'A long task description. '.repeat(160); // ~4000 chars
await page.goto(BASE + '/tasks/create');
await page.fill('#task-title', 'Browser task');
await page.fill('#task-desc', LONG);
await page.selectOption('#task-project', { label: 'UI Project' });
await page.click('button[type=submit]');
await page.waitForURL(/\/tasks\/\d+$/);
const taskUrl = page.url();
await page.waitForFunction(() => document.body.innerText.includes('A long task description.'));
ok('task with a ~4000 character description saved', (await text()).includes('A long task description.'));

await page.click('button:has-text("Activity")');
await page.fill('input[placeholder="Add a comment…"]', 'first browser comment');
await page.click('button:has-text("Post")');
await page.waitForFunction(() => document.body.innerText.includes('first browser comment'));
ok('comment posted', true);
await page.waitForFunction(() => document.body.innerText.includes('commented on'));
ok('the comment shows in the activity log', true);

await page.click('button:has-text("Work Items")');
await page.fill('input[placeholder="Add subtask…"]', 'My subtask');
await page.click('button:has-text("Add"):near(input[placeholder="Add subtask…"])');
await page.waitForFunction(() => document.body.innerText.includes('My subtask'));
await page.reload();
await page.click('button:has-text("Work Items")');
await page.waitForFunction(() => document.body.innerText.includes('My subtask'));
ok('a subtask can be added from the UI and stays visible under its task after reload', true);

const notePath = path.join(tmp, 'note.txt');
fs.writeFileSync(notePath, 'attachment from the browser');
await page.click('button:has-text("Activity")');
await page.setInputFiles('input[type=file]', notePath);
await page.waitForSelector('button:has-text("note.txt")');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("note.txt")')]);
const dlPath = await dl.path();
ok('attachment uploaded and downloaded with auth (blob download)', fs.readFileSync(dlPath, 'utf8') === 'attachment from the browser' && dl.suggestedFilename() === 'note.txt');

// ---------- tasks list status change (used a non-existent PATCH route before)
await page.goto(BASE + '/tasks');
await page.waitForSelector('select[aria-label="Change status"]');
const sel = page.locator('select[aria-label="Change status"]').first(); // per-task status select (the page also has a saved-filter select)
const options = await sel.locator('option').evaluateAll((os) => os.map((o) => o.value));
const target = options.includes('done') ? 'done' : options[options.length - 1];
await sel.selectOption(target);
await page.waitForFunction(() => document.body.innerText.includes('Status updated') || document.body.innerText.includes('Failed'));
ok('changing a task status on the tasks list works', (await text()).includes('Status updated'));

// ---------- labels: friendly duplicate error
await page.goto(BASE + '/labels');
await page.fill('input[placeholder="New label name"]', 'bug');
await page.click('button:has-text("+ Add Label")');
await page.waitForFunction(() => document.body.innerText.includes('bug'));
await page.fill('input[placeholder="New label name"]', 'bug');
await page.click('button:has-text("+ Add Label")');
await page.waitForFunction(() => /already exists|Failed|error/i.test(document.body.innerText));
ok('a duplicate label gives a readable message (was a 500)', /already exists/i.test(await text()), (await text()).slice(0, 200));

// ---------- sessions, export, deletion
await page.goto(BASE + '/user/settings/sessions');
await page.waitForFunction(() => document.body.innerText.includes('This device'));
ok('sessions page marks the current device', true);

await page.goto(BASE + '/user/settings/data-export');
const [exp] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Download my data")')]);
const expJson = JSON.parse(fs.readFileSync(await exp.path(), 'utf8'));
ok('data export downloads real JSON about me', expJson.profile?.username === USER && expJson.ownedProjectsAndTasks?.some((n) => n.title === 'Browser task'));
ok('...without password hashes', !JSON.stringify(expJson).includes('$2'));

await page.goto(BASE + '/user/settings/deletion');
await page.click('button:has-text("Request Account Deletion")');
await page.waitForFunction(() => document.body.innerText.includes('Enter your password'));
ok('deletion needs the password', true);
await page.fill('#del-password', 'wrong password!!');
await page.click('button:has-text("Request Account Deletion")');
await page.click('[data-testid="confirm-accept"]');
await page.waitForFunction(() => document.body.innerText.includes('Incorrect password'));
ok('a wrong password is refused', true);
await page.fill('#del-password', PW);
await page.click('button:has-text("Request Account Deletion")');
await page.click('[data-testid="confirm-accept"]');
await page.waitForFunction(() => document.body.innerText.includes('Deletion scheduled'));
ok('deletion is scheduled with the real date', true);
await page.click('button:has-text("Cancel Deletion Request")');
await page.waitForFunction(() => document.body.innerText.includes('cancelled'));
ok('deletion can be cancelled', true);

// ---------- silent refresh in a real browser (Secure + SameSite=Strict + path-scoped cookie)
await page.goto(BASE + '/dashboard');
await page.evaluate(() => localStorage.setItem('access_token', 'expired.or.garbage'));
await page.reload();
await page.waitForSelector('nav[aria-label="Main"]');
const tokenNow = await page.evaluate(() => localStorage.getItem('access_token'));
ok('an expired access token is refreshed silently from the cookie', page.url().endsWith('/dashboard') && tokenNow !== 'expired.or.garbage');
await page.evaluate(() => localStorage.removeItem('access_token'));
await page.goto(BASE + '/projects');
await page.waitForSelector('nav[aria-label="Main"]');
ok('with no access token at all the cookie restores the session', new URL(page.url()).pathname === '/projects');
const cookies = await ctx.cookies();
const rt = cookies.find((c) => c.name === 'noa_rt');
ok('the refresh cookie is HttpOnly, Secure, SameSite=Strict and scoped to /api/auth', !!rt && rt.httpOnly && rt.secure && rt.sameSite === 'Strict' && rt.path === '/api/auth', JSON.stringify(rt));
ok('page scripts cannot read the refresh cookie', !(await page.evaluate(() => document.cookie.includes('noa_rt'))));

// ---------- accessibility basics
await page.goto(BASE + '/dashboard');
await page.waitForSelector('nav[aria-label="Main"]');
await page.keyboard.press('Tab');
const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
ok('first Tab stop is the "Skip to content" link', first === 'Skip to content', first);
ok('icon buttons have accessible names', (await page.locator('button[aria-label="Account menu"]').count()) === 1 && (await page.locator('button[aria-label="Toggle light/dark theme"]').count()) === 1 && (await page.locator('input[aria-label="Search tasks and projects"]').count()) === 1);
ok('browser tab title is page-specific', (await page.title()) === 'Dashboard · NOAgenda', await page.title());

// ---------- 404 for a signed-in user
await page.goto(BASE + '/definitely-not-here');
await page.waitForFunction(() => document.body.innerText.includes('Page not found'));
ok('a signed-in user sees a proper 404 with a way back', (await text()).includes('Back to Dashboard') && (await page.title()).startsWith('Page not found'));

// ---------- admin guard
await page.goto(BASE + '/admin/users');
await page.waitForURL(/\/dashboard/);
ok('a non-admin never sees the admin area (redirected)', true);
execSync(`${BACKEND_EXEC} node dist/scripts/promote-admin.js ${USER}`, { stdio: 'pipe' });
await page.evaluate(() => localStorage.removeItem('access_token'));
await ctx.clearCookies();
await page.goto(BASE + '/user/login');
await page.fill('#login-username', USER);
await page.fill('#login-password', PW);
await page.click('button[type=submit]');
await page.waitForURL(/\/dashboard/);
await page.goto(BASE + '/admin/users');
await page.waitForFunction(() => document.body.innerText.toLowerCase().includes('users') && !document.body.innerText.includes('Checking permissions'));
ok('an admin can open the admin area', new URL(page.url()).pathname === '/admin/users');

// ---------- mobile layout
const mobile = await browser.newContext({ ignoreHTTPSErrors: true, locale: 'en-US', viewport: { width: 375, height: 812 }, storageState: await ctx.storageState() });
const m = await mobile.newPage(); watch(m); m.setDefaultTimeout(15000);
await m.goto(BASE + '/dashboard');
await m.waitForSelector('button[aria-label="Open menu"]');
ok('mobile: a menu button is shown', await m.locator('button[aria-label="Open menu"]').isVisible());
const box0 = await m.locator('nav#main-nav').boundingBox();
ok('mobile: the sidebar is off-screen until opened', box0 && box0.x + box0.width <= 1, JSON.stringify(box0));
await m.click('button[aria-label="Open menu"]');
await m.waitForTimeout(400);
const box1 = await m.locator('nav#main-nav').boundingBox();
ok('mobile: the drawer slides in', box1 && box1.x >= -1 && box1.width > 200, JSON.stringify(box1));
await m.click('nav#main-nav >> text=Projects');
await m.waitForURL(/\/projects$/);
await m.waitForTimeout(400);
const box2 = await m.locator('nav#main-nav').boundingBox();
ok('mobile: navigating closes the drawer', box2 && box2.x + box2.width <= 1, JSON.stringify(box2));
for (const path of ['/dashboard', '/tasks', '/projects', `/projects/${projectId}`, '/user/settings']) {
  await m.goto(BASE + path); await m.waitForSelector('main#main-content');
  const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(`mobile: no horizontal page scroll on ${path}`, over <= 1, `overflow ${over}px`);
}

// ---------- logout
await page.goto(BASE + '/dashboard');
await page.waitForSelector('button[aria-label="Account menu"]');
await page.click('button[aria-label="Account menu"]');
await page.click('text=Logout');
await page.waitForURL(/\/user\/login/);
ok('logout lands on a clean sign-in page (no redirect memory)', !page.url().includes('redirect='), page.url());
await page.goto(BASE + '/dashboard');
await page.waitForURL(/\/user\/login/);
ok('after logout protected pages need a new sign-in', true);
const stillRt = (await ctx.cookies()).find((c) => c.name === 'noa_rt');
ok('logout removed the refresh cookie', !stillRt);

// ---------- no CSP violations or script errors anywhere
ok('no Content-Security-Policy violations or uncaught errors in any page', problems.length === 0, problems.slice(0, 5).join(' | '));
if (fail) await snapshot('assertion-failed');
await browser.close();
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
