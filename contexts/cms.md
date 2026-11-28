# CMS specification

Dear World’s CMS is the internal workspace for reviewing thoughts, managing client accounts and assigning staff permissions. Pages live under `/cms` and APIs under `/api/cms`. Update this document when changing a CMS contract.

## Access and navigation

Staff sign in with a username and password. Protected pages validate the CMS session on the server before rendering. APIs independently check the active account and its current permissions. Effective scopes combine the account’s roles. System accounts and roles are protected from ordinary administration.

`services/constant.ts` defines page paths. `services/permission.ts` defines permission keys, module actions, protected-route rules and landing priority. Each protected page uses `createProtectedPage` and receives its resolved permissions. The sidebar and action controls use those same rules. The landing order is Dashboard, Submissions, Client users, Accounts, then Roles. Staff without access to any module see the no-access state.

| Page | Purpose |
| --- | --- |
| `/cms` | Dashboard, subject to `dashboard.show` |
| `/cms/submissions` and `/cms/submissions/detail` | Review, create, moderate and delete thoughts |
| `/cms/client-users` and `/cms/client-users/detail` | Search client accounts and manage their status |
| `/cms/accounts` and `/cms/accounts/detail` | Manage staff accounts, role assignments and password resets |
| `/cms/roles` and `/cms/roles/detail` | Configure roles from the permission catalog |
| `/cms/profile` and `/cms/profile/change-password` | View the signed-in identity and change its password |
| `/cms/general` | Set the interface language |
| `/cms/login` | Sign in or redirect an authenticated user to their landing page |

Detail pages create a record when the URL has no ID and load an existing record with `?id=...`. The server provides the initial identity to the provider-scoped CMS store. Logout and session expiry clear private query state. Cross-tab logout returns other CMS tabs to sign-in.

## Module behavior

**Dashboard.** Summary cards count total, publicly visible, awaiting inspection, valid and invalid thoughts. Counts use creation dates and current moderation state. Publicly visible overlaps with valid. Metric links require permission to view submissions and carry the relevant status or validity filters. Summary and trend load independently. Both use calendar periods in the browser’s time zone. The trend fills empty intervals and offers an accessible data table.

**Submissions.** Staff can filter by description, publication status and validity. Coordinates link to the public map, where ordinary visibility checks apply. Creation accepts description, coordinates and initial state. Existing content, coordinates, weather and provenance are read-only. Publication and validity have independent permissions. Deletion requires `submission.delete`.

New thoughts default to `published` and `need-inspect`. Creating or moderating a thought into a published, non-valid state requires explicit confirmation. The API returns 409 with `errors.confirmPublish` and `details.nonValidCount` when confirmation is missing. The UI confirms the affected count before sending `confirmPublish: true` and handles stale counts from the server. Bulk moderation accepts deduplicated IDs and exactly one status or validity change. Bulk moderation and deletion are atomic.

**Client users.** The list supports email search and a status filter. Existing email and password are read-only. Creating an account, changing its status, deleting it and revoking a ban each require the corresponding permission. Choosing a non-default initial status also requires status-change permission. A verified account retains its verification. Client status audit fields identify the latest change and its CMS actor when available.

The detail panel places the account email, reference and status above two sections titled Email verification and Activity and limits. Narrow screens stack the sections and move the status below the account identity. The status dropdown is at most `14rem` wide in both the detail and creation forms.

**Accounts and roles.** Staff accounts can hold multiple roles. Account creation and editing use session-authorized role options. Password reset has its own permission. Deactivation and administrative password reset revoke sessions. A self-service password change requires the current password and revokes other sessions. Roles assign code-defined permissions through a module matrix with standard actions and module-specific extras. Assigned roles are protected from deletion.

### Dashboard periods

Dashboard summary offers seven days, thirty days and all time. Trend has its own thirty-day and all-time options. Both default to thirty days. All-time trend uses daily buckets through ninety calendar days of history and monthly buckets thereafter, including the current partial interval. Links from summary cards transfer moderation filters only. The chart and its data table report the same counts.

