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
    await expect(page.locator(".live-character > svg")).toHaveAttribute(
      "data-mood",
      "calm",
    );
    await choose(page, "good");
    await choose(page, "good");
    await page.locator("#continue").click();
    await expect(page.locator(".turn")).toHaveCount(3);
    await expect(page.locator("main")).toHaveAttribute("data-stage", "reflect");
    await page.locator("#resources-button").click();
    await expect(page.locator("a.resource")).toHaveCount(3);
    expect(errors).toEqual([]);
  });
}
test("answers react instantly; harmful reply goes straight to repair; restart cancel and confirm", async ({
  page,
}) => {
  await enter(page);
  await expect(page.locator("#reveal")).toHaveCount(0);
  await choose(page, "harmful");
  await expect(page.locator(".live-character > svg")).toHaveAttribute(
    "data-mood",
    "worried",
  );
  await expect(page.locator(".meter-delta.down")).toHaveText("-20");
  await expect(page.locator('[data-kind="repair"]').first()).toBeVisible();
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
test("answer text is escaped, and typed replies, Finish and chat log are gone", async ({
  page,
}) => {
  await page.route("**/data/scenarios.json", async (route) => {
    const data = structuredClone(content);
    data.scenarios[0].replies[0][0].text = "<img src=x onerror=alert(1)> Hi";
    return route.fulfill({ json: data });
  });
  await enter(page);
  await expect(page.locator(".custom-entry, #custom, #reflect, .transcript")).toHaveCount(0);
  await page.locator(".reply", { hasText: "<img" }).click();
  await expect(page.locator(".your-choice")).toContainText("<img");
  await expect(page.locator(".your-choice img")).toHaveCount(0);
});
test("neutral and promise responses leave space to continue", async ({
  page,
}) => {
  await enter(page);
  await choose(page, "neutral");
  await expect(page.locator(".feedback-title")).toContainText("information");
  await choose(page, "good");
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
    "Not clinically validated",
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
    await page.locator("#nav-home").click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test("pause: card button before practice, pill only during practice, feedback preserved", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.locator('[data-select="0"]').click();
  await expect(page.locator("#pause-session")).toBeHidden();
  await page.locator("#breathe").click();
  await expect(page.locator("#calm-cue")).toContainText("Breathe in");
  await page.clock.fastForward(4000);
  await expect(page.locator("#calm-cue")).toContainText("Breathe out");
  await page.locator("#calm-return").click();
  await page.locator("#begin").click();
  await expect(page.locator("#pause-session")).toBeVisible();
  await page.locator('[data-kind="good"]').click();
  const feedback = await page.locator(".feedback-title").innerText();
  await page.locator("#pause-session").click();
  await page.clock.fastForward(30000);
  await page.locator("#calm-return").click();
  await expect(page.locator(".feedback-title")).toHaveText(feedback);
  await page.locator('[data-kind="good"]').click();
  await page.locator('[data-kind="good"]').click();
  await page.locator("#continue").click();
  await expect(page.locator("#pause-session")).toBeHidden();
  await page.locator("#plan-button").click();
  await expect(page.locator(".now-steps li")).toHaveCount(6);
  await expect(page.locator("#pause-session")).toBeHidden();
});

test("master progression: neutral replies reach reflection without a score requirement", async ({
  page,
}) => {
  await enter(page);
  await choose(page, "neutral");
  await choose(page, "neutral");
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

test("Back and Home are visible on every screen except home", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#nav-back")).toBeHidden();
  await expect(page.locator("#nav-home")).toBeHidden();
  await expect(page.locator("header")).toHaveCount(1);
  await page.locator('[data-select="0"]').click();
  await expect(page.locator("#how-nav")).toBeHidden();
  await expect(page.locator("#nav-back")).toBeVisible();
  await expect(page.locator("#nav-home")).toBeVisible();
  await page.locator("#begin").click();
  await expect(page.locator("#nav-back")).toBeVisible();
  await choose(page, "good");
  await choose(page, "good");
  await choose(page, "good");
  await page.locator("#continue").click();
  await page.locator("#plan-button").click();
  await page.locator("#nav-back").click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "reflect");
  await page.locator("#nav-back").click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "practice");
  await expect(page.locator(".reaction")).toHaveCount(1);
  await page.locator("#nav-back").click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "prep");
  await page.locator("#now-nav").click();
  await page.locator("#nav-back").click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "prep");
  await page.locator("#nav-home").click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "home");
});
test("double-clicking an answer records it once", async ({ page }) => {
  await enter(page);
  await page.locator('[data-kind="good"]').dblclick();
  await expect(page.locator(".deck-progress b")).toHaveText("2");
});
test("loading screen shows on page load only, not when returning home", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#splash")).toBeVisible();
  await expect(page.locator("#splash")).toHaveCount(0, { timeout: 5000 });
  await page.locator('[data-select="0"]').click();
  await page.locator("#nav-home").click();
  await page.locator('[data-select="0"]').click();
  await page.locator("#home").click();
  await expect(page.locator("#splash")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#splash")).toBeVisible();
});

test("Back from a scenario lands on the scenario cards", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-category="friendship"]').click();
  await page.locator('[data-select="5"]').click();
  await page.locator("#nav-back").click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "home");
  await expect(page.locator('[data-category="friendship"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const top = await page
    .locator("#situations")
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeLessThan(200);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
});
test("dialogs open with focus on the dialog, not the close button", async ({
  page,
}) => {
  await enter(page);
  await page.locator("#restart").click();
  await expect(page.locator("#modal")).toBeFocused();
  await expect(page.locator(".modal-close")).not.toBeFocused();
});
test("the result card is fully visible below the header after answering", async ({
  page,
}) => {
  await enter(page);
  await choose(page, "good");
  await page.waitForTimeout(600);
  const { top, header } = await page.evaluate(() => ({
    top: document.querySelector(".reaction").getBoundingClientRect().top,
    header: document.querySelector("header").getBoundingClientRect().bottom,
  }));
  expect(top).toBeGreaterThanOrEqual(header);
});

test("children animate and react: talking, celebration, rain, banner, meter score", async ({
  page,
}) => {
  await enter(page);
  await expect(page.locator(".live-character.talking .c-mouth-open")).toHaveCount(1);
  await expect(page.locator(".delta-pop")).toHaveCount(0);
  await choose(page, "good");
  await expect(page.locator(".burst span").first()).toBeAttached();
  await expect(page.locator(".burst-banner.kind-good")).toContainText("Nice!");
  await expect(page.locator(".meter-delta.up")).toHaveText("+15");
  await choose(page, "harmful");
  await expect(page.locator(".rain .cloud")).toBeAttached();
  await expect(page.locator(".burst-banner.kind-harmful")).toContainText("Ouch");
  await expect(page.locator(".meter-delta.down")).toHaveText("-20");
});
test("Home sits at the far right of the header", async ({ page }) => {
  await enter(page);
  const last = await page.evaluate(
    () => document.querySelector("header nav").lastElementChild.id,
  );
  expect(last).toBe("nav-home");
});
