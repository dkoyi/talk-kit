import {
  evaluate,
  moodFor,
  validateContent,
  RULES,
} from "./engine.js";
import { recordingFor, validateRecordings } from "./audio.js";

const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let activeCategory = "feelings",
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
  reacted = false;
let activeAudio = null;
let recordings = {};
let breathTimer = null,
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
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
  thanks:
    '<path d="M20 15a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M12 13.5s-3-1.8-3-3.8a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 2-3 3.8-3 3.8z"/>',
  checkin:
    '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="M9 15l2 2 4-4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  retry: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4.5h4.5"/>',
  pick: '<rect x="3" y="7" width="13" height="13" rx="2.5"/><path d="M8 4h10.5A2.5 2.5 0 0 1 21 6.5V17"/>',
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

// Expression parts per mood. Eyes are soft dark ovals at (95,102) and (135,102); the
// lids are drawn for the left eye and mirrored (s = -1) for the right.
const MOODS = {
  sad: {
    brows: ["M84 89Q93 87 102 80", "M128 80Q137 87 146 89"],
    lid: (x, s) => `M${x - 10 * s} 91H${x + 10 * s}V96L${x - 10 * s} 101Z`,
    lidEdge: (x, s) => `M${x - 8 * s} 100.4L${x + 8 * s} 96.4`,
    mouth:
      '<path d="M102 136Q115 123 128 136" fill="none" stroke="#6d2f27" stroke-width="3.4" stroke-linecap="round"/>',
    blush: 0.18,
  },
  worried: {
    brows: ["M84 86Q93 82 102 81", "M128 81Q137 82 146 86"],
    lid: (x, s) => `M${x - 10 * s} 91H${x + 10 * s}V97.4L${x - 10 * s} 98Z`,
    lidEdge: (x, s) => `M${x - 8 * s} 97.9L${x + 8 * s} 97.4`,
    mouth:
      '<path d="M104 131q5.5-5 11-1t11-1" fill="none" stroke="#6d2f27" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
    blush: 0.22,
  },
  calm: {
    brows: ["M84 85Q93 79 102 82", "M128 82Q137 79 146 85"],
    mouth:
      '<path d="M103 127Q115 137 127 127" fill="none" stroke="#6d2f27" stroke-width="3.2" stroke-linecap="round"/>',
    blush: 0.32,
  },
  happy: {
    brows: ["M83 82Q93 74 103 79", "M127 79Q137 74 147 82"],
    // Smiling, half-moon eyes read as warm and friendly at any size.
    smileEyes: true,
    // A wide grin full of teeth, top and bottom, so the joy is unmistakable.
    mouth: (id) =>
      `<clipPath id="${id}"><path d="M95 122Q115 154 135 122Q115 127 95 122Z"/></clipPath><path d="M95 122Q115 154 135 122Q115 127 95 122Z" fill="#fffdf9"/><g clip-path="url(#${id})" fill="none"><path d="M93 131Q115 137 137 131" stroke="#cdbfb2" stroke-width="1.6"/><path d="M105 118v28M115 118v30M125 118v28" stroke="#e6ddd3" stroke-width="1.2"/></g><path d="M95 122Q115 154 135 122Q115 127 95 122Z" fill="none" stroke="#6d2f27" stroke-width="2.4" stroke-linejoin="round"/>`,
    blush: 0.5,
  },
};
// Per-character look: skin, shade, shirt, hair, iris.
const KIDS = [
  { skin: "#c58d67", shade: "#a8714f", shirt: "#75896e", hair: "#453b32", iris: "#5b3b25", she: "she", her: "her" },
  { skin: "#956547", shade: "#7a4e36", shirt: "#c29a72", hair: "#303d39", iris: "#3a271b", she: "he", her: "him" },
  { skin: "#e1b492", shade: "#c9946f", shirt: "#9b8ea5", hair: "#615043", iris: "#6b4a2b", she: "she", her: "her" },
];
const HAIR = [
  // Maya: shoulder-length hair with a side-swept fringe.
  {
    back: "M63 104C55 44 175 44 167 104L171 162Q160 172 148 162L150 122H80L82 162Q70 172 59 162Z",
    front:
      "M66 100C60 50 100 38 124 41C152 44 170 66 166 102C161 86 152 75 141 69C128 82 102 88 76 86C71 90 68 95 66 100Z",
    shine: "M92 52Q112 44 132 49",
  },
  // Jayden: short, curly crop.
  {
    back: "",
    front:
      "M67 98C62 56 88 44 115 44C142 44 168 56 163 98C160 84 154 76 146 72C130 76 100 76 84 72C76 76 70 84 67 98Z",
    curls: [
      [78, 64, 10], [90, 54, 11], [104, 48, 11], [118, 46, 11], [132, 49, 11], [145, 56, 10], [154, 66, 9],
    ],
    shine: "M98 50Q115 44 132 50",
  },
  // Lucía: straight fringe and two pigtails.
  {
    back: "M66 100C60 46 170 46 164 100Z",
    pigtails: true,
    front:
      "M64 100C55 32 175 32 166 100C163 90 159 84 156 80Q150 86 144 79Q138 86 131 79Q124 86 117 79Q110 86 103 79Q96 86 89 79Q82 86 75 80C71 85 68 91 66 98Z",
    shine: "M90 56Q112 47 136 54",
  },
];
let artSeq = 0;
const childArt = (i, mood = "worried") => {
  const k = KIDS[i];
  const h = HAIR[i];
  const m = MOODS[mood];
  const id = `tk-mouth-${++artSeq}`;
  const eye = (x) =>
    m.smileEyes
      ? `<path d="M${x - 8} 104Q${x} 93.5 ${x + 8} 104" fill="none" stroke="#2b1d16" stroke-width="3.6" stroke-linecap="round"/>`
      : `<ellipse cx="${x}" cy="102" rx="6.8" ry="8.2" fill="#2b1d16"/><ellipse cx="${x}" cy="104" rx="4.4" ry="5" fill="${k.iris}" opacity=".6"/><circle cx="${x + 2.3}" cy="${m.lid ? 101 : 98.8}" r="2.6" fill="#fff"/><circle cx="${x - 2.1}" cy="105.8" r="1.2" fill="#fff" opacity=".85"/>`;
  const lid = (x, s) =>
    m.lid
      ? `<path d="${m.lid(x, s)}" fill="${k.skin}"/><path d="${m.lidEdge(x, s)}" fill="none" stroke="${k.shade}" stroke-width="1.8" stroke-linecap="round"/>`
      : "";
  const shirtDetail = [
    `<path d="M98 152Q115 170 132 152" fill="none" stroke="#5e7358" stroke-width="5" stroke-linecap="round"/><path d="M106 162v16M124 162v16" stroke="#eef2e6" stroke-width="2.4" stroke-linecap="round"/><circle cx="106" cy="179" r="2.2" fill="#eef2e6"/><circle cx="124" cy="179" r="2.2" fill="#eef2e6"/>`,
    `<path d="M100 151Q115 162 130 151" fill="none" stroke="#a37e58" stroke-width="5" stroke-linecap="round"/><path d="M58 184Q115 176 172 184v8Q115 184 58 192Z" fill="#e8d3b3"/>`,
    `<path d="M115 156Q101 168 92 156Q100 150 115 156ZM115 156Q129 168 138 156Q130 150 115 156Z" fill="#fffdf8" stroke="#d9d1e0" stroke-width="1.2"/><circle cx="115" cy="172" r="2.4" fill="#fffdf8"/><circle cx="115" cy="184" r="2.4" fill="#fffdf8"/>`,
  ][i];
  const pigtails = h.pigtails
    ? `<g class="c-pigtails"><path d="M64 84C40 86 34 118 46 140C52 128 58 108 70 96Z" fill="${k.hair}" stroke="#4a3c32" stroke-width="1.5"/><path d="M166 84C190 86 196 118 184 140C178 128 172 108 160 96Z" fill="${k.hair}" stroke="#4a3c32" stroke-width="1.5"/><circle cx="66" cy="88" r="5.5" fill="#e8607a"/><circle cx="164" cy="88" r="5.5" fill="#e8607a"/></g>`
    : "";
  const curls = (h.curls || [])
    .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${k.hair}"/>`)
    .join("");
  return `<svg class="child mood-${mood}" viewBox="0 0 230 205" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" role="img" aria-label="${["Maya", "Jayden", "Lucía"][i]}: illustrative ${mood} expression" data-mood="${mood}"><circle cx="115" cy="100" r="83" fill="#fff" opacity=".35"/><g class="c-body"><path d="M52 205C52 168 80 151 115 151S178 168 178 205Z" fill="${k.shirt}"/><path d="M103 128h24v22q-12 9-24 0Z" fill="${k.shade}"/>${shirtDetail}</g><g class="c-head">${pigtails}${h.back ? `<path d="${h.back}" fill="${k.hair}"/>` : ""}<circle cx="68" cy="106" r="9" fill="${k.skin}" stroke="${k.shade}" stroke-width="1.5"/><circle cx="162" cy="106" r="9" fill="${k.skin}" stroke="${k.shade}" stroke-width="1.5"/><path d="M68 98C68 66 90 52 115 52S162 66 162 98C162 128 144 150 115 150S68 128 68 98Z" fill="${k.skin}" stroke="${k.shade}" stroke-width="1.6"/>${curls}<path d="${h.front}" fill="${k.hair}"/><path d="${h.shine}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".16"/><path class="c-brows" d="${m.brows.join("")}" stroke="${k.hair}" stroke-width="4.5" fill="none" stroke-linecap="round"/><g class="c-blink"><g class="c-eyes">${eye(95)}${eye(135)}</g>${lid(95, 1)}${lid(135, -1)}</g><ellipse class="c-blush" cx="82" cy="121" rx="9" ry="5" fill="#e0806a" opacity="${m.blush}"/><ellipse class="c-blush" cx="148" cy="121" rx="9" ry="5" fill="#e0806a" opacity="${m.blush}"/><path d="M112 113q-1.5 5 2 6.5q2.5 .8 4.5-1" stroke="${k.shade}" stroke-width="2.2" fill="none" stroke-linecap="round"/><g class="c-mouth">${typeof m.mouth === "function" ? m.mouth(id) : m.mouth}</g><ellipse class="c-mouth-open" cx="115" cy="130" rx="7" ry="5.5" fill="#7a2a26"/><path class="c-tear" d="M88 112q-4 8 0 11q4-3 0-11" fill="#7fb8dc"/><path class="c-tear c-tear-2" d="M142 112q-4 8 0 11q4-3 0-11" fill="#7fb8dc"/></g></svg>`;
};
// Decorative green sprigs and sparkles that sway and twinkle around the page.
const LEAF = "M0 0C9-12 27-13 38 0C27 13 9 12 0 0Z";
const sprig = (cls, flip = false) =>
  `<svg class="sprig ${cls}" viewBox="0 0 120 170" aria-hidden="true"${flip ? ' style="--flip:-1"' : ""}><path class="sprig-stem" d="M60 168C57 130 64 92 58 52C56 36 60 20 66 8" fill="none" stroke="#3f7a5c" stroke-width="3.2" stroke-linecap="round"/>${[
    [59, 140, -150, "#2f6b52", 0],
    [60, 122, -30, "#4f8f68", 0.4],
    [60, 100, -155, "#6fa27a", 0.8],
    [59, 80, -25, "#2f6b52", 1.2],
    [58, 58, -150, "#4f8f68", 1.6],
    [61, 38, -35, "#6fa27a", 2],
    [65, 14, -70, "#8fbf86", 2.4],
  ]
    .map(
      ([x, y, a, f, d]) =>
        `<g transform="translate(${x} ${y}) rotate(${a})"><path class="sprig-leaf" style="--d:${d}s" d="${LEAF}" fill="${f}"/></g>`,
    )
    .join("")}</svg>`;
