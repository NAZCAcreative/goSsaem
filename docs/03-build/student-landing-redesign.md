# Student entry page redesign

Updated 2026-11-17. Public entry: `/` redirects to `/student`. The public landing and student workspace share an ivory/lavender visual system and navigation.

- Shared `StudentNavigation` provides pill navigation, selected-page state, a discovery popover, account menu, keyboard Escape/focus return, outside dismissal, focus outlines and reduced-motion support. Teacher workspace navigation is unchanged.
- The landing retains the Korean scenery, video, pronunciation cards and quiz with updated spacing, colors, typography and hover feedback.
- Video target: `https://www.youtube-nocookie.com/embed/9wG_Y4pL5Zc`. Loads on explicit play; a direct YouTube link remains available. Cover artwork is AI-generated and is not a frame from the video.
- Existing logo and images are reused. `TeacherSpotlight` reads up to four real public teachers through the existing filtered search RPC. Loading, retry and empty states do not fabricate profiles, ratings or counts.
- The landing and student home provide a search gateway that switches between lessons and teachers. Search pages share query-preserving discovery tabs. Teacher results use two columns on wide screens; their minimum prices no longer assume a fixed 50-minute duration.
- Mobile retains the five-item bottom navigation and uses stacked hero/search sections. Desktop navigation is visible from 1024px. Teacher and lesson routes highlight the same discovery menu; learning reports highlight the profile menu.
- Navigation storage version 4 migrates route matches while retaining custom links, order and visibility.
- Speech uses the device's Korean speech synthesis and reports unavailable audio. The quiz uses a native modal dialog with Escape dismissal and focus restoration.
- The common header-hiding rule prevents a duplicate header on the landing. Student colors are scoped so teacher and administrator screens keep their existing themes.

## Verification

- `npm run type-check`, `npm run lint`, and the production build passed.
- Unit tests cover selected-menu matching and persisted-menu migration; existing student/teacher role tests still pass.
- `node tests/student-design.browser.cjs` uses a local Next production server (`TEST_BASE_URL`, default port 3110). It verifies 320, 390, 768, 1024 and 1440px layouts, public teacher cards, search mode, retained queries, discovery popovers, Escape/focus return, outside dismissal and the quiz. Account menu interactions use the actual React header with an isolated signed-in fixture.
- Screenshots: `.tmp/student-refresh/landing-{width}.png`, `teachers-{width}.png`, `account-{width}.png`, and `desktop-preview.png`.
- Public query responses and the account fixture are isolated. No real accounts, reservations or messages are changed. No production deployment is included.
- YouTube video playback itself was not verified; external page fetches failed and the remote thumbnail was unavailable. The test checks the exact iframe target, not successful external playback.

## Generated assets

Built-in imagegen output is saved in `public/img/generated/landing-korea.png` and `public/img/generated/landing-video-cover.png`. Full prompts are recorded in `public/img/generated/landing-korea.md`.
