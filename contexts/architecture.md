System Overview

The system is built as a single Next.js application that handles both frontend and backend responsibilities.

Primary components:

Next.js frontend UI
Next.js App Router Route Handlers
PostgreSQL database
Prisma ORM

The current external services are map tiles/styles and Open-Meteo for weather. Realtime infrastructure remains optional and is not connected.

Tech Stack

Frontend + Backend Framework

Next.js 16.4.3 (App Router; Turbopack for development, Webpack available with `pnpm dev --webpack`)
React 19
TypeScript
next-intl for English and Vietnamese, with a cookie-backed locale

Database

PostgreSQL
Prisma ORM

Map / Visualization

MapLibre GL for the map and adaptive globe, using the local styles/map-style.json style
EOX Sentinel-2 cloudless 2016 raster tiles for the globe surface, with a Canvas 2D star field

Animation

Framer Motion, GSAP, and browser animation APIs

The UI should prioritize smooth transitions and motion design, especially on desktop.

Frontend Responsibilities

The frontend handles:

map rendering
marker display
submission UI
localized writing guidance and shared error dialogs
English/Vietnamese language switching

Personal history is connected through the toolbar. Subtle realtime updates remain outside the connected home-page flow.

Main UI modules:

Map Module

MapView owns the MapLibre instance and the writing pin. It dynamically loads on the client, handles pan/zoom and click-to-place interaction, and mounts ThoughtModal with an explicit open prop.

Zooming out reveals an EOX satellite globe, atmospheric rim, and camera-linked star field. SPACE_FADE_START_ZOOM and SPACE_FADE_END_ZOOM in spaceStyle.ts define the shared transition range. The same map interpolates from a spherical projection to Mercator while satellite imagery, atmosphere, stars, and labels blend into the themed basemap, retaining the camera, sources, and writing pin. The raster source's maximum zoom follows the rounded-up fade end. The minimum zoom adapts on resize to keep the Earth near 65% of the viewport's shorter side. Thought bubbles, clusters, hover overlays, and the draft pin use 45% size through the fade start, then smoothly reach full size at the fade end; DOM visuals and WebGL hit areas share the same scale. Marker opacity uses an 8% multiplier at the viewport-dependent minimum zoom and returns to normal at the fade start, with the same curve for WebGL points, DOM bubbles, clusters, hover overlays, and the draft pin. Resizing updates both DOM and WebGL opacity bounds. Labels fade at world scale; covered DOM markers are hidden behind the Earth. Clicking space cannot place a pin. The space background uses bright semantic text/icon tokens while retaining the selected map-time palette and glass. Stars redraw only when the camera or viewport changes; listeners are removed before map destruction. EOX imagery attribution is visible in the map disclaimer.

The glass Toolbar has a personal-history action and two dropdown actions: language and map time (Auto, daytime, evening, and nighttime). Its time choice lives in useSystemStore and is saved in localStorage as pm_map_time_mode. MapView restores valid saved choices before map creation; a fresh page uses Auto when the saved value is missing, invalid, or storage is unavailable. Auto uses the browser's local time: daytime 06:00–14:59, evening 15:00–17:59, and nighttime 18:00–05:59. MapView rechecks each minute in Auto and on focus/visibility return; manual choices hold until changed. Effective stage changes use a one-second circular reveal from the toolbar time icon across the whole viewport, including themed text and controls. The new palette appears inside the expanding circle while the old palette remains outside. A radial alpha mask blends only a 24px feathered boundary, keeping the map and text sharp. Its registered radius uses fast–slow–fast easing and expands far enough for the opaque interior to cover every viewport corner before completion, without fading the whole page. MapView changes basemap paint colors with zero transition duration, synchronizes data-map-time and the html .dark class, and redraws the map before capturing the new view. The map instance, camera, sources, and markers are retained. Initial load, reduced motion, unsupported browsers, hidden pages, and failed transitions switch immediately; unchanged stages do not animate. Rapid selections settle on the latest choice, and resize/unmount cancels the reveal. Nighttime uses the dark text/icon tokens in styles/_variables.scss; daytime and evening use the light tokens. Glass keeps the same transparent backing and refraction in every stage, including portaled panels and fallback glass. Shared buttons, loading dots, and map notices read these CSS tokens rather than separate store colors.

