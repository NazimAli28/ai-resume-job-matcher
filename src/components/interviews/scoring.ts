// Demo scoring and follow-up heuristics. Deterministic and local: no model is called.
// Everything produced here is an estimate and is labeled that way in the UI.
// Scores look at content only (length, numbers, result words, job-skill mentions,
// first-person actions). Grammar, accent and spelling are never scored.

import type { InterviewAnswer, InterviewEvaluation, InterviewQuestion, InterviewSession, Job, Persona, Profile, RubricScore } from "@/demo/types";
import { categoryOf, jobSkills, NEEDS_RESULT, type Category } from "./bank";
import { modelAnswerFor } from "./model-answer";

export const BEHAVIORAL_WEIGHTS = { "STAR structure": 25, Specificity: 25, Relevance: 20, Clarity: 15, Conciseness: 15 } as const;
export const TECHNICAL_WEIGHTS = { Accuracy: 40, Depth: 25, Reasoning: 20, Communication: 15 } as const;

const RESULT_RE =
  /\b(result(ed|s|ing)?|reduc(ed|ing|es)|increas(ed|ing|es)|improv(ed|ing|es)|outcome|learn(ed|t)|users?|saved|cut|faster|shipped|launched|number|lower(ed)?|grew|growth)\b|%/i;
const ACTION_RE =
  /\b(built|wrote|led|created|designed|fixed|decided|suggested|proposed|implemented|worked|developed|made|ran|set up|tested|migrated|organi[sz]ed|compared|reviewed|presented|asked|taught|learned|started)\b/i;
const SITUATION_RE = /\b(when|once|while|during|project|team|at my|at the|last (year|month|week)|our)\b/i;
const TASK_RE = /\b(needed|had to|goal|responsible|asked|wanted|task|aim|deadline)\b/i;
const CONNECTOR_RE = /\b(because|so|then|which|after|before|but|first|next|finally|therefore)\b/i;
const EXAMPLE_RE = /\b(for example|for instance|e\.g\.|such as|in my|i used|i built|i wrote|at [A-Z])/i;
const TRADEOFF_RE = /\b(trade-?off|however|instead|but|edge case|downside|alternatively|depends)\b/i;

export const NO_ANSWER = "(no answer)";

export const wordCount = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
export const hasResultSignal = (t: string) => RESULT_RE.test(t) || /\d/.test(t);

function sentencesOf(t: string): string[] {
  return (t.match(/[^.!?\n]+[.!?]?/g) ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Verbatim quote (trailing punctuation removed, capped at 140 chars on a word boundary). */
function quoteOf(sentence: string | undefined): string {
  if (!sentence) return "";
  let s = sentence.replace(/[.!?]+$/, "").trim();
  if (s.length > 140) s = s.slice(0, 140).replace(/\s+\S*$/, "");
  return s;
}

interface Signals {
  text: string;
  words: number;
  sentences: string[];
  avgSentence: number;
  hasNumber: boolean;
  result: boolean;
  iCount: number;
  weCount: number;
  iRatio: number;
}

function signals(text: string): Signals {
  const words = wordCount(text);
  const sentences = sentencesOf(text);
  const iCount = (text.match(/\b(i|my|me|i'm|i've|i'd|i'll)\b/gi) ?? []).length;
  const weCount = (text.match(/\b(we|our|us|we're|we've)\b/gi) ?? []).length;
  return {
    text,
    words,
    sentences,
    avgSentence: sentences.length ? words / sentences.length : 0,
    hasNumber: /\d/.test(text),
    result: RESULT_RE.test(text) || /\d/.test(text),
    iCount,
    weCount,
    iRatio: iCount + weCount === 0 ? 0 : iCount / (iCount + weCount),
  };
}

const firstWith = (s: Signals, re: RegExp) => s.sentences.find((x) => re.test(x));
const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));

