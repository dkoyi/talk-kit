import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RULES,
  evaluate,
  moodFor,
  validateContent,
} from "../assets/engine.js";
const content = JSON.parse(
  readFileSync(new URL("../data/scenarios.json", import.meta.url)),
);
test("12 complete situations across four categories, with pending reviews", () => {
  assert.equal(validateContent(content), content);
  assert.equal(content.scenarios.length, 12);
  for (const c of content.categories)
    assert.equal(
      content.scenarios.filter((s) => s.categoryId === c.id).length,
      3,
    );
  const altered = structuredClone(content);
  altered.scenarios[0].review.status = "approved";
  assert.throws(() => validateContent(altered));
});
test("authored weights and bounds preserve the original behavior", () => {
  assert.deepEqual(RULES, {
    good: 15,
    repair: 18,
    harmful: -20,
    promise: -5,
    neutral: 0,
    unknown: 0,
  });
  const s = content.scenarios[0];
  assert.equal(evaluate("test", "harmful", s, 50).after, 30);
  assert.equal(evaluate("test", "repair", s, 30).after, 48);
  assert.equal(evaluate("test", "good", s, 90).after, 95);
  assert.equal(evaluate("test", "harmful", s, 10).after, 5);
  assert.equal(evaluate("test", "unknown", s, 50).after, 50);
  assert.match(evaluate("test", "promise", s, 50).feedback, /secrecy/);
});
test("expressions represent illustrative state and uncertainty", () => {
  assert.equal(moodFor(30, "harmful"), "worried");
  assert.equal(moodFor(65, "good"), "calm");
  assert.equal(moodFor(50), "worried");
  assert.equal(moodFor(95, "unknown"), "worried");
});
test("each character has one consistent ElevenLabs voice", () => {
  const byCharacter = new Map();
  for (const s of content.scenarios) {
    assert.equal(s.voice.provider, "elevenlabs");
    const seen = byCharacter.get(s.characterIndex);
    if (seen) assert.equal(s.voice.voiceId, seen);
    else byCharacter.set(s.characterIndex, s.voice.voiceId);
  }
  assert.equal(new Set(byCharacter.values()).size, 3);
  const altered = structuredClone(content);
  altered.scenarios[0].voice.voiceId = "not a voice";
  assert.throws(() => validateContent(altered));
});
test("every line a child speaks has ElevenLabs audio tags", () => {
  const lines = new Set();
  for (const s of content.scenarios) {
    lines.add(s.open);
    s.later.forEach((l) => lines.add(l));
  }
  Object.values(content.childResponses).forEach((v) =>
    v.forEach((l) => lines.add(l)),
  );
  for (const line of lines)
    assert.ok(content.audioTags[line]?.length, `missing tags: ${line}`);
  const altered = structuredClone(content);
  altered.audioTags[content.scenarios[0].open] = ["[Nervous]"];
  assert.throws(() => validateContent(altered));
});