submissionsLayer loads id/lat/lng positions for the current viewport on initial load and moveend. It normalizes wrapped longitudes, cancels obsolete requests, and skips duplicate bounds. Clicking a cluster expands it; clicking an individual marker opens its thought.

MapLibre clusters the downloaded GeoJSON in the browser (clusterMaxZoom: 5, clusterRadius: 30). Clustering reduces rendering density; it does not reduce the number of positions returned for that viewport.

ThoughtModal fetches the selected thought's description and weather only when opened. It aborts obsolete requests and provides skeleton, retry, and not-found states.

After loading a thought, ThoughtModal replaces the current URL's `thought`, `lat`, and `lng` query parameters with its ID and coordinates, preserving other parameters and the hash. Closing the modal removes those navigation parameters. Refreshing an open thought revisits it through the existing Take me there action; refreshing after closing stays on the map.

Map cleanup removes request/listener/animation work, overlays, layers, sources, and images when the relevant owner is destroyed or retried.

Submission Module

SubmissionForm accepts a description of up to 600 characters and requires a placed pin. The service sends description, lat and lng; ownership comes from the verified client account session; the server fetches weather before saving. There is no title input in the current flow.

usePinStore holds draft coordinates. useSubmissionMapStore exposes the map operations needed by the form; MapView retains ownership of the map lifecycle.

During submission, the writing pin is hidden and map interactions are paused while the bubble flies. A successful save clears the draft, refreshes viewport positions, and reveals them after arrival. The map then zooms beyond the clustering threshold while preserving a closer existing zoom. A failed save preserves the draft and pin; a refresh failure after saving is reported separately.

Client API writes use TanStack Query `useMutation`. Public submission preparation
runs in `onMutate`; its `onSuccess` invalidates account-scoped history and completes
the existing bubble/marker/camera sequence. `onError` keeps stage-specific errors,
and `onSettled` releases the map and restores focus. Unmount still aborts the
request/animation and releases the map independently. Locale mutations refresh
the router on success and report failures through the existing error UI.

Errors are handled through the shared ErrorProvider/ErrorModal and Next.js route/root error boundaries. The empty-description validation remains beside the textarea.

History Module

HistoryPanel opens from the toolbar and loads account-owned private history with
10-item pagination and debounced description search. Guests can open the login sidebar.
History includes exact timestamps and author deletion with confirmation. Take me there
closes history and opens the thought on the map; unpublished thoughts cannot navigate.
Client-account changes clear old private queries and reload personalized map visibility.
Submitted content is immutable; public PATCH is unavailable.

Realtime Module

Planned module; no WebSocket, SSE, or polling subscription is currently connected. Existing map reloads follow viewport changes or a local submission.

listens for new submissions

Animation Layer

Used to create:

marker appearance animation
map UI transitions
popup transitions
subtle environmental motion

Animations should feel fluid and calm, not flashy.

Backend (Next.js Server)

Backend logic runs inside the Next.js server layer.

Internal CMS API logic lives in native endpoint files under `app/api/cms`, with
shared server-only auth/HTTP utilities in the private `app/api/_handlers/` folder.
Its server-only page factory lives in `components/ProtectedPage`. Each native CMS page selects its content component with
`createProtectedPage(Component, ROUTE_PATHS.KEY)`; the factory validates the session
and resolves permissions before rendering content. `services/constant.ts` holds
fixed service constants, including CMS paths. `services/permission.ts` owns the
permission catalog, module definitions, exhaustive protected-route permission map
and landing policy, with no component registry. `services/routes.ts` retains landing
navigation helpers and route types. Shared server-only API helpers live in
`app/api/_shared.ts`. Shared API constants live in `app/api/constant.ts`, and client
auth constants live in `app/api/client/constant.ts`. Both are plain data modules
available to frontend and backend code. `_handlers` and its subfolders
are excluded from routing, and every handler retains its `server-only` guard.
CMS page components and reusable UI follow the existing `components/` and `components/shared/` structure, with
colocated `index.scss` styles. Permission/route/schema/query definitions live in
`services/`, CMS domain requests in `services/cms/{accounts,roles,submissions,auth}/`,
transport/common types in `services/shared/`, and session state in
`store/cmsStore.ts`. See `contexts/cms.md` for the complete ownership map.

