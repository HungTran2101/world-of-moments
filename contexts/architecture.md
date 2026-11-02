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

Map cleanup removes request/listener/animation work, overlays, layers, sources, and images when the relevant owner is destroyed or retried.

Submission Module

SubmissionForm accepts a description of up to 600 characters and requires a placed pin. The service sends description, lat, lng, and author_uuid; the server fetches weather before saving. There is no title input in the current flow.

usePinStore holds draft coordinates. useSubmissionMapStore exposes the map operations needed by the form; MapView retains ownership of the map lifecycle.

During submission, the writing pin is hidden and map interactions are paused while the bubble flies. A successful save clears the draft, refreshes viewport positions, and reveals them after arrival. The map then zooms beyond the clustering threshold while preserving a closer existing zoom. A failed save preserves the draft and pin; a refresh failure after saving is reported separately.

Errors are handled through the shared ErrorProvider/ErrorModal and Next.js route/root error boundaries. The empty-description validation remains beside the textarea.

History Module

The toolbar opens a non-modal, viewport-height HistoryPanel with toolbar-matching top and bottom margins on the right, wrapped in RefractiveGlass. Shared Radix dialog behavior handles Escape and focus restoration; CSS slide entry/exit respects reduced motion. Its title and 350 ms debounced search stay fixed above an independently scrolling list. TanStack Query owns page-based history data, cancellation, retry state, and caching scoped by saved UUID, search, and page. Each page contains up to 50 thoughts. Previous/next controls and the current/total page indicator stay centered in a footer outside the scrolling list. Changing search or UUID starts at page 1; only the selected page is rendered. History cards omit coordinates; the saved coordinates remain available to the map navigation action. Opening history never creates a UUID; missing or inaccessible storage shows a localized invitation to share. UUID changes are observed across tabs and after the first local submission. Successful creation invalidates history queries. Each thought has a Take me there action that closes history, moves the map to its coordinates beyond the clustering threshold while preserving closer zoom, and opens the existing thought modal after the camera arrives. Selecting another thought or starting a submission cancels an earlier visit; the draft pin is preserved. Author update/delete services and API handlers exist without connected author-management controls.

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

Internal CMS API logic lives in the root `handlers/` folder, with its server-only
page wrapper in `components/ProtectedPage`. CMS page components and reusable UI
follow the existing `components/` and `components/shared/` structure, with
colocated `index.scss` styles. Permission/route/schema/query definitions live in
`services/`, CMS domain requests in `services/cms/accounts/` and
`services/cms/roles/`, transport/common types in `services/shared/`, and session state in
`store/cmsStore.ts`. See `contexts/cms.md` for the complete ownership map.

CMS authentication uses the database-backed HttpOnly session cookie. The server
passes plain user information and scopes into the CMS store; APIs authorize the
live session and permissions directly, without JWTs or a token refresh flow.

The accounts, roles, future-message, submissions and locale service modules use
`index.ts` for request functions and `types.ts` for module-owned types. Consumers
import runtime services and type-only definitions separately.

Responsibilities:

store submissions
provide map queries
enforce rate limits
fetch weather data
Future-message create/list scaffolding exists; unlocking is not implemented.

Implemented submission Route Handlers:

POST /api/submissions

Validates description (1–600 characters), coordinates, and author_uuid. The form trims descriptions before sending. A successful create fetches weather, stores the row, and returns it with status 201. Creation is limited to one attempt per IP per 30-second rolling window; invalid attempts also consume the limit.

GET /api/submissions

Requires west, south, east, and north viewport bounds; returns only id, lat, and lng.
Bounds crossing the international date line are supported.

Invalid bounds return 400. The query has no fixed row cap, and public positions omit author_uuid and timestamps.

GET /api/submissions/history

Requires a valid x-author-uuid header and accepts search and page parameters (page defaults to 1). Returns a page of matching thoughts, newest first with an ID tie-breaker, as `{ items, metadata: { page, pageSize, total, totalPages } }`. All current and future paginated list APIs use this envelope and the shared `PaginatedResponse<T>` / `PaginationMetadata` types in `services/shared/pagination.ts`. Requested pages beyond the available range are clamped to the last page; an empty history has one empty page. Every page is filtered by the supplied UUID; description search is case-insensitive. Responses are private/no-store and omit author_uuid. This follows the existing local UUID ownership model, without accounts or sessions.

GET /api/submissions/:id

Loads a single thought's public description and weather when its modal opens.

Returns id, description, lat, lng, weather_summary, and weather_code; returns 404 when missing. Both public GET handlers use compressedJson to negotiate Brotli/gzip, generally starting at 1 KB, and vary responses by Accept-Encoding.

PATCH /api/submissions/:id

Supports description changes with author_uuid in the request body. It compares the supplied UUID with the stored author_uuid, returning 403 on mismatch and 404 when missing.

DELETE /api/submissions/:id

Checks x-author-uuid against the stored author_uuid and returns 204 after deletion. These mutation handlers are implemented without connected edit/delete UI.

POST /api/locale

Validates vi/en and stores the choice in a one-year locale cookie. The language selector refreshes the page after changing it; Vietnamese is the default.

The following future-message endpoints are create/list scaffolding only; the planned send/unlock experience remains unfinished.

Future message endpoints:

POST /api/future-message

GET /api/future-message

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

author_uuid

updated_at

Submission uses a cuid ID and a 600-character description column. It has indexes on author_uuid and on the lat/lng pair. weather_summary and weather_code are nullable. There is no title column in the current model.

FutureMessage

id

author_uuid

message

unlock_condition

created_at

unlocked_at

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

In-memory, per-process rolling-window rate limiting by the first x-forwarded-for IP for creation routes. Submission creation uses the constants in app/api/constant.ts (one attempt per 30 seconds). This is not a shared limit across server instances.

Zod validation for create/update payloads and viewport bounds, plus the description length limit.

Author UUID comparison for public update/delete. Public identity remains a browser-local UUID. Internal CMS accounts and database-backed sessions are isolated under `/cms` and `/api/cms`; see `contexts/cms.md` for the CMS contracts.

Public submission GET routes explicitly select safe fields. Create/update responses return the saved row to the caller.

Writing guidance is implemented in the sidebar. Server-side content moderation is not implemented.

Planned protection:

Optional profanity filter
