Phase 1 — MVP

Current status: the core map, submission flow, and personal history are implemented. History opens from the toolbar with debounced search, 10-item pagination and deletion for the signed-in client account.

Goal: core experience working.

Features:

2D interactive map — implemented with MapLibre
click-to-place pin submission — implemented with a description-only form (up to 600 characters)
view markers — implemented with viewport loading, client-side clustering, and on-demand thought details
weather atmosphere text — implemented with server-side weather lookup and localized display
client email/password accounts — implemented with verified email and isolated cookie sessions
personal history — implemented with a floating glass panel, search, and TanStack Query pagination (50 thoughts per page)

Tech goals:

Next.js project setup — implemented with the App Router and English/Vietnamese localization
Prisma + PostgreSQL integration — implemented
submission API — create, viewport list, detail, update, and delete handlers implemented; author edit/delete UI is not connected
Phase 2 — Motion and Experience

Current status: the motion and responsive UI listed below are implemented. This records implementation status, not a claim that all visual polish is final.

Focus on UI polish.

Features:

smooth marker animations — implemented for marker/cluster entry and marker hover
animated map popups — implemented as a thought dialog with loading states and typed text
elegant transitions — implemented with a cloud loader, animated sidebar, shared dialog motion, and submission-bubble flight
improved desktop UI experience — implemented with a full-map layout, glass controls, focus handling, and responsive styling

Animations should reinforce the quiet and reflective atmosphere.

Phase 3 — Realtime World

Features:

realtime marker appearance
subtle map animations when new messages appear

Implementation:

WebSocket or SSE
Phase 4 — Future Message System

Status: disabled pending a new client-account-based flow. Legacy create/list APIs,
services, anonymous-identity bootstrap/cookies and limiter have been removed. Existing
messages are retained with nullable `clientUserId` ownership; existing anonymous
messages remain unclaimed. The planned UI remains unconnected.

Features:

send message to future self
unlock conditions

Example conditions:

after X days
random future date
Phase 5 — 3D Globe Mode

Features:

rotating globe
galaxy background
globe marker visualization

Technology:

Three.js
Phase 6 — Moderation and Stability

Add:

report system
admin moderation dashboard — implemented in CMS with separate publication/validity permissions, bulk actions, and record audit fields
stronger spam protection
Phase 7 — Scaling

Already implemented: viewport-bound position queries with date-line handling, a latitude/longitude database index, on-demand thought details, and negotiated Brotli/gzip compression for public submission reads.

Optimizations:

marker clustering — implemented in MapLibre after viewport positions are downloaded
spatial queries
caching weather responses
