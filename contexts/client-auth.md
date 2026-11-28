# Client accounts and ownership

Visitors can read the map anonymously. A verified client account can publish thoughts and open its private history. The server derives ownership from the active client session. A CMS login grants access only to the administration workspace.

## Account flow

The sidebar offers registration and sign-in with email and password. Registration validates password confirmation locally. After the form passes local validation, the sidebar obtains a fresh Turnstile token and sends it with the credentials and selected locale. A new account receives a verification link. Opening it shows a localized result, and returning to the map refreshes the account status. Verifying in another browser does not sign that browser in.

During registration, a temporary email-check failure offers Retry. An invalid or undeliverable address offers Edit email. The form keeps the entered credentials in component memory while the user corrects the address. Restricted accounts can sign in to read their status.

## Authentication API

Routes are under `/api/client/auth`. Client mutations require the trusted application origin.

Both `register` and `login` require a `captchaToken` for the corresponding Turnstile action. The server verifies the token and its hostname before handling the account. A valid request body with a missing or rejected token returns `403` with `captchaRequired`. Malformed requests and requests that include a token count toward the IP limit, including successful attempts. A valid request body missing only the token uses no attempt. A Turnstile service or configuration failure returns `503` with `unavailable`.

| Method and route | Contract |
| --- | --- |
| POST `register` | Create a client account, establish a session and request a verification email. Duplicate email returns 409. |
| POST `login` | Authenticate the client and return its identity. |
| GET `session` | Return the current user and sidebar availability, or `{ user: null }` for a guest. |
| POST `resend` | Request another verification email for the signed-in, unverified account and return the next send time. |
| POST `verify` | Consume the submitted token and return a success or invalid result. Service failures allow a retry. |
| POST `logout` | Revoke the current client session. |

Registration and resend send verification emails from `Dear World <no-reply@dearworld.space>` with `support@dearworld.space` as the reply address. The sidebar also opens a draft to support for account appeals and undeliverable verification emails. The addresses come from `emails/config.ts`.

If Resend rejects an email because its daily or monthly quota is exhausted, registration keeps the account and session and returns `201` with `emailErrorCode: "emailQuotaExceeded"`. The resend endpoint returns `503` with the same error code. The service refunds any new verification send it reserved for that request. A retry of a previously reserved send retains its original token and does not use an additional attempt. The resend cooldown still applies.

## Thought submission limits

`POST /api/submissions` enforces a five-minute cooldown and a maximum of three thoughts per hosting day. A rejected submission returns `429`, the `cooldown` or `daily-limit` code, an ISO `retryAt` and the `Retry-After` header. The sidebar switches from the form to the corresponding pause state and refreshes the session at the deadline. Tabs already editing may learn about a new limit on their next submission attempt.

The eleventh valid submission rejected by those limits in ten minutes triggers a seven-day suspension. The third time the account crosses the threshold, the server bans it from submission. The request that triggers the restriction returns `403` with `suspended` or `banned`.

## Visibility and author actions

| Thought state | Map and direct links | Author’s private history |
| --- | --- | --- |
| Published and valid | Visible to everyone | Visible |
| Published and awaiting review or invalid | Visible to the signed-in author | Visible |
| Unpublished | Hidden, including from the author’s map | Visible |

Public responses omit identities and exact timestamps. Private history includes the author’s creation times, supports search and pagination, and offers navigation to thoughts visible on the map. Changing accounts clears previous private queries and refreshes map visibility across tabs.

Submitted words, coordinates and weather are immutable. Authors can delete their own thoughts after confirmation, including while suspended or banned. CMS deletion and moderation follow the [CMS permission rules](cms.md).