## Lists and forms

Each CRUD list owns its header, breadcrumbs, columns, row actions, selection and table composition. Use `useCRUDPage` for list queries, URL state and deletion. Committed search, filters, page and page size survive navigation. Search and filter changes return to the first page. Empty results use page 1. Deletion clamps the current page to the available range.

Every list declares `createdAt` immediately before Actions. Use `common.createdAt` and `formatDateTime` for `HH:mm dd/MM/yyyy` in the browser time zone. Center the Actions heading and cells. Navigation uses links and mutations use buttons. Icon controls need localized tooltips and accessible names.

Forms use React Hook Form and shared Yup schemas. Keep labels, field errors, focus handling and pending states accessible in both languages. A detail form hydrates for its record identity and preserves edits during background refreshes. Destructive actions require confirmation. Failed mutations preserve user input or selection. The UI owns confirmation, query invalidation, navigation and logout broadcasting.

The CMS sets `--cms-control-height` to `36px` on `.cms` and `.cms-popup`, including dialogs rendered through a portal. Inputs, buttons and selects use this height by default. Use an explicit size variant, a height utility or component CSS for a control that needs a different height. Checkboxes keep their compact size, and multiselects use the default as a minimum so selected values can wrap.

### Search, selection and dialogs

Search keeps the draft in the input. After 350 ms it commits the trimmed value using history replacement. Manual submission cancels the timer and can refresh an unchanged query. Pagination and filter changes push history entries. Browser navigation restores the controls and cancels stale drafts.

Table selection is controlled by the page. Select All applies to eligible rows. Bulk actions receive the selected records, and built-in deletion receives their IDs. Cancellation, failed requests and a callback returning `false` preserve selection. A successful operation clears it. Row links remain keyboard accessible independently of selection.

CMS confirmation dialogs use the shared modal controls. Keep focus inside the active dialog, prevent duplicate submissions during pending callbacks and restore focus to the opener on close. Localize dialog actions, field errors, tooltips and accessible labels through the CMS message catalog.

### Permission editing

The role matrix groups Show, Create, Update, Delete and extra permissions by module. A module toggle changes that module’s available permissions and preserves the others. System roles are read-only. The protected system account is excluded from lists and ordinary detail, update, reset and deletion operations. The role-options endpoint supports account forms without granting access to the Roles management page.

## API and service contracts

CMS components call named functions from `services/cms/<module>/index.ts`. Service modules own endpoint URLs, HTTP methods, ID encoding and payloads, accept optional `ApiRequestOptions`, and keep response types in `types.ts`. Server helpers in `app/api/_handlers/` enforce session, permission and trusted-origin requirements.

| Resource under `/api/cms` | Operations |
| --- | --- |
| `auth` | POST login, logout and change-password |
| `dashboard` | GET summary and trend with period and time zone |
| `accounts`, `roles` | GET lists and details, POST creation and bulk deletion, PATCH updates. Accounts also support POST password reset by ID. |
| `nopermission/options/roles` | GET assignable roles with a valid CMS session |
| `submissions` | GET lists and details, POST creation, PATCH moderation, POST bulk moderation and deletion |
| `client-users` | GET lists and details, POST creation, PATCH status, POST revoke-ban by ID and bulk deletion |

Paginated APIs return `{ items, metadata: { page, pageSize, total, totalPages } }` using the shared pagination types. Pages are 1-based. Empty results have zero items and one page. CMS records expose ISO creation timestamps. Staff changes to submissions, roles and accounts record the updater and update time. Audit values are for display and traceability. Authorization uses the active session.

API errors carry a localized error key and optional field errors or conflict details. Forms map field errors to their inputs. A protected 401 ends the CMS session in the UI. A 403 reports missing permission. Server permission checks apply to direct requests as well as actions initiated by the UI.

The app-wide error screens open a report draft addressed to `support@dearworld.space`.
