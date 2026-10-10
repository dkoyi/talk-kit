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
    button.textContent = "◖ Listen";
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
  return '<button class="review-badge" data-review><span aria-hidden="true">◇</span> Professional review pending <span aria-hidden="true">↗</span></button>';
}
function home() {
  return `<section class="hero new-hero"><div class="hero-copy"><div class="eyebrow"><span class="tiny-spark">✦</span> FOR THE CONVERSATIONS THAT MATTER</div><h1>A little practice.<br>A <em>closer connection.</em></h1><p>You don’t need all the right answers. Just a little room to listen. Practice tricky online moments before they happen.</p><div class="hero-actions"><button class="primary" id="start">Find your first conversation <span aria-hidden="true">↗</span></button><button class="text-button" id="how-button">How it works <span aria-hidden="true">↓</span></button></div><div class="privacy"><span aria-hidden="true">◌</span> No account. No pressure. Your own pace.</div></div><div class="hero-stage" aria-label="An example fictional conversation card"><span class="floating-tag top-tag">A safe space to try.</span><span class="spark spark-one" aria-hidden="true">✳</span><div class="back-card one"></div><div class="back-card two"></div><div class="hero-demo"><div class="demo-top"><span class="pill">A MOMENT WITH MAYA</span><span aria-hidden="true">01 / 03</span></div><div class="demo-character">${childArt(0, "happy")}</div><blockquote>“Can I tell you<br>something?”</blockquote><div class="demo-response"><span aria-hidden="true">♡</span> “Of course. I’m here to listen.”</div><div class="demo-bottom"><span class="little-dot"></span> Small words. A big opening.</div></div><span class="floating-tag bottom-tag"><span aria-hidden="true">↺</span> You can always begin again.</span></div></section><div class="trustline"><span><b>✧</b> Real-life moments, fictional stories</span><span><b>◷</b> A few minutes for you</span><span><b>♡</b> Connection over perfection</span></div><section id="situations" class="situation-section"><div class="section-head"><div><div class="eyebrow">YOUR CONVERSATION DECK</div><h2>What’s on their mind?</h2></div><p>${scenarios.length} situations. ${content.categories.length} everyday topics.<br>Start with what feels familiar.</p></div><div class="category-tabs" role="group" aria-label="Conversation topics">${content.categories.map((cat) => `<button data-category="${esc(cat.id)}" aria-pressed="${cat.id === activeCategory}">${esc(cat.label)} <span>${scenarios.filter((s) => s.categoryId === cat.id).length}</span></button>`).join("")}</div><p class="category-description" id="category-description" role="status">${esc(content.categories.find((cat) => cat.id === activeCategory).description)}</p><div class="cards">${scenarios
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.categoryId === activeCategory)
    .map(
      ({ s, i }) =>
        `<article class="card scenario-card theme-${s.characterIndex}"><div class="portrait"><span class="topic">${esc(s.topic)}</span><span class="card-number">${String(i + 1).padStart(2, "0")}</span>${childArt(s.characterIndex)}</div><div class="card-content"><div class="character-meta"><span>${esc(s.name)} <span class="age">· age ${s.age}</span></span><span>~5 min</span></div><h3>${esc(s.headline)}</h3><blockquote>“${esc(s.open)}”</blockquote><button class="deck-button" data-select="${i}">Practice this moment <span aria-hidden="true">↗</span></button></div></article>`,
    )
    .join(
      "",
    )}</div></section><section class="review-strip"><div class="seal" aria-hidden="true">◇</div><div><h3>Carefully written. Open to review.</h3><p>Our goal: content curated with licensed therapists and psychologists. These demo decks are awaiting professional review.</p></div>${reviewBadge()}</section><section class="how" id="how"><div><div class="eyebrow">A LITTLE REHEARSAL</div><h2>Room to get<br>comfortable.</h2></div>${[
    [
      "01",
      "Meet the moment",
      "Choose a fictional situation that feels familiar.",
    ],
    [
      "02",
      "Try your words",
      "Turn a response card over. Notice what it makes room for.",
    ],
    [
      "03",
      "Take it with you",
      "Reflect, try a repair, and leave with a conversation starter.",
    ],
  ]
    .map(
      (x) =>
        `<div><span class="how-number">${x[0]}</span><strong>${x[1]}</strong><p>${x[2]}</p></div>`,
    )
    .join("")}</section>`;
}
function prep() {
  return `${step(1)}<button class="back" id="back">← All conversations</button><div class="prep-title"><div class="eyebrow">BEFORE THE FIRST WORD</div><h1>First, make a little <em>room.</em></h1><p class="muted">Take a breath. Get to know the moment. There’s no rush.</p></div><div class="prep-layout"><section class="panel scenario-intro theme-${c().characterIndex}"><div class="portrait">${childArt(c().characterIndex)}</div><div class="eyebrow">${esc(c().topic)} · ${esc(c().name)}, ${c().age}</div><blockquote>“${esc(c().open)}”</blockquote><p class="muted">${esc(c().context)}</p>${c().background ? `<div class="feedback"><strong>What’s going on</strong>${esc(c().background)}</div>` : ""}${reviewBadge()}</section><section class="panel preparation"><span class="coach-icon" aria-hidden="true">♡</span><h2>Connection comes first.</h2><p class="muted">You don’t need every answer immediately. Start by showing that sharing with you was a good decision.</p><div class="feedback"><strong>What ${esc(c().name)} may need</strong>${esc(c().need)}</div><div class="tips"><div class="tip"><strong>Make space for…</strong><p>${(c().say || ["“Thank you for telling me.”", "“You’re not to blame.”", "“What would help right now?”"]).map(esc).join("<br>")}</p></div><div class="tip avoid"><strong>Pause before…</strong><p>${(c().avoid || ["Blaming or dismissing.", "Threatening punishment.", "Taking over without listening."]).map(esc).join("<br>")}</p></div></div><button class="breath-launch" id="breathe"><span class="breath-icon" aria-hidden="true">✳</span><span><strong>A moment to settle</strong><small>Optional · 30-second relaxation pause</small></span><span aria-hidden="true">↗</span></button><button class="primary full-width" id="begin">I’m ready to practice <span aria-hidden="true">→</span></button><p class="sim-label">A fictional exercise, not a prediction of a real child’s feelings or a clinical assessment.</p></section></div>`;
}
function practice() {
  const last = lastTurn();
  const mood = moodFor(score, last?.kind);
  return `${step(2)}<div class="practice-heading"><div><div class="eyebrow">A FEW WORDS CAN OPEN A DOOR</div><h1>A moment with <em>${esc(c().name)}.</em></h1></div><button class="secondary" id="restart">↺ Start over</button></div><div class="practice-shell"><aside class="character-panel theme-${c().characterIndex}"><div class="character-top"><span class="pill">${esc(c().topic)}</span></div><div class="live-character">${childArt(c().characterIndex, mood)}<span class="mood-label">${mood === "happy" ? "Feeling more connected" : mood === "calm" ? "Finding some ease" : mood === "sad" ? "Needing some space" : "Taking a little time"}</span></div><div class="character-name">${esc(c().name)}<span>Age ${c().age} · Fictional character</span></div><div class="feeling"><strong>IN THIS STORY</strong><span>${last ? esc(last.feeling) : esc(c().feeling)}</span></div><div class="openness"><span>Conversation openness</span><b>${zone()}</b><div class="meter"><span class="marker" style="left:calc(${score}% - 2px)"></span></div><div class="zones"><span>Guarded</span><span>More open</span></div></div><button class="text-button small" data-rules>How this simulation works ↗</button><p class="sim-label">Expressions and openness are illustrative. Real children respond differently.</p></aside><section class="conversation-area"><div class="deck-progress"><span><b>${Math.min(count + 1, 3)}</b> / 3 moments <span class="progress-hint">· your own pace</span></span><div class="progress-dots" aria-label="${count} of 3 moments explored">${[0, 1, 2].map((i) => `<span class="${i < count ? "done" : i === count ? "current" : ""}"></span>`).join("")}</div></div><div class="flashcard ${revealed ? "feedback-side" : ""}" id="flashcard" tabindex="-1">${revealed ? feedbackCard(last) : questionCard()}</div><div class="under-card"><button class="text-button" id="reflect">Finish & reflect</button><span>There’s room to try again. Always.</span></div>${messages.length > 1 ? `<details class="transcript"><summary>Your conversation so far <span>${turns.length} ${turns.length === 1 ? "response" : "responses"}</span></summary><div class="chatlog" id="chatlog">${messages.map((m) => `<div class="bubble ${m.who === "You" ? "parent" : ""}"><span class="speaker">${esc(m.who)}</span>${esc(m.text)}</div>`).join("")}</div></details>` : ""}</section></div>`;
}
function questionCard() {
  return `<div class="flashcard-top"><span class="eyebrow">${repairMode ? "A CHANCE TO BEGIN AGAIN" : "LISTEN TO THE MOMENT"}</span><button class="voice-button" id="listen" aria-pressed="false">◖ Listen</button></div><p id="voice-error" class="inline-error" role="status" hidden></p><p class="voice-caption">Optional audio · no microphone</p><blockquote class="child-quote">“${esc(currentLine())}”</blockquote><div class="choice-header"><h2>${repairMode ? "How could you reconnect?" : "What would you say?"}</h2><span>Choose a card to explore</span></div><div class="replies" role="group" aria-label="Response choices">${options()
    .map(
      (o, i) =>
        `<button class="reply ${picked === i ? "selected" : ""}" data-reply="${i}" data-kind="${o.kind}" aria-pressed="${picked === i}"><span class="choice-letter">${String.fromCharCode(65 + i)}</span><span>${esc(o.text)}</span><span class="choice-mark" aria-hidden="true">${picked === i ? "✓" : "↗"}</span></button>`,
    )
    .join(
      "",
    )}</div><p class="inline-error" id="choice-error" role="alert" hidden></p><button class="primary full-width" id="reveal">Explore this response <span aria-hidden="true">↗</span></button><details class="custom-entry" ${customDraft ? "open" : ""}><summary>Or try your own words <span>Experimental</span></summary><form id="custom-form" novalidate><label class="formlabel" for="custom">Use a fictional reply. Avoid names or identifying details.</label><textarea id="custom" maxlength="500" aria-describedby="custom-help custom-error" placeholder="What would you say in this moment?">${esc(customDraft)}</textarea><div class="custom-meta"><span id="custom-help">Simple phrase feedback; may miss context.</span><span id="character-count">${customDraft.length}/500</span></div><p id="custom-error" class="inline-error" role="alert" hidden></p><button class="secondary" type="submit">Try my words →</button></form></details><button class="text-button repair-link" id="repair">↺ Practice repairing a reaction</button>`;
}
function feedbackCard(last) {
  return `<div class="flashcard-top"><span class="eyebrow">TURN THE MOMENT OVER</span><span class="feedback-symbol" aria-hidden="true">${last.kind === "good" || last.kind === "repair" ? "✧" : "↺"}</span></div><p class="your-choice">You tried: “${esc(last.text)}”</p><h2 class="feedback-title">${esc(last.title)}<span>.</span></h2><p class="feedback-copy">${esc(last.feedback)}</p><div class="tag-list">${last.values.map((v) => `<span class="tag">${v}</span>`).join("")}</div><div class="next-line"><span class="eyebrow">${esc(c().name.toUpperCase())} IN THIS STORY</span><blockquote>“${esc(currentLine())}”</blockquote><button class="voice-button" id="listen" aria-pressed="false">◖ Listen</button><p id="voice-error" class="inline-error" role="status" hidden></p></div><div class="another-line"><strong>Another line to keep</strong><p>“${esc(last.alternative)}”</p></div><button class="primary full-width" id="continue">${count >= 3 ? "See my reflection" : "Continue the conversation"} <span aria-hidden="true">→</span></button>${last.kind === "harmful" || last.kind === "promise" ? '<button class="secondary full-width repair-now" id="repair">↺ Try a repair now</button>' : ""}<p class="sim-label">Authored learning feedback · Professional review pending</p>`;
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
  return `<svg class="chart" viewBox="0 0 500 160" role="img" aria-label="Illustrative conversation openness across ${turns.length} practice responses"><path d="M35 35H465M35 80H465M35 125H465" stroke="#dde4d5"/><polyline points="${pts}" fill="none" stroke="#48745b" stroke-width="3"/>${scores.map((s, i) => `<circle cx="${35 + i * (430 / Math.max(scores.length - 1, 1))}" cy="${130 - s}" r="4" fill="#48745b"/>`).join("")}<text x="35" y="149" font-size="9" fill="#73816f">Start</text><text x="430" y="149" font-size="9" fill="#73816f">Last turn</text></svg>`;
}
function reflect() {
  let vals = [...new Set(turns.flatMap((t) => t.values))];
  return `${step(3)}<div class="eyebrow">Practice, reflect, carry it with you</div><h1 style="font-size:43px;margin:12px 0">You don’t need perfect words.<br><em>You need room to listen.</em></h1><p class="muted">Here’s what you explored with ${c().name}. This summary evaluates the exercise, not your parenting.</p><div class="summary"><section class="panel"><h3>Your conversation journey</h3>${chart()}${compare()}<p class="sim-label">This chart shows authored simulation changes. It does not measure real-world trust.</p>${turns.length ? turns.map((t, i) => `<div class="turn"><strong>${i + 1}. ${esc(t.text)}</strong><p>${t.feedback}</p></div>`).join("") : '<p class="muted">No replies yet. You can return to practice whenever you’re ready.</p>'}</section><aside><section class="panel"><div class="eyebrow">Humanity 101 in practice</div><h3 style="margin-top:12px">Small choices. Human values.</h3><p class="sim-label">Values explored in this exercise</p>${content.principles.map((v) => `<span class="tag ${vals.includes(v) ? "" : "off"}">${vals.includes(v) ? "✓ " : ""}${esc(v)}</span>`).join("")}<p class="muted" style="margin-top:17px">Recognizing an unhelpful reaction is a chance to practice self-reflection, too.</p><h3>For your next conversation</h3>${["Thank them for telling you.", "Listen before deciding what happens next.", "Ask what support they need.", "Explain any next steps and additional help.", "Agree on a time to check in again."].map((s) => `<label class="check"><input type="checkbox">${s}</label>`).join("")}<button class="primary" id="plan-button">See next steps →</button><button class="text-button" id="resources-button">Browse support resources ↗</button></section><div style="display:flex;gap:10px;margin-top:15px"><button class="secondary" id="again">Practice again</button><button class="secondary" id="new">Try another situation</button></div></aside></div>`;
}
function resources() {
  return `<button class="back" id="back-prev">← Back to where you were</button><div class="eyebrow">For parents & caregivers</div><h1 style="font-size:43px">Start with listening.<br><em>Then find support.</em></h1><div class="summary"><section class="panel"><h3>A short conversation starter</h3><div class="script">“Thank you for telling me. You’re not in trouble for asking for help. I’m here to listen. Can you tell me what you need right now? We can work out the next steps together.”</div><p class="muted">Adapt these words to your child’s age and the situation. A real child may need time, silence, or a different trusted adult.</p><div class="notice">This app does not receive reports, contact professionals, or provide emergency assistance. The links open external services with their own privacy policies.</div></section><section><a class="resource" target="_blank" rel="noopener noreferrer" href="https://parents.thorn.org/"><strong>Thorn for Parents ↗</strong><span>Conversation guides about online safety.</span></a><a class="resource" target="_blank" rel="noopener noreferrer" href="https://www.missingkids.org/gethelpnow/cybertipline"><strong>NCMEC CyberTipline ↗</strong><span>Reporting suspected online child sexual exploitation.</span></a><a class="resource" target="_blank" rel="noopener noreferrer" href="https://www.stopbullying.gov/cyberbullying/what-is-it"><strong>StopBullying.gov ↗</strong><span>Information about cyberbullying and linked reporting resources.</span></a><p class="sim-label">Resources listed are U.S.-focused. A school counselor or trusted local professional may help identify appropriate support.</p></section></div>`;
}
function about() {
  return `<button class="back" id="back-home">← Back to situations</button><div class="eyebrow">Our approach</div><h1 style="font-size:43px">Prepare the adult.<br><em>Keep space for the child.</em></h1><div class="summary"><section class="panel"><h3>From advice to rehearsal</h3><p class="muted">The Talk Kit combines fictional scenarios, authored branching responses, conversation feedback, and repair practice. It is designed to help adults prepare for difficult online-safety conversations.</p><h3>Transparent simulation</h3><p class="muted">Suggested replies use predefined learning feedback. Optional typed replies use a small phrase-based checker, not AI. It may miss context, negation, sarcasm, or wording; uncertain replies receive no score change.</p><h3>What the meter means</h3><p class="muted">Conversation openness is an illustrative story device. It is not validated, diagnostic, or a prediction of a real child’s response. The app does not guarantee an outcome.</p></section><section class="panel"><h3>Privacy by design</h3><p class="muted">No accounts, file uploads, child profiles, or outgoing chat messages. Typed practice replies remain in this tab’s memory and clear on reload. Hosting providers may maintain standard access logs.</p><button class="review-badge" data-review>◇ View professional review process ↗</button><h3 style="margin-top:20px">Before real-world rollout</h3><p class="muted">Scenario content and feedback need review by qualified child-development and safeguarding professionals. Parent usability studies should evaluate the clarity and usefulness of the practice.</p><a href="https://parents.thorn.org/guides/getting-aligned-on-social-media-platforms/" target="_blank" rel="noopener noreferrer">Explore a source conversation guide ↗</a></section></div>`;
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
      `<span class="modal-kicker">A FRESH START</span><h2 id="modal-title">Make room to begin again?</h2><p>Your current practice responses will clear. You can also keep going at your own pace.</p><div class="modal-actions"><button class="primary" id="confirm-restart">Start fresh</button><button class="secondary" data-close>Keep practicing</button></div>`,
    );
    on("#confirm-restart", () => {
      closeModal();
      reset();
      render();
      $("#flashcard").focus();
      toast("A fresh start. Take your time.");
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
        "Choose a response card first, or try your own words below.";
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
            : "Write a few words first. You can also choose one of the response cards.";
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
function openModal(html) {
  stopVoice();
  modalReturn = document.activeElement;
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
    `<span class="modal-kicker">A LITTLE SPACE FOR YOU</span><h2 id="modal-title">It’s okay to take a pause.</h2><p>This moment is just for you. Your conversation and any unfinished words will be here when you return.</p><div class="breathing-orbit breathing"><div class="breathing-circle"><span id="calm-seconds" role="timer" aria-label="Seconds remaining">30</span><small>seconds of space</small></div></div><h3 id="calm-cue" class="calm-cue" aria-live="polite">Breathe in gently…</h3><p id="calm-status" role="status">Follow the circle if comfortable, or breathe at your own pace.</p><div class="modal-actions"><button class="primary" id="calm-return" data-close>End pause</button><button class="secondary" id="calm-start" hidden>Take another moment</button></div>`,
  );
  const start = () => {
    clearInterval(breathTimer);
    breathDeadline = Date.now() + 30000;
    $("#calm-start").hidden = true;
    $("#calm-return").textContent = "End pause";
    $("#calm-status").textContent =
      "Follow the circle if comfortable, or breathe at your own pace.";
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
          "Continue when you’re ready. You can take another moment, too.";
        $("#calm-return").textContent = "I’m ready to continue →";
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
    `<span class="modal-kicker">TRANSPARENCY, BEFORE TRUST</span><h2 id="modal-title">A place for professional care.</h2><span class="status-pending">◇ Awaiting professional review</span><p>We’re designing a curation process with licensed therapists and psychologists. No reviewer credentials or approvals have been verified for this demo.</p><div class="review-process"><div><b>01 · Verify the professional</b><p>Check an active license with the issuing board and record the jurisdiction and date.</p></div><div><b>02 · Review the whole moment</b><p>Review the scenario, response options, feedback, and illustrative weights for a specific content version.</p></div><div><b>03 · Publish with a record</b><p>Show who reviewed it, their scope, the review date, and when re-review is due. Content edits need a new review.</p></div></div><p class="sim-label">All current decks: version ${esc(content.contentVersion)} · pending review. Professional review would not guarantee outcomes or replace individual care.</p><button class="primary full-width" data-close>Back to the conversation</button>`,
  );
}
function showRules() {
  openModal(
    `<span class="modal-kicker">A STORY, NOT A SCORECARD</span><h2 id="modal-title">What changes the expression?</h2><p>The original authored rules move an illustrative openness meter, starting at 50 and staying between 5 and 95. It never grades your parenting.</p><dl class="rule-list">${Object.entries(
      RULES,
    )
      .map(
        ([k, v]) =>
          `<div><dt>${{ good: "Supportive reply", repair: "Repair", harmful: "Blame or dismissal", promise: "Absolute secrecy promise", neutral: "Information seeking", unknown: "Uncertain wording" }[k]}</dt><dd>${v > 0 ? "+" : ""}${v}</dd></div>`,
      )
      .join(
        "",
      )}</dl><p>Three main responses complete the deck, regardless of their score. Optional repairs leave room to try again without advancing the story. You can finish and reflect at any time.</p><p class="sim-label">Typed words use a limited phrase checker. It can miss meaning, negation, and sarcasm. These weights and expressions are not clinically validated.</p><button class="primary full-width" data-close>Got it</button>`,
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
      button.textContent = "■ Stop audio";
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
  button.textContent = "■ Stop audio";
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
      '<section class="panel load-error" role="alert"><span class="coach-icon">↺</span><h1>We couldn’t load the conversation cards.</h1><p>Please refresh to try again. If you opened this as a file, use the local server command in README.md.</p><button class="primary" id="reload">Try again</button><p>Need support now? <a href="https://parents.thorn.org/" target="_blank" rel="noopener noreferrer">Visit Thorn for Parents ↗</a></p></section>';
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
  return `<div class="feedback"><strong>Room to practice again</strong>Illustrative openness: ${history[0]} on your first try, ${history.at(-1)} this time. This is a story state, not a parenting grade.</div>`;
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
  return `${step(3)}<button class="back" id="back-reflect">← Back to reflection</button><div class="eyebrow">BRING THE PRACTICE WITH YOU</div><h1 style="font-size:43px">A next step.<br><em>A little more connection.</em></h1><p class="muted">Ideas for a situation like ${esc(c().name)}’s. Adapt them to your child and circumstances.</p><div class="summary"><section class="panel"><h2>One step at a time.</h2><ol class="now-steps">${pl.steps.map((x) => `<li>${esc(x).replace(/&lt;(\/?strong)&gt;/g, "<$1>")}</li>`).join("")}</ol>${reviewBadge()}</section><section><h3>Helpful resources</h3>${pl.links.map(([title, description, url]) => `<a class="resource" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(title)} ↗</strong><span>${esc(description)}</span></a>`).join("")}<button class="secondary" id="resources-button">Find support now ↗</button><p class="sim-label">U.S.-focused resources. If anyone is in immediate danger, contact local emergency services.</p></section></div>`;
}
