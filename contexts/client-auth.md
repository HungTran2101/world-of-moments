# Client accounts and submission ownership

The public map is freely browsable. Published valid thoughts are visible to everyone;
published thoughts awaiting review or marked invalid are additionally visible to their
signed-in author. Unpublished thoughts remain outside the map. Public responses omit
identities and exact timestamps. Private history includes the author's timestamps.

## Authentication

Server-only auth/request helpers live in the private, non-routable `app/api/_handlers/`
folder. Shared client auth constants live in `app/api/client/constant.ts`; this module contains plain
values used by both frontend and backend, with no secrets or server-only imports.

CMS and client accounts reuse User/Account/Session/Verification tables, with a required
`kind` discriminator. Existing users default to `cms`. CMS accounts retain username
login and generated internal emails. Client emails are normalized to lowercase before
lookup/storage and are unique; public registration never creates roles or CMS accounts.
Both authentication configurations and every protected lookup enforce the account kind.
Client and CMS sessions have independent secrets and cookie prefixes. Cookies are
HttpOnly, SameSite=Lax and Secure in production, with seven-day absolute expiry and
no cookie cache or sliding refresh. The server reads current account status for each
protected request. Tokens/password hashes never enter public DTOs or client storage.

Explicit public endpoints under `/api/client/auth`:

- POST `register`: email/password, optional locale and CAPTCHA token. Creates an
  unverified account, starts a session and attempts its initial verification email.
  Duplicate emails return 409 without changing credentials or sending another email.
- POST `login`: same credentials; restricted accounts can log in to see their status.
- POST `logout`: revokes the current client session only.
- GET `session`: `{ user: ClientIdentity | null }`, including sidebar availability.
- POST `resend`: authenticated, unverified account only; optional locale.
- GET `verify?token=...`: consumes verification and redirects to `/?verification=...`.

Mutations require the configured same-origin Origin. Login never sends email implicitly.
Successful verification preserves an existing session; it does not sign another browser
into the account. Password recovery is not part of this feature.

## Verification email

Resend delivers localized HTML/plain-text email from a configured verified domain.
Random verification IDs and a secret-derived token allow identical retry payloads;
only token hashes are stored in the existing Verification table. Tokens are bound to
an account ID, cannot verify a later account reusing the same email, and all expire
at account creation plus seven days. Verifying consumes every outstanding link.

A 60-second server cooldown applies between send attempts. Four durable send slots
are available: initial send and three resends. Network retries reuse the pending slot,
its token and Resend idempotency key. Pending slots are retried only inside Resend's
24-hour idempotency window. Resending never extends the account deadline.
Unverified accounts are rejected at their exact deadline even before scheduled deletion.

## Submission policy

POST `/api/submissions` requires a verified client account. Nullable `clientUserId`
is the ownership authority; old anonymous thoughts remain unclaimed. A shared per-user
PostgreSQL advisory transaction lock serializes account changes, creation and quota
updates. Failed persistence does not consume allowance. Deletion restores no allowance.

- Three successful creations per hosting-server calendar day, with five minutes
  between successful creations. `TZ` must match across instances. The day rolls over
  on request; there is no daily reset job.
- The eleventh cooldown/quota rejection in ten minutes triggers a restriction.
- First and second suspensions last seven days. The third trigger bans immediately
  and resets the suspension counter. Manual suspensions count; an already-active
  suspension does not add another strike. Expiry restores verified status and keeps
  the count. A ban can only be restored by the authorized revoke-ban action.
- Cooldown and daily-limit UI use different copy without exposing duration/allowance.
  Suspension may display its expiry. Banned UI provides a configured mailto appeal.

Thought content, coordinates and atmosphere are immutable. Public PATCH is absent
(405). Author DELETE checks live account ownership; suspended/banned authors can
still delete and read their history. CMS may delete with `submission.delete` and
moderate publication/validity with their respective permissions. CMS PATCH rejects
content, coordinate, ownership and provenance fields.

