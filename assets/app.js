import {
  classify,
  evaluate,
  moodFor,
  validateContent,
  RULES,
} from "./engine.js";

const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let activeCategory = "contact",
  currentOptions = null,
  recorded = false,
  returnStage = "home";
const attempts = {};
let content,
  scenarios = [],
  stage = "home",
  selected = 0,
  score = 50,
  turns = [],
  messages = [],
  count = 0,
  repairMode = false,
  customDraft = "",
  picked = null,
  revealed = false;
let activeAudio = null;
let breathTimer = null,
  breathDeadline = 0,
  toastTimer = null,
  voiceToken = 0,
  modalReturn = null;
// Simple line icons (24px grid) used as visual cues in place of text.
const ICONS = {
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  people:
    '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 3-6 6-6s6 2 6 6M15 14.5c3 0 6 1.5 6 5"/>',
  heart:
    '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  happy:
    '<circle cx="12" cy="12" r="9"/><path d="M8 14.5c2 2.5 6 2.5 8 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  calm: '<circle cx="12" cy="12" r="9"/><path d="M9 15h6"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  worried:
    '<circle cx="12" cy="12" r="9"/><path d="M8.5 16c2-2 5-2 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  sad: '<circle cx="12" cy="12" r="9"/><path d="M8.5 16.5c2-2.5 5-2.5 7 0"/><path d="M9 9.5h.01M15 9.5h.01M9 12v1.5"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  cross: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  leaf: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l8-8"/>',
  speaker:
    '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  thought:
    '<path d="M7 15a4 4 0 0 1-.5-8A5 5 0 0 1 16 6a4 4 0 0 1 1 9z"/><circle cx="7" cy="19" r="1.3"/><circle cx="4" cy="21.5" r=".7"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  sprout:
    '<path d="M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 12c0-3 2.5-5.5 7-5.5 0 3.5-2.5 5.5-7 5.5z"/>',
  question:
    '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17h.01"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  broken:
    '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M12 7.4l-1.5 4 3 1.5-1.5 4"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  pencil: '<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/>',
  ear: '<path d="M8 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0"/><path d="M11 10a2 2 0 0 1 4 0"/>',
  calendar:
    '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  book: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/>',
  shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/><path d="M12 9v6M9 12h6"/>',
  trend: '<path d="M4 17l6-6 4 4 6-7"/><path d="M15 8h5v5"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const c = () => scenarios[selected];
const options = () => {
  if (currentOptions) return currentOptions;
  const base = repairMode
    ? content.repairChoices
    : (c().replies || content.choices)[Math.min(count, 2)];
  currentOptions = [...base];
  for (let i = currentOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [currentOptions[i], currentOptions[j]] = [
      currentOptions[j],
      currentOptions[i],
    ];
  }
  return currentOptions;
};
const zone = () =>
  score < 25
    ? "Shut down"
    : score < 50
      ? "Guarded"
      : score < 75
        ? "Opening up"
        : "Talking with you";
const lastTurn = () => turns.at(-1);
const currentLine = () => {
  const lines = [];
  for (let i = messages.length - 1; i >= 0 && messages[i].who !== "You"; i--)
    lines.unshift(messages[i].text);
  return lines.join(" ") || c().open;
};

const MOODS = {
  sad: {
    brow: "M86 91l12-5m34 0 12 5",
    eye: 2.6,
    mouth: "q9-7 18 0",
    blush: 0.15,
  },
  worried: {
    brow: "M86 90l12-4m34 0 12 4",
    eye: 4,
    mouth: "q9-3 18 0",
    blush: 0.2,
  },
  calm: {
    brow: "M86 88q6-3 12-1m34 0q6-2 12 1",
    eye: 4,
    mouth: "q9 3 18 0",
    blush: 0.3,
  },
  happy: {
    brow: "M86 86q6-4 12-2m34 0q6-2 12 2",
    eye: 3.6,
    mouth: "q9 8 18 0",
    blush: 0.4,
  },
};
const childArt = (i, mood = "worried") =>
  `<svg viewBox="0 0 230 205" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${["Maya", "Jayden", "Lucía"][i]}: illustrative ${mood} expression" data-mood="${mood}"><circle cx="115" cy="100" r="83" fill="#fff" opacity=".35"/><path d="M55 203v-30c0-39 120-39 120 0v30" fill="${["#75896e", "#c29a72", "#9b8ea5"][i]}"/><rect x="101" y="132" width="28" height="29" rx="10" fill="${["#b47b57", "#7a4e36", "#d2a27f"][i]}"/><path d="M66 99V75c0-66 100-66 100 0v39" fill="${["#453b32", "#303d39", "#615043"][i]}"/><ellipse cx="115" cy="97" rx="44" ry="51" fill="${["#c58d67", "#956547", "#e1b492"][i]}"/><path d="M70 77c-1-57 91-63 96 0-27-8-36-27-39-34-11 20-34 32-57 34" fill="${["#453b32", "#303d39", "#615043"][i]}"/><ellipse cx="84" cy="114" rx="8" ry="4.5" fill="#e0806a" opacity="${MOODS[mood].blush}"/><ellipse cx="146" cy="114" rx="8" ry="4.5" fill="#e0806a" opacity="${MOODS[mood].blush}"/><path d="${MOODS[mood].brow}" stroke="#57463b" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="94" cy="99" rx="3.2" ry="${MOODS[mood].eye}" fill="#263a34"/><ellipse cx="137" cy="99" rx="3.2" ry="${MOODS[mood].eye}" fill="#263a34"/><circle cx="95.2" cy="97.5" r="1.1" fill="#fff"/><circle cx="138.2" cy="97.5" r="1.1" fill="#fff"/><path d="M111 112l-2 5h7" stroke="#775445" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M106 129${MOODS[mood].mouth}" stroke="#775445" stroke-width="2.4" fill="none" stroke-linecap="round"/>${mood === "sad" ? '<path d="M91 106q-3 6 0 9q3-3 0-9" fill="#9cc6dc"/>' : ""}${i === 2 ? '<path d="M72 68q-31 8-22 44m106-44q31 8 24 44" fill="none" stroke="#615043" stroke-width="17"/>' : ""}</svg>`;
function step(n) {
  return `<ol class="steps" aria-label="Practice progress">${["Choose", "Prepare", "Practice", "Reflect"].map((v, i) => `<li ${i === n ? 'aria-current="step"' : ""} class="${i === n ? "active" : ""} ${i < n ? "complete" : ""}"><span>${i < n ? "✓" : i + 1}</span>${v}</li>`).join("")}</ol>`;
}
function reset() {
  currentOptions = null;
  recorded = false;
  score = 50;
  turns = [];
  messages = [{ who: c().name, text: c().open }];
  count = 0;
  repairMode = false;
  customDraft = "";
  picked = null;
  revealed = false;
}
function stopVoice() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.removeAttribute("src");
    activeAudio = null;
  }
  voiceToken++;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  const button = $("#listen");
  if (button) {
    button.innerHTML = `${icon("speaker")} Listen`;
    button.setAttribute("aria-pressed", "false");
  }
}
function toast(text) {
  clearTimeout(toastTimer);
  $("#toast").textContent = text;
  $("#toast").hidden = false;
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 5000);
}
function go(next) {
  if (next === "resources" && stage !== "resources") returnStage = stage;
  stopVoice();
  closeModal();
  if (next === "reflect" && !recorded && turns.length) {
    (attempts[c().id] ??= []).push(score);
    recorded = true;
  }
  stage = next;
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
  const h = $("main h1");
  if (h) {
    h.tabIndex = -1;
    h.classList.add("focus-destination");
    h.focus();
  }
}
function reviewBadge() {
  return '<button class="review-badge" data-review><span aria-hidden="true">◇</span> Expert review pending <span aria-hidden="true">↗</span></button>';
}
const CATEGORY_ICONS = {
  contact: "chat",
  friendship: "people",
  feelings: "heart",
  boundaries: "clock",
};
function home() {
  return `<section class="hero new-hero"><div class="hero-copy"><h1>Practice the<br><em>hard talks.</em></h1><p>Kids face tricky things online. Practice what to say before it happens.</p><div class="hero-actions"><button class="primary" id="start">Let’s start <span aria-hidden="true">↓</span></button><button class="text-button" id="how-button">How it works <span aria-hidden="true">↓</span></button></div><div class="privacy">${icon("lock")} Free · No sign-up</div></div><div class="hero-stage" aria-label="An example practice card"><span class="floating-tag top-tag">${icon("happy")} Safe to try</span><span class="spark spark-one" aria-hidden="true">✳</span><div class="back-card one"></div><div class="back-card two"></div><div class="hero-demo"><div class="demo-top"><span class="pill">MAYA, 13</span></div><div class="demo-character">${childArt(0, "happy")}</div><blockquote>“Can I tell you<br>something?”</blockquote><div class="demo-response"><span aria-hidden="true">♡</span> “Of course. I’m listening.”</div></div><span class="floating-tag bottom-tag"><span aria-hidden="true">↺</span> Try again anytime</span></div></section><section id="situations" class="situation-section"><div class="section-head"><div><h2>Pick a moment</h2></div></div><div class="category-tabs" role="group" aria-label="Conversation topics">${content.categories.map((cat) => `<button data-category="${esc(cat.id)}" aria-pressed="${cat.id === activeCategory}">${icon(CATEGORY_ICONS[cat.id] || "chat", "cat-icon")} ${esc(cat.label)}</button>`).join("")}</div><div class="cards">${scenarios
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.categoryId === activeCategory)
    .map(
      ({ s, i }) =>
        `<article class="card scenario-card theme-${s.characterIndex}"><div class="portrait"><span class="topic">${esc(s.topic)}</span>${childArt(s.characterIndex)}</div><div class="card-content"><div class="character-meta"><span>${esc(s.name)} <span class="age">· ${s.age}</span></span></div><h3>${esc(s.headline)}</h3><button class="deck-button" data-select="${i}">Start <span aria-hidden="true">↗</span></button></div></article>`,
    )
    .join("")}</div><div class="review-note">${reviewBadge()}</div></section><section class="how" id="how"><div><h2>How it works</h2></div>${[
    ["eye", "Pick a moment"],
    ["chat", "Choose what to say"],
    ["happy", "See how they feel"],
  ]
    .map(
      (x) =>
        `<div><span class="how-number">${icon(x[0])}</span><strong>${x[1]}</strong></div>`,
    )
    .join("")}</section>`;
}
function prep() {
  return `${step(1)}<button class="back" id="back">← Back</button><div class="prep-title"><h1>Get <em>ready.</em></h1></div><div class="prep-layout"><section class="panel scenario-intro theme-${c().characterIndex}"><div class="portrait">${childArt(c().characterIndex)}</div><div class="eyebrow">${esc(c().name)}, ${c().age}</div><blockquote>“${esc(c().open)}”</blockquote><p class="muted">${esc(c().context)}</p></section><section class="panel preparation"><div class="tips"><div class="tip"><strong>${icon("check", "good-icon")} Try saying</strong><p>${(c().say || ["“Thank you for telling me.”", "“You’re not to blame.”", "“What would help right now?”"]).map(esc).join("<br>")}</p></div><div class="tip avoid"><strong>${icon("cross", "bad-icon")} Avoid</strong><p>${(c().avoid || ["Blaming or dismissing.", "Threatening punishment.", "Taking over without listening."]).map(esc).join("<br>")}</p></div></div><button class="breath-launch" id="breathe"><span class="breath-icon">${icon("leaf")}</span><span><strong>Take a breath first</strong><small>30 seconds</small></span><span aria-hidden="true">↗</span></button><button class="primary full-width" id="begin">I’m ready <span aria-hidden="true">→</span></button></section></div>`;
}
function practice() {
  const last = lastTurn();
  const mood = moodFor(score, last?.kind);
  return `${step(2)}<div class="practice-heading"><div><h1>Talking with <em>${esc(c().name)}.</em></h1></div><button class="secondary" id="restart">↺ Start over</button></div><div class="practice-shell"><aside class="character-panel theme-${c().characterIndex}"><div class="character-top"><span class="pill">${esc(c().topic)}</span></div><div class="live-character">${childArt(c().characterIndex, mood)}<span class="mood-label">${mood === "happy" ? `${icon("happy")} Feeling closer` : mood === "calm" ? `${icon("calm")} Calmer` : mood === "sad" ? `${icon("sad")} Needs space` : `${icon("worried")} Worried`}</span></div><div class="character-name">${esc(c().name)}<span>Age ${c().age}</span></div><div class="feeling"><strong>${icon("thought")}</strong><span>${last ? esc(last.feeling) : esc(c().feeling)}</span></div><div class="openness" role="img" aria-label="How open ${esc(c().name)} feels: ${zone()}"><div class="face-scale">${icon("worried")}<div class="meter"><span class="marker" style="left:calc(${score}% - 2px)"></span></div>${icon("happy")}</div></div><button class="text-button small" data-rules>ⓘ How this works</button></aside><section class="conversation-area"><div class="deck-progress"><span><b>${Math.min(count + 1, 3)}</b> / 3</span><div class="progress-dots" aria-label="${count} of 3 moments explored">${[0, 1, 2].map((i) => `<span class="${i < count ? "done" : i === count ? "current" : ""}"></span>`).join("")}</div></div><div class="flashcard ${revealed ? "feedback-side" : ""}" id="flashcard" tabindex="-1">${revealed ? feedbackCard(last) : questionCard()}</div><div class="under-card"><button class="text-button" id="reflect">Finish ✓</button></div>${messages.length > 1 ? `<details class="transcript"><summary>Chat so far <span>${turns.length}</span></summary><div class="chatlog" id="chatlog">${messages.map((m) => `<div class="bubble ${m.who === "You" ? "parent" : ""}"><span class="speaker">${esc(m.who)}</span>${esc(m.text)}</div>`).join("")}</div></details>` : ""}</section></div>`;
}
function questionCard() {
  return `<div class="flashcard-top"><span class="eyebrow">${repairMode ? "↺ MAKE IT RIGHT" : ""}</span><button class="voice-button" id="listen" aria-pressed="false">${icon("speaker")} Listen</button></div><p id="voice-error" class="inline-error" role="status" hidden></p><blockquote class="child-quote">“${esc(currentLine())}”</blockquote><div class="choice-header"><h2>${repairMode ? "How can you make it right?" : "What would you say?"}</h2></div><div class="replies" role="group" aria-label="Response choices">${options()
    .map(
      (o, i) =>
        `<button class="reply ${picked === i ? "selected" : ""}" data-reply="${i}" data-kind="${o.kind}" aria-pressed="${picked === i}"><span class="choice-letter">${String.fromCharCode(65 + i)}</span><span>${esc(o.text)}</span><span class="choice-mark" aria-hidden="true">${picked === i ? "✓" : "↗"}</span></button>`,
    )
    .join(
      "",
    )}</div><p class="inline-error" id="choice-error" role="alert" hidden></p><button class="primary full-width" id="reveal">See what happens <span aria-hidden="true">→</span></button><details class="custom-entry" ${customDraft ? "open" : ""}><summary>${icon("pencil")} Or type your own</summary><form id="custom-form" novalidate><label class="formlabel" for="custom">What would you say?</label><textarea id="custom" maxlength="500" aria-describedby="custom-help custom-error" placeholder="Type here…">${esc(customDraft)}</textarea><div class="custom-meta"><span id="custom-help">No real names, please.</span><span id="character-count">${customDraft.length}/500</span></div><p id="custom-error" class="inline-error" role="alert" hidden></p><button class="secondary" type="submit">Try it →</button></form></details><button class="text-button repair-link" id="repair">↺ Practice making it right</button>`;
}
const RESULT_ICONS = {
  good: "star",
  repair: "sprout",
  neutral: "question",
  unknown: "question",
  promise: "alert",
  harmful: "broken",
};
const resultIcon = (kind) =>
  icon(RESULT_ICONS[kind] || "question", `result-${kind}`);
