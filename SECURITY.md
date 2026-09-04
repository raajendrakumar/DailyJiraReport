# Security review: Daily Jira Bugs & Stories Report

This document is the outcome of a full security audit of this repository and
its published GitHub Pages site, done before making any access-control
changes. It records what was actually found (not assumed), the current vs.
recommended architecture, and the exact steps to close the gap.

**Audit date:** 2026-08-28
**Scope:** `index.html`, `css/styles.css`, `js/app.js`, `js/vendor/xlsx.full.min.js`,
full `git log --all` history, `.gitignore`, GitHub repo settings, GitHub Pages
config, GitHub Actions. No `.github/workflows` exist in this repo.

---

## A. Security audit

| # | Finding | Severity | Current risk | Recommended fix |
|---|---|---|---|---|
| 1 | Dashboard is publicly reachable at `raajendrakumar.github.io/DailyJiraReport/` with no authentication | **High** | Anyone with the URL — inside or outside the company — can view all Jira ticket data, assignee names, and (indirectly) client/project names that appear in ticket summaries (e.g. "Ford", "Lucid", "Marmon", "Oshkosh"). No login, no session, no audit trail of who viewed it. | Put an identity-aware proxy (Cloudflare Access) or an authenticated hosting platform in front of the site. See Section B/E/F. |
| 2 | Repository is public (`visibility: public`) | **Medium** | Full source, commit history, and commit messages are public. No secrets were found in history (verified — see below), but internal engineering process detail (ticket workflow, assignee names, sprint cadence) is visible to anyone. | Make the repository private (Section E). Note: repo-private ≠ site-private on GitHub Pages — see Finding 5. |
| 3 | Jira ticket summaries embed client/customer names | **Medium** | Ticket summaries in the published snapshot reference real automotive-industry client names. This is business-confidential even though it's not a "credential." | Same fix as #1 — gate the site behind auth so this data isn't internet-public. |
| 4 | No `Content-Security-Policy`, `Referrer-Policy`, or `X-Robots-Tag`/`noindex` were set | **Medium** | Site could be crawled/indexed by search engines, and had no defense-in-depth against injected-script execution if a future bug introduced one. | **Fixed in this change**: added a CSP `<meta>` tag (script-src 'self', no inline scripts anywhere), `<meta name="referrer" content="same-origin">`, `<meta name="robots" content="noindex,nofollow">`, and `robots.txt`. See caveats below. |
| 5 | GitHub Pages cannot enforce authentication on this plan | **High (architectural limit)** | This repo is on a **personal (User-owned) GitHub account**. GitHub only supports restricting a Pages site to signed-in org members on **GitHub Enterprise Cloud**. On Free/Pro/Team, a Pages site is publicly reachable at its URL **even if the source repository is private**. Making the repo private will *not* make the published site private. | Do not attempt to fake this with a JavaScript password check (explicitly out of scope per your requirements — it's trivially bypassed by viewing source, curling the URL, or reading Network tab). Put a real identity-aware proxy in front (Cloudflare Access) or move hosting to a platform where you control an auth-gated origin. See Section B. |
| 6 | XSS / DOM injection risk in dynamically rendered ticket data | **Low (mitigated)** | Audited every place ticket/assignee data (`t.summary`, `t.key`, `p.name`, `r.label`, etc.) is written into `innerHTML` in `js/app.js`. **Every single one is passed through `esc()`**, a proper HTML-entity-encoding function, before insertion — including the uploaded-file preview path (same render functions are reused). No raw interpolation into `innerHTML` was found. | No code change needed. Verified with a live browser test (Playwright) exercising search/filter/upload paths — no injection points found. |
| 7 | `localStorage`/`sessionStorage`/cookies | **None found** | The app stores nothing in browser storage and reads no cookies. | No action needed. |
| 8 | URL parameters | **None found** | The app does not read `location.search`, `URLSearchParams`, or any query string. No reflected-parameter risk exists. | No action needed. |
| 9 | External resources | **Low** | Only Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) is loaded cross-origin, via `<link>`, not `<script>`. The Excel-parsing library (SheetJS) is vendored locally (`js/vendor/xlsx.full.min.js`), not pulled from a third-party CDN at runtime. | No action needed; this is already the safer pattern (no supply-chain risk from a CDN going down or being compromised). |
| 10 | Secrets in code or Git history | **None found** | Searched every tracked file and the **entire `git log --all -p` history** (all 11 commits) for API keys, tokens, passwords, bearer tokens, `@atlassian.net` references, and GitHub token patterns (`ghp_`, `gho_`). Zero real matches. The only pattern hits were inside the vendored SheetJS library's own code (it legitimately handles Excel password-protected files — e.g. `PtgAttrIfError`, `SH33TJSERR` internal strings), not application secrets. | Nothing to rotate — there is no live Jira API integration in this codebase today, so there are no Jira credentials to leak in the first place. |
| 11 | GitHub Actions / workflow secrets | **None found** | No `.github/workflows/*.yml` file exists in this repo. The 10 "workflow runs" visible in the Actions tab are GitHub's own auto-generated `pages build and deployment` system entries (created automatically every time Pages publishes), not user-defined Actions. Confirmed 0 repository-level Actions secrets configured via the API. | No action needed. If a CI/CD pipeline is added later, follow Section E for how to use GitHub Secrets correctly. |
| 12 | HTTPS | **Low** | `https_enforced: true` is already set on the GitHub Pages config (confirmed via API), and the current `raajendrakumar.github.io` URL is served over HTTPS. | No action needed. See Section H for why HTTPS alone is not "secure." |
| 13 | Clickjacking (`X-Frame-Options` / `frame-ancestors`) | **Medium (platform limit)** | GitHub Pages cannot send custom HTTP response headers, and browsers **ignore `frame-ancestors` when it's delivered via a `<meta>` tag** (confirmed live — Chrome logs exactly this warning). So there is currently no real clickjacking protection, and none is achievable on GitHub Pages alone. | Achievable once a proxy (Cloudflare) or a different host is in front — see Section F. |
| 14 | MIME-sniffing protection (`X-Content-Type-Options: nosniff`) | **Medium (platform limit)** | Same root cause as #13 — this is HTTP-header-only, GitHub Pages can't set it, and there's no meta-tag equivalent. | Same fix as #13. |
| 15 | CORS | **N/A today** | The app makes zero cross-origin `fetch`/`XHR` calls — there is no API to have a CORS misconfiguration on. | Becomes relevant only if/when the optional backend in Section B is built — that backend must allowlist only the dashboard's real origin. |

