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
The registration form requires a matching confirm-password value. It is validated
locally and excluded from both the API payload and any CAPTCHA retry payload.
Login does not require or display this field; switching form modes clears it.
Login and registration slide horizontally in opposite directions when switching.
Reduced-motion preferences disable the transition; entered email/password values persist.
Both authentication configurations and every protected lookup enforce the account kind.
Client and CMS sessions have independent secrets and cookie prefixes. Cookies are
HttpOnly, SameSite=Lax and Secure in production, with no cookie cache or sliding refresh.
The server reads current account status for each protected request.
Tokens/password hashes never enter public DTOs or client storage.

Explicit public endpoints under `/api/client/auth`:

- POST `register`: email/password, optional locale and CAPTCHA token. Checks stored
  email suppression and recipient DNS after admission/CAPTCHA/creation allowance,
  before hashing the password or creating an unverified account. Then starts a session
  and attempts its initial verification email.
  Duplicate emails return 409 without changing credentials or sending another email.
- POST `login`: same credentials; restricted accounts can log in to see their status.
- POST `logout`: revokes the current client session only.
- GET `session`: `{ user: ClientIdentity | null }`, including sidebar availability.
- POST `resend`: authenticated, unverified account only; optional locale.
- GET `verify?token=...`: consumes verification and redirects to `/?verification=...`.

Client auth and thought mutations share the same-origin check in
`app/api/_handlers/clientHttp.ts`, including the optional `SUBMISSION_PUBLIC_ORIGIN`
override. Login never sends email implicitly.
Successful verification preserves an existing session; it does not sign another browser
into the account. Password recovery is not part of this feature.

## Limits and restriction rules

Values come from [`CLIENT_LIMITS`](../app/api/client/constant.ts), except the thought
length limit in [`constants.MAX_DESCRIPTION_LENGTH`](../app/api/constant.ts).

| Flow | Rule | Limit and behavior | Scope |
| --- | --- | --- | --- |
| Login / registration | Password length | 8–128 characters. Invalid payloads consume a hard-limit request but do not affect the CAPTCHA counter. | Per request |
| Login | Request cap | Maximum ten same-origin POSTs within a rolling 30 minutes. The 11th starts a fixed 24-hour login block. | Per IP, login only |
| Registration | Request cap | Maximum five same-origin POSTs within a rolling 30 minutes. The sixth starts a fixed 24-hour registration block. | Per IP, registration only |
| Registration | Account creation cap | Maximum ten committed account creations within a rolling 12 hours. Further creations wait until the oldest creation leaves the window. Deletion does not restore allowance; CMS-created accounts do not count. | Per IP |
| Login | CAPTCHA threshold | After five credential failures within a rolling five-minute window, the sixth attempt requires invisible Turnstile. Successful login and passing CAPTCHA do not clear earlier failures. | Per IP, login CAPTCHA counter |
| Registration | CAPTCHA threshold | The first three requests passing payload validation proceed without CAPTCHA; the fourth within a rolling five-minute window requires invisible Turnstile. Requests passing any required CAPTCHA are counted before account creation, including duplicate-email and creation-quota failures. Passing CAPTCHA does not clear the counter. | Per IP, registration CAPTCHA counter |
| Login / registration | Session lifetime | Seven days from session creation, without sliding renewal. | Per session |
| Registration / verification | Verification deadline | Seven days from account creation. All verification links share this deadline; resending does not extend it. Expired unverified accounts are rejected and deleted on access or by scheduled cleanup. | Per account |
| Verification email | Send cooldown | At least 60 seconds between send attempts, including retries after delivery failures. | Per account |
| Verification email | Send allowance | Four durable send slots: the initial email and three resends. A failed delivery still reserves its slot. Exhaustion returns `429 resendLimit` unless a pending slot can be retried. | Per account |
| Verification email | Pending delivery retry | Reuse the pending slot, token and Resend idempotency key within 24 hours of slot creation, subject to the cooldown and verification deadline. | Per send slot |
| Submission | Account eligibility | A live session and verified account are required. Unverified, suspended and banned accounts cannot create thoughts. | Per account |
| Submission | Content length | 1–600 characters after trimming. Invalid payloads are rejected before quota and rejection counting. | Per request |
| Submission | Daily allowance | Three successful creations per hosting-server calendar day. Resets on request when the day changes; `TZ` must match across instances. Failed persistence consumes no allowance; deletion restores none. | Per account |
| Submission | Cooldown | At least five minutes between successful creations, including across the daily boundary. Quota/cooldown rejections return `429 daily-limit` or `429 cooldown`. | Per account |
| Submission | Repeated quota/cooldown rejections | The 11th rejection within a rolling ten minutes triggers a restriction and clears the rejection counter. Other validation/authentication errors do not count. | Per account |
| Submission | Restriction escalation | First and second suspensions last seven days; the third suspension trigger bans immediately and resets the suspension count. Manual suspensions count; an already-active suspension adds no strike. Expiry restores verified status on access while retaining the count. Only an authorized revoke-ban action can restore a banned account. | Per account |

