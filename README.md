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
- Scenario-specific preparation, original curated responses and child dialogue, repair practice, seven human values, reflection and next-step plans.
- A persistent **Take a pause** action during preparation, practice, feedback, reflection, next steps, and support. On mobile it becomes a sticky bar above the content.
- A full-screen pause over a calm landscape (`assets/calm-scene.svg`) with a 30-second countdown that begins when opened, with 4-second inhale / 6-second exhale cues over three cycles. Following the cues is optional. End early, press Escape, or wait and continue when ready. It never submits an answer, changes the score, or clears a draft/selection. Timing uses a deadline to account for background-tab throttling. Reduced-motion settings disable the breathing animation; the countdown and cues remain.
- Optional **Listen** playback using installed English device voices. Only `localService` voices are selected. It requests no microphone access and stops on navigation or opening a dialog. Browser voices differ; clear inline fallback text appears when no voice is available. This is speech playback, not speech recognition, voice cloning, or an AI conversation service.
- Locally served DM Sans and Fraunces fonts, restrained transitions, keyboard controls, dialog focus restoration, and mobile layouts.
- Clear pending professional-review status. No names, licenses, or completed approvals are invented.

## Edit the content with your reviewers

`data/scenarios.json` is the website's content source. Each scenario has an `id`, `categoryId`, `characterIndex` (0: Maya, 1: Jayden, 2: Lucía), context, opening dialogue, preparation tips, three sets of response choices, and pending-review metadata. The original three also have detailed next-step plans. Shared repairs, categories, principles, and authored child responses are in the same file.

For each response, `kind` is one of `good`, `repair`, `harmful`, `promise`, `neutral`, or `unknown`. Optional `values`, `note`, `alt`, `title`, and `delta` let reviewers specify feedback and weight overrides. `childResponses` maps an exact response text to the child's authored reply lines; otherwise the scenario's `later` lines are used for supportive replies. Update both if changing a mapped response. UI templates remain in `assets/app.js`; styles in `assets/styles.css`; weights and data validation in `assets/engine.js`.

The default weights match both base versions: supportive +15, repair +18, harmful −20, absolute promise −5, neutral/uncertain 0. The illustrative meter starts at 50 and stays between 5 and 95. Three main responses complete a deck regardless of their score, preserving the latest master branch’s progression behavior. Optional repairs do not advance the main story. Parents can finish early. Scores and expressions are story devices, not clinical measures or grades. Attempts remain in memory only for optional reflection across retries.


After changing content, refresh the browser and run the tests below. The loader rejects malformed response decks and non-pending review statuses in this demo. Edit `contentVersion` when preparing a new reviewed release.

## Tests

Requires Node.js 20+. Browser test dependencies are development-only:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

If Chromium is already installed:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

The browser suite starts its own server on port 8013. It exercises all 12 decks, branching/repair, answer escaping, the countdown and state preservation, review dialogs, voice fallbacks/cancellation, content-load recovery, and 360/390/768/1440px layouts. Voice playback is tested with browser API doubles; actual sound and available device voices require checking in the browser/device you will demo. Tests do not establish clinical effectiveness or professional review.

## Scope and provenance

The uploaded curated version contained a placeholder reviewer name and text claiming psychologist review. Because no completed review was supplied, the UI accurately labels all decks **Professional review pending**. New situations are demo content for later curation. The visual direction uses calm colors, readable typography, and clear topic grouping; the CDC site could not be accessed in this environment, so no claim is made that a specific CDC implementation was inspected or reproduced.

The site has no accounts, analytics, cloud chat, or conversation persistence. Refresh clears practice text and progress. Static hosts may retain access logs. External support links have their own privacy policies and are U.S.-focused. The app provides fictional educational rehearsal, not therapy or emergency support.

Fonts: self-hosted `@fontsource-variable/dm-sans` and `@fontsource-variable/fraunces`, version 5.2.8, distributed under the SIL Open Font License. License notices are retained in `assets/fonts/`. No Google Fonts request is made at runtime.

## Character voices (ElevenLabs)

Each scenario in `data/scenarios.json` has a `voice` field naming the ElevenLabs voice for that child, so every character always sounds the same:

| Character | Voice | `voiceId` |
|---|---|---|
| Maya, 13 | Gigi (young, childish, American) | `jBpfuIE2acCO8z3wKNLl` |
| Jayden, 11 | Harry (young, anxious, American) | `SOYHLrjzK2X1ezoPC6cr` |
| Lucía, 8 | Mimi (young, childish) | `zrHiDhphv9ZnVXBqCLjz` |

These are ElevenLabs premade voices; none is labelled as a child, so these are the closest fits. Confirm each ID in your ElevenLabs account (Voices → ⋯ → Copy voice ID) before generating audio, as ElevenLabs is replacing some legacy default voices.

Every line a child speaks also has ElevenLabs v3 audio tags in `audioTags`, keyed by the exact line (lines are shared between scenarios, so they are keyed by text like `audioClips`). For example:

```json
"audioTags": {
  "Can I tell you something? Someone in my game keeps asking for pictures. Please don’t get mad.": ["nervous", "hesitant", "pleading"]
}
```

When generating a clip, prefix the line with its tags in brackets, e.g. `[nervous] [hesitant] [pleading] Can I tell you something?…`, using the character's `voiceId` and a v3 model. The loader rejects tags that aren't lowercase words, and the engine tests check that no spoken line is missing tags. The five fallback lines in `assets/app.js` are tagged too.

The website never calls ElevenLabs: an API key in a static site would be public. Generate each line once in ElevenLabs with the character's `voiceId`, save the MP3 under `assets/audio/<character>/`, and map it in `audioClips` as described below. Lines without a recording fall back to the device voice.

## Prerecorded audio and deployment

To use a recording instead of the device voice, add its relative path under `audioClips` in `data/scenarios.json`, keyed by the exact dialogue displayed on the card. For example:

```json
"audioClips": {
  "Can I tell you something? Someone in my game keeps asking for pictures. Please don’t get mad.": "assets/audio/maya/scene-1.mp3"
}
```

Only map recordings that exist and match the displayed line. Allowed file types are MP3, WAV and OGG. Missing/unplayable recordings produce an inline error and leave the text usable. Unmapped dialogue uses the optional device voice. This replaces the previous single-file `availableAudio` mapping and preserves its opt-in behavior. Obtain permission for any recordings you use.

For Vercel, use framework **Other**, no build command, and the repository root as the output directory. For Netlify or GitHub Pages, publish the static application files (`index.html`, `assets/`, `data/`). On GitHub Pages this repository uses the `master` branch; use **Settings → Pages → Deploy from a branch → master / root**.
