<p align="center">
  <img src="public/favicon/cover-image.png" alt="A hand-drawn world covered in little notes, beneath clouds and sunshine" width="100%" />
</p>

<h1 align="center">World of Moments</h1>

<p align="center">
  <em>A quiet map of human thoughts.</em>
</p>

<p align="center">
  A memory of a street. A feeling carried far from home.<br />
  A few words left somewhere they belong.
</p>

<p align="center">
  <a href="#a-little-of-you-left-somewhere">The experience</a> &nbsp;·&nbsp;
  <a href="#a-quiet-corner-of-the-world">The spirit</a> &nbsp;·&nbsp;
  <a href="#beneath-the-map">The craft</a> &nbsp;·&nbsp;
  <a href="contexts/roadmap.md">The road ahead</a>
</p>

---

## A little of you, left somewhere

World of Moments is an anonymous map where people leave small thoughts tied to places around the world. Wander through words left by others, or choose a place that means something to you and leave a moment of your own.

| 🌍 Wander | 📍 Leave a thought | 🌦 Pause a little |
| :--- | :--- | :--- |
| Move across the map and discover words scattered around the world. | Choose a place, write a few honest lines, and let them find their place on the map. | Open a moment and sit with its words and the weather around it. |

> “I used to take this road home. Today, the rain brought it all back.”
>
> *Posted in a gentle drizzle.*

Public moments carry words, a place, and a little weather. Names and exact timestamps stay out of the public view.

## A quiet corner of the world

A small observation, a memory, words you never said. Joy, longing, grief, and hard days all belong here. There is room for more than one kind of feeling.

- **Anonymous to the world.** Browse freely. Sign in and verify your email to leave thoughts and revisit your own moments; your name and email are never shown publicly.
- **Space to simply be.** No likes, comments, followers, feeds, or popularity counts.
- **Atmosphere in the details.** Weather lends each thought a little context; gentle motion helps it settle into the map.
- **Words left with care.** Thoughts are public. Keep personal details private, speak from your own experience, and leave room for the person who finds them.

## Beneath the map

The experience begins with a 2D map. English and Vietnamese copy, soft transitions, and a small writing flow keep the focus on the moment.

Zoom out to see the Earth against a quiet star field, with satellite imagery from [EOX::Maps](https://maps.eox.at/). Zoom back in to return to the map and keep exploring.

<details>
<summary><strong>A look at the tools</strong></summary>

| Part | Built with |
| :--- | :--- |
| Application | Next.js · React · TypeScript |
| Map | MapLibre GL |
| Data | PostgreSQL · Prisma |
| Local state | Zustand |
| Motion | Framer Motion · GSAP |
| Languages | next-intl · English & Vietnamese |

</details>

<details>
<summary><strong>Notes from the project</strong></summary>

- [Product & philosophy](contexts/project.md) — the experience and the ideas behind it.
- [Architecture](contexts/architecture.md) — how the map, data, and application fit together.
- [Roadmap](contexts/roadmap.md) — the planned phases of the project.

</details>

## Still unfolding

World of Moments is in early development, with map exploration, thought submission, and weather atmosphere at its heart. Personal history opens from the toolbar, with search, pagination and deletion for thoughts owned by your signed-in account. Submitted thoughts cannot be edited. Future messages remain disabled: the old anonymous-identity APIs, services, cookie bootstrap and limiter have been removed. Stored messages use nullable client-account ownership, preserving existing anonymous messages as unclaimed, while the new flow remains unimplemented. The roadmap also makes room for subtle realtime arrivals and a secondary globe view as the project grows.

---

<p align="center">
  <em>Small thoughts. Big world.</em><br />
  <sub>Leave a little of yourself somewhere.</sub>
</p>

## Development setup

Copy `.env.example` to the appropriate `.env.development` configuration and set the
database URL, independent CMS/client auth secrets, Resend sender/key, Turnstile keys
and application origin. Apply the schema with `pnpm db:push`, then run
`pnpm prisma:generate`. Schema files are the development source of truth; migration
files and reset flows are not used. Run `pnpm cms:seed` only with the intended bootstrap
password configured. Run `pnpm dev` to start the app.

Schedule `pnpm client-users:cleanup` hourly on the host and use the same `TZ` across
server instances. See [client authentication](contexts/client-auth.md) and
[CMS contracts](contexts/cms.md) for setup, ownership and moderation details.