**Headline conclusion:** there are no leaked credentials to rotate and no backend to harden, because none exist yet. The actual, real risk is **#1/#5: the dashboard itself is public with no login**, and GitHub Pages on this account tier structurally cannot fix that with a header, a meta tag, or a repo-visibility change. That requires either an identity-aware proxy in front of the site, or moving the site behind a platform that supports real access control.

---

## B. Architecture

**Current:**

```
Browser (anyone with the URL)
        │  HTTPS
        ▼
GitHub Pages (raajendrakumar.github.io/DailyJiraReport)
        │
        ▼
Static index.html with an inline JSON snapshot
(no backend, no live Jira API call, no credentials in play)
```

**Recommended (practical for an internal company dashboard, zero code rewrite required):**

```
User (browser)
   │
   ▼
Cloudflare Access  ──── verifies identity against Google/Microsoft/GitHub SSO
   │  (only @truevaluehub.com accounts, or an explicit allow-list, pass)
   ▼
Cloudflare Pages *or* the existing GitHub Pages site, proxied through Cloudflare
   │
   ▼
Same static dashboard (unchanged) — the manually-pasted-snapshot workflow
you already use in README.md keeps working as-is
```

**Optional future extension**, only if/when you want the dashboard to pull
**live** data instead of a manually pasted snapshot:

```
User → Cloudflare Access → Static frontend (unchanged)
                                  │  fetch, same-origin
                                  ▼
                     Backend (Cloudflare Worker / Vercel / Azure Function)
                                  │  server-side only — JIRA_API_TOKEN never
                                  │  reaches the browser
                                  ▼
                            Jira Cloud REST API
```

This second diagram is the one your prompt's "target architecture" describes.
It is **not implemented in this change** because building it now, with
placeholder credentials for an IdP/API you haven't chosen yet, would be
exactly the "fake security" pattern you told me to avoid — non-functional
code that looks like a backend but isn't wired to anything real. `.env.example`
documents the shape of it for whenever you're ready.

### Why Cloudflare Access, specifically

Weighed against your list:

| Option | Verdict |
|---|---|
| **Cloudflare Access** | ✅ Recommended. Free for ≤50 users, zero app code changes, works in front of the *existing* GitHub Pages site (or Cloudflare Pages), supports Google/Microsoft/GitHub SSO + email-domain allow-listing, session TTL, logout, audit log. |
| GitHub Enterprise Cloud (org-restricted Pages) | Only way to make a *github.io* URL itself private — but requires an Enterprise Cloud plan and moving this personal repo into a paid org. Overkill for one internal dashboard. |
| Microsoft Entra ID app registration + custom login page | Real option if TrueValueHub already uses Microsoft 365 — but requires writing and hosting an actual auth-gated backend (this app has none today). More work than Cloudflare Access for the same outcome. |
| Auth0 / Firebase Auth / Supabase Auth | All viable, all require the same thing: a real backend or auth-gated hosting platform to enforce the check server-side (client-side-only checks are explicitly insecure, per your own requirements). More setup than Access for no extra benefit here. |
| A JS `if (password === ...)` check | ❌ Explicitly rejected, per your requirements. Trivially bypassed via View Source / DevTools / curl. |

### Two ways to stand up Cloudflare Access — pick one

- **A. Proxy the existing GitHub Pages site** (keep `raajendrakumar.github.io/DailyJiraReport` as the origin, put a Cloudflare-managed domain in front of it). Requires adding a domain/subdomain to Cloudflare's DNS.
- **B. Host on Cloudflare Pages directly** (`*.pages.dev` free subdomain, or your own domain later). Zero DNS risk to `truevaluehub.com` (the live company WordPress site + email on GoDaddy are untouched), fastest to stand up, and Access wraps it the same way.

Given `truevaluehub.com` is your team's **live production site with active
email (MX records on GoDaddy)**, I'd default to **Option B** to start —
it doesn't touch that domain's DNS at all. Option A (a subdomain like
`reports.truevaluehub.com`) can be layered on later once you're comfortable,
exactly like the earlier custom-domain work in this repo's history.

**This is the one decision only you can make** — it needs a Cloudflare
account and a choice of identity provider. I've asked you about it
separately rather than guessing.

---

## C. Implementation (this change)

What was changed in this pass — all reversible, all verified not to break
the app (tested with Playwright over `file://` and a real local HTTP server):

- `index.html`: added a `Content-Security-Policy` meta tag (`script-src 'self'`
  — no inline scripts exist anywhere in this app, so this is a real,
  meaningful restriction, not decoration), `Referrer-Policy: same-origin`,
  and `noindex, nofollow`.
- `robots.txt`: added, disallowing all crawling. **Not real access control**
  — it's a request that well-behaved crawlers honor; it does nothing against
  a direct link or a scraper that ignores it. Listed here so it isn't
  mistaken for security.
- `.gitignore`: added `.env` / `.env.*` (keeping `.env.example` explicitly
  un-ignored) so a future real `.env` can never be committed by accident.