CMS authentication uses the database-backed HttpOnly session cookie. The server
passes plain user information and scopes into the CMS store; APIs authorize the
live session and permissions directly, without JWTs or a token refresh flow.

CMS UI calls named service functions; endpoint URLs, methods and request encoding
belong to services. Role options use the session-only
`/api/cms/nopermission/options/roles` endpoint through the roles service.

The accounts, roles, auth, submissions and locale service modules use
`index.ts` for request functions and `types.ts` for module-owned types. Consumers
import runtime services and type-only definitions separately.

Responsibilities:

store submissions
provide map queries
enforce rate limits
fetch weather data
Future messages are disabled pending a new client-account-based flow; legacy runtime
code is removed, and unlocking is not implemented.

Implemented submission Route Handlers:

POST /api/submissions

Validates description (1–600 characters) and coordinates, derives ownership from a verified client account session, and atomically saves the thought with its quota counter. See `contexts/client-auth.md` for daily allowance, cooldown, suspensions and bans.

GET /api/submissions

Requires west, south, east, and north viewport bounds; returns only id, lat, and lng.
Bounds crossing the international date line are supported.

Invalid bounds return 400. The query has no fixed row cap, and public positions omit ownership IDs and timestamps.

GET /api/submissions/history

Requires a client-account session and accepts search/page parameters. Returns account-owned
thoughts, newest first, in the shared `{ items, metadata }` pagination envelope (10 per page).
Empty results have one page, and requested pages are clamped. Responses are private/no-store
and include exact timestamps only for the author.

GET /api/submissions/:id

Loads a single visible thought's description and weather when its modal opens.

Returns id, description, lat, lng, weather_summary, and weather_code; returns 404 when missing or hidden. Both public GET handlers use compressedJson to negotiate Brotli/gzip, generally starting at 1 KB, and vary responses by Accept-Encoding.

PATCH /api/submissions/:id

Not supported (405). Submitted content, coordinates and weather cannot be edited.

DELETE /api/submissions/:id

Requires a client session and matching nullable `clientUserId`; returns 204 after deletion.
History provides a confirmation UI. CMS deletion separately requires `submission.delete`.

POST /api/locale

Validates vi/en and stores the choice in a one-year locale cookie. The language selector refreshes the page after changing it; Vietnamese is the default.

Future-message endpoints are temporarily unavailable: GET/POST `/api/future-message`
return 404. POST `/api/submissions/client-token` returns 405 via the existing
`/api/submissions/[id]` route and cannot initialize anonymous identity. The old handlers,
future-message/visitor services, browser identity cache/bootstrap, signed anonymous
cookies, identity-error constant and in-memory limiter have been removed, including
the temporary `app/api/_disabled/` archive. Existing messages are retained with nullable
`clientUserId` ownership; legacy anonymous messages remain unclaimed. Future messages
must use the existing client-account authentication when reimplemented. Client-account auth, map browsing,
thoughts and CMS routes remain active.

Database

Database: PostgreSQL

ORM: Prisma 7 with the PostgreSQL adapter and a pg connection pool

Current schema models (prisma/schema/):

Submission

id

description

lat

lng

weather_summary

weather_code

created_at

clientUserId (nullable)

updated_at

Submission uses a cuid ID and a 600-character description column. It has indexes on
clientUserId, the lat/lng pair and created_at. Nullable clientUserId references User
with SetNull deletion. weather_summary and weather_code are nullable. There is no
title or legacy author_uuid column in the current model.

FutureMessage (storage only; no active API/service)

id

clientUserId (nullable)

message

unlock_condition

created_at

unlocked_at

FutureMessage.clientUserId is indexed and references User with SetNull deletion.
Existing anonymous messages remain unclaimed; the legacy author_uuid column is removed.

Realtime Layer

Planned design below; no realtime transport is currently active.

Purpose:

Show new markers appearing on the map when someone submits.

Possible implementations:

WebSocket
Server Sent Events
short polling

Event payload should be minimal:

submission id
latitude
longitude

Clients fetch full data afterward.

Weather Service

Weather data is fetched when a submission is created.

Input:

latitude
longitude

Output:

weather summary
weather code

The backend converts weather data into atmospheric narrative text.

