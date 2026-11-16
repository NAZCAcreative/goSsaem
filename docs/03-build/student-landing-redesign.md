# Student entry page redesign

Public entry: `/` redirects to `/student`. The signed-in student dashboard is unchanged by this redesign.

- Recreates the supplied reference composition with navy/coral typography, a Korean spring background, a central video cover, pastel pronunciation cards, a four-card teacher section, and a working Korean challenge.
- Video target: `https://www.youtube-nocookie.com/embed/9wG_Y4pL5Zc`. Loads on explicit play; a direct YouTube link remains available. Cover artwork is AI-generated and is not a frame from the video.
- Existing logo and teacher imagery are reused. Featured teacher records take priority; otherwise the public teacher directory is used. If the database is unavailable, clearly generic learning-topic cards link to search. No invented learner totals or testimonials are displayed.
- Mobile layout uses a collapsible menu, stacked hero, three vocabulary cards, and two-column teacher cards.
- Speech uses the device's Korean speech synthesis and reports unavailable audio. The quiz uses a native modal dialog with Escape dismissal and focus restoration.
- The common header-hiding rule exempts this page's dedicated header. Other application navigation remains unchanged.

## Verification

- `npm.cmd run type-check -- --incremental false`: passed.
- `node_modules/.bin/eslint.cmd src/components/features/StudentLanding.tsx src/components/shared/TopNavigation.tsx`: passed.
- `node tests/landing.browser.cjs`: passed at 1672, 1280, 1024, 768, 390 and 320 pixels; no horizontal overflow or uncaught page errors. Verified mobile menu, quiz wrong/correct feedback, Escape/focus restoration, and the configured video URL.
- Screenshots: `.tmp/landing/{width}.png`, `.tmp/landing/quiz-mobile.png`.
- Browser verification used process-only preview Supabase values and intercepted preview database requests. This checkout has no `.env.local`; actual database integration and a production build need real project environment variables.
- YouTube video playback itself was not verified; external page fetches failed and the remote thumbnail was unavailable. The test checks the exact iframe target, not successful external playback.

## Generated assets

Built-in imagegen output is saved in `public/img/generated/landing-korea.png` and `public/img/generated/landing-video-cover.png`. Full prompts are recorded in `public/img/generated/landing-korea.md`.
