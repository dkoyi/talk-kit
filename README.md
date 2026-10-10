# The Talk Kit

A static, parent-friendly conversation rehearsal prototype. Built from the repository's original `index.html` and the later uploaded curated version, with its first three scenarios, specific replies, child dialogue, seven values, weights, repair mechanism, preparation tips, next-step plans, and 30-second pause retained in the new interface.

## Run it

No framework, backend, API key, database server, or npm installation is required to run the website.

1. Open a terminal in the project directory.
2. Run:

   ```sh
   python3 -m http.server 8000 --bind 127.0.0.1
   ```

3. Open `http://127.0.0.1:8000` in your browser.
4. Stop the server with Ctrl+C.

On Windows, use `py -m http.server 8000 --bind 127.0.0.1` if `python3` is unavailable. Use a different free port if necessary. Serve the entire folder: opening `index.html` directly as a `file://` URL does not support the JSON/module loading. For deployment, the public application consists of `index.html`, `assets/`, and `data/`; upload those to a static HTTPS host. The local Python server is for development.

## What's included

- 12 editable situations across Online contact, Friendship & belonging, Content & feelings, and Digital boundaries.
- Three fictional characters with four SVG expressions that respond to the illustrative conversation state.
- Shuffled response cards: select, explore feedback, then continue. Feedback stays visible until the parent chooses to move on.
- Scenario-specific preparation, original curated responses and child dialogue, repair practice, optional typed replies, seven human values, reflection and next-step plans.
- A persistent **Feeling overwhelmed? Take a pause** action during preparation, practice, feedback, reflection, next steps, and support. On mobile it becomes a sticky bar above the content.
- A 30-second countdown that begins when opened, with 4-second inhale / 6-second exhale cues over three cycles. Following the cues is optional. End early, press Escape, or wait and continue when ready. It never submits an answer, changes the score, or clears a draft/selection. Timing uses a deadline to account for background-tab throttling. Reduced-motion settings disable the breathing animation; the countdown and cues remain.
- Optional **Listen** playback using installed English device voices. Only `localService` voices are selected. It requests no microphone access and stops on navigation or opening a dialog. Browser voices differ; clear inline fallback text appears when no voice is available. This is speech playback, not speech recognition, voice cloning, or an AI conversation service.
- Locally served DM Sans and Fraunces fonts, restrained transitions, keyboard controls, dialog focus restoration, and mobile layouts.
- Clear pending professional-review status. No names, licenses, or completed approvals are invented.

## Edit the content with your reviewers

`data/scenarios.json` is the website's content source. Each scenario has an `id`, `categoryId`, `characterIndex` (0: Maya, 1: Jayden, 2: Lucía), context, opening dialogue, preparation tips, three sets of response choices, and pending-review metadata. The original three also have detailed next-step plans. Shared repairs, categories, principles, and authored child responses are in the same file.

For each response, `kind` is one of `good`, `repair`, `harmful`, `promise`, `neutral`, or `unknown`. Optional `values`, `note`, `alt`, `title`, and `delta` let reviewers specify feedback and weight overrides. `childResponses` maps an exact response text to the child's authored reply lines; otherwise the scenario's `later` lines are used for supportive replies. Update both if changing a mapped response. UI templates remain in `assets/app.js`; styles in `assets/styles.css`; weights, typed-reply classification and data validation in `assets/engine.js`.

The default weights match both base versions: supportive +15, repair +18, harmful −20, absolute promise −5, neutral/uncertain 0. The illustrative meter starts at 50 and stays between 5 and 95. Three supportive/repair responses complete a deck; other replies leave space to try again. Parents can finish early. Scores and expressions are story devices, not clinical measures or grades. Attempts remain in memory only for optional reflection across retries.

Typed replies use a small phrase checker. It can miss context, negation, sarcasm, and safety concerns; it is not an assessment tool. Ambiguous matches receive no score change. Suggested cards use their authored response classifications.

After changing content, refresh the browser and run the tests below. The loader rejects malformed response decks and non-pending review statuses in this demo. Edit `contentVersion` when preparing a new reviewed release.

## Database supplied

`database/catalog.sqlite3` is an optional seeded SQLite catalog containing the 12 situations, a content snapshot, and empty professional/review tables. The web demo reads JSON directly; no backend connection is needed or implied.

Rebuild or add a content snapshot with:

```sh
python3 database/build_database.py
```

The builder is repeatable, preserves existing snapshots/reviews, and hashes the content plus the response engine so approvals can be tied to exact questions, feedback, and weights. `database/schema.sql` defines immutable snapshots/reviews, reviewer license metadata, evidence and expiry fields, approval constraints, and a current-approvals view that excludes expired or revoked credentials. To use another location:

```sh
python3 database/build_database.py /path/to/catalog.sqlite3
```

This is a foundation for the professional curation layer, **not a live license verification service**. Before publishing verified labels, implement authenticated reviewer/admin access, verify credentials with the relevant licensing board, securely record evidence, approve a specific content version, and serve current approvals through a backend. Database constraints do not prove a credential is genuine or replace authorization. The current frontend deliberately does not turn a manually edited JSON badge into a verified claim.

A full backend becomes useful when you need shared editorial accounts, authenticated sign-off, real license verification, published review histories, or server-based voice. It is unnecessary for the current demo. Do not add real professional personal data or parent conversations to the public JSON or a database served by a static host.

## Tests

Requires Node.js 20+ and Python 3. Browser test dependencies are development-only:

```sh
npm ci
npm test
python3 tests/database_test.py
npx playwright install chromium
npm run test:browser
```

If Chromium is already installed:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

The browser suite starts its own server on port 8013. It exercises all 12 decks, branching/repair, typed-reply errors and escaping, the countdown and state preservation, review dialogs, voice fallbacks/cancellation, content-load recovery, and 360/390/768/1440px layouts. Voice playback is tested with browser API doubles; actual sound and available device voices require checking in the browser/device you will demo. Tests do not establish clinical effectiveness or professional review.

## Scope and provenance

The uploaded curated version contained a placeholder reviewer name and text claiming psychologist review. Because no completed review was supplied, the UI accurately labels all decks **Professional review pending**. New situations are demo content for later curation. The visual direction uses calm colors, readable typography, and clear topic grouping; the CDC site could not be accessed in this environment, so no claim is made that a specific CDC implementation was inspected or reproduced.

The site has no accounts, analytics, cloud chat, or conversation persistence. Refresh clears practice text and progress. Static hosts may retain access logs. External support links have their own privacy policies and are U.S.-focused. The app provides fictional educational rehearsal, not therapy or emergency support.

Fonts: self-hosted `@fontsource-variable/dm-sans` and `@fontsource-variable/fraunces`, version 5.2.8, distributed under the SIL Open Font License. License notices are retained in `assets/fonts/`. No Google Fonts request is made at runtime.