Client history/cache keys follow the signed-in account. Session changes cancel/remove
private history queries and refresh personalized map/detail visibility across tabs.
Account deletion cascades credentials/sessions/limiter state and detaches ownership
with SetNull, preserving thoughts. Legacy future-message routes, visitor services,
identity cache/bootstrap, signed anonymous cookies and limiter have been removed.
Future messages remain disabled until implemented with the new client-account flow.
Their existing model/data are retained until the ownership redesign. Client auth and
thought mutations retain the same trusted-origin check in
`app/api/_handlers/clientHttp.ts`, including the optional `SUBMISSION_PUBLIC_ORIGIN`
override; they no longer import an anonymous-identity module or require its cookie secret.

## Abuse state and cleanup

Compact `ClientSubmissionLimit` and expiring `ClientAuthIpLimit` records persist across
restarts/processes. No account event-history table is maintained. Status audit fields
store the latest status change time and CMS user ID (null means system); limiter
updates do not overwrite that audit.

Registration request 11 within a rolling 30 seconds requires invisible Turnstile.
Login requires it after more than ten credential failures in 30 seconds. Tokens are
validated server-side for hostname/action and are single-use; passing does not clear
the window. IP extraction trusts only proxy-overwritten X-Real-IP in production;
missing/invalid production IP fails safely. Configure the reverse proxy to overwrite
that header rather than forwarding a caller's value. Siteverify failure does not bypass
the challenge. `/privacy` references Cloudflare's required privacy addendum.

Run `pnpm client-users:cleanup` hourly from host cron, using the application directory
and the same environment as the server, for example:

```cron
0 * * * * cd /path/to/world-of-moments && NODE_ENV=production /absolute/path/to/pnpm client-users:cleanup
```

This command is idempotent, rechecks account expiry under the same per-user lock,
and removes expired auth-IP windows and client verification records. It does not delete
CMS accounts, verified clients or thoughts. Suspension expiry is also checked on access.

## Development schema workflow

Prisma schema files are the source of truth. Migration files and the old browser/network
blacklist module/tables are removed. Use `pnpm db:push`, then `pnpm prisma:generate`;
there is no migration deployment or automatic reset flow. Inspect any data-loss prompt
before accepting it: only intentionally retired tables may be discarded. Preserve
submissions, future messages, CMS accounts, credentials, roles and moderation records.

Configure independent `CLIENT_AUTH_SECRET`/`BETTER_AUTH_SECRET`, Resend sender/key,
Turnstile public/secret keys, trusted origins, support email and consistent hosting TZ.
See `.env.example`. Email delivery and real Turnstile checks require working provider
credentials; test fixtures alone cannot verify external delivery or browser reputation.

## Validation — 2026-11-11

- `pnpm test:client`: 13 database/security scenarios pass, including separate-process
  submission races, transaction rollback, hosting-day boundaries, suspension escalation,
  verification reuse/expiry, resend idempotency and fixture-backed Turnstile validation.
- `pnpm test:client:http`: eight production HTTP scenarios pass, covering session/kind
  isolation, permissions, immutable thoughts, author/CMS deletion, the empty All-status
  filter, account deletion and future-message behavior before its subsequent disablement.
- Scoped ESLint/Stylelint fixes, repository ESLint, TypeScript, Prisma validation and
  the Webpack production build pass. Next.js still reports the existing middleware
  filename deprecation; that unrelated convention was not changed.
- Browser checks cover EN/VI auth/status copy, a 390px viewport, both email previews,
  CMS list/detail/create and revoke-ban confirmation, full map submission, author
  deletion/cancellation and cross-tab logout/account-switch privacy. The invisible title
  no longer intercepts the sign-out button. No application console errors were observed.
- Real Resend delivery and real Turnstile challenges remain unverified without provider
  keys. Provider success/failure, token checks and retry behavior were tested with fixtures.
- Development schema synchronization removed retired blacklist tables and migration
  metadata. All original columns/records in the nine protected tables match their
  pre-change fingerprints: 223 thoughts, two CMS users/credentials, one existing CMS
  session, two roles and two role assignments; empty existing tables remain empty.
- Test accounts/roles/thoughts and browser tabs/windows were removed, test server/proxy
  processes stopped, and the cleanup command ran successfully. No host cron was installed;
  configure the documented hourly schedule when deploying.