Request admission runs after the same-origin check and before JSON parsing, CAPTCHA,
password work or account creation. Every admitted POST counts, including malformed
payloads, successful logins, unknown emails, missing/invalid CAPTCHA and automatic
CAPTCHA retries. A challenge and its retry consume two requests. Active-block requests
are rejected without extending the block. Blocks are action-specific and never change
account status, restrict an email across IPs or revoke existing sessions.

CAPTCHA failures stop credential checking/account creation and do not increment the
separate CAPTCHA attempt counter. Passing CAPTCHA never resets or bypasses hard limits.
Creation-quota rejections still consume registration requests and can trigger its
one-day block. Already-admitted work may finish; public account insertion rechecks
the active block and creation allowance atomically.

Hard-limit responses are HTTP 429 with
`{ code: "authRateLimited", retryAt: "<ISO timestamp>" }` and a `Retry-After` header
in whole seconds, rounded up with a minimum of one second. Active one-day blocks
take precedence over creation-quota retry times. Otherwise creation-quota retry time
is the oldest retained creation plus 12 hours. The existing form error area shows
localized, nontechnical text and does not automatically retry these errors.

## Verification email

Resend delivers localized HTML/plain-text email from a configured verified domain.
Random verification IDs and a secret-derived token allow identical retry payloads;
only token hashes are stored in the existing Verification table. Tokens are bound to
an account ID and cannot verify a later account reusing the same email. Verifying
consumes every outstanding link. Send allowances, retries and expiry follow the table above.

Registration slides to “We're checking your email” after local form validation. The
same POST performs all checks; no public email-check endpoint exists. Temporary DNS
failure (`503 emailDnsTemporary`) shows Retry; invalid domains (`422 emailDomainInvalid`)
and suppressed recipients (`422 emailUndeliverable`) show Edit email. Credentials stay
in component memory and confirm-password is never sent. CAPTCHA remains available
on the checking panel and retry obtains a fresh token when required. DNS retries and
CAPTCHA retries still count as new requests under the existing hard limits.

DNS uses a five-second overall deadline, cancelling outstanding queries. Ordinary MX
records are accepted; absent MX permits A/AAAA fallback. NXDOMAIN, explicit Null MX
and no receiving route reject the address; resolver errors/timeouts remain retryable.
DNS cannot prove that a mailbox exists. Both initial send and resend check suppression
and DNS outside transactions, then recheck account eligibility, cooldown, allowance
and suppression under the account lock before reserving a slot. Rejected preflight
consumes no email slot. An email failure after account creation preserves the account,
session and pending slot; registration returns `201` with `emailError: true` and optional
`emailErrorCode` rather than claiming successful delivery. Existing idempotent retry
payloads and keys are preserved, including for slots created before this change.

Private `ClientIdentity` includes `verificationEmailBlocked`; a suppressed address has
`canResend: false`. Suppression blocks email only, never verification of an existing
valid link or moderation/account status. Existing verification remains permanent.

### Resend webhook setup