/** Keywords from the job's requirements and the user's own resume anchors. */
function keywordsFor(job: Job, profile: Profile): { skills: string[]; anchors: string[] } {
  const skills = jobSkills(job, profile)
    .flatMap((s) => [s, ...(s.includes("/") ? s.split("/").map((x) => x.trim()) : [])])
    .map((s) => s.toLowerCase())
    .filter((s) => s.length >= 2 && !/^(yrs|years|degree)/.test(s));
  if (job.requirements.some((r) => /testing/i.test(r.skill))) skills.push("test");
  const anchors = [...profile.experiences.map((e) => e.employer), ...profile.projects.map((p) => p.name)].map((s) => s.toLowerCase());
  return { skills: [...new Set(skills)], anchors };
}

const hits = (text: string, words: string[]) => words.filter((w) => text.toLowerCase().includes(w));

const LEVEL_COMMENT: Record<string, string[]> = {
  "STAR structure": [
    "Almost none of the story shows: situation, task, action and result are all missing.",
    "Only one or two parts of the story show up. Add what you did and how it ended.",
    "Situation and action are there; the result is vague or missing.",
    "Most of the story is present. Make the result more concrete.",
    "A complete story with a concrete result.",
  ],
  Structure: [
    "Hard to see an order to the answer.",
    "One or two points, but no clear order (now, before, why).",
    "A rough order. Add the 'why this role' step to close it.",
    "Easy to follow: present, past, why.",
    "Clear order from start to finish, with an example.",
  ],
  Specificity: [
    "Generic: nothing here could not be said by anyone.",
    "Mostly general claims. Name a project, tool or number.",
    "One concrete detail. Add a number or what you personally did.",
    "Concrete about what you did. A number would settle it.",
    "Concrete, owned and quantified.",
  ],
  Relevance: [
    "Does not connect to the question or the role.",
    "Barely touches the role's requirements.",
    "Partly answers; the link to the job's requirements is thin.",
    "Answers the question and connects to the role.",
    "Directly answers and ties to the job's requirements and your resume.",
  ],
  Clarity: [
    "Hard to follow. Break it into short steps.",
    "Understandable, but the points run together.",
    "Understandable, with a little rambling.",
    "Easy to follow.",
    "Logical and easy to follow.",
  ],
  Accuracy: [
    "Nothing in the answer touches the technologies the job asks for. Please verify any claims.",
    "One relevant term, but no explanation. Please verify any claims.",
    "Relevant terms are used. Check the details yourself: we can't verify them.",
    "Covers several relevant technologies. Check the details yourself.",
    "Covers the job's technologies in some detail. Check the details yourself.",
  ],
  Depth: [
    "Surface-level.",
    "A definition, but no example or trade-off.",
    "Some detail or one example.",
    "Detail plus an example or trade-off.",
    "Examples, trade-offs and edge cases.",
  ],
  Reasoning: [
    "No visible steps.",
    "Few steps shown. Say why you chose them.",
    "Some reasoning is visible.",
    "Clear steps with reasons.",
    "Clear, justified steps from start to finish.",
  ],
  Communication: [
    "Hard to follow.",
    "Understandable, but the points run together.",
    "Understandable, with a little rambling.",
    "Clear and easy to follow.",
    "Clear and well ordered.",
  ],
};

function concisenessScore(words: number): { score: number; comment: string } {
  const secs = Math.round(words / 2.5);
  if (words < 40 || words > 450) return { score: 1, comment: `About ${words} words: ${words < 40 ? "too short to show your thinking" : "too long to hold attention"}.` };
  if (words < 80 || words > 350) return { score: 3, comment: `About ${words} words (around ${secs} seconds spoken): ${words < 80 ? "a little short" : "a little long"}.` };
  if (words >= 120 && words <= 300) return { score: 5, comment: `About ${words} words (around ${secs} seconds spoken): a good length.` };
  return { score: 4, comment: `About ${words} words (around ${secs} seconds spoken): close to the sweet spot of 120 to 300.` };
}

function clarityScore(s: Signals): number {
  if (s.words < 12) return 2;
  if (s.avgSentence > 35) return 2;
  let score = 3;
  if (CONNECTOR_RE.test(s.text)) score += 1;
  if (s.words >= 40 && s.avgSentence <= 28) score += 1;
  return clamp(score);
}

