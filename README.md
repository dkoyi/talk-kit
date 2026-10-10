# The Talk Kit — Updated Prototype

This version is built **directly on your latest uploaded `index.html`**, not the older generated app.

## Fastest setup (no packages, no database)

1. Extract the ZIP.
2. Open `index.html` in Chrome, Safari, Firefox, or Edge. The entire prototype runs in the browser.
3. For more reliable local testing, open a terminal in this folder and run:

   ```bash
   python -m http.server 5173
   ```

   On Windows, use `py -m http.server 5173` if `python` is not recognized. Open `http://localhost:5173`.

There is **no separate database or backend**. The three fictional stories, choices, and responses live in the `scenarios` and `CHILD` JavaScript objects in `index.html`. All interaction state is kept in tab memory and resets on refresh. Web hosting can still produce ordinary access logs.

## What's new

- Flashcard-style A/B/C option selection, with selected state and explicit confirmation (not instant button reactions).
- Original hand-coded SVG children, with four illustrative expression variations (sad, worried, calm, happy).
- Scenario-specific choice text and fictional reactions inherited from the latest uploaded file.
- Repair option when a response is unhelpful, including on the last main turn.
- Story progression independent of getting a “right” answer, so every user can reach reflection.
- Preserved full-screen 30-second relaxation scene with an animated orb and an exit control.
- Refreshed visual palette and typography (Fraunces + DM Sans from Google Fonts, with system fallbacks when offline).
- Optional prerecorded audio hooks, initially disabled to avoid broken audio playback.
- Removed unverified psychologist-approval claims. All content should remain labeled as pending review until an actual qualified expert signs off.

## Adding audio

1. Obtain appropriately licensed audio recordings; do not clone real children's voices.
2. Add files such as:

   ```text
   assets/audio/maya/scene-1.mp3
   assets/audio/maya/scene-2.mp3
   assets/audio/maya/scene-3.mp3
   assets/audio/maya/repair.mp3
   assets/audio/jayden/scene-1.mp3
   assets/audio/lucia/scene-1.mp3
   ```

3. In `index.html`, find `const availableAudio=new Set();` and replace with the paths of files that actually exist:

   ```js
   const availableAudio = new Set([
     'assets/audio/maya/scene-1.mp3',
     'assets/audio/maya/scene-2.mp3'
   ]);
   ```

The Listen control becomes enabled for those scenes. The caption text always remains available. This is a **manual mapping**, not a generated-speech service. Check voice provider terms and permissions before use.

## Deploying

**Vercel:** Push `index.html` (and any `assets` folder) to the root of a GitHub repository. Import to Vercel, select framework **Other**, no build step, output root. Deploy.

**Netlify:** Drag and drop the extracted folder into Netlify's manual deploy interface.

**GitHub Pages:** Place `index.html` at repository root and enable Pages from the main branch root.

Lovable is unnecessary for this version. Rebuilding inside it would introduce moving parts and could undo the UI you have already created.

## Editing stories and responses

- `scenarios` = names, scene contexts, prompts, and three rounds of options per child.
- `CHILD` = authored responses mapped to option text. When changing a response's wording, update the corresponding key in `CHILD` (or the fallback dialogue will appear).
- `BASE` = illustrative feedback templates and state movement.
- `PLANS` = scenario-specific guidance and outside links; review these with qualified experts.
- `MOODS` / `childArt()` = original SVG illustrations and expression variants.

## Safety and product truthfulness

This is an educational **prototype**, not therapy, safeguarding assessment, or crisis intervention. The expressions and scene state are fictional illustrations, not inferred psychological outcomes. Professional content review is pending; don't put a reviewer name or “clinically verified” badge into production without confirmed approval for the exact published version. Do not collect real children's disclosures in the demo. Sensitive protective guidance needs specialist validation before real use.

## Suggested test path

1. Home → Maya → Prepare → start/finish the 30-second calming pause.
2. Start practice → choose a blaming A/B/C card → confirm → view response and change in SVG expression.
3. Select a repair card → confirm → follow the rest of the story, including alternate paths.
4. Finish → reflection → scenario-specific next steps.
5. Repeat with Jayden and Lucía, including neutral and promise choices.
6. Test at 375px phone width and with keyboard Tab/Enter controls.