The current lookup calls Open-Meteo's forecast endpoint for current weather_code at the chosen coordinates, without a cache (revalidate: 0). It stores the WMO code and an English summary. If lookup fails, creation continues with "Posted on a quiet day." and code 0.

ThoughtModal prefers the localized weather sentence for a known code and falls back to the stored summary otherwise.

Security

Implemented protections:

Client account quotas, auth-IP request caps, creation allowances, temporary blocks and
CAPTCHA windows persist in PostgreSQL and are checked on the server. Login/registration
request admission precedes payload parsing and expensive operations. Public account
creation and its IP allowance commit atomically; CAPTCHA/password work does not hold
an IP transaction open. See `contexts/client-auth.md` for limits, retention and retry
responses. Submission creation and quota updates share a per-account transaction lock.
Public mutations check trusted same-origin requests; anonymous ownership IDs are never
accepted. CMS/client sessions use separate secrets/cookies and account-kind checks.
Legacy future-message anonymous identity and its in-memory limiter have been removed.
The same trusted-origin check now lives directly in `app/api/_handlers/clientHttp.ts`,
preserving the `SUBMISSION_PUBLIC_ORIGIN`/`NEXT_PUBLIC_APP_URL` runtime configuration
and cross-site rejection for client-auth and thought mutations. The removed
`SUBMISSION_CLIENT_COOKIE_SECRET` is no longer required.
See `contexts/client-auth.md` for lifecycle, CAPTCHA, proxy and cleanup contracts.

Zod validates public payloads and bounds; public GET/create DTOs select only safe fields.
Client-account deletion detaches thought ownership while retaining the published records.

Writing guidance is implemented in the sidebar. Manual CMS moderation is implemented; automatic content classification is not implemented.

Planned protection:

Optional profanity filter


Submission moderation and audit additions

Submission status is published/unpublished; validity is valid/invalid/need-inspect.
New records default to published + need-inspect. Submitted content is immutable. CMS has separate
status and validity permissions, creation and deletion; existing content is read-only
in CMS. See contexts/cms.md for API, warning and permission contracts.

Pins and direct thought GETs require published status. A valid submission is visible
to everyone; a non-valid published submission is visible only to its signed-in client
author. Invalid/missing sessions confer no extra access; client UUID headers/body fields confer none.
These reads are private/no-store and vary on identity and compression headers.
Client-account changes refresh visible positions without recreating the map. History retains
all owned states; unpublished entries cannot navigate to map details.

Submission createdBy/createdFrom and all three modules' updatedBy are derived by the
server. CMS DTOs expose updatedAt/updatedBy; historical updater names are null.
Public DTOs exclude client ownership IDs, CMS actor names and exact timestamps; private
history retains its existing owner-scoped timestamps. New record updater names
start with the creator. Updates and password changes stamp the actor transactionally;
login/session activity does not. Submission storage keeps updated_at; CMS DTOs use
updatedAt. Creation/update public responses now use explicit safe field selections.

Client authentication and schema maintenance

User.kind isolates CMS and client accounts in shared Better Auth tables. Nullable
Submission.clientUserId and FutureMessage.clientUserId reference User with SetNull
deletion, preserving records when an account is deleted. ClientSubmissionLimit
stores successful daily usage, last submission and bounded rejected-attempt timestamps;
ClientAuthIpLimit stores bounded login/register request and CAPTCHA timestamps,
successful registration timestamps and action-specific IP block expiry. User fields hold verification
send slots, status, suspension count/expiry and separate status audit data. There are
no blacklist or account event-history tables. Prisma schema files are synchronized
using `pnpm db:push` and `pnpm prisma:generate`; migration files are not retained.

Public registration checks recipient DNS and durable address-level suppression before
creating an account. Verification sends repeat preflight outside transactions and recheck
eligibility/suppression before reserving a slot. `ClientEmailSuppression` is independent
of users and retains the first permanent bounce, complaint or provider-suppression event.
`POST /api/webhooks/resend` verifies the raw payload/timestamp using Svix and
`RESEND_WEBHOOK_SECRET`; persistence precedes acknowledgment. Client identities expose
only `verificationEmailBlocked` and resend eligibility, never provider event details.
See `contexts/client-auth.md` for webhook setup, retry behavior and the deferred auth/limit review.
