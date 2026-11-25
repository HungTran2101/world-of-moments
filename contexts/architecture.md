# Application architecture

Dear World runs as one Next.js App Router application. React and TypeScript implement the public map and CMS. Route Handlers own server requests, Prisma handles PostgreSQL access, and next-intl supplies English and Vietnamese translations.

## Code ownership

| Location | Responsibility |
| --- | --- |
| `app/` | Native routes, layouts, metadata, localization entry points and error boundaries |
| `app/api/` | Request validation, authorization and responses. Private server helpers live in `_handlers/`. |
| `components/` | Feature UI and colocated styles. Shared controls live in `components/shared/` and `components/ui/`. |
| `services/` | Typed request functions, response types, shared transport and pagination contracts |
| `lib/` | Domain logic, persistence access and server-side integrations |
| `store/` | Zustand state for draft pins, map commands, appearance and the CMS session |
| `prisma/schema/` | Database schema definitions |

## Map lifecycle

`MapView` owns the MapLibre instance, camera, map layers and writing pin. The map loads on the client. The submission layer requests positions for the visible bounds on initial load and after movement ends. It handles the international date line, skips duplicate bounds and cancels obsolete requests. MapLibre clusters the returned positions. Opening a pin loads its description and weather separately.

The thought dialog writes `thought`, `lat` and `lng` into the current URL and removes them on close. Other query parameters and the fragment survive both operations. Shared links and history’s **Take me there** action converge on the same camera and dialog behavior.

The globe and street map share one camera. Zoom controls the transition between spherical and Mercator projection, satellite imagery, labels, stars and marker scale. Resizing recomputes the minimum zoom and marker visibility. Map time can follow the browser’s local clock or a saved manual choice. Theme changes preserve the map instance and accommodate reduced motion. Map owners release requests, listeners, animations, overlays and sources on teardown.

### Lighting and globe interaction

Auto lighting uses the browser clock. Daytime begins at 06:00, evening at 15:00 and nighttime at 18:00. The map checks the time on minute boundaries and when focus or visibility returns. Manual choices persist under `pm_map_time_mode`. Missing or invalid preferences fall back to Auto. The circular theme reveal starts at the toolbar control and covers portaled UI as well as the map. Initial load and reduced motion apply the palette immediately. Rapid changes settle on the last choice.

DOM markers and their WebGL hit areas share the globe transition scale. Markers behind the globe are hidden and clicking empty space cannot place a pin. Resizing keeps the globe framed and recalculates marker opacity. The dialog cancels obsolete detail requests and distinguishes loading, retry and missing-thought states.

## Writing and history

`SubmissionForm` reads the draft coordinates from `usePinStore` and invokes map commands through `useSubmissionMapStore`. During submission the map pauses interaction and hides the draft pin. A successful save clears the draft, invalidates the account’s history and refreshes visible positions. The camera moves past the clustering threshold while preserving a closer existing zoom. If the save succeeds but the map refresh fails, the UI reports the refresh failure separately. On unmount the form cancels pending animation and requests and releases the map.

TanStack Query manages remote reads and mutations. Private history queries include account identity. The history panel owns debounced search, pagination, navigation and deletion confirmation. See [client accounts and ownership](client-auth.md) for the access contract.

## Public route contracts

| Route | Responsibility |
| --- | --- |
| GET `/api/submissions` | Validate viewport bounds and return visible positions. |
| POST `/api/submissions` | Validate the description and coordinates and save a thought for the verified client. |
| GET `/api/submissions/[id]` | Return a visible thought and weather, or 404 for a missing or hidden record. |
| DELETE `/api/submissions/[id]` | Check client ownership and return 204 after deletion. |
| GET `/api/submissions/history` | Return the signed-in author’s searchable history, newest first. |
| POST `/api/locale` | Store the selected language and allow the UI to refresh translated content. |

Personalized map reads use private caching directives and vary on cookie and accepted encoding. The geography layer and thought detail support compressed responses. The public app has no active realtime subscription or future-message endpoint. CMS pages, services and APIs follow the [CMS specification](cms.md).
