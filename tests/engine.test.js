import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { recordingFor, validateRecordings } from "../assets/audio.js";
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

const recordings = JSON.parse(
  readFileSync(new URL("../assets/audio/recordings.json", import.meta.url)),
);

test("every saved recording has a valid mapping and non-empty audio file", () => {
  assert.equal(validateRecordings(recordings), recordings);
  for (const [character, lines] of Object.entries(recordings)) {
    for (const [text, path] of Object.entries(lines)) {
      assert.equal(recordingFor(recordings, character, text), path);
      assert.ok(readFileSync(new URL(`../${path}`, import.meta.url)).length > 0);
    }
  }
});

test("all 12 scenarios have recordings for openings, responses, later lines and repairs", () => {
  const fallbacks = [
    "I’m worried I shouldn’t have said anything. Can we slow down?",
    "What if we need someone else to help?",
    "I’m not sure how to explain it. I need you to listen.",
    "I don’t want to talk about it anymore.",
  ];
  for (const scenario of content.scenarios) {
    const texts = [scenario.open, ...scenario.later, ...fallbacks];
    for (const choice of [...scenario.replies.flat(), ...content.repairChoices]) {
      const childLines = content.childResponses[choice.text];
      if (childLines) texts.push(childLines.join(" "));
    }
    for (const text of texts)
      assert.ok(recordingFor(recordings, scenario.name, text), `${scenario.id}: ${text}`);
  }
});

test("shared dialogue selects each child's voice and keeps legacy fallback", () => {
  const text = "What if we need someone else to help?";
  const paths = ["Maya", "Jayden", "Lucía"].map((character) =>
    recordingFor(recordings, character, text, { [text]: "assets/audio/old.mp3" }),
  );
  assert.equal(new Set(paths).size, 3);
  assert.ok(paths.every((path) => path !== "assets/audio/old.mp3"));
  assert.equal(recordingFor({}, "Maya", text, { [text]: "assets/audio/old.mp3" }), "assets/audio/old.mp3");
  assert.equal(recordingFor({}, "Maya", text), undefined);
});

test("recordings manifest rejects malformed and external paths", () => {
  for (const invalid of [null, [], { Maya: [] }, { Maya: { line: 42 } },
    { Maya: { line: "https://example.com/voice.mp3" } },
    { Maya: { line: "assets/audio/../secret.mp3" } }])
    assert.throws(() => validateRecordings(invalid));
  assert.deepEqual(validateRecordings({}), {});
});
