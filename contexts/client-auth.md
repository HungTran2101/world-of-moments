# Client accounts and ownership

Visitors can read the map anonymously. A verified client account can publish thoughts and open its private history. The server derives ownership from the active client session. A CMS login grants access only to the administration workspace.

## Account flow

The sidebar offers registration and sign-in with email and password. Registration validates password confirmation locally and sends the credentials and selected locale to the server. A new account receives a verification link. Opening it shows a localized result, and returning to the map refreshes the account status. Verifying in another browser does not sign that browser in.

During registration, a temporary email-check failure offers Retry. An invalid or undeliverable address offers Edit email. The form keeps the entered credentials in component memory while the user corrects the address. Restricted accounts can sign in to read their status.

## Authentication API

Routes are under `/api/client/auth`. Client mutations require the trusted application origin.

| Method and route | Contract |
| --- | --- |
| POST `register` | Create a client account, establish a session and request a verification email. Duplicate email returns 409. |
| POST `login` | Authenticate the client and return its identity. |
| GET `session` | Return the current user and sidebar availability, or `{ user: null }` for a guest. |
| POST `resend` | Request another verification email for the signed-in, unverified account and return the next send time. |
| POST `verify` | Consume the submitted token and return a success or invalid result. Service failures allow a retry. |
| POST `logout` | Revoke the current client session. |

## Visibility and author actions

| Thought state | Map and direct links | Author’s private history |
| --- | --- | --- |
| Published and valid | Visible to everyone | Visible |
| Published and awaiting review or invalid | Visible to the signed-in author | Visible |
| Unpublished | Hidden, including from the author’s map | Visible |

Public responses omit identities and exact timestamps. Private history includes the author’s creation times, supports search and pagination, and offers navigation to thoughts visible on the map. Changing accounts clears previous private queries and refreshes map visibility across tabs.

Submitted words, coordinates and weather are immutable. Authors can delete their own thoughts after confirmation, including while suspended or banned. CMS deletion and moderation follow the [CMS permission rules](cms.md).