function row(dimension: string, weight: number, score: number, quote: string, comment?: string): RubricScore {
  return { dimension, score, weight, quote, comment: comment ?? LEVEL_COMMENT[dimension]?.[score - 1] ?? "" };
}

function behavioralRubric(q: InterviewQuestion, cat: Category, s: Signals, job: Job, profile: Profile): RubricScore[] {
  const kw = keywordsFor(job, profile);
  const skillHits = hits(s.text, kw.skills);
  const anchorHits = hits(s.text, kw.anchors);
  const W = BEHAVIORAL_WEIGHTS;
  const isHr = q.kind === "HR";

  // Structure: STAR for stories, order (now / before / why / example) for HR questions.
  let structure: RubricScore;
  if (!isHr) {
    const el = {
      situation: SITUATION_RE.test(s.text),
      task: TASK_RE.test(s.text),
      action: s.iCount >= 1 && ACTION_RE.test(s.text),
      result: s.result,
    };
    const n = Object.values(el).filter(Boolean).length;
    const score = n <= 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : s.hasNumber ? 5 : 4;
    const missing = (Object.keys(el) as (keyof typeof el)[]).filter((k) => !el[k]);
    const quote = quoteOf(firstWith(s, RESULT_RE) ?? firstWith(s, ACTION_RE) ?? s.sentences[0]);
    const comment = missing.length ? `${LEVEL_COMMENT["STAR structure"][score - 1]} Not found: ${missing.join(", ")}.` : LEVEL_COMMENT["STAR structure"][score - 1];
    structure = row("STAR structure", W["STAR structure"], score, quote, comment);
  } else {
    const markers = [
      /\b(i'm|i am|currently|now|my role)\b/i,
      /\b(before|previously|earlier|then|used to)\b/i,
      /\b(because|want|looking|interested|excited|goal)\b/i,
      ACTION_RE,
    ].filter((re) => re.test(s.text)).length;
    const score = clamp(1 + markers);
    structure = row("Structure", W["STAR structure"], score, quoteOf(firstWith(s, /\b(because|want|interested|excited|before|currently)\b/i) ?? s.sentences[0]));
  }

  // Specificity: concrete detail, numbers, owned actions.
  let spec = 1;
  if (s.words >= 30) spec += 1;
  if (s.hasNumber) spec += 1;
  if (skillHits.length > 0 || anchorHits.length > 0) spec += 1;
  if (s.iCount >= 2 && s.iRatio >= 0.5) spec += 1;
  if (!s.hasNumber && s.iRatio < 0.3) spec = Math.min(spec, 3);
  spec = clamp(spec);
  const specQuote = quoteOf(
    firstWith(s, /\d/) ??
      s.sentences.find((x) => hits(x, [...kw.skills, ...kw.anchors]).length > 0) ??
      [...s.sentences].sort((a, b) => b.length - a.length)[0],
  );
  const specNote =
    !s.hasNumber && s.iRatio < 0.3 && s.weCount > 0
      ? `${LEVEL_COMMENT.Specificity[spec - 1]} Mostly "we": say what you did.`
      : undefined;

  // Relevance: links to the job's requirements and the candidate's own resume items.
  const rel = clamp(1 + Math.min(2, skillHits.length) + (s.words >= 25 ? 1 : 0) + (anchorHits.length ? 1 : 0));
  const relQuote = quoteOf(s.sentences.find((x) => hits(x, [...kw.skills, ...kw.anchors]).length > 0) ?? s.sentences[0]);

  const clarity = clarityScore(s);
  const clarityQuote = quoteOf(s.avgSentence > 35 ? [...s.sentences].sort((a, b) => b.length - a.length)[0] : firstWith(s, CONNECTOR_RE) ?? s.sentences[0]);
  const conc = concisenessScore(s.words);

  void cat;
  return [
    structure,
    row("Specificity", W.Specificity, spec, specQuote, specNote),
    row("Relevance", W.Relevance, rel, relQuote),
    row("Clarity", W.Clarity, clarity, clarityQuote),
    row("Conciseness", W.Conciseness, conc.score, "", conc.comment),
  ];
}

function technicalRubric(s: Signals, job: Job, profile: Profile): RubricScore[] {
  const kw = keywordsFor(job, profile);
  const skillHits = hits(s.text, kw.skills);
  const W = TECHNICAL_WEIGHTS;

  const acc = clamp(1 + Math.min(3, skillHits.length) + (s.words >= 40 ? 1 : 0));
  const accQuote = quoteOf(s.sentences.find((x) => hits(x, kw.skills).length > 0) ?? s.sentences[0]);

  let depth = 1;
  if (s.words >= 40) depth += 1;
  if (s.words >= 80) depth += 1;
  if (EXAMPLE_RE.test(s.text) || s.hasNumber) depth += 1;
  if (TRADEOFF_RE.test(s.text)) depth += 1;
  depth = clamp(depth);
  const depthQuote = quoteOf(firstWith(s, TRADEOFF_RE) ?? firstWith(s, EXAMPLE_RE) ?? s.sentences[0]);

  const steps = (s.text.match(new RegExp(CONNECTOR_RE.source, "gi")) ?? []).length;
  const reasoning = clamp(1 + Math.min(4, steps));
  const reasonQuote = quoteOf(firstWith(s, CONNECTOR_RE) ?? s.sentences[0]);

  const comm = clarityScore(s);
  const commQuote = quoteOf(s.avgSentence > 35 ? [...s.sentences].sort((a, b) => b.length - a.length)[0] : s.sentences[0]);

  return [
    row("Accuracy", W.Accuracy, acc, accQuote),
    row("Depth", W.Depth, depth, depthQuote),
    row("Reasoning", W.Reasoning, reasoning, reasonQuote),
    row("Communication", W.Communication, comm, commQuote),
  ];
}

const WORKED: Record<string, string> = {
  "STAR structure": "Your answer told a story with an action and an outcome.",
  Structure: "Your answer had a clear order.",
  Specificity: "You gave concrete detail instead of general claims.",
  Relevance: "You tied your answer to what the job asks for.",
  Clarity: "Easy to follow.",
  Conciseness: "A good length.",
  Accuracy: "You used the technologies the job names.",
  Depth: "You went beyond a definition.",
  Reasoning: "Your steps were easy to follow.",
  Communication: "You explained it clearly.",
};
const MISSING: Record<string, string> = {
  "STAR structure": "Say what the situation was, what you did, and how it ended. A real result is the part interviewers remember.",
  Structure: "Add a clear order: where you are now, what came before, and why this role.",
  Specificity: "Name a project, tool or number, and say what you personally did.",
  Relevance: "Connect your answer to one of the job's requirements.",
  Clarity: "Use shorter sentences and say the main point first.",
  Conciseness: "Aim for 120 to 300 words (about one to two minutes spoken).",
  Accuracy: "Use the exact technologies from the job and check the details yourself.",
  Depth: "Add an example from your own work and one trade-off.",
  Reasoning: "Walk through your steps in order and say why you chose them.",
  Communication: "Lead with the main point, then the detail.",
};

export function overallFor(rubric: RubricScore[]): number {
  const total = rubric.reduce((a, r) => a + r.weight, 0);
  if (total === 0) return 0;
  return Math.round((rubric.reduce((a, r) => a + r.weight * r.score, 0) / total) * 20);
}

export function combinedText(a: InterviewAnswer): string {
  const follow = a.followUp?.answer ? a.followUp.answer.split("\n").filter((l) => l && l !== NO_ANSWER).join(" ") : "";
  return [a.answer, follow].filter(Boolean).join(" ").trim();
}

export function evaluateText(q: InterviewQuestion, text: string, job: Job, profile: Profile): InterviewEvaluation {
  const s = signals(text);
  const cat = categoryOf(q);
  const rubric = q.kind === "TECHNICAL" ? technicalRubric(s, job, profile) : behavioralRubric(q, cat, s, job, profile);
  const best = [...rubric].sort((a, b) => b.score - a.score || b.weight - a.weight)[0];
  const worst = [...rubric].sort((a, b) => a.score - b.score || b.weight - a.weight)[0];
  const model = modelAnswerFor(q, job, profile);
  return {
    questionId: q.id,
    overall: overallFor(rubric),
    rubric,
    whatWorked: best.score >= 3 ? WORKED[best.dimension] ?? "" : "You gave an answer. The points below show how to strengthen it.",
    whatWasMissing: MISSING[worst.dimension] ?? "",
    modelAnswer: model.text,
    modelAnswerSources: model.sources,
  };
}

export function evaluateSession(session: InterviewSession, job: Job, profile: Profile): { evaluations: InterviewEvaluation[]; overall: number } {
  const evaluations: InterviewEvaluation[] = [];
  for (const a of session.answers) {
    const text = combinedText(a);
    const q = session.questions.find((x) => x.id === a.questionId);
    if (!q || !text) continue;
    evaluations.push(evaluateText(q, text, job, profile));
  }
  const overall = evaluations.length ? Math.round(evaluations.reduce((a, e) => a + e.overall, 0) / evaluations.length) : 0;
  return { evaluations, overall };
}

// ---------- Follow-ups ----------

export function followUpLines(a: InterviewAnswer | undefined): { question: string[]; answer: string[] } {
  return {
    question: a?.followUp?.question ? a.followUp.question.split("\n") : [],
    answer: a?.followUp?.answer ? a.followUp.answer.split("\n") : [],
  };
}

const PERSONA_PREFIX: Record<Persona, string> = {
  FRIENDLY_RECRUITER: "Thanks, that helps. ",
  HIRING_MANAGER: "",
  TECHNICAL_PANEL: "",
  TOUGH_BUT_FAIR: "That's a bit general. ",
};

/**
 * Demo follow-up policy (see PRD 05 section 9.4): at most 2 per question, capped per session,
 * and each one asks for exactly ONE missing element. Returns null when no follow-up is needed.
 */
export function nextFollowUp(args: {
  question: InterviewQuestion;
  mainAnswer: string;
  followAnswers: string[];
  asked: number;
  sessionAsked: number;
  cap: number;
  persona: Persona;
  company: string;
}): string | null {
  const { question, mainAnswer, followAnswers, asked, sessionAsked, cap, persona, company } = args;
  if (asked >= 2 || sessionAsked >= cap) return null;
  const cat = categoryOf(question);
  const all = [mainAnswer, ...followAnswers].join(" ");
  const total = wordCount(all);
  const needsResult = NEEDS_RESULT.includes(cat);
  const technical = cat === "TECH" || cat === "QUALITY" || cat === "PROJECT";
  const short = total < 25;
  const noResult = needsResult && !hasResultSignal(all);
  const noExample = technical && !EXAMPLE_RE.test(all) && total < 60;

  if (asked === 1) {
    // Second follow-up only when the first reply was very thin and the gap is still open.
    const last = followAnswers[followAnswers.length - 1] ?? "";
    if (wordCount(last) >= 8 || !(short || noResult || noExample)) return null;
  } else if (!(short || noResult || noExample)) {
    return null;
  }

  const prefix = PERSONA_PREFIX[persona];
  let ask: string;
  if (asked === 1) {
    ask = needsResult && noResult ? "What was your part in it, specifically?" : "Could you add one specific detail? A project, a tool or a number is enough.";
  } else if (cat === "MOTIVATION") {
    ask = `What specifically about ${company} or this role appeals to you?`;
  } else if (cat === "INTRO") {
    ask = "Can you add one concrete example of something you've built or shipped?";
  } else if (cat === "GAP") {
    ask = "What is one concrete step you would take in your first two weeks to get up to speed?";
  } else if (needsResult && noResult) {
    ask = "What was the result? A number or a concrete outcome is ideal.";
  } else if (needsResult) {
    ask = "What was your part in it, specifically?";
  } else if (technical) {
    ask = "Can you give a concrete example from your own work?";
  } else {
    ask = "Can you give a specific example?";
  }
  return `${prefix}${ask}`;
}

export const bandWord = (v: number) => (v >= 80 ? "Strong" : v >= 65 ? "Good" : v >= 50 ? "Fair" : "Needs work");

/** Dimension names differ slightly between the seeded session and local scoring. */
export const normDim = (d: string) => (d === "Structure" ? "STAR structure" : d);
