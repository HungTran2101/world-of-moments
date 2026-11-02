Project Overview

A map-based anonymous reflection web application where people can leave small thoughts tied to locations around the world.

The product focuses on quiet reflection rather than social interaction. Users can explore messages scattered across the planet and occasionally receive something written by their past self.

There are no accounts, followers, notifications, likes, or popularity metrics.

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
- Submitting creates the browser UUID if needed, saves the thought with weather context, and animates a thought bubble toward the selected pin. Refreshed markers are revealed after the bubble arrives, and the map zooms to show the submitted thought outside the clustering threshold.
- Map positions load for the current viewport after the camera stops. Nearby thoughts are clustered in the browser; clicking a cluster zooms into it.
- Clicking an individual thought opens a dialog that loads its description and weather on demand, with loading, retry, and not-found states.
- English and Vietnamese are available, with Vietnamese as the default. The selected language is remembered in a cookie.
- The sidebar provides localized writing guidance. Submission and runtime errors use the shared error modal; map-position and thought-detail loading have their own retry states.
- If saving fails, the draft and selected pin remain. Once saving succeeds, the draft is cleared even if refreshing the map fails, to avoid encouraging duplicate submissions.

Implementation boundaries

- Public map reads return only positions or public thought details; they omit author UUIDs and exact timestamps.
- The update and delete APIs exist and check the supplied author UUID against the stored UUID. Author edit/delete controls are not connected to the current page.
- `HistoryPanel` is a presentational component accepting supplied items; it is not mounted on the home page and there is no author-history loading flow.
- The future-message model, service, and create/list endpoints exist as scaffolding. The send/unlock experience is not connected to the current page. The future-message plan above is unchanged.
- Marker refreshes follow viewport changes or a local submission. There is no live subscription for thoughts submitted by other visitors.

Identity Model

The public map has no authentication system. Internal CMS authentication is separate and documented in `contexts/cms.md`.

Users are identified by a locally stored UUID in LocalStorage.

Purpose (including planned author tools):

associate submissions with the same browser
allow editing or deleting personal posts
provide a private personal history

If the user clears storage or changes device, a new identity is created.

Atmosphere Concept

Instead of showing timestamps publicly, the application shows weather context.

Example:

"Posted on a quiet rainy afternoon."

Weather is fetched using the location of the pin placed on the map.

The private-history design includes:

exact timestamp
raw weather data

inside their private history.

This private-history view is not connected yet. The existing `HistoryPanel` displays supplied descriptions, weather summaries, and rounded coordinates; it does not currently render exact timestamps or raw weather records.

Product Philosophy

The product intentionally removes typical social media mechanics.

Removed elements:

likes
comments
followers
feeds
popularity metrics

The goal is to emphasize moments, places, atmosphere, and time.