const twinkle = (cls) =>
  `<svg class="twinkle ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" fill="currentColor"/></svg>`;
// Big leaves fanning out of a corner, for the page background.
const fern = (cls) =>
  `<svg class="fern ${cls}" viewBox="0 0 220 220" aria-hidden="true">${[
    [-14, "#2f6b52", 0],
    [-40, "#4f8f68", 0.7],
    [-66, "#6fa27a", 1.4],
    [-88, "#8fbf86", 2.1],
  ]
    .map(
      ([a, f, d]) =>
        `<g transform="translate(14 206) rotate(${a})"><g class="fern-leaf" style="--d:${d}s"><path d="M0 0C40-30 128-34 176 0C128 34 40 30 0 0Z" fill="${f}"/><path d="M8 0H160" stroke="#fffdf8" stroke-width="2" stroke-linecap="round" opacity=".35"/></g></g>`,
    )
    .join("")}</svg>`;
// A fixed layer behind everything: it never takes space, scrolls or catches taps.
const backdrop = () =>
  `<div class="bg-decor" aria-hidden="true"><span class="bg-blob bg-blob-a"></span><span class="bg-blob bg-blob-b"></span><span class="bg-blob bg-blob-c"></span>${fern("bg-fern-a")}${fern("bg-fern-b")}${sprig("bg-sprig-a")}${sprig("bg-sprig-b", true)}${twinkle("bg-tw-a")}${twinkle("bg-tw-b")}${twinkle("bg-tw-c")}${twinkle("bg-tw-d")}</div>`;
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
  reacted = false;
}
function stopVoice() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.removeAttribute("src");
    activeAudio = null;
  }
  voiceToken++;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  $(".live-character")?.classList.remove("speaking");
  const button = $("#listen");
  if (button) {
    button.innerHTML = `${icon("speaker")} Listen`;
    button.setAttribute("aria-pressed", "false");
  }
}
// Short messages slide up, stay briefly, then slide down and fade away.
function toast(text) {
  const el = $("#toast");
  clearTimeout(toastTimer);
  el.textContent = text;
  el.classList.remove("toast-out");
  el.hidden = false;
  toastTimer = setTimeout(() => {
    el.classList.add("toast-out");
    toastTimer = setTimeout(() => {
      el.hidden = true;
      el.classList.remove("toast-out");
    }, 380);
  }, 2200);
}
function go(next, anchor = null) {
  if (next === "resources" && stage !== "resources") returnStage = stage;
  stopVoice();
  closeModal();
  if (next === "reflect" && !recorded && turns.length) {
    (attempts[c().id] ??= []).push(score);
    recorded = true;
  }
  stage = next;
  render();
  const target = anchor && $(anchor);
  if (target) target.scrollIntoView({ block: "start", behavior: "instant" });
  else window.scrollTo({ top: 0, behavior: "instant" });
  const h = (target && target.querySelector("h2")) || $("main h1");
  if (h) {
    h.tabIndex = -1;
    h.classList.add("focus-destination");
    h.focus({ preventScroll: true });
  }
  if (stage === "practice") speak({ automatic: true });
}
// Where "Back" leads from each screen. Resources returns to wherever it was opened.
const BACK = {
  prep: "home",
  practice: "prep",
  reflect: "practice",
  plan: "reflect",
  about: "home",
  review: "home",
};
const CATEGORY_ICONS = {
  contact: "chat",
  friendship: "people",
  feelings: "heart",
  boundaries: "clock",
};
function home() {
  return `<div class="hk-scope"><section class="hk-hero" aria-labelledby="hk-h1"><div class="hk-copy"><p class="hk-aud"><svg class="hk-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="6" r="2.6"/><path d="M3.5 20v-4.5a4.5 4.5 0 0 1 9 0V20"/><circle cx="17" cy="10.2" r="2"/><path d="M13.6 20v-2.6a3.4 3.4 0 0 1 6.8 0V20"/></svg>For parents &amp; caregivers</p><h1 class="hk-h1" id="hk-h1">Practice the <span class="hk-key">hard talks</span> before they happen.</h1><p class="hk-sub">Short, guided practice for the tough talks about your child’s life online. Built with licensed child-care professionals.</p><div class="hk-ctas"><button class="hk-btn" id="start" type="button">Try a practice conversation <svg class="hk-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button><button class="hk-link" id="how-button" type="button">How it works <svg class="hk-icon hk-icon-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button></div><ul class="hk-trust"><li><svg class="hk-icon hk-icon-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>Built with licensed child-care professionals</li><li><svg class="hk-icon hk-icon-sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6"/><path d="M5.7 5.7l3.8 3.8M14.5 14.5l3.8 3.8M18.3 5.7l-3.8 3.8M9.5 14.5l-3.8 3.8"/></svg>Practice only &middot; not therapy &middot; always points to real help</li><li><svg class="hk-icon hk-icon-sm" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9.5" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Free &middot; No sign-up &middot; Nothing saved</li></ul></div><figure class="hk-demo" aria-label="Example rehearsal with Maya, 14"><span class="hk-back hk-back-2" aria-hidden="true"></span><span class="hk-back hk-back-1" aria-hidden="true"></span><svg class="hk-sprout" viewBox="0 0 92 96" aria-hidden="true"><path class="stem" d="M46 96C46 72 44 52 50 30"/><path class="l1" d="M47 66C30 68 15 58 11 43C29 41 44 50 47 66Z"/><path class="l2" d="M48 50C63 48 77 37 80 21C62 22 50 32 48 50Z"/><path class="l3" d="M50 31C42 22 42 10 49 1C58 9 59 21 50 31Z"/></svg><div class="hk-card"><span class="hk-chip">MAYA, 14</span><div class="hk-portrait">${childArt(0, "happy")}</div><p class="hk-label">Your child says:</p><p class="hk-quote">&ldquo;Can I tell you something?&rdquo;</p><p class="hk-label">You reply:</p><p class="hk-reply"><svg class="hk-icon hk-icon-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.4-7.5-10A4.5 4.5 0 0 1 12 6.6 4.5 4.5 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/></svg>&ldquo;Of course. I&rsquo;m listening.&rdquo;</p><div class="hk-meter" role="img" aria-label="Openness meter: Maya is opening up"><div class="hk-meter-track"><span class="hk-meter-thumb"><svg class="hk-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 14q3.5 3.5 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/></svg></span></div><p class="hk-meter-cap"><span>See how your words might land</span><strong>Opening up</strong></p></div></div><span class="hk-tag hk-tag-1"><svg class="hk-icon hk-icon-sm" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 14q3.5 3.5 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>Safe to try</span><span class="hk-tag hk-tag-2"><svg class="hk-icon hk-icon-sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4.5h4.5"/></svg>Try again anytime</span></figure></section><p class="hk-bond"><svg viewBox="0 0 92 96" aria-hidden="true"><path d="M46 96C46 72 44 52 50 30" fill="none" stroke="#4f8a63" stroke-width="6" stroke-linecap="round"/><path d="M47 66C30 68 15 58 11 43C29 41 44 50 47 66Z" fill="#6aa47b"/><path d="M48 50C63 48 77 37 80 21C62 22 50 32 48 50Z" fill="#4f8a63"/><path d="M50 31C42 22 42 10 49 1C58 9 59 21 50 31Z" fill="#8cc08c"/></svg>Every bond grows with small words.</p><ol class="hk-steps" id="how" aria-label="How it works"><li class="hk-step"><span class="hk-step-ic"><svg class="hk-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15a2 2 0 0 1-2 2H8l-4 3.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M12 8v3.5"/><path d="M12 14h.01"/></svg><span class="hk-step-n">1</span></span><div><h3>Pick a real moment</h3><p>A stranger asks for photos</p></div></li><li class="hk-step"><span class="hk-step-ic"><svg class="hk-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4.5h4.5"/></svg><span class="hk-step-n">2</span></span><div><h3>Practice what you&rsquo;d say</h3><p>Try it, and try again</p></div></li><li class="hk-step"><span class="hk-step-ic"><svg class="hk-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20v-8"/><path d="M12 12c0-3.3-2.7-6-6-6H4v1c0 3.3 2.7 6 6 6h2"/><path d="M12 10c0-2.8 2.2-5 5-5h3v1c0 2.8-2.2 5-5 5h-3"/></svg><span class="hk-step-n">3</span></span><div><h3>Reflect</h3><p>See how it might land, and what to do next</p></div></li></ol></div><section id="situations" class="situation-section"><div class="section-head"><div><h2>Pick a moment</h2></div>${sprig("sprig-head")}${twinkle("tw-head")}</div><div class="category-tabs" role="group" aria-label="Conversation topics">${content.categories.map((cat) => `<button data-category="${esc(cat.id)}" aria-pressed="${cat.id === activeCategory}">${icon(CATEGORY_ICONS[cat.id] || "chat", "cat-icon")} ${esc(cat.label)}</button>`).join("")}</div><div class="cards">${scenarios
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.categoryId === activeCategory)
    .map(
      ({ s, i }) =>
        `<article class="card scenario-card theme-${s.characterIndex}"><div class="portrait"><span class="topic">${esc(s.topic)}</span>${twinkle("tw-card")}${childArt(s.characterIndex)}</div><div class="card-content"><div class="character-meta"><span>${esc(s.name)} <span class="age">Age ${s.age}</span></span></div><h3>${esc(s.headline)}</h3><button class="deck-button" data-select="${i}">Start <span aria-hidden="true">↗</span></button></div></article>`,
    )
    .join("")}</div></section>`;
}
function prep() {
  return `${step(1)}<div class="prep-title"><h1>Get <em>ready.</em></h1></div><div class="prep-layout"><section class="panel scenario-intro theme-${c().characterIndex}"><div class="intro-hero"><div class="portrait">${childArt(c().characterIndex)}</div><div class="intro-name">${esc(c().name)}<span>Age ${c().age}</span></div></div><blockquote>“${esc(c().open)}”</blockquote><p class="muted">${esc(c().context)}</p><button class="text-button small rules-link prep-rules" data-rules>ⓘ How this works</button></section><section class="panel preparation"><div class="tips"><div class="tip"><strong>${icon("check", "good-icon")} Try saying</strong><p>${(c().say || ["“Thank you for telling me.”", "“You’re not to blame.”", "“What would help right now?”"]).map(esc).join("<br>")}</p></div><div class="tip avoid"><strong>${icon("cross", "bad-icon")} Avoid</strong><p>${(c().avoid || ["Blaming or dismissing.", "Threatening punishment.", "Taking over without listening."]).map(esc).join("<br>")}</p></div></div><button class="gr-breath" id="breathe" type="button" data-pause-open data-wash="#f7cc63"><span class="gr-breath-ic" data-pause-icon><svg class="hk-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19h18"/><path class="sun" d="M7 19a5 5 0 0 1 10 0"/><path class="sun" d="M12 8.5v2.5M6.3 11.3l1.6 1.6M17.7 11.3l-1.6 1.6"/></svg></span><span><span class="gr-breath-t">Take a breath first</span><span class="gr-breath-s">30 seconds · follow the sun</span></span><span class="gr-breath-go" aria-hidden="true"><svg class="hk-icon" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></button><button class="primary full-width" id="begin">I’m ready <span aria-hidden="true">→</span></button></section></div>`;
}
function practice() {
  const last = lastTurn();
  const mood = moodFor(score, last?.kind);
  const delta = last ? last.after - last.before : 0;
  // Animate only on the render right after an answer, not on later re-renders.
  const react =
    reacted && last
      ? ` react-${delta > 0 ? "up" : delta < 0 ? "down" : "flat"}`
      : "";
  const from = reacted && last ? last.before : score;
  const way = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  // Mouth moves for roughly as long as the line takes to say.
  const talkBeats = Math.min(
    24,
    Math.max(6, Math.round(currentLine().split(/\s+/).length * 1.4)),
  );
  const effects = !react
    ? ""
    : way === "up"
      ? `<div class="burst" aria-hidden="true">${Array.from({ length: 16 }, (_, k) => `<span style="--a:${k * 22.5}deg;--c:${["#2fbf55", "#ffc400", "#ff7a59", "#3fa9f5", "#b36bff"][k % 5]}"></span>`).join("")}</div>`
      : way === "down"
        ? `<div class="rain" aria-hidden="true"><span class="cloud"></span>${Array.from({ length: 7 }, (_, k) => `<i style="--x:${k * 14 - 42}px;--d:${(k % 3) * 0.15}s"></i>`).join("")}</div>`
        : "";
  const banner = !react
    ? ""
    : `<div class="burst-banner kind-${last.kind}" aria-hidden="true">${resultIcon(last.kind)}<strong>${
        { good: "Nice! " + esc(c().name) + " opened up.", repair: "Nice repair! " + esc(c().name) + " feels safer.", harmful: "Ouch. " + esc(c().name) + " is upset.", promise: "Careful. That promise may not hold.", neutral: "Hmm. " + esc(c().name) + " isn’t sure yet.", unknown: "Hmm. " + esc(c().name) + " isn’t sure yet." }[last.kind] || ""
      }</strong></div>`;
  return `${step(2)}<div class="practice-heading"><h1>Talking with <em>${esc(c().name)}</em></h1><div class="heading-tools"><div class="deck-progress"><span><b>${Math.min(count + 1, 3)}</b> / 3</span><div class="progress-dots" aria-label="${count} of 3 moments explored">${[0, 1, 2].map((i) => `<span class="${i < count ? "done" : i === count ? "current" : ""}"></span>`).join("")}</div></div><button class="secondary" id="restart"><svg class="restart-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4.5V9h4.5"/></svg>Start over</button></div></div><div class="practice-shell"><aside class="character-panel theme-${c().characterIndex} mood-${mood}${react}"><div class="character-hero"><div class="character-top"><span class="pill">${esc(c().topic)}</span></div><div class="live-character talking" style="--talk-n:${talkBeats}">${effects}${childArt(c().characterIndex, mood)}<span class="mood-label">${mood === "happy" ? `${icon("happy")} Feeling closer` : mood === "calm" ? `${icon("calm")} Calmer` : mood === "sad" ? `${icon("sad")} Upset` : `${icon("worried")} Worried`}</span></div><div class="character-name">${esc(c().name)}</div></div><div class="character-age">Age ${c().age}</div><div class="feeling"><strong>${icon("thought")}</strong><span>${last ? esc(last.feeling) : esc(c().feeling)}</span></div><div class="openness" role="img" aria-label="How open ${esc(c().name)} feels: ${zone()}"><div class="openness-head"><span>How open ${esc(c().name)} feels</span><b>${zone()}</b></div><div class="meter-track${react ? ` pulse-${way}` : ""}" style="--from:${from}%;--to:${score}%"><div class="meter-fill"></div><div class="meter-knob">${icon(mood === "sad" ? "sad" : mood === "worried" ? "worried" : mood === "calm" ? "calm" : "happy")}</div>${react && delta ? `<span class="meter-delta ${way}">${delta > 0 ? "+" : ""}${delta}</span>` : ""}</div></div><button class="text-button small rules-link" data-rules>ⓘ How this works</button></aside><section class="conversation-area"><div class="flashcard${react}" id="flashcard" tabindex="-1">${practiceCard()}</div></section></div>${banner}`;
}
function practiceCard() {
  const last = lastTurn();
  const finished = count >= 3 && !repairMode;
  const reaction = last
    ? `<div class="reaction kind-${last.kind}" role="status"><div class="reaction-head">${resultIcon(last.kind)}<h2 class="feedback-title">${esc(last.title)}</h2></div><p class="your-choice">You said: “${esc(last.text)}”</p><p class="also-try">${icon("bulb")} <span>Also try: “${esc(last.alternative)}”</span></p></div>`
    : "";
  const child = `<div class="flashcard-top"><span class="eyebrow">${esc(c().name.toUpperCase())}${repairMode ? " · MAKE IT RIGHT" : ""}</span><button class="voice-button" id="listen" aria-pressed="false">${icon("speaker")} Listen</button></div><p id="voice-error" class="inline-error" role="status" hidden></p><blockquote class="child-quote">“${esc(currentLine())}”</blockquote>`;
  if (finished)
    return `${reaction}${child}<button class="primary full-width" id="continue">See how it went <span aria-hidden="true">→</span></button>`;
  return `${reaction}${child}<div class="choice-header"><h2>${repairMode ? "One more try: how can you make it right?" : "What would you say?"}</h2><span class="attempt-pill${repairMode ? " last" : ""}" aria-label="Attempt ${repairMode ? 2 : 1} of 2"><i class="pip on"></i><i class="pip${repairMode ? " on" : ""}"></i>Attempt ${repairMode ? 2 : 1} of 2</span></div><div class="replies" role="group" aria-label="Response choices">${options()
    .map(
      (o, i) =>
        `<button class="reply" data-reply="${i}" data-kind="${o.kind}"><span class="choice-letter">${String.fromCharCode(65 + i)}</span><span>${esc(o.text)}</span><span class="choice-mark" aria-hidden="true">→</span></button>`,
    )
    .join(
      "",
    )}</div>`;
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
function respond(text, kind, choice = {}) {
  stopVoice();
  // On the second attempt, positive answers earn half ("making it right" is already +10).
  if (repairMode && kind !== "repair" && RULES[kind] > 0 && !Number.isFinite(choice.delta))
    choice = { ...choice, delta: Math.ceil(RULES[kind] / 2) };
  const turn = evaluate(text, kind, c(), score, choice);
  score = turn.after;
  turns.push(turn);
  messages.push({ who: "You", text });
  // Two attempts per question: a hurtful or risky first answer gets one "make it
  // right" try; after that (or after any other answer) the next question comes.
  const retry = !repairMode && (kind === "harmful" || kind === "promise");
  if (!retry) count = Math.min(3, count + 1);
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
  repairMode = retry;
  currentOptions = null;
  reacted = true;
  render();
  reacted = false;
  $("#flashcard").focus({ preventScroll: true });
  // On phones the child sits above the card, so keep their reaction in view too.
  const result = matchMedia("(max-width: 720px)").matches
    ? $(".character-panel")
    : $(".reaction");
  const box = result?.getBoundingClientRect();
  const headerBottom = $("header").getBoundingClientRect().bottom;
  if (result && (box.top < headerBottom || box.top > innerHeight * 0.55)) {
    // Measure the card that holds the result (it never animates), in the same on-screen
    // units as the scroll position, so this stays right when the page is zoomed.
    const anchor = result.closest(".flashcard") || result;
    const header = $("header").getBoundingClientRect().height;
    const top = anchor.getBoundingClientRect().top + window.scrollY - header - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: motion() });
  }
  speak({ automatic: true });
}
// The openness journey: coloured zones, a line that draws itself, and one badge per answer.
const ZONES = [
  ["good", "Talking with you"],
  ["open", "Opening up"],
  ["risky", "Guarded"],
  ["hurt", "Shut down"],
];
function journey() {
  const name = esc(c().name);
  const scores = [50, ...turns.map((t) => t.after)];
  const x = (i) => 8 + (i * 84) / Math.max(scores.length - 1, 1);
  const y = (s) => 100 - s;
  const line = scores
    .map((s, i) => {
      if (!i) return `M${x(0)} ${y(s)}`;
      const mx = (x(i - 1) + x(i)) / 2;
      return `C${mx} ${y(scores[i - 1])} ${mx} ${y(s)} ${x(i)} ${y(s)}`;
    })
    .join(" ");
  const steps = turns
    .map((t, i) => {
      const d = t.after - t.before;
      return `After answer ${i + 1}, ${name} ${d > 0 ? "opened up more" : d < 0 ? "pulled back" : "stayed the same"}.`;
    })
    .join(" ");
  return `<figure class="tk-journey"><div class="tk-plot" role="img" aria-labelledby="journey-desc"><div class="tk-zones" aria-hidden="true">${ZONES.map(([k, label]) => `<div class="z-${k}"><span>${label}</span></div>`).join("")}</div><svg class="tk-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${line}" vector-effect="non-scaling-stroke"/></svg><span class="tk-dot-start" style="--x:${x(0)}%;--y:${y(50)}%"></span>${turns.map((t, i) => `<span class="tk-dot tk-badge is-${t.kind}" style="--x:${x(i + 1)}%;--y:${y(t.after)}%;--i:${i}">${resultIcon(t.kind)}</span>`).join("")}</div><div class="tk-axis" aria-hidden="true"><span>Start</span><span>End</span></div><figcaption class="sr-only" id="journey-desc">How open ${name} felt, step by step. ${name} started in the middle. ${steps} At the end: ${zone()}.</figcaption></figure>${compare()}`;
}
function reflect() {
  const vals = [...new Set(turns.flatMap((t) => t.values))];
  const name = esc(c().name);
  const mood = moodFor(score, lastTurn()?.kind);
  // A hard conversation gets honest, gentle wording and a clear next try, not a party.
  const cheer = score >= 50;
    const again = `<button class="tk-btn ${cheer ? "tk-btn-secondary" : "tk-btn-primary"}" id="again">${icon("retry")} Try again</button>`;
  const next = `<button class="tk-btn ${cheer ? "tk-btn-primary" : "tk-btn-secondary"}" id="plan-button">Next steps ${icon("arrow")}</button>`;
  const pick = `<button class="tk-btn tk-btn-secondary" id="new">${icon("pick")} Pick another</button>`;
  return `${step(3)}<div class="tk-results"><header class="tk-card tk-hero"><div class="tk-child-wrap"><div class="tk-child theme-${c().characterIndex}">${childArt(c().characterIndex, mood)}</div>${cheer ? `<div class="burst" aria-hidden="true">${Array.from({ length: 16 }, (_, k) => `<span style="--a:${k * 22.5}deg;--c:${["#265c4c", "#2fa84f", "#edb586", "#e8a317"][k % 4]}"></span>`).join("")}</div>` : ""}</div><div class="tk-hero-text"><p class="tk-chip">${icon("check")} Practice done</p><h1 class="tk-display">${cheer ? "Well done!" : "Not quite yet."}</h1><p class="tk-sub">${cheer ? `${name} really opened up to you. Your words made it feel safe to talk.` : `${name} found it hard to open up this time. Let’s see why.`}</p></div></header><div class="tk-grid"><div class="tk-col"><section class="tk-card"><h2 class="tk-card-title">${name}’s openness</h2>${journey()}</section><section class="tk-card"><h2 class="tk-card-title">Your ${turns.length} answers</h2><ol class="tk-answers">${turns.map((t) => `<li class="turn tk-answer"><span class="tk-badge is-${t.kind}">${resultIcon(t.kind)}</span><div><p class="tk-verdict is-${t.kind}">${esc(t.title)}</p><p class="tk-quote">“${esc(t.text)}”</p>${t.kind === "harmful" || t.kind === "promise" ? `<p class="tk-also">${icon("bulb")} <span>Instead: “${esc(t.alternative)}”</span></p>` : ""}</div></li>`).join("")}</ol></section></div><div class="tk-col"><section class="tk-card"><h2 class="tk-card-title">Values you showed</h2><ul class="tk-tags">${content.principles.map((v, i) => (vals.includes(v) ? `<li class="tk-tag is-on" style="--i:${i}">${icon("check")}${esc(v)}</li>` : `<li class="tk-tag ${cheer ? "is-off" : "is-missed"}" style="--i:${i}">${cheer ? "" : icon("cross")}${esc(v)}<span class="sr-only">, not this time</span></li>`)).join("")}</ul></section><div class="tk-card tk-actions" role="group" aria-label="What next">${cheer ? next : again}<div class="tk-actions-row">${cheer ? again : next}${pick}</div><button class="tk-btn tk-btn-quiet" id="resources-button">Get help ↗</button></div><section class="tk-card"><h2 class="tk-card-title">Next time</h2><ul class="tk-todos">${[["thanks", "Say thank you"], ["ear", "Listen first"], ["people", "Decide together"], ["checkin", "Check in later"]].map(([n, s]) => `<li><label class="tk-todo"><span class="tk-todo-icon">${icon(n)}</span><span class="tk-todo-label">${s}</span><input type="checkbox" class="tk-tick"></label></li>`).join("")}</ul></section></div></div></div>`;
}
function resources() {
  return `<h1 style="font-size:47px">Get <em>help.</em></h1><div class="summary"><section class="panel"><h3>${icon("chat")} What to say</h3><div class="script">“Thank you for telling me. You’re not in trouble. I’m here. What do you need right now?”</div><div class="notice">This site can’t send reports or call anyone. The links open other websites.</div></section><section><a class="resource" target="_blank" rel="noopener noreferrer" href="https://www.missingkids.org/gethelpnow/cybertipline"><strong>NCMEC CyberTipline ↗</strong><span>Report online sexual exploitation of a child.</span></a><a class="resource" target="_blank" rel="noopener noreferrer" href="https://www.stopbullying.gov/cyberbullying/what-is-it"><strong>StopBullying.gov ↗</strong><span>Help with cyberbullying.</span></a><p class="sim-label">${icon("alert")} In danger right now? Call 911 (US) or your local emergency number.</p></section></div>`;
}
function about() {
  return `<div class="page-title"><h1>About <em>us</em></h1><p class="lead">We’re the Talk Kit team. Kids meet tricky things online: strangers, bullying, scary videos. We want every parent and caregiver to feel ready to talk about them, so kids keep coming to you.</p></div><div class="info-grid">${[
    ["heart", "Our goal", "Help you stay calm, listen and keep your child talking when something goes wrong online."],
    ["chat", "How it works", "Pick a moment, choose what to say, and see how the child might feel."],
    ["people", "Who it’s for", "Parents, grandparents and caregivers. No tech skills needed."],
    ["lock", "Private", "No sign-up. Nothing you do here is saved or sent."],
    ["alert", "Not therapy", "Practice only. Not therapy, a test or emergency help."],
  ]
    .map(
      ([n, t, d]) =>
        `<section class="info-card">${icon(n, "info-icon")}<h2>${t}</h2><p>${d}</p></section>`,
    )
    .join("")}</div><section class="panel info-callout">${icon("shield", "info-icon")}<div><h2>Expert review</h2><p>We’re asking licensed professionals who work with children to check every story.</p></div><button class="primary" id="about-review">See how review works <span aria-hidden="true">→</span></button></section>`;
}
// How expert review works: the steps, described as a process.
function review() {
  return `<div class="page-title"><h1>Expert <em>review</em></h1><p class="lead">How licensed professionals who work with children and families review our stories, answers and feedback.</p></div><ol class="review-steps">${[
    ["shield", "Check the license", "We confirm each reviewer is a licensed therapist, psychologist, counselor or social worker, and that the license is active."],
    ["book", "Read every story", "They go through each child’s lines, every answer choice and all the feedback."],
    ["check", "Check the advice", "Is it safe, kind, right for the child’s age and in line with current child-safety guidance?"],
    ["pencil", "Fix what they flag", "We rewrite anything they question, then they check it again."],
    ["calendar", "Show who reviewed it", "Each story will show the reviewer’s name, license and date once it’s signed off."],
  ]
    .map(
      ([n, t, d], i) =>
        `<li class="info-card"><span class="review-num">${i + 1}</span>${icon(n, "info-icon")}<h2>${t}</h2><p>${d}</p></li>`,
    )
    .join("")}</ol><section class="panel info-callout"><div><h2>What reviewers look for</h2><div class="look-for">${["Safe advice", "No blame", "Right for the age", "Kind words", "Clear next steps"].map((x) => `<span class="tag">✓ ${x}</span>`).join("")}</div></div></section>`;
}
function render() {
  stopVoice();
  $("#app").innerHTML =
    (stage === "home"
      ? home()
      : stage === "prep"
        ? prep()
        : stage === "practice"
          ? practice()
          : stage === "reflect"
            ? reflect()
            : stage === "about"
              ? about()
              : stage === "review"
                ? review()
              : stage === "plan"
                ? plan()
                : resources());
  $("#app").dataset.stage = stage;
  // One header for the whole site: Back and Home replace the home-page links in a session.
  const inside = stage !== "home";
  $("#nav-back").hidden = !inside;
  $("#nav-home").hidden = !inside;
  document.body.classList.toggle("inside", inside);
  $("#pause-session").hidden = stage === "prep";
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
    .querySelectorAll("[data-rules]")
    .forEach((b) => (b.onclick = showRules));
  on("#start", () => $("#situations").scrollIntoView({ behavior: motion() }));
  // Scroll just far enough that all three steps are in view.
  on("#how-button", () => $("#how").scrollIntoView({ behavior: motion(), block: "end" }));
  on("#begin", () => {
    reset();
    go("practice");
  });
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
      speak({ automatic: true });
    });
  });
  document.querySelectorAll("[data-reply]").forEach(
    (b) =>
      (b.onclick = (e) => {
        // Ignore the second click of a double-click so one tap answers once.
        if (e.detail > 1) return;
        const o = options()[Number(b.dataset.reply)];
        respond(o.text, o.kind, o);
      }),
  );
  on("#continue", () => go("reflect"));
  on("#listen", speak);
  on("#again", () => {
    reset();
    go("practice");
  });
  on("#new", () => go("home", "#situations"));
  on("#resources-button", () => go("resources"));
  on("#about-review", () => go("review"));
  on("#plan-button", () => go("plan"));
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
  $("#modal").focus();
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
// The pause: a painted dawn lake with a sun that breathes (4s in, 6s out, three times).
// "How this works": a live meter that steps through each kind of answer, moving the
// knob right or left by its points and back, so parents see the mechanic in seconds.
const RULE_DEMO = [
  ["good", "Kind, supportive", "happy"],
  ["repair", "Making it right", "calm"],
  ["neutral", "Asking a question", "calm"],
  ["promise", "Promising secrecy", "worried"],
  ["harmful", "Blaming", "sad"],
];
const signed = (v) => (v > 0 ? `+${v}` : `${v}`);
// Points on the second ("make it right") attempt: positive answers count half.
const secondTry = (k) => (k === "repair" ? RULES.repair : RULES[k] > 0 ? Math.ceil(RULES[k] / 2) : RULES[k]);
function showRules() {
  const name = esc(c()?.name || "your child");
  openModal(
    `<h2 id="modal-title">How this works</h2><p class="rules-lead">Your words move how open ${name} feels.</p><div class="rules-demo" aria-hidden="true"><div class="openness-head"><span>How open ${name} feels</span><b id="demo-zone">Opening up</b></div><div class="meter-track demo-meter" id="demo-meter" style="--to:50%"><div class="demo-clip"><div class="meter-fill"></div><div class="demo-cover"></div></div><div class="demo-rail"><div class="meter-knob" id="demo-knob">${icon("calm")}</div><span class="meter-delta" id="demo-delta" hidden></span></div></div></div><dl class="rule-list rule-table"><div class="rule-head"><dt>Your answer</dt><dd>1st try</dd><dd>2nd try</dd></div>${RULE_DEMO.map(
      ([k, label]) => `<div data-rule="${k}"><dt>${resultIcon(k)} ${label}</dt><dd>${k === "repair" ? "–" : signed(RULES[k])}</dd><dd>${signed(secondTry(k))}</dd></div>`,
    ).join("")}</dl><ul class="rules-points"><li>Start in the middle. Kind words move right, blame moves left.</li><li>Blame or a risky promise? You get a 2nd try to make it right.</li><li>On the 2nd try, good answers count half.</li></ul><button class="primary full-width" data-close>Got it</button>`,
  );
  const meter = $("#demo-meter"), knob = $("#demo-knob"), delta = $("#demo-delta"), zone = $("#demo-zone");
  // Paint the colour scale across the whole bar, so the fill is green on the right.
  meter.querySelector(".meter-fill").style.backgroundSize = `${meter.offsetWidth}px 100%`;
  if (motion() === "instant") return;
  const zoneFor = (v) => (v < 25 ? "Shut down" : v < 50 ? "Guarded" : v < 75 ? "Opening up" : "Talking with you");
  let i = 0, out = false;
  const step = () => {
    if (!meter.isConnected) return clearInterval(breathTimer);
    const [k, , mood] = RULE_DEMO[i];
    const v = k === "repair" ? RULES.repair : RULES[k];
    document.querySelectorAll(".rule-list [data-rule]").forEach((row) => row.classList.toggle("active", row.dataset.rule === k && !out));
    if (!out) {
      const to = 50 + v;
      meter.style.setProperty("--to", `${to}%`);
      knob.innerHTML = icon(mood);
      delta.hidden = false;
      delta.className = `meter-delta ${v > 0 ? "up" : v < 0 ? "down" : "flat"}`;
      delta.textContent = signed(v);
      zone.textContent = zoneFor(to);
    } else {
      meter.style.setProperty("--to", "50%");
      knob.innerHTML = icon("calm");
      delta.hidden = true;
      zone.textContent = zoneFor(50);
      i = (i + 1) % RULE_DEMO.length;
    }
    out = !out;
  };
  clearInterval(breathTimer);
  breathTimer = setInterval(step, 1100);
  setTimeout(step, 350);
}
function speak({ automatic = false } = {}) {
  const button = $("#listen");
  const error = $("#voice-error");
  if (button.getAttribute("aria-pressed") === "true") {
    stopVoice();
    return;
  }
  error.hidden = true;
  const clip = recordingFor(recordings, c().name, currentLine(), content.audioClips);
  if (clip) {
    stopVoice();
    const token = voiceToken;
    const fail = (reason) => {
      if (token !== voiceToken) return;
      stopVoice();
      if (error.isConnected) {
        error.textContent =
          automatic && reason?.name === "NotAllowedError"
            ? "Your browser blocked automatic playback. Tap Listen to hear this line."
            : "This recording is unavailable. You can keep reading the conversation.";
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
      $(".live-character")?.classList.add("speaking");
      activeAudio.play().catch(fail);
    } catch (reason) {
      fail(reason);
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
  $(".live-character")?.classList.add("speaking");
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
// The logo and Home always replay the quick loading screen, then show the home page.
function goHome() {
  if (!content) return;
  if (!window.TalkKitLoading || motion() === "instant") return go("home");
  document.documentElement.classList.add("tk-loading");
  const intro = window.TalkKitLoading.play("quick");
  go("home");
  intro.then(() => window.TalkKitLoading.exit()).then(releasePage);
}
$("#home").onclick = goHome;
$("#nav-home").onclick = goHome;
$("#nav-back").onclick = () => {
  if (!content) return;
  const to = stage === "resources" ? returnStage : BACK[stage] || "home";
  // Leaving a scenario lands back on the scenario cards, not the top of the page.
  const leave = () => go(to, to === "home" && !["about", "review"].includes(stage) ? "#situations" : null);
  // Mid-conversation (or finished but before "See how it went"), going back clears the answers: warn first.
  if (stage === "practice" && turns.length) {
    openModal(
      `<h2 id="modal-title">Go back?</h2><p>Your answers will be cleared.</p><div class="modal-actions"><button class="primary" id="confirm-back">← Go back</button><button class="secondary" data-close>Keep going</button></div>`,
    );
    on("#confirm-back", () => {
      closeModal();
      reset();
      leave();
    });
    return;
  }
  leave();
};
$("#review-nav").onclick = () => content && go("review");
$("#footer-review").onclick = () => content && go("review");
$("#footer-about").onclick = () => content && go("about");
$("#about-nav").onclick = () => content && go("about");
$("#now-nav").onclick = () => {
  if (content) go("resources");
};
// The pause overlay (assets/pause.js) opens from any [data-pause-open] button.
document.addEventListener("talkkit:pause-open", () => stopVoice());
window.addEventListener("pagehide", () => {
  stopVoice();
  closeModal();
});
// The loading screen (assets/loading.js) plays on page load; its logo flies into the header
// once the content is ready and the intro has played.
const pageStart = performance.now();

// While the loading screen is up, the page's animations wait (html.tk-loading pauses them),
// so Maya's reply, the meter and the sprout play once the screen has gone.
const releasePage = () => document.documentElement.classList.remove("tk-loading");
function hideSplash() {
  const exit = () => (window.TalkKitLoading ? window.TalkKitLoading.exit().then(releasePage) : releasePage());
  const wait = Math.max(0, 2500 - (performance.now() - pageStart));
  if (window.TalkKitLoading) setTimeout(exit, wait);
  else window.addEventListener("load", () => setTimeout(exit, wait), { once: true });
  setTimeout(releasePage, wait + 3000);
}
async function init() {
  try {
    const response = await fetch("./data/scenarios.json");
    if (!response.ok) throw Error("Content request failed");
    content = validateContent(await response.json());
    scenarios = content.scenarios;
    recordings = {};
    try {
      const audioResponse = await fetch("./assets/audio/recordings.json");
      if (!audioResponse.ok) throw Error("Recordings request failed");
      recordings = validateRecordings(await audioResponse.json());
    } catch (error) {
      // A missing manifest must not prevent reading/practicing the conversation.
      console.warn("Saved voices unavailable; using device voices as fallback.", error);
    }
    // Build the page once the loading logo has finished drawing its outline (~1.15s), so that
    // heavy work never interrupts the drawing; the rest of the intro runs on the GPU.
    await new Promise((ok) => setTimeout(ok, Math.max(0, 1150 - (performance.now() - pageStart))));
    render();
    hideSplash();
  } catch {
    content = null;
    $("#app").innerHTML =
      '<section class="panel load-error" role="alert"><span class="coach-icon">↺</span><h1>We couldn’t load the conversation cards.</h1><p>Please try again.</p><button class="primary" id="reload">Try again</button><p>In danger right now? Call 911 (US) or your local emergency number.</p></section>';
    on("#reload", init);
    hideSplash();
  }
}
document.body.insertAdjacentHTML("afterbegin", backdrop());
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
  return `<p class="tk-compare">${icon("sprout")}<span>First try: ${history[0]}</span><span aria-hidden="true">·</span><strong>This time: ${history.at(-1)}</strong></p>`;
}
// The child's hands gripping the edge of the steps card. One hand is drawn once, with
// its fingers pointing along +x (they curl over the edge onto the card) and its thumb
// pointing along +y. Each hand is then placed on its own and mirrored, so the two are
// a true left/right pair with both thumbs turned inward, toward each other.
function peekHand(skin, shade) {
  const paint = `fill="${skin}" stroke="${shade}" stroke-width="1.3" stroke-linejoin="round"`;
  // Each finger bends at the knuckle: a short base over the edge, then the tip folded
  // down onto the card. Drawn little finger first, so each tip rests over the one below.
  const finger = ([y, base, tip, bend]) =>
    `<g transform="translate(20 ${y})"><rect x="0" y="0" width="${base + 3}" height="6.8" rx="3.4" ${paint}/><rect x="${base - 1}" y="0" width="${tip}" height="6.6" rx="3.3" transform="rotate(${bend} ${base} 3.4)" ${paint}/><path d="M${base} 1.4v4" stroke="${shade}" stroke-width="1" stroke-linecap="round" opacity=".55"/></g>`;
  return `<ellipse cx="16" cy="32" rx="7.2" ry="4.4" transform="rotate(34 16 32)" ${paint}/><rect x="3" y="1" width="23" height="29" rx="11" ${paint}/>${[
    [23, 5, 6, 42],
    [16, 6.5, 7.5, 38],
    [9, 7, 8, 36],
    [2, 6.5, 7, 34],
  ]
    .map(finger)
    .join("")}<path d="M8 9q4-2 8 0M8 16q4-2 8 0M8 23q4-2 8 0" fill="none" stroke="${shade}" stroke-width="1" stroke-linecap="round" opacity=".4"/>`;
}
function peekHands(i) {
  const { skin, shade } = KIDS[i];
  const hand = peekHand(skin, shade);
  // Side (desktop): the card's left edge is at x=20; the upper hand's thumb points down,
  // the lower hand is flipped top-to-bottom so its thumb points up.
  const side = `<svg class="hands-side" viewBox="0 0 48 94"><g transform="translate(-2 0)">${hand}</g><g transform="translate(-2 94) scale(1 -1)">${hand}</g></svg>`;
  // Top (phones): the card's top edge is at y=28; fingers hang down over it, and the two
  // hands sit either side of the head with their thumbs pointing toward it.
  const top = `<svg class="hands-top" viewBox="0 0 150 46"><g transform="rotate(90) scale(1 -1)">${hand}</g><g transform="translate(150 0) rotate(90)">${hand}</g></svg>`;
  return `<div class="peek-hands" aria-hidden="true">${side}${top}</div>`;
}
function plan() {
  const { she, her } = KIDS[c().characterIndex];
  const pl = c().plan || {
    steps: [
      `<strong>Thank ${c().name}</strong> for telling you, and make room to listen.`,
      `<strong>Ask what support ${she} would like</strong>, while explaining any safety steps you need to take.`,
      "<strong>Agree on one small next step</strong> together.",
      `<strong>Check in with ${her} again</strong> in a few days. Seek qualified support if the worry lasts or affects daily life.`,
    ],
    links: [
      [
        "StopBullying.gov",
        "Help with cyberbullying.",
        "https://www.stopbullying.gov/cyberbullying/what-is-it",
      ],
    ],
  };
  return `${step(3)}<h1 style="font-size:47px">Next <em>steps.</em></h1><div class="summary plan-summary"><div class="peek-wrap theme-${c().characterIndex}"><div class="peek" aria-hidden="true" style="--shirt:${KIDS[c().characterIndex].shirt}"><div class="peek-kid">${childArt(c().characterIndex, "happy")}</div></div><section class="panel"><ol class="now-steps">${pl.steps.map((x) => `<li>${esc(x).replace(/&lt;(\/?strong)&gt;/g, "<$1>")}</li>`).join("")}</ol></section>${peekHands(c().characterIndex)}</div><section>${pl.links.length ? "<h3>Helpful links</h3>" : ""}${pl.links.map(([title, description, url]) => `<a class="resource" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(title)} ↗</strong><span>${esc(description)}</span></a>`).join("")}<button class="secondary" id="resources-button">Get help now ↗</button><p class="sim-label">${icon("alert")} In danger right now? Call 911 (US) or your local emergency number.</p></section></div>`;
}