function feedbackCard(last) {
  return `<div class="flashcard-top"><span class="feedback-emoji">${resultIcon(last.kind)}</span></div><p class="your-choice">You said: “${esc(last.text)}”</p><h2 class="feedback-title">${esc(last.title)}<span>.</span></h2><p class="feedback-copy">${esc(last.feedback)}</p><div class="tag-list">${last.values.map((v) => `<span class="tag">${v}</span>`).join("")}</div><div class="next-line"><span class="eyebrow">${esc(c().name.toUpperCase())}</span><blockquote>“${esc(currentLine())}”</blockquote><button class="voice-button" id="listen" aria-pressed="false">${icon("speaker")} Listen</button><p id="voice-error" class="inline-error" role="status" hidden></p></div><div class="another-line"><strong>${icon("bulb")} Also try</strong><p>“${esc(last.alternative)}”</p></div><button class="primary full-width" id="continue">${count >= 3 ? "See how it went" : "Keep going"} <span aria-hidden="true">→</span></button>${last.kind === "harmful" || last.kind === "promise" ? '<button class="secondary full-width repair-now" id="repair">↺ Try making it right</button>' : ""}`;
}
function respond(text, kind, choice = {}) {
  stopVoice();
  const turn = evaluate(text, kind, c(), score, choice);
  score = turn.after;
  turns.push(turn);
  messages.push({ who: "You", text });
  // Preserve master: each main response progresses, regardless of its score.
  if (!repairMode) count = Math.min(3, count + 1);
  const lines = {
    harmful: "I’m worried I shouldn’t have said anything. Can we slow down?",
    unknown: "[Pause the simulation and reflect on your response.]",
    promise: "What if we need someone else to help?",
    neutral: "I’m not sure how to explain it. I need you to listen.",
  };
  let childLines = content.childResponses?.[text] || [
    lines[kind] || c().later[Math.min(Math.max(count - 1, 0), 2)],
  ];
  if (kind === "harmful" && score < 30)
    childLines = ["I don’t want to talk about it anymore."];
  for (const line of childLines) messages.push({ who: c().name, text: line });
  repairMode = false;
  customDraft = "";
  picked = null;
  revealed = true;
  render();
  $("#flashcard").focus();
}
function chart() {
  let scores = [50, ...turns.map((t) => t.after)];
  let pts = scores
    .map(
      (s, i) => `${35 + i * (430 / Math.max(scores.length - 1, 1))},${130 - s}`,
    )
    .join(" ");
  return `<svg class="chart" viewBox="0 0 500 160" role="img" aria-label="Illustrative conversation openness across ${turns.length} practice responses"><path d="M35 35H465M35 80H465M35 125H465" stroke="#dde4d5"/><polyline points="${pts}" fill="none" stroke="#48745b" stroke-width="3"/>${scores.map((s, i) => `<circle cx="${35 + i * (430 / Math.max(scores.length - 1, 1))}" cy="${130 - s}" r="4" fill="#48745b"/>`).join("")}<text x="35" y="149" font-size="14" fill="#73816f">Start</text><text x="440" y="149" font-size="14" fill="#73816f">End</text></svg>`;
}
function reflect() {
  let vals = [...new Set(turns.flatMap((t) => t.values))];
  return `${step(3)}<h1 style="font-size:47px;margin:12px 0">Well <em>done!</em></h1><p class="muted">Here’s how it went with ${esc(c().name)}.</p><div class="summary"><section class="panel"><h3>How ${esc(c().name)} opened up</h3>${chart()}${compare()}${turns.length ? turns.map((t, i) => `<div class="turn"><strong>${resultIcon(t.kind)} “${esc(t.text)}”</strong><p>${esc(t.title)}</p></div>`).join("") : '<p class="muted">No replies yet.</p>'}</section><aside><section class="panel"><h3>Values you showed</h3>${content.principles.map((v) => `<span class="tag ${vals.includes(v) ? "" : "off"}">${vals.includes(v) ? "✓ " : ""}${esc(v)}</span>`).join("")}<h3>Next time</h3>${[["heart", "Say thank you"], ["ear", "Listen first"], ["people", "Decide together"], ["calendar", "Check in later"]].map(([n, s]) => `<label class="check"><input type="checkbox">${icon(n)} ${s}</label>`).join("")}<button class="primary" id="plan-button">Next steps →</button><button class="text-button" id="resources-button">Get help ↗</button></section><div style="display:flex;gap:10px;margin-top:15px"><button class="secondary" id="again">↺ Try again</button><button class="secondary" id="new">Pick another</button></div></aside></div>`;
}
function resources() {
  return `<button class="back" id="back-prev">← Back</button><h1 style="font-size:47px">Get <em>help.</em></h1><div class="summary"><section class="panel"><h3>${icon("chat")} What to say</h3><div class="script">“Thank you for telling me. You’re not in trouble. I’m here. What do you need right now?”</div><div class="notice">This site can’t send reports or call anyone. The links open other websites.</div></section><section><a class="resource" target="_blank" rel="noopener noreferrer" href="https://parents.thorn.org/"><strong>Thorn for Parents ↗</strong><span>Guides for talking about online safety.</span></a><a class="resource" target="_blank" rel="noopener noreferrer" href="https://www.missingkids.org/gethelpnow/cybertipline"><strong>NCMEC CyberTipline ↗</strong><span>Report online sexual exploitation of a child.</span></a><a class="resource" target="_blank" rel="noopener noreferrer" href="https://www.stopbullying.gov/cyberbullying/what-is-it"><strong>StopBullying.gov ↗</strong><span>Help with cyberbullying.</span></a><p class="sim-label">${icon("alert")} In danger right now? Call 911 (US) or your local emergency number.</p></section></div>`;
}
function about() {
  return `<button class="back" id="back-home">← Back</button><h1 style="font-size:47px">About <em>this site.</em></h1><div class="summary"><section class="panel about-list"><p>${icon("book")} Made-up stories, for practice only.</p><p>${icon("lock")} No sign-up. Nothing is saved or sent.</p><p>${icon("happy")} The face and meter are a story, not a grade.</p><p>${icon("pencil")} Typed replies use a simple word check, not AI.</p></section><section class="panel about-list"><p>${icon("shield")} Not therapy or emergency help.</p><button class="review-badge" data-review>◇ Expert review pending ↗</button><p><a href="https://parents.thorn.org/guides/getting-aligned-on-social-media-platforms/" target="_blank" rel="noopener noreferrer">Source guide ↗</a></p></section></div>`;
}
function render() {
  stopVoice();
  $("#app").innerHTML =
    stage === "home"
      ? home()
      : stage === "prep"
        ? prep()
        : stage === "practice"
          ? practice()
          : stage === "reflect"
            ? reflect()
            : stage === "about"
              ? about()
              : stage === "plan"
                ? plan()
                : resources();
  $("#app").dataset.stage = stage;
  $("#pause-session").hidden = ![
    "prep",
    "practice",
    "reflect",
    "plan",
    "resources",
  ].includes(stage);
  document.body.classList.toggle("in-session", !$("#pause-session").hidden);
  decorate($("#app"));
  bind();
}
function on(selector, handler) {
  const element = $(selector);
  if (element) element.addEventListener("click", handler);
}
function bind() {
  document.querySelectorAll("[data-category]").forEach(
    (b) =>
      (b.onclick = () => {
        activeCategory = b.dataset.category;
        render();
        document
          .querySelector(`[data-category="${activeCategory}"]`)
          .focus({ preventScroll: true });
      }),
  );
  document.querySelectorAll("[data-select]").forEach(
    (b) =>
      (b.onclick = () => {
        selected = Number(b.dataset.select);
        reset();
        go("prep");
      }),
  );
  document
    .querySelectorAll("[data-review]")
    .forEach((b) => (b.onclick = showReview));
  document
    .querySelectorAll("[data-rules]")
    .forEach((b) => (b.onclick = showRules));
  on("#start", () => $("#situations").scrollIntoView({ behavior: motion() }));
  on("#how-button", () => $("#how").scrollIntoView({ behavior: motion() }));
  on("#back-prev", () => go(returnStage));
  on("#back", () => go("home"));
  on("#back-home", () => go("home"));
  on("#begin", () => {
    reset();
    go("practice");
  });
  on("#breathe", showCalm);
  on("#calm", showCalm);
  on("#restart", () => {
    openModal(
      `<h2 id="modal-title">Start over?</h2><p>Your answers will be cleared.</p><div class="modal-actions"><button class="primary" id="confirm-restart">↺ Start over</button><button class="secondary" data-close>Keep going</button></div>`,
    );
    on("#confirm-restart", () => {
      closeModal();
      reset();
      render();
      $("#flashcard").focus();
      toast("Starting fresh.");
    });
  });
  document.querySelectorAll("[data-reply]").forEach(
    (b) =>
      (b.onclick = () => {
        picked = Number(b.dataset.reply);
        document.querySelectorAll("[data-reply]").forEach((x) => {
          const active = x === b;
          x.classList.toggle("selected", active);
          x.setAttribute("aria-pressed", active);
          x.querySelector(".choice-mark").textContent = active ? "✓" : "↗";
        });
        $("#choice-error").hidden = true;
      }),
  );
  on("#reveal", () => {
    if (picked === null) {
      $("#choice-error").textContent =
        "Pick an answer first.";
      $("#choice-error").hidden = false;
      return;
    }
    const o = options()[picked];
    respond(o.text, o.kind, o);
  });
  on("#continue", () => {
    if (count >= 3) {
      go("reflect");
      return;
    }
    revealed = false;
    picked = null;
    currentOptions = null;
    repairMode = lastTurn()?.kind === "harmful";
    render();
    $("#flashcard").focus();
  });
  on("#repair", () => {
    customDraft = $("#custom")?.value || "";
    repairMode = true;
    revealed = false;
    picked = null;
    currentOptions = null;
    repairMode = lastTurn()?.kind === "harmful";
    render();
    $(".reply").focus();
  });
  on("#reflect", () => go("reflect"));
  on("#listen", speak);
  const form = $("#custom-form");
  if (form) {
    $("#custom").oninput = () => {
      customDraft = $("#custom").value;
      $("#character-count").textContent = `${customDraft.length}/500`;
      $("#custom-error").hidden = true;
      $("#custom").removeAttribute("aria-invalid");
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      const text = $("#custom").value.trim();
      if (!text || text.length > 500) {
        $("#custom-error").textContent =
          text.length > 500
            ? "Keep your reply under 500 characters."
            : "Type a few words first.";
        $("#custom-error").hidden = false;
        $("#custom").setAttribute("aria-invalid", "true");
        $("#custom").focus();
        return;
      }
      respond(text, classify(text));
    };
  }
  on("#again", () => {
    reset();
    go("practice");
  });
  on("#new", () => go("home"));
  on("#resources-button", () => go("resources"));
  on("#plan-button", () => go("plan"));
  on("#back-reflect", () => go("reflect"));
}
const motion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
function openModal(html, variant = "") {
  stopVoice();
  modalReturn = document.activeElement;
  $("#modal").className = variant;
  $("#modal-content").innerHTML =
    `<button class="modal-close" data-close aria-label="Close dialog">×</button>${html}`;
  decorate($("#modal-content"));
  document.body.classList.add("modal-open");
  $("#modal").showModal();
  $("#modal")
    .querySelectorAll("[data-close]")
    .forEach((b) => (b.onclick = closeModal));
}
function closeModal() {
  clearInterval(breathTimer);
  breathTimer = null;
  if ($("#modal").open) $("#modal").close();
}
$("#modal").addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  clearInterval(breathTimer);
  breathTimer = null;
  if (modalReturn?.isConnected) modalReturn.focus();
});
$("#modal").addEventListener("click", (e) => {
  if (e.target === $("#modal")) {
    const r = $("#modal").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeModal();
  }
});
function showCalm() {
  openModal(
    `<div class="calm-scene" aria-hidden="true"><div class="calm-picture"></div><span class="calm-mote"></span><span class="calm-mote"></span><span class="calm-mote"></span><span class="calm-mote"></span><span class="calm-mote"></span><span class="calm-mote"></span></div><div class="calm-panel"><h2 id="modal-title">Take a pause.</h2><p>Your progress is saved.</p><div class="breathing-orbit breathing"><div class="breathing-circle"><span id="calm-seconds" role="timer" aria-label="Seconds remaining">30</span><small>seconds</small></div></div><h3 id="calm-cue" class="calm-cue" aria-live="polite">Breathe in gently…</h3><p id="calm-status" role="status">Follow the circle.</p><div class="modal-actions"><button class="primary" id="calm-return" data-close>End pause</button><button class="secondary" id="calm-start" hidden>↺ Again</button></div></div>`,
    "calm-fullscreen",
  );
  const start = () => {
    clearInterval(breathTimer);
    breathDeadline = Date.now() + 30000;
    $("#calm-start").hidden = true;
    $("#calm-return").textContent = "End pause";
    $("#calm-status").textContent =
      "Follow the circle.";
    $(".breathing-orbit").classList.add("breathing");
    const tick = () => {
      const left = Math.max(0, Math.ceil((breathDeadline - Date.now()) / 1000));
      $("#calm-seconds").textContent = left;
      const cue =
        left === 0
          ? "Your pause is complete."
          : (30 - left) % 10 < 4
            ? "Breathe in gently…"
            : "Breathe out slowly…";
      if ($("#calm-cue").textContent !== cue) $("#calm-cue").textContent = cue;
      if (left === 0) {
        clearInterval(breathTimer);
        breathTimer = null;
        $(".breathing-orbit").classList.remove("breathing");
        $("#calm-status").textContent =
          "Go on when you’re ready.";
        $("#calm-return").textContent = "I’m ready →";
        $("#calm-start").hidden = false;
      }
    };
    tick();
    breathTimer = setInterval(tick, 200);
  };
  on("#calm-start", start);
  start();
}
function showReview() {
  openModal(
    `<h2 id="modal-title">Expert review</h2><span class="status-pending">◇ Pending</span><p>We plan to have licensed therapists check every story. No reviewer credentials or approvals have been verified yet.</p><div class="review-process"><div><b>1 · Check the expert’s license</b></div><div><b>2 · Review each story</b></div><div><b>3 · Show who reviewed it</b></div></div><p class="sim-label">Version ${esc(content.contentVersion)}</p><button class="primary full-width" data-close>Got it</button>`,
  );
}
function showRules() {
  openModal(
    `<h2 id="modal-title">How the face changes</h2><p>Each answer moves the meter. It’s a story, not a grade.</p><dl class="rule-list">${Object.entries(
      RULES,
    )
      .map(
        ([k, v]) =>
          `<div><dt>${`${resultIcon(k)} ${{ good: "Kind, supportive", repair: "Making it right", harmful: "Blaming", promise: "Promising secrecy", neutral: "Asking questions", unknown: "Unclear" }[k]}`}</dt><dd>${v > 0 ? "+" : ""}${v}</dd></div>`,
      )
      .join(
        "",
      )}</dl><p class="sim-label">Just a practice tool. Not clinically validated.</p><button class="primary full-width" data-close>Got it</button>`,
  );
}
function speak() {
  const button = $("#listen");
  const error = $("#voice-error");
  if (button.getAttribute("aria-pressed") === "true") {
    stopVoice();
    return;
  }
  error.hidden = true;
  const clip = content.audioClips?.[currentLine()];
  if (clip) {
    stopVoice();
    const token = voiceToken;
    const fail = () => {
      if (token !== voiceToken) return;
      stopVoice();
      if (error.isConnected) {
        error.textContent =
          "This recording is unavailable. You can keep reading the conversation.";
        error.hidden = false;
      }
    };
    try {
      activeAudio = new Audio(clip);
      activeAudio.onended = () => {
        if (token === voiceToken) stopVoice();
      };
      activeAudio.onerror = fail;
      button.textContent = "■ Stop";
      button.setAttribute("aria-pressed", "true");
      activeAudio.play().catch(fail);
    } catch {
      fail();
    }
    return;
  }
  if (
    !("speechSynthesis" in window) ||
    !("SpeechSynthesisUtterance" in window)
  ) {
    error.textContent =
      "Voice playback isn’t available in this browser. You can read the full conversation on the card.";
    error.hidden = false;
    return;
  }
  const voices = window.speechSynthesis
    .getVoices()
    .filter((v) => v.localService && /^en\b/i.test(v.lang));
  if (!voices.length) {
    error.textContent =
      "No English device voice is available yet. Try Listen again after voices load, or continue with the text.";
    error.hidden = false;
    return;
  }
  stopVoice();
  const token = voiceToken;
  const utterance = new SpeechSynthesisUtterance(currentLine());
  utterance.voice = voices[c().characterIndex % voices.length];
  utterance.lang = utterance.voice.lang;
  utterance.rate = [0.9, 0.94, 0.85][c().characterIndex];
  utterance.pitch = [1.05, 0.95, 1.12][c().characterIndex];
  button.textContent = "■ Stop";
  button.setAttribute("aria-pressed", "true");
  utterance.onend = () => {
    if (token === voiceToken) stopVoice();
  };
  utterance.onerror = (e) => {
    if (token !== voiceToken) return;
    stopVoice();
    if (
      e.error !== "canceled" &&
      e.error !== "interrupted" &&
      error.isConnected
    ) {
      error.textContent =
        "That voice couldn’t play. Try again, or keep reading the conversation.";
      error.hidden = false;
    }
  };
  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    stopVoice();
    error.textContent =
      "Voice playback couldn’t start. The written conversation is still available.";
    error.hidden = false;
  }
}
$("#home").onclick = () => content && go("home");
$("#how-nav").onclick = () => {
  if (!content) return;
  if (stage !== "home") go("home");
  $("#how").scrollIntoView({ behavior: motion() });
};
$("#about-nav").onclick = () => content && go("about");
$("#now-nav").onclick = () => {
  if (content) go("resources");
};
$("#pause-session").onclick = showCalm;
window.addEventListener("pagehide", () => {
  stopVoice();
  closeModal();
});
async function init() {
  try {
    const response = await fetch("./data/scenarios.json");
    if (!response.ok) throw Error("Content request failed");
    content = validateContent(await response.json());
    scenarios = content.scenarios;
    render();
  } catch {
    content = null;
    $("#app").innerHTML =
      '<section class="panel load-error" role="alert"><span class="coach-icon">↺</span><h1>We couldn’t load the conversation cards.</h1><p>Please try again.</p><button class="primary" id="reload">Try again</button><p>Need support now? <a href="https://parents.thorn.org/" target="_blank" rel="noopener noreferrer">Visit Thorn for Parents ↗</a></p></section>';
    on("#reload", init);
  }
}
decorate(document.body);
init();

