Project Overview

A map-based anonymous reflection web application where people can leave small thoughts tied to locations around the world.

The product focuses on quiet reflection rather than social interaction. Users can explore messages scattered across the planet and occasionally receive something written by their past self.

Client accounts privately authorize writing and personal history. There are no followers, notifications, likes, or popularity metrics.

The experience should feel atmospheric, calm, and visually beautiful.

Because the feature set is intentionally small, the interface should rely heavily on smooth and modern animation to create emotional engagement.

Core Experience (product intent)

The list below describes the intended experience. Current implementation status is documented separately below.

Users can:

Browse a world map
Read thoughts left by others
Drop their own message at any location
Send a message to their future self

Messages appear as markers on the map and contain:

description
weather atmosphere description

Public viewers do not see timestamps.

Current Implementation

- The home page mounts a 2D MapLibre map, a writing sidebar, the title, and a language selector.
- Zooming out smoothly reveals a satellite globe with an atmospheric rim and stars. Zooming back in restores the themed map and its labels without replacing the map or clearing a draft pin.
- Clicking an empty map location places or moves the writing pin. The form accepts a description of up to 600 characters; a title is not part of the current submission flow.
- Submitting requires a verified client account, saves the thought with weather context, and animates a thought bubble toward the selected pin. Refreshed markers are revealed after the bubble arrives, and the map zooms to show the submitted thought outside the clustering threshold.
- Map positions load for the current viewport after the camera stops. Nearby thoughts are clustered in the browser; clicking a cluster zooms into it.
- Clicking an individual thought opens a dialog that loads its description and weather on demand, with loading, retry, and not-found states.
- English and Vietnamese are available, with Vietnamese as the default. The selected language is remembered in a cookie.
- The sidebar provides localized writing guidance. Submission and runtime errors use the shared error modal; map-position and thought-detail loading have their own retry states.
- If saving fails, the draft and selected pin remain. Once saving succeeds, the draft is cleared even if refreshing the map fails, to avoid encouraging duplicate submissions.

Implementation boundaries

- Public map reads return only positions or public thought details; they omit author UUIDs and exact timestamps.
- Submitted content and coordinates cannot be edited. Authors can delete their own thoughts from history; CMS deletion requires its delete permission.
- `HistoryPanel` loads the signed-in account’s paginated private history from the map toolbar.
- Future messages remain disabled. Their old create/list handlers, anonymous-identity bootstrap, services, cookies and limiter have been removed. The existing model/data are retained until the new client-account-based flow is implemented; no future-message UI is connected.
- Marker refreshes follow viewport changes or a local submission. There is no live subscription for thoughts submitted by other visitors.

Identity Model

Anyone can browse the map. Writing requires email/password registration and email
verification through Resend. Client and CMS accounts share auth tables with strict
account-kind isolation and separate HttpOnly session cookies. Thoughts remain anonymous
to public readers. Existing anonymous thoughts remain unclaimed; deleting a client
account keeps its thoughts on the map without ownership.

The submission sidebar contains login/registration, verification, eligibility notices,
or the writing form. Verified accounts can leave three thoughts per hosting day with
a five-minute pause between them. Repeated attempts beyond these limits lead to
seven-day suspensions and a ban on the third trigger. Public notices do not expose the
quota or cooldown duration. See `contexts/client-auth.md` for the complete contract.

The signed anonymous visitor-identity flow is removed. Future messages must use
client-account authentication when reimplemented; active thoughts already use it.

Atmosphere Concept

Instead of showing timestamps publicly, the application shows weather context.

Example:

"Posted on a quiet rainy afternoon."

Weather is fetched using the location of the pin placed on the map.

The private-history design includes:

exact timestamp
raw weather data

inside their private history.

The existing `HistoryPanel` displays account-owned descriptions, localized weather summaries and exact creation timestamps. Raw weather records are not displayed.

Product Philosophy

The product intentionally removes typical social media mechanics.

Removed elements:

likes
comments
followers
feeds
popularity metrics

The goal is to emphasize moments, places, atmosphere, and time.