- `.env.example`: added as a template for the *optional* future live-Jira
  backend (Section B's second diagram). Contains no real values. Not read
  by any code today.
- `SECURITY.md` (this file): the audit, architecture, and runbook.

**Not changed:** no fake login screen, no client-side password check, no
placeholder OAuth config wired into the app. Per your own explicit
requirement, none of that goes in until it's backed by a real identity
provider you've actually configured.

---

## D. `.env.example`

See [`.env.example`](.env.example) in the repo root. Reproduced here for
reference — **never put real values in this file**; it's committed as
documentation only:

```
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
CF_ACCESS_TEAM_DOMAIN=
CF_ACCESS_AUD=
ENTRA_TENANT_ID=
ENTRA_CLIENT_ID=
ENTRA_CLIENT_SECRET=
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
ALLOWED_EMAIL_DOMAIN=truevaluehub.com
```

---

## E. GitHub — exact steps

**Making the repository private** (recommended, but confirm with the team
first — anyone currently relying on the public link/repo will lose access,
and this is a deliberate, one-way-feeling settings change I'm not making
without your go-ahead):

1. GitHub → this repo → **Settings** → scroll to **Danger Zone** → **Change repository visibility** → **Make private**.
2. ⚠️ Read Finding #5 again first: this hides the *source code*, not the *published site*. The `github.io` URL keeps serving publicly until you also do Section B/F.
3. If the team wants the source hidden **and** the live site to keep working during the Cloudflare Access setup, you can do this step at any time — it doesn't depend on the auth rollout.

**Removing secrets:** none were found (Section A, finding #10) — nothing to remove.

**Rotating exposed credentials:** none exist in this codebase — nothing to rotate.

**Configuring GitHub Secrets** (for when the optional backend from Section B
is built, e.g. as a GitHub Actions deploy step): GitHub → Settings →
**Secrets and variables** → **Actions** → **New repository secret**. Store
`JIRA_API_TOKEN`, `JIRA_EMAIL`, and any IdP client secret there — **never**
in a workflow YAML file's plaintext, never in a committed `.env`. Reference
them in a workflow only as `${{ secrets.NAME }}`, which GitHub automatically
redacts from build logs.

**Configuring deployment:** unchanged for the static frontend — it keeps
deploying from `main` via GitHub Pages exactly as it does today. Nothing
in this change alters that.

**Disabling public access where applicable:** GitHub Pages itself has no
"require login" toggle on this plan (Finding #5). Public access to the
*site* can only be closed by putting Cloudflare Access (or an equivalent
identity-aware proxy) in front of it, per Section B.

---

## F. Deployment (Cloudflare Access — once you confirm the path in Section B)

Concrete steps once you pick Option A or B above and have a Cloudflare account:

1. **Build**: none needed — this is a static site, already just `index.html` + `css/` + `js/`. Deploy the repo as-is.
2. **Environment variables**: none needed for the frontend-only path. If the optional backend is added later, its env vars go in the hosting platform's secret store (e.g. Cloudflare Worker secrets via `wrangler secret put`), never in the repo.
3. **Authentication configuration**: Cloudflare Zero Trust dashboard → **Access** → **Applications** → **Add an application** → **Self-hosted** → point it at your Cloudflare Pages `*.pages.dev` domain (or the proxied GitHub Pages domain). Add a policy: **Allow** → **Include** → **Emails ending in** → `@truevaluehub.com` (or specific emails while piloting).
4. **Domain configuration**: Option B needs no domain work at all to start (`*.pages.dev`). Option A requires adding `truevaluehub.com` to Cloudflare or a partial/CNAME setup for just the `reports` subdomain — do this deliberately and separately, given the live WordPress site + email on that domain.
5. **HTTPS**: automatic — Cloudflare issues and manages the TLS certificate for both `*.pages.dev` and any custom domain added to it.
6. **Access control**: the Access policy from step 3 *is* the access control — unauthenticated or non-matching-email users get Cloudflare's own login/deny page, never your app.
7. **Testing**: see Section G below.
8. **Rollback**: Cloudflare Access policies can be disabled or deleted instantly from the dashboard with zero deploy — the underlying site is unaffected. If Option B (Cloudflare Pages) doesn't work out, the same repo can be re-pointed at GitHub Pages in minutes since nothing about the app itself changes.

---

## G. Security test checklist

| Test case | Expected result today (pre-Access) | Expected result after Cloudflare Access |
|---|---|---|
| Unauthenticated user visits the URL | ⚠️ Full dashboard loads — this is the gap being closed | Redirected to Cloudflare Access login |
| Authorized user (`@truevaluehub.com`) logs in | N/A (no login exists yet) | Dashboard loads normally after SSO |
| Unauthorized user (wrong email domain) tries to log in | N/A | Access denies with a branded "not authorized" page |
| Expired session | N/A | User is prompted to re-authenticate after the configured session TTL |
| Logout | N/A | Cloudflare Access logout endpoint clears the session; next visit re-prompts login |
| Direct API access | N/A — no API exists | N/A unless the optional backend is built; if so, backend must independently verify the `Cf-Access-Jwt-Assertion` header, not trust the frontend |
| Direct JSON/CSV access | The board-data JSON is embedded in `index.html`, not a separate fetchable file — there is no standalone `.json`/`.csv` URL to hit | Same, plus the whole page is now behind Access |
| Browser DevTools inspection | ✅ Already verified clean — no secrets, no tokens, no hidden endpoints in Sources/Application tabs | Same |
| View Source | ✅ Already verified clean | Same |
| Network tab | ✅ Already verified — only `css/styles.css`, `js/app.js`, `js/vendor/xlsx.full.min.js`, and Google Fonts requests; nothing sensitive | Same, plus you'll see the Cloudflare Access cookie/JWT (not a secret — it's a signed session token, not a credential) |
| Jira token exposure | ✅ None exists to expose | ✅ Still none, unless/until the optional backend is built — and even then, must never appear in any browser-visible response |
| XSS | ✅ Verified — every dynamic render path goes through `esc()`; tested search/filter/upload with Playwright, no injection found | Same |
| CORS | N/A — no cross-origin API calls exist | N/A unless backend is added |
| CSP | ✅ Added and verified (script-src 'self', no violations in a live browser test) | Same |
| HTTPS | ✅ Already enforced | ✅ Enforced by Cloudflare too |
| Direct URL access (deep link) | Loads immediately, no gate | Redirected through Access first, then lands on the same deep link post-login |
| Incognito browser | Loads immediately, no gate | Prompts fresh login (no cached session) |
| Mobile browser | Loads immediately, no gate | Cloudflare Access login flow works on mobile browsers |

---

## Remaining risks (honest list)

1. **The dashboard is still fully public right now.** This document and the
   meta-tag/`.gitignore` hardening in this change do not, by themselves,
   add authentication — that requires the Cloudflare Access decision in
   Section B, which is yours to make.
2. **Clickjacking and MIME-sniffing protection are not truly active** on
   GitHub Pages (Findings #13/#14) — the CSP meta tag helps against script
   injection, but `frame-ancestors`/`X-Frame-Options`/`X-Content-Type-Options`
   need a real HTTP layer (Cloudflare) to work.
3. **Ticket summaries contain business-sensitive client names.** Until
   access is gated, treat the current public URL as fully exposed and avoid
   adding anything more sensitive to the snapshot.
4. **The manually-pasted-snapshot workflow is unauthenticated by nature** —
   whoever has push access to `main` can publish data. This is unchanged by
   anything in this document; it's a process control (who has repo write
   access), not a code fix.

## Final recommendation

Ship this change (meta-tag hardening + `.gitignore` + documentation — all
verified non-breaking) now, then decide on **Cloudflare Access in front of
Cloudflare Pages** (Section B, Option B) as the next step. That closes
Finding #1/#5 — the only real, high-severity gap this audit found — without
inventing a fake backend or a client-side password check.
