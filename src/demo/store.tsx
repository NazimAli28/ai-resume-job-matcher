"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { initialState } from "./data";
import type {
  Application, ApplicationStatus, CoverLetter, DemoState, FactBankItem, InterviewSession, Job, JobMatch,
  MatchOverride, Profile, ResumeVersion, Suggestion, TargetMarket, Usage, User,
} from "./types";
import { TODAY } from "@/lib/dates";

const STORAGE_KEY = "arw-demo-v2";

export type DemoAction =
  | { type: "RESET" }
  | { type: "HYDRATE"; state: DemoState }
  | { type: "UPDATE_USER"; patch: Partial<User> }
  | { type: "SET_TARGET_MARKET"; market: TargetMarket }
  | { type: "UPDATE_PROFILE"; patch: Partial<Profile> }
  | { type: "ADD_FACT"; fact: string }
  | { type: "REMOVE_FACT"; id: string }
  | { type: "ADD_RESUME"; version: ResumeVersion }
  | { type: "SET_ACTIVE_RESUME"; id: string }
  | { type: "RESOLVE_FINDING"; resumeId: string; findingId: string; resolved: boolean }
  | { type: "ADD_JOB"; job: Job; match: JobMatch }
  | { type: "ARCHIVE_JOB"; id: string; archived: boolean }
  | { type: "SET_REQUIREMENT_OVERRIDE"; jobId: string; requirementId: string; override?: MatchOverride }
  | { type: "SET_SUGGESTION"; id: string; patch: Partial<Suggestion> }
  | { type: "ADD_COVER_LETTER"; letter: CoverLetter }
  | { type: "ADD_APPLICATION"; application: Application }
  | { type: "MOVE_APPLICATION"; id: string; status: ApplicationStatus; note?: string }
  | { type: "UPDATE_APPLICATION"; id: string; patch: Partial<Application> }
  | { type: "SAVE_INTERVIEW"; session: InterviewSession }
  | { type: "MARK_NOTIFICATION_READ"; id: string }
  | { type: "INCREMENT_USAGE"; key: keyof Usage };

function reducer(state: DemoState, a: DemoAction): DemoState {
  switch (a.type) {
    case "RESET":
      return initialState;
    case "HYDRATE":
      return a.state;
    case "UPDATE_USER":
      return { ...state, user: { ...state.user, ...a.patch } };
    case "SET_TARGET_MARKET":
      return { ...state, user: { ...state.user, targetMarket: a.market } };
    case "UPDATE_PROFILE":
      return { ...state, profile: { ...state.profile, ...a.patch } };
    case "ADD_FACT": {
      const item: FactBankItem = { id: `fb${Date.now()}`, fact: a.fact, source: "USER", addedAt: TODAY };
      return { ...state, profile: { ...state.profile, factBank: [...state.profile.factBank, item] } };
    }
    case "REMOVE_FACT":
      return { ...state, profile: { ...state.profile, factBank: state.profile.factBank.filter((f) => f.id !== a.id) } };
    case "ADD_RESUME":
      return { ...state, resumes: [a.version, ...state.resumes], activeResumeId: a.version.id };
    case "SET_ACTIVE_RESUME":
      return { ...state, activeResumeId: a.id };
    case "RESOLVE_FINDING":
      return {
        ...state,
        resumes: state.resumes.map((r) =>
          r.id !== a.resumeId
            ? r
            : { ...r, findings: r.findings.map((f) => (f.id === a.findingId ? { ...f, resolved: a.resolved } : f)) },
        ),
      };
    case "ADD_JOB":
      return { ...state, jobs: [a.job, ...state.jobs], matches: [a.match, ...state.matches] };
    case "ARCHIVE_JOB":
      return { ...state, jobs: state.jobs.map((j) => (j.id === a.id ? { ...j, archived: a.archived } : j)) };
    case "SET_REQUIREMENT_OVERRIDE":
      return {
        ...state,
        jobs: state.jobs.map((j) =>
          j.id !== a.jobId
            ? j
            : { ...j, requirements: j.requirements.map((r) => (r.id === a.requirementId ? { ...r, override: a.override } : r)) },
        ),
      };
    case "SET_SUGGESTION":
      return { ...state, suggestions: state.suggestions.map((s) => (s.id === a.id ? { ...s, ...a.patch } : s)) };
    case "ADD_COVER_LETTER":
      return { ...state, coverLetters: [a.letter, ...state.coverLetters] };
    case "ADD_APPLICATION":
      return {
        ...state,
        applications: [a.application, ...state.applications],
        // Linking a resume to an application freezes that version (PRD: immutable once linked).
        resumes: state.resumes.map((r) => (r.id === a.application.resumeVersionId ? { ...r, state: "LOCKED" } : r)),
      };
    case "MOVE_APPLICATION":
      return {
        ...state,
        applications: state.applications.map((app) =>
          app.id !== a.id || app.status === a.status
            ? app
            : {
                ...app,
                status: a.status,
                updatedAt: TODAY,
                appliedAt: app.appliedAt ?? (a.status === "APPLIED" ? TODAY : undefined),
                history: [...app.history, { status: a.status, at: TODAY, note: a.note }],
              },
        ),
      };
    case "UPDATE_APPLICATION":
      return { ...state, applications: state.applications.map((app) => (app.id === a.id ? { ...app, ...a.patch, updatedAt: TODAY } : app)) };
    case "SAVE_INTERVIEW": {
      const exists = state.interviews.some((s) => s.id === a.session.id);
      return {
        ...state,
        interviews: exists ? state.interviews.map((s) => (s.id === a.session.id ? a.session : s)) : [a.session, ...state.interviews],
      };
    }
    case "MARK_NOTIFICATION_READ":
      return { ...state, notifications: state.notifications.map((n) => (n.id === a.id ? { ...n, read: true } : n)) };
    case "INCREMENT_USAGE":
      return { ...state, usage: { ...state.usage, [a.key]: state.usage[a.key] + 1 } };
  }
}

interface DemoContextValue {
  state: DemoState;
  dispatch: (a: DemoAction) => void;
  ready: boolean;
  jobById: (id: string) => Job | undefined;
  resumeById: (id: string) => ResumeVersion | undefined;
  matchFor: (jobId: string) => JobMatch | undefined;
  activeResume: ResumeVersion;
  /** True when the user has reached the plan limit for this action. */
  atLimit: (key: keyof Usage) => boolean;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);

  // Load the saved demo once; until then the sample data renders as-is.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", state: JSON.parse(raw) as DemoState });
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  const jobById = useCallback((id: string) => state.jobs.find((j) => j.id === id), [state.jobs]);
  const resumeById = useCallback((id: string) => state.resumes.find((r) => r.id === id), [state.resumes]);
  const matchFor = useCallback((jobId: string) => state.matches.find((m) => m.jobId === jobId), [state.matches]);
  const atLimit = useCallback((key: keyof Usage) => state.usage[key] >= state.limits[key], [state.usage, state.limits]);
  const activeResume = state.resumes.find((r) => r.id === state.activeResumeId) ?? state.resumes[0];

  const value = useMemo(
    () => ({ state, dispatch, ready, jobById, resumeById, matchFor, activeResume, atLimit }),
    [state, ready, jobById, resumeById, matchFor, activeResume, atLimit],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside <DemoProvider>");
  return ctx;
}