Set `RESEND_WEBHOOK_SECRET` to the endpoint signing secret. In the Resend dashboard,
configure the environment's public HTTPS `/api/webhooks/resend` URL and subscribe to
`email.bounced`, `email.complained`, and `email.suppressed`. Use separate endpoints and
secrets for development and production. The endpoint authenticates the raw body and
timestamp with Svix; browser cookies and the browser same-origin wrapper are not used.
See [signature verification](https://resend.com/docs/webhooks/verify-webhooks-requests).

Permanent bounces (`data.bounce.type: Permanent`), complaints and provider suppression
create normalized address-level `ClientEmailSuppression` records. Temporary bounces,
delayed delivery, delivery success and unrelated events do not change suppression.
The first recorded blocking event retains its reason, provider email/event identifiers
and timestamp. Atomic conflict-ignore inserts make duplicate, concurrent and reordered
events harmless. Records have no account foreign key, survive account deletion/cleanup,
and are only cleared after operational review; no CMS suppression editor is provided.
When clearing a record, reconcile the provider's suppression list too. Do not subscribe
this endpoint to an unrelated Resend account: signed adverse events apply at address level.

The endpoint returns `204` after persistence (or an intentionally ignored event), `400`
for invalid signatures/payloads, and `503` for missing configuration or persistence
failure so Resend can retry. Feedback protects subsequent sends after arrival; it cannot
cancel a send already in flight. Old delivery history is not backfilled automatically.

### Auth and limit review opportunities (not implemented)

- Retry accounting: registration permits five requests per 30 minutes and blocks on
  the sixth for 24 hours. DNS Retry and automatic CAPTCHA retry each consume requests;
  evaluate separate transport-abuse and logical-registration budgets before changing policy.
- Error classification: `signInClient` maps every Better Auth `APIError` to credentials;
  distinguish invalid credentials from service failures to avoid false login-failure counts.
- Concurrent login checks: simultaneous requests can pass the CAPTCHA threshold before
  failed credential checks finish. Evaluate bounded in-flight accounting without keeping
  database locks/connections during password work.
- Database/password work: registration hashes then verifies the same password for sign-in,
  and account/pending-verification state is reread across several transactions. Measure query
  counts and investigate supported session creation and request-local reuse.
- Delivery accounting: provider configuration is currently validated after reserving a slot.
  Evaluate earlier validation and richer provider-error classification.
- DNS efficiency: measure lookup traffic before adding a bounded short-lived domain cache
  or deduplicating simultaneous domain lookups.

Run `pnpm test:client-email` for deterministic DNS/signature/persistence-boundary tests.
The opt-in development-database suite uses isolated fixture addresses/IPs, mocked
DNS/provider responses, and removes its own records:

```sh
CLIENT_EMAIL_INTEGRATION=1 node --conditions=react-server --import tsx --test tests/client-email.integration.test.ts
```

## Submission policy

For POST `/api/submissions`, nullable `clientUserId` is the ownership authority;
the legacy `author_uuid` column is removed. Old anonymous thoughts remain unclaimed.
A shared per-user PostgreSQL advisory
transaction lock serializes account changes, creation and quota updates, enforcing
the table's limits across concurrent requests and processes.
Cooldown and daily-limit UI use different copy without exposing duration/allowance.
Suspension may display its expiry. Banned UI provides a configured mailto appeal.

Thought content, coordinates and atmosphere are immutable. Public PATCH is absent
(405). Author DELETE checks live account ownership; suspended/banned authors can
still delete and read their history. CMS may delete with `submission.delete` and
moderate publication/validity with their respective permissions. CMS PATCH rejects
content, coordinate, ownership and provenance fields.

Client history/cache keys follow the signed-in account. Session changes cancel/remove
private history queries and refresh personalized map/detail visibility across tabs.
Account deletion cascades credentials/sessions/limiter state and detaches ownership
with SetNull, preserving thoughts and future messages. Legacy future-message routes, visitor services,
identity cache/bootstrap, signed anonymous cookies and limiter have been removed.
Future messages remain disabled until implemented with the new client-account flow.
Their storage now uses nullable `clientUserId` referencing `User`, indexed and paired
with `onDelete: SetNull`, matching submission ownership. The legacy `author_uuid`
column and index are removed; existing anonymous messages remain unclaimed with
`clientUserId: null`. Future handlers must derive ownership from a verified client
session, enforce the client account kind and never accept ownership IDs from callers.

## Abuse state and cleanup

Compact `ClientSubmissionLimit` and expiring `ClientAuthIpLimit` records persist across
restarts/processes. No account event-history table is maintained. Status audit fields
store the latest status change time and CMS user ID (null means system); limiter
updates do not overwrite that audit.

Each `ClientAuthIpLimit` row is keyed by normalized, hashed IP plus login/register action.
It retains up to five login or three registration CAPTCHA timestamps, 11 login or six
registration request timestamps, and ten successful-creation timestamps (registration
only), plus nullable `blockedUntil`. Existing histories still count toward the reduced
thresholds; changing the constants does not reset an active block.
Short advisory-lock transactions protect request admission; rejection is returned only
after the block is committed. CAPTCHA verification and password hashing/checking run
outside those transactions. Public account/credential insertion and recording the
successful creation share the same registration IP transaction, preventing concurrent
requests from exceeding ten creations. Rollbacks/duplicate emails consume no creation
slot; session or email failures after account commit still consume it.

`expiresAt` is the latest expiry across all retained histories and the active block.
Expired timestamps stop counting immediately on access, independently of cleanup.
New request and creation histories begin empty when these columns are first added;
historical IP attribution cannot be reconstructed.

Turnstile tokens are validated server-side for hostname/action and are single-use.
IP extraction trusts only proxy-overwritten X-Real-IP in production;
missing/invalid production IP fails safely. Configure the reverse proxy to overwrite
that header rather than forwarding a caller's value. Siteverify failure does not bypass
the challenge. `/privacy` references Cloudflare's required privacy addendum.

Run `pnpm client-users:cleanup` hourly from host cron, using the application directory
and the same environment as the server, for example:

```cron
0 * * * * cd /path/to/world-of-moments && NODE_ENV=production /absolute/path/to/pnpm client-users:cleanup
```

This command is idempotent, rechecks account expiry under the same per-user lock,
and removes auth-IP rows only after all retained windows and blocks expire, along with
expired client verification records. Active blocks are additionally guarded during
deletion. It does not delete CMS accounts, verified clients, thoughts or future messages.
The command does not install its own cron schedule.

## Development schema workflow

Prisma schema files are the source of truth. Migration files and the old browser/network
blacklist module/tables are removed. Use `pnpm db:push`, then `pnpm prisma:generate`;
there is no migration deployment or automatic reset flow. Inspect any data-loss prompt
before accepting it: only intentionally retired tables may be discarded. Preserve
submissions, future messages, CMS accounts, credentials, roles and moderation records.

Configure independent `CLIENT_AUTH_SECRET`/`BETTER_AUTH_SECRET`, Resend sender/key/webhook secret,
Turnstile public/secret keys, trusted origins, support email and consistent hosting TZ.
See `.env.example`. Email delivery and real Turnstile checks require working provider
credentials.
