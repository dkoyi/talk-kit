import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RULES,
  classify,
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
test("phrase checker handles known, ambiguous, and negated matches conservatively", () => {
  assert.equal(classify("Thank you for telling me"), "good");
  assert.equal(classify("Give me your phone."), "harmful");
  for (const text of [
    "Thank you for telling me. Give me your phone.",
    "Never thank you for telling me",
    "What happens next?",
  ])
    assert.equal(classify(text), "unknown");
});
test("expressions represent illustrative state and uncertainty", () => {
  assert.equal(moodFor(30, "harmful"), "worried");
  assert.equal(moodFor(65, "good"), "calm");
  assert.equal(moodFor(50), "worried");
  assert.equal(moodFor(95, "unknown"), "worried");
});