function decorate(root) {
  // Inline SVG arrows avoid missing glyphs in minimal browser font installs.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    if (walker.currentNode.textContent.includes("↗"))
      nodes.push(walker.currentNode);
  }
  for (const node of nodes) {
    if (["SCRIPT", "STYLE"].includes(node.parentElement?.tagName)) continue;
    const fragment = document.createDocumentFragment();
    node.textContent.split("↗").forEach((part, i) => {
      if (i) {
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        svg.setAttribute("viewBox", "0 0 16 16");
        svg.setAttribute("class", "arrow-icon");
        svg.setAttribute("aria-hidden", "true");
        svg.innerHTML =
          '<path d="M4 12 12 4M4 4h8v8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
        fragment.append(svg);
      }
      fragment.append(document.createTextNode(part));
    });
    node.replaceWith(fragment);
  }
}
function compare() {
  const history = attempts[c().id] || [];
  if (history.length < 2) return "";
  return `<div class="feedback"><strong>${icon("trend")} Compared to last time</strong>First try: ${history[0]} · This time: ${history.at(-1)}</div>`;
}
function plan() {
  const pl = c().plan || {
    steps: [
      "Thank them for telling you, and make room to listen.",
      "Ask what support they would like, while explaining any necessary safety steps.",
      "Agree on one manageable next step together.",
      "Check in again. Seek qualified support if distress persists or affects daily life.",
    ],
    links: [
      [
        "Thorn for Parents",
        "Conversation guides about online safety.",
        "https://parents.thorn.org/",
      ],
    ],
  };
  return `${step(3)}<button class="back" id="back-reflect">← Back</button><h1 style="font-size:47px">Next <em>steps.</em></h1><div class="summary"><section class="panel"><ol class="now-steps">${pl.steps.map((x) => `<li>${esc(x).replace(/&lt;(\/?strong)&gt;/g, "<$1>")}</li>`).join("")}</ol>${reviewBadge()}</section><section><h3>Helpful links</h3>${pl.links.map(([title, description, url]) => `<a class="resource" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(title)} ↗</strong><span>${esc(description)}</span></a>`).join("")}<button class="secondary" id="resources-button">Get help now ↗</button><p class="sim-label">${icon("alert")} In danger right now? Call 911 (US) or your local emergency number.</p></section></div>`;
}
