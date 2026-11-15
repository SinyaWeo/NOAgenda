# Browser smoke test

A real-browser (Chromium via Playwright) test of the **production Docker stack**: Caddy over HTTPS,
same-origin `/api`, the real CSP and `Secure` refresh cookie, email delivered to a mail sink.

```bash
e2e/run.sh            # builds + starts an isolated stack, runs the test, tears it all down
KEEP=1 e2e/run.sh     # leave the stack running afterwards for poking around
```

Needs Docker with the compose plugin and Node 20+. The first run downloads Chromium (~130 MB).
Ports used on the host: 8443, 8088 (Caddy) and 8126 (mail sink UI/API); override with `HTTPS_PORT` / `HTTP_PORT`.

## What it checks
- Protected pages redirect to sign-in and return you afterwards; no protected content is rendered while signed out
- Registration (consent box), email verification link, sign-in, wrong-password message
- Creating a project, a task with a long description, a comment, a subtask; attachment upload and authenticated download
- Task status change, duplicate-label error message, sessions list, data export download, account-deletion request/cancel
- Silent refresh with an expired or missing access token (HttpOnly + Secure + SameSite=Strict cookie scoped to `/api/auth`)
- Skip link, accessible names, page titles, 404 page, admin area hidden from non-admins, mobile drawer and no horizontal scroll
- No Content-Security-Policy violations or uncaught script errors on any page

On failure, screenshots and `stack.log` are written to `e2e/artifacts/` (CI uploads them).
This test creates users and data in a throwaway database; it never touches a real deployment.
