// Story weights: kind answers +20, making it right +10, asking a question +5, blame -20.
// On the second ("make it right") attempt, positive answers earn half. They are not
// clinically validated scores or measurements of a child's trust.
export const RULES = Object.freeze({
  good: 20,
  repair: 10,
  harmful: -20,
  promise: -5,
  neutral: 5,
  unknown: 0,
});
export const clampScore = (score) => Math.max(5, Math.min(95, score));
export function evaluate(text, kind, scenario, score, choice = {}) {
  if (!Object.hasOwn(RULES, kind)) kind = "unknown";
  let title,
    feedback,
    alternative = "Thank you for telling me. I’m here to listen.",
    values = [],
    feeling;
  if (kind === "good" || kind === "repair") {
    title =
      kind === "repair"
        ? "You made room to begin again"
        : "You made room for more";
    feedback =
      kind === "repair"
        ? "Acknowledging your reaction and apologizing can reopen a conversation. Repair doesn’t erase the experience; it creates another opportunity to listen."
        : "This response offers support without blame. The next useful step is to listen and include the child in a plan.";
    values =
      kind === "repair"
        ? ["Self-reflection", "Compassion"]
        : ["Empathy", "Respect"];
    feeling = `${scenario.name} might feel more comfortable asking for support.`;
  } else if (kind === "harmful") {
    title = "Pause and try a repair";
    feedback =
      "Blame, dismissal, or an immediate threat of punishment may make sharing feel risky. You can acknowledge the reaction and start again.";
    alternative =
      "I’m sorry I reacted that way. You did the right thing by telling me.";
    values = ["Self-reflection"];
    feeling = `${scenario.name} might worry that sharing will lead to blame or losing control.`;
  } else if (kind === "promise") {
    title = "Support without an absolute promise";
    feedback =
      "Reassurance matters, but promising secrecy in every situation may be impossible to keep. Explain that you will discuss any necessary help with them.";
    alternative =
      "I’ll explain what I’m doing and why. You don’t have to face this alone.";
    values = ["Integrity"];
    feeling = `${scenario.name} might feel reassured now, but unsure later if that promise cannot be kept.`;
  } else if (kind === "neutral") {
    title = "You asked for information";
    feedback =
      "This can help clarify the situation. Pair questions with reassurance, and leave time for the child to answer.";
    alternative =
      "Thank you for telling me. What would you like me to understand first?";
    values = ["Respect"];
    feeling = `${scenario.name} might still be unsure how you will respond.`;
  } else {
    title = "Let’s reflect rather than score";
    feedback =
      "The phrase checker cannot confidently interpret this reply. Consider: does it acknowledge feelings, avoid blame, and leave space for the child to speak? No score change is applied.";
    feeling = "This prototype cannot infer a reaction from these words.";
  }
  return {
    text,
    kind,
    before: score,
    after: clampScore(
      score + (Number.isFinite(choice.delta) ? choice.delta : RULES[kind]),
    ),
    title: choice.title || title,
    feedback: choice.note || feedback,
    alternative: choice.alt || alternative,
    values: choice.values || values,
    feeling,
  };
}
export function moodFor(score, kind) {
  if (kind === "unknown") return "worried";
  return score < 30
    ? "sad"
    : score < 60
      ? "worried"
      : score < 80
        ? "calm"
        : "happy";
}
export function validateContent(data) {
  if (
    data.audioClips &&
    (typeof data.audioClips !== "object" ||
      Array.isArray(data.audioClips) ||
      Object.values(data.audioClips).some(
        (path) =>
          typeof path !== "string" ||
          !/^assets\/audio\/[a-zA-Z0-9_/-]+\.(mp3|wav|ogg)$/.test(path) ||
          path.includes(".."),
      ))
  )
    throw Error("Invalid audio mapping");
  // ElevenLabs audio tags per spoken line, e.g. ["nervous", "whispers"].
  if (
    data.audioTags &&
    (typeof data.audioTags !== "object" ||
      Array.isArray(data.audioTags) ||
      Object.values(data.audioTags).some(
        (tags) =>
          !Array.isArray(tags) ||
          !tags.length ||
          tags.some((t) => typeof t !== "string" || !/^[a-z][a-z ]*$/.test(t)),
      ))
  )
    throw Error("Invalid audio tags");
  if (
    data?.schemaVersion !== 1 ||
    !Array.isArray(data.scenarios) ||
    data.scenarios.length < 1 ||
    !Array.isArray(data.choices) ||
    data.choices.length !== 3
  )
    throw Error("Unsupported scenario data");
  if (!Array.isArray(data.categories) || !data.categories.length)
    throw Error("Missing categories");
  const ids = new Set();
  for (const s of data.scenarios) {
    if (
      ids.has(s.id) ||
      !data.categories.some((c) => c.id === s.categoryId) ||
      ![0, 1, 2].includes(s.characterIndex)
    )
      throw Error("Invalid scenario identity");
    ids.add(s.id);
    for (const k of [
      "id",
      "name",
      "topic",
      "headline",
      "context",
      "open",
      "need",
      "feeling",
      "color",
    ])
      if (typeof s[k] !== "string" || !s[k].trim())
        throw Error("Incomplete scenario");
    // Optional ElevenLabs voice for generating this character's recordings.
    if (
      s.voice &&
      (s.voice.provider !== "elevenlabs" ||
        !/^[A-Za-z0-9]{20}$/.test(s.voice.voiceId || ""))
    )
      throw Error("Invalid voice");
    if (s.replies && (!Array.isArray(s.replies) || s.replies.length !== 3))
      throw Error("Incomplete response deck");
    if (
      s.plan &&
      (!Array.isArray(s.plan.steps) ||
        s.plan.steps.some((x) => typeof x !== "string") ||
        !Array.isArray(s.plan.links) ||
        s.plan.links.some(
          (link) =>
            !Array.isArray(link) ||
            link.length !== 3 ||
            link.some((x) => typeof x !== "string") ||
            !/^https:\/\//.test(link[2]),
        ))
    )
      throw Error("Invalid support plan");
    if (
      !Array.isArray(s.later) ||
      s.later.length !== 3 ||
      s.later.some((x) => typeof x !== "string")
    )
      throw Error("Incomplete dialogue");
    if (s.review?.status !== "pending")
      throw Error("This prototype only publishes pending review content");
  }
  for (const group of [
    ...data.choices,
    data.repairChoices,
    ...data.scenarios.flatMap((s) => s.replies || []),
  ]) {
    if (
      !Array.isArray(group) ||
      group.length !== 3 ||
      group.some(
        (o) => typeof o.text !== "string" || !Object.hasOwn(RULES, o.kind),
      )
    )
      throw Error("Invalid response choices");
  }
  return data;
}
