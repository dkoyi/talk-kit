import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const content = JSON.parse(
  readFileSync(new URL("../data/scenarios.json", import.meta.url)),
);
async function enter(page, index = 0) {
  await page.goto("/");
  await page
    .locator(`[data-category="${content.scenarios[index].categoryId}"]`)
    .click();
  await page.locator(`[data-select="${index}"]`).click();
  await page.locator("#begin").click();
}
async function choose(page, kind) {
  await page.locator(`[data-kind="${kind}"]`).click();
  await page.locator("#reveal").click();
}
for (const [index, scenario] of content.scenarios.entries()) {
  test(`${scenario.id}: full practice and reflection`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await enter(page, index);
    await expect(page.locator(".child-quote")).toContainText(scenario.open);
    await choose(page, "good");
    await expect(page.locator(".feedback-title")).toContainText(
      "You made room for more",
    );
    await expect(page.locator(".live-character svg")).toHaveAttribute(
      "data-mood",
      "calm",
    );
    await page.locator("#continue").click();
    await choose(page, "good");
    await page.locator("#continue").click();
    await choose(page, "good");
    await page.locator("#continue").click();
    await expect(page.locator(".turn")).toHaveCount(3);
    await expect(page.locator("main")).toHaveAttribute("data-stage", "reflect");
    await page.locator("#resources-button").click();
    await expect(page.locator("a.resource")).toHaveCount(3);
    expect(errors).toEqual([]);
  });
}
test("selection errors, harmful reply, repair, restart cancel and confirm", async ({
  page,
}) => {
  await enter(page);
  await page.locator("#reveal").click();
  await expect(page.locator("#choice-error")).toContainText(
    "Choose a response",
  );
  await choose(page, "harmful");
  await expect(page.locator(".live-character svg")).toHaveAttribute(
    "data-mood",
    "worried",
  );
  await page.locator("#repair").click();
  await choose(page, "repair");
  await expect(page.locator(".feedback-title")).toContainText("begin again");
  await page.locator("#restart").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".feedback-title")).toBeVisible();
  await expect(page.locator("#restart")).toBeFocused();
  await page.locator("#restart").click();
  await page.locator("#confirm-restart").click();
  await expect(page.locator(".transcript")).toHaveCount(0);
  await expect(page.locator(".child-quote")).toContainText(
    content.scenarios[0].open,
  );
});
test("typed replies: inline errors, uncertainty, escaping, and limits", async ({
  page,
}) => {
  await enter(page);
  await page.locator(".custom-entry summary").click();
  await page.locator("#custom").fill("   ");
  await page.locator("#custom-form button").click();
  await expect(page.locator("#custom-error")).toContainText(
    "Write a few words",
  );
  await expect(page.locator("#custom")).toHaveAttribute("aria-invalid", "true");
  await page
    .locator("#custom")
    .fill("<img src=x onerror=alert(1)> What do you need?");
  await page.locator("#custom-form button").click();
  await expect(page.locator(".feedback-title")).toContainText(
    "reflect rather than score",
  );
  await expect(page.locator(".your-choice")).toContainText("<img");
  await expect(page.locator(".your-choice img")).toHaveCount(0);
  await page.locator("#continue").click();
  await page.locator(".custom-entry summary").click();
  await page.locator("#custom").fill("Thank you for telling me.");
  await page.locator("#custom-form button").click();
  await expect(page.locator(".feedback-title")).toContainText(
    "You made room for more",
  );
  await page.locator("#reflect").click();
  await expect(page.locator(".turn")).toHaveCount(2);
});
test("neutral and promise responses leave space to continue", async ({
  page,
}) => {
  await enter(page);
  await choose(page, "neutral");
  await expect(page.locator(".feedback-title")).toContainText("information");
  await page.locator("#continue").click();
  await choose(page, "good");
  await page.locator("#continue").click();
  await choose(page, "promise");
  await expect(page.locator(".feedback-title")).toContainText(
    "absolute promise",
  );
  await expect(page.locator("#repair")).toBeVisible();
});
test("relaxation timer finishes, can repeat, and cancels on Escape", async ({
  page,
}) => {
  await page.clock.install();
  await enter(page);
  await page.locator("#pause-session").click();
  await expect(page.locator("#calm-seconds")).toHaveText("30");
  await page.clock.fastForward(30000);
  await expect(page.locator("#calm-seconds")).toHaveText("0");
  await expect(page.locator("#calm-cue")).toContainText("complete");
  await page.locator("#calm-start").click();
  await page.clock.fastForward(1000);
  await expect(page.locator("#calm-seconds")).toHaveText("29");
  await page.keyboard.press("Escape");
  await page.clock.fastForward(35000);
  await page.locator("#pause-session").click();
  await expect(page.locator("#calm-seconds")).toHaveText("30");
});
test("review status, rule explanation, keyboard dialog behavior", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-review]").click();
  await expect(page.locator("#modal-content")).toContainText(
    "No reviewer credentials or approvals have been verified",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-review]")).toBeFocused();
  await enter(page);
  await page.locator("[data-rules]").click();
  await expect(page.locator(".rule-list")).toContainText("+18");
  await expect(page.locator("#modal-content")).toContainText(
    "not clinically validated",
  );
});
test("voice unavailable and failure are recoverable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      value: { getVoices: () => [], cancel() {}, speak() {} },
    });
  });
  await enter(page);
  await page.locator("#listen").click();
  await expect(page.locator("#voice-error")).toContainText(
    "No English device voice",
  );
  await choose(page, "good");
  await expect(page.locator(".feedback-title")).toBeVisible();
});
test("voice playback uses local voices, stops on navigation, handles errors", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.voiceLog = [];
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [
          { localService: false, lang: "en-US", name: "remote" },
          { localService: true, lang: "en-US", name: "device" },
        ],
        cancel() {
          window.voiceLog.push("cancel");
        },
        speak(u) {
          window.voiceLog.push(u.voice.name);
          window.lastUtterance = u;
        },
      },
    });
  });
  await enter(page);
  await page.locator("#listen").click();
  await expect(page.locator("#listen")).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => window.voiceLog.at(-1))).toBe("device");
  await page.locator("#listen").click();
  await expect(page.locator("#listen")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.locator("#listen").click();
  await page.evaluate(() =>
    window.lastUtterance.onerror({ error: "audio-busy" }),
  );
  await expect(page.locator("#voice-error")).toContainText("couldn’t play");
  await page.locator("#listen").click();
  await page.locator("#home").click();
  expect(await page.evaluate(() => window.voiceLog.at(-1))).toBe("cancel");
});
test("failed content request offers retry without an empty screen", async ({
  page,
}) => {
  await page.route("**/data/scenarios.json", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("/");
  await expect(page.locator(".load-error")).toContainText("couldn’t load");
  await page.unroute("**/data/scenarios.json");
  await page.locator("#reload").click();
  await expect(page.locator("[data-category]")).toHaveCount(4);
});
for (const width of [360, 390, 768, 1440])
  test(`layout at ${width}px; no overflow and reduced motion`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await enter(page, 2);
    await expect(page.locator(".reply")).toHaveCount(3);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".flashcard")
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
    await choose(page, "good");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator("#home").click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test("overwhelmed pause preserves selected choice, typed draft, and feedback across the entire scenario", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.locator('[data-select="0"]').click();
  await page.locator("#pause-session").click();
  await expect(page.locator("#calm-cue")).toContainText("Breathe in");
  await page.clock.fastForward(4000);
  await expect(page.locator("#calm-cue")).toContainText("Breathe out");
  await page.locator("#calm-return").click();
  await page.locator("#begin").click();
  await page.locator('[data-kind="good"]').click();
  await page.locator(".custom-entry summary").click();
  await page.locator("#custom").fill("I want to listen.");
  await page.locator("#pause-session").click();
  await page.clock.fastForward(10000);
  await page.locator("#calm-return").click();
  await expect(page.locator("#custom")).toHaveValue("I want to listen.");
  await expect(page.locator('[data-kind="good"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#reveal").click();
  const feedback = await page.locator(".feedback-title").innerText();
  await page.locator("#pause-session").click();
  await page.clock.fastForward(30000);
  await page.locator("#calm-return").click();
  await expect(page.locator(".feedback-title")).toHaveText(feedback);
  await page.locator("#reflect").click();
  await expect(page.locator("#pause-session")).toBeVisible();
  await page.locator("#plan-button").click();
  await expect(page.locator(".now-steps li")).toHaveCount(6);
  await page.locator("#pause-session").click();
  await expect(page.locator("#calm-seconds")).toHaveText("30");
});

test("master progression: neutral replies reach reflection without a score requirement", async ({
  page,
}) => {
  await enter(page);
  await choose(page, "neutral");
  await page.locator("#continue").click();
  await choose(page, "neutral");
  await page.locator("#continue").click();
  await choose(page, "promise");
  await page.locator("#continue").click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "reflect");
  await expect(page.locator(".turn")).toHaveCount(3);
});
test("prerecorded audio mapping plays and stops; failures remain readable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.Audio = class {
      constructor(path) {
        this.path = path;
        window.testAudio = this;
      }
      play() {
        return window.audioShouldFail
          ? Promise.reject(Error("unavailable"))
          : Promise.resolve();
      }
      pause() {
        window.recordingStopped = true;
      }
      removeAttribute() {}
    };
  });
  await page.route("**/data/scenarios.json", (route) => {
    const data = structuredClone(content);
    data.audioClips = {
      [data.scenarios[0].open]: "assets/audio/maya/scene-1.mp3",
    };
    return route.fulfill({ json: data });
  });
  await enter(page);
  await page.locator("#listen").click();
  await expect(page.locator("#listen")).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => window.testAudio.path)).toBe(
    "assets/audio/maya/scene-1.mp3",
  );
  await page.locator("#pause-session").click();
  expect(await page.evaluate(() => window.recordingStopped)).toBe(true);
  await page.keyboard.press("Escape");
  await page.evaluate(() => (window.audioShouldFail = true));
  await page.locator("#listen").click();
  await expect(page.locator("#voice-error")).toContainText(
    "recording is unavailable",
  );
  await expect(page.locator(".child-quote")).toBeVisible();
});
