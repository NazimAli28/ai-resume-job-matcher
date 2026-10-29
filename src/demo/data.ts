import type { DemoState, Job, JobMatch, ResumeVersion } from "./types";

// Demo data only. Company names are fictional. "Today" in the demo is 2026-10-21.

const contactLines = [
  "Ayesha Khan · Lahore, Pakistan",
  "ayesha.khan@example.com · +92 3xx xxxxxxx · linkedin.com/in/ayesha-demo",
  "CNIC: 35202-•••••••-•",
];

const v3: ResumeVersion = {
  id: "rv3",
  label: "v3",
  name: "Frontend – general",
  fileName: "Ayesha_Frontend_v3.pdf",
  createdAt: "2026-10-19T10:00:00Z",
  origin: "UPLOAD",
  state: "LOCKED",
  parseHealth: 92,
  readability: 74,
  parseBreakdown: [
    { label: "Text is selectable (not an image)", value: 100 },
    { label: "Standard section headings", value: 88 },
    { label: "Contact details readable", value: 80 },
    { label: "Single-column reading order", value: 100 },
  ],
  readabilityBreakdown: [
    { label: "Bullets start with an action", value: 62 },
    { label: "Bullets show an outcome", value: 58 },
    { label: "Length fits experience", value: 86 },
    { label: "Scannable layout", value: 90 },
  ],
  sections: [
    { heading: "Header", lines: contactLines },
    {
      heading: "Summary",
      lines: ["Frontend developer who enjoys building clean, fast interfaces with React."],
    },
    {
      heading: "My Journey",
      lines: [
        "Frontend Developer — Kinara Software, Lahore · Feb 2023 – Present",
        "Built and maintained 14 React + TypeScript screens for a logistics dashboard used by 300+ dispatchers.",
        "Worked on the checkout flow, which reduced failed payments.",
        "Responsible for making components reusable.",
        "Wrote unit tests with Jest and React Testing Library for core components.",
        "Frontend Intern — Bolan Digital, Karachi · Jun 2022 – Dec 2022",
        "Helped migrate jQuery pages to React.",
        "Fixed UI bugs reported by QA.",
      ],
    },
    {
      heading: "Projects",
      lines: [
        "Rozgaar Tracker — job application tracker built with Next.js and Tailwind.",
        "Weather PWA — offline-first weather app with service workers.",
      ],
    },
    {
      heading: "Skills",
      lines: ["JavaScript, React, TypeScript, HTML, CSS, Tailwind, Jest, Git, REST APIs"],
    },
    {
      heading: "Education",
      lines: ["BS Computer Science — Punjab Institute of Technology · 2018 – 2022 · CGPA 3.4/4"],
    },
  ],
  findings: [
    {
      id: "f1", ruleId: "PII1", category: "PRIVACY", severity: "HIGH",
      title: "Remove your CNIC number",
      whatWeSaw: "Your national ID number is in the header.",
      why: "Employers never need it on a resume, and it exposes you to identity fraud if the file is shared.",
      fix: "Delete the CNIC line. Share it only on an official form if an employer asks after an offer.",
      evidence: { section: "Header", text: "CNIC: 35202-•••••••-•" },
    },
    {
      id: "f2", ruleId: "P3", category: "PARSE", severity: "HIGH",
      title: "Contact details sit in the page header area",
      whatWeSaw: "Your email and phone are inside the document's header region.",
      why: "Some applicant tracking systems skip header and footer regions, so your contact details may never reach the recruiter.",
      fix: "Move name, email and phone into the main body at the top of page 1.",
      evidence: { section: "Header", text: "ayesha.khan@example.com · +92 3xx xxxxxxx" },
    },
    {
      id: "f3", ruleId: "R2", category: "READABILITY", severity: "MEDIUM",
      title: "4 bullets don't start with an action",
      whatWeSaw: "Bullets like this one start with a role description instead of what you did.",
      why: "Recruiters skim the first few words of each bullet. Starting with an action shows your contribution faster.",
      fix: "Start with a verb: built, led, reduced, shipped, migrated.",
      evidence: { section: "My Journey", text: "Responsible for making components reusable." },
    },
    {
      id: "f4", ruleId: "R3", category: "READABILITY", severity: "MEDIUM",
      title: "2 bullets mention a result without a number",
      whatWeSaw: "This bullet says payments improved but not by how much.",
      why: "A number makes a claim believable. We won't invent one, so we'll ask you for it when tailoring.",
      fix: "Add the real figure if you know it (for example the % drop in failed payments).",
      evidence: { section: "My Journey", text: "Worked on the checkout flow, which reduced failed payments." },
    },
    {
      id: "f5", ruleId: "P5", category: "PARSE", severity: "LOW",
      title: "Non-standard section heading",
      whatWeSaw: "Your experience section is titled “My Journey”.",
      why: "Parsers look for familiar headings to sort your history correctly.",
      fix: "Rename it to “Experience”.",
      evidence: { section: "My Journey", text: "My Journey" },
    },
    {
      id: "f6", ruleId: "PII4", category: "PRIVACY", severity: "TIP",
      title: "Photo included",
      whatWeSaw: "Your resume has a profile photo.",
      why: "Common for local roles in Pakistan, but many international employers prefer no photo to reduce bias.",
      fix: "Keep it for local applications; remove it when your target market is International.",
    },
  ],
};

const v2: ResumeVersion = {
  ...v3,
  id: "rv2",
  label: "v2",
  name: "Frontend – older",
  fileName: "Ayesha_Frontend_v2.pdf",
  createdAt: "2026-08-02T10:00:00Z",
  state: "LOCKED",
  parseHealth: 84,
  readability: 68,
  findings: v3.findings.slice(0, 5),
};

const v1: ResumeVersion = {
  ...v3,
  id: "rv1",
  label: "v1",
  name: "First CV",
  fileName: "Ayesha_CV_2023.pdf",
  createdAt: "2026-05-14T10:00:00Z",
  state: "LOCKED",
  parseHealth: 61,
  readability: 55,
  findings: v3.findings,
};

const k = (t: string) => ({ section: "My Journey", text: t });

const jobs: Job[] = [
  {
    id: "j1", title: "Frontend Developer", company: "Indus Systems", location: "Lahore", workMode: "Hybrid",
    url: "https://example.com/jobs/indus-frontend", source: "ROZEE_PK", addedAt: "2026-10-18T09:00:00Z",
    salary: "PKR 180k–240k / month",
    description:
      "We are hiring a Frontend Developer to build customer-facing web apps.\n\nRequirements:\n- 2+ years of professional frontend experience\n- Strong React and TypeScript\n- Experience with Next.js\n- Integrating REST APIs\n\nNice to have:\n- Unit testing (Jest / React Testing Library)\n- Docker\n- Accessibility (WCAG)",
    requirements: [
      { id: "r1", text: "2+ years of professional frontend experience", skill: "Experience 2+ yrs", type: "MUST_HAVE", matchClass: "STRONG", evidence: k("Frontend Developer — Kinara Software, Lahore · Feb 2023 – Present"), note: "2 years 8 months at Kinara Software, plus a 6-month internship." },
      { id: "r2", text: "Strong React and TypeScript", skill: "React", type: "MUST_HAVE", matchClass: "STRONG", evidence: k("Built and maintained 14 React + TypeScript screens for a logistics dashboard used by 300+ dispatchers."), note: "Used daily in your current role." },
      { id: "r3", text: "Strong React and TypeScript", skill: "TypeScript", type: "MUST_HAVE", matchClass: "STRONG", evidence: k("Built and maintained 14 React + TypeScript screens for a logistics dashboard used by 300+ dispatchers."), note: "Shown in the same bullet as React." },
      { id: "r4", text: "Experience with Next.js", skill: "Next.js", type: "MUST_HAVE", matchClass: "PARTIAL", evidence: { section: "Projects", text: "Rozgaar Tracker — job application tracker built with Next.js and Tailwind." }, note: "Only in a personal project, not in work experience." },
      { id: "r5", text: "Integrating REST APIs", skill: "REST APIs", type: "MUST_HAVE", matchClass: "PARTIAL", evidence: { section: "Skills", text: "JavaScript, React, TypeScript, HTML, CSS, Tailwind, Jest, Git, REST APIs" }, note: "Listed as a skill but no bullet shows you using it." },
      { id: "r6", text: "Unit testing (Jest / React Testing Library)", skill: "Jest", type: "NICE_TO_HAVE", matchClass: "STRONG", evidence: k("Wrote unit tests with Jest and React Testing Library for core components."), note: "Directly stated in your experience." },
      { id: "r7", text: "Docker", skill: "Docker", type: "NICE_TO_HAVE", matchClass: "MISSING", note: "Not mentioned anywhere in your resume or profile." },
      { id: "r8", text: "Accessibility (WCAG)", skill: "Accessibility", type: "NICE_TO_HAVE", matchClass: "UNKNOWN", note: "Nothing clearly for or against. Tell us if you've done accessibility work." },
    ],
  },
  {
    id: "j2", title: "React Developer", company: "Clifton Digital", location: "Karachi", workMode: "Remote",
    url: "https://example.com/jobs/clifton-react", source: "COMPANY_SITE", addedAt: "2026-10-10T09:00:00Z",
    description: "React Developer for an e-commerce team.\n\nRequirements:\n- 3+ years React\n- Redux or Zustand\n- GraphQL\n\nNice to have:\n- Shopify experience",
    requirements: [
      { id: "r1", text: "3+ years React", skill: "Experience 3+ yrs", type: "MUST_HAVE", matchClass: "PARTIAL", evidence: k("Frontend Developer — Kinara Software, Lahore · Feb 2023 – Present"), note: "About 2 years 8 months, slightly under 3." },
      { id: "r2", text: "Redux or Zustand", skill: "State management", type: "MUST_HAVE", matchClass: "UNKNOWN", note: "No state library named in your resume." },
      { id: "r3", text: "GraphQL", skill: "GraphQL", type: "MUST_HAVE", matchClass: "MISSING", note: "Not found." },
      { id: "r4", text: "Shopify experience", skill: "Shopify", type: "NICE_TO_HAVE", matchClass: "MISSING", note: "Not found." },
    ],
  },
  {
    id: "j3", title: "Software Engineer I", company: "Karakoram Soft", location: "Islamabad", workMode: "On-site",
    url: "https://example.com/jobs/karakoram-se1", source: "REFERRAL", sourceDetail: "Referred by Hamza (ex-classmate)", addedAt: "2026-10-06T09:00:00Z",
    description: "Entry-level software engineer, web team.\n\nRequirements:\n- BS Computer Science\n- JavaScript\n- Git",
    requirements: [
      { id: "r1", text: "BS Computer Science", skill: "Degree", type: "MUST_HAVE", matchClass: "STRONG", evidence: { section: "Education", text: "BS Computer Science — Punjab Institute of Technology · 2018 – 2022 · CGPA 3.4/4" }, note: "Matches." },
      { id: "r2", text: "JavaScript", skill: "JavaScript", type: "MUST_HAVE", matchClass: "STRONG", evidence: { section: "Skills", text: "JavaScript, React, TypeScript, HTML, CSS, Tailwind, Jest, Git, REST APIs" }, note: "Used throughout your experience." },
      { id: "r3", text: "Git", skill: "Git", type: "MUST_HAVE", matchClass: "PARTIAL", evidence: { section: "Skills", text: "JavaScript, React, TypeScript, HTML, CSS, Tailwind, Jest, Git, REST APIs" }, note: "Skills list only." },
    ],
  },
  {
    id: "j4", title: "Frontend Engineer", company: "Ravi Labs", location: "Lahore", workMode: "Hybrid",
    url: "https://example.com/jobs/ravi-frontend", source: "LINKEDIN", addedAt: "2026-09-28T09:00:00Z", salary: "PKR 220k–280k / month",
    description: "Frontend Engineer for our analytics product.\n\nRequirements:\n- React + TypeScript\n- Testing culture\n- Performance optimization\n\nNice to have:\n- Charts / data visualization",
    requirements: [
      { id: "r1", text: "React + TypeScript", skill: "React", type: "MUST_HAVE", matchClass: "STRONG", evidence: k("Built and maintained 14 React + TypeScript screens for a logistics dashboard used by 300+ dispatchers."), note: "Daily use." },
      { id: "r2", text: "Testing culture", skill: "Testing", type: "MUST_HAVE", matchClass: "STRONG", evidence: k("Wrote unit tests with Jest and React Testing Library for core components."), note: "Stated in experience." },
      { id: "r3", text: "Performance optimization", skill: "Performance", type: "MUST_HAVE", matchClass: "PARTIAL", evidence: { section: "Projects", text: "Weather PWA — offline-first weather app with service workers." }, note: "Implied by the PWA project, not shown at work." },
      { id: "r4", text: "Charts / data visualization", skill: "Data viz", type: "NICE_TO_HAVE", matchClass: "UNKNOWN", note: "A logistics dashboard may include charts. Add evidence if so." },
    ],
  },
  {
    id: "j5", title: "UI Engineer", company: "Margalla Tech", location: "Islamabad", workMode: "Remote",
    url: "https://example.com/jobs/margalla-ui", source: "LINKEDIN", addedAt: "2026-10-20T09:00:00Z",
    description: "UI Engineer for a design system team.\n\nRequirements:\n- React\n- Design systems / component libraries\n- CSS expertise",
    requirements: [
      { id: "r1", text: "React", skill: "React", type: "MUST_HAVE", matchClass: "STRONG", evidence: k("Built and maintained 14 React + TypeScript screens for a logistics dashboard used by 300+ dispatchers."), note: "Daily use." },
      { id: "r2", text: "Design systems / component libraries", skill: "Design systems", type: "MUST_HAVE", matchClass: "PARTIAL", evidence: k("Responsible for making components reusable."), note: "Reusable components mentioned, but not a full library." },
      { id: "r3", text: "CSS expertise", skill: "CSS", type: "MUST_HAVE", matchClass: "STRONG", evidence: { section: "Skills", text: "JavaScript, React, TypeScript, HTML, CSS, Tailwind, Jest, Git, REST APIs" }, note: "CSS and Tailwind listed." },
    ],
  },
  {
    id: "j6", title: "Junior Developer", company: "Shalimar Apps", location: "Lahore", workMode: "On-site",
    url: "https://example.com/jobs/shalimar-jr", source: "JOB_FAIR", sourceDetail: "LUMS career fair, Sep 2026", addedAt: "2026-09-12T09:00:00Z", salary: "PKR 150k / month",
    description: "Junior developer, mobile-first web apps.\n\nRequirements:\n- JavaScript\n- React or Vue",
    requirements: [
      { id: "r1", text: "JavaScript", skill: "JavaScript", type: "MUST_HAVE", matchClass: "STRONG", evidence: { section: "Skills", text: "JavaScript, React, TypeScript, HTML, CSS, Tailwind, Jest, Git, REST APIs" }, note: "Matches." },
      { id: "r2", text: "React or Vue", skill: "React", type: "MUST_HAVE", matchClass: "STRONG", evidence: k("Built and maintained 14 React + TypeScript screens for a logistics dashboard used by 300+ dispatchers."), note: "Matches." },
    ],
  },
  {
    id: "j7", title: "Web Developer", company: "Lyari Tech", location: "Karachi", workMode: "On-site",
    url: "https://example.com/jobs/lyari-web", source: "INDEED", addedAt: "2026-09-25T09:00:00Z",
    description: "Web developer for agency projects.\n\nRequirements:\n- PHP / Laravel\n- JavaScript",
    requirements: [
      { id: "r1", text: "PHP / Laravel", skill: "PHP", type: "MUST_HAVE", matchClass: "MISSING", note: "Not found." },
      { id: "r2", text: "JavaScript", skill: "JavaScript", type: "MUST_HAVE", matchClass: "STRONG", evidence: { section: "Skills", text: "JavaScript, React, TypeScript, HTML, CSS, Tailwind, Jest, Git, REST APIs" }, note: "Matches." },
    ],
  },
  {
    id: "j8", title: "Software Engineer", company: "Thal Analytics", location: "Lahore", workMode: "On-site",
    url: "https://example.com/jobs/thal-se", source: "MUSTAKBIL", addedAt: "2026-08-20T09:00:00Z",
    description: "Full-stack engineer.\n\nRequirements:\n- Node.js\n- SQL\n- React",
    requirements: [
      { id: "r1", text: "Node.js", skill: "Node.js", type: "MUST_HAVE", matchClass: "MISSING", note: "Not found." },
      { id: "r2", text: "SQL", skill: "SQL", type: "MUST_HAVE", matchClass: "MISSING", note: "Not found." },
      { id: "r3", text: "React", skill: "React", type: "MUST_HAVE", matchClass: "STRONG", evidence: k("Built and maintained 14 React + TypeScript screens for a logistics dashboard used by 300+ dispatchers."), note: "Matches." },
    ],
  },
  {
    id: "j9", title: "Frontend Developer", company: "Hunza Cloud", location: "Remote", workMode: "Remote",
    url: "https://example.com/jobs/hunza-fe", source: "RECRUITER", sourceDetail: "Recruiter message on LinkedIn", addedAt: "2026-10-02T09:00:00Z",
    description: "Frontend developer for a cloud console.\n\nRequirements:\n- React\n- TypeScript\n- Take-home assignment",
    requirements: [
      { id: "r1", text: "React", skill: "React", type: "MUST_HAVE", matchClass: "STRONG", evidence: k("Built and maintained 14 React + TypeScript screens for a logistics dashboard used by 300+ dispatchers."), note: "Matches." },
      { id: "r2", text: "TypeScript", skill: "TypeScript", type: "MUST_HAVE", matchClass: "STRONG", evidence: k("Built and maintained 14 React + TypeScript screens for a logistics dashboard used by 300+ dispatchers."), note: "Matches." },
    ],
  },
];

const factorSet = (must: number, nice: number, title: number, evidence: number, thresholds: number) => [
  { key: "must", label: "Must-have requirements", weight: 45, value: must, explanation: "Share of must-haves you clearly meet (partial counts half)." },
  { key: "nice", label: "Nice-to-haves", weight: 15, value: nice, explanation: "Share of nice-to-haves found in your resume." },
  { key: "title", label: "Title and seniority", weight: 15, value: title, explanation: "How closely your recent titles match the role and level." },
  { key: "evidence", label: "Evidence quality", weight: 15, value: evidence, explanation: "Whether skills appear in real work bullets, not just a skills list." },
  { key: "thresholds", label: "Years, education, location", weight: 10, value: thresholds, explanation: "Hard thresholds like years of experience and degree." },
];

const matches: JobMatch[] = [
  { jobId: "j1", resumeVersionId: "rv3", score: 78, factors: factorSet(80, 50, 90, 70, 100), summary: "4 of 5 must-haves are covered or partly covered. Next.js and REST APIs need stronger evidence." },
  { jobId: "j2", resumeVersionId: "rv3", score: 38, factors: factorSet(25, 0, 80, 50, 60), hardGapCap: 60, summary: "GraphQL is a hard requirement you don't show yet, so this match is capped." },
  { jobId: "j3", resumeVersionId: "rv3", score: 75, factors: factorSet(83, 100, 60, 50, 100), summary: "You meet the basics. Show Git in a real bullet to strengthen it." },
  { jobId: "j4", resumeVersionId: "rv3", score: 85, factors: factorSet(83, 50, 95, 80, 100), summary: "Strong fit. Performance work is only shown in a side project." },
  { jobId: "j5", resumeVersionId: "rv3", score: 80, factors: factorSet(83, 100, 70, 60, 100), summary: "Good fit. Make your component-library work more concrete." },
  { jobId: "j6", resumeVersionId: "rv2", score: 90, factors: factorSet(100, 100, 70, 80, 100), summary: "All must-haves covered." },
  { jobId: "j7", resumeVersionId: "rv1", score: 52, factors: factorSet(50, 100, 50, 40, 100), hardGapCap: 60, summary: "PHP is required and missing." },
  { jobId: "j8", resumeVersionId: "rv1", score: 45, factors: factorSet(33, 100, 70, 40, 100), hardGapCap: 45, summary: "Two hard requirements missing (Node.js, SQL)." },
  { jobId: "j9", resumeVersionId: "rv3", score: 97, factors: factorSet(100, 100, 80, 80, 100), summary: "All must-haves covered with work evidence." },
];

export const initialState: DemoState = {
  user: {
    id: "u1", name: "Ayesha Khan", email: "ayesha.khan@example.com", city: "Lahore",
    targetMarket: "PK_LOCAL", targetRoles: ["Frontend Developer", "React Developer"],
    plan: "FREE", beta: true, onboarded: true,
  },
  profile: {
    headline: "Frontend developer · React, TypeScript",
    phone: "+92 3xx xxxxxxx",
    linkedin: "linkedin.com/in/ayesha-demo",
    github: "github.com/ayesha-demo",
    experiences: [
      {
        id: "e1", title: "Frontend Developer", employer: "Kinara Software", location: "Lahore", start: "2023-02", end: null,
        bullets: [
          "Built and maintained 14 React + TypeScript screens for a logistics dashboard used by 300+ dispatchers.",
          "Worked on the checkout flow, which reduced failed payments.",
          "Responsible for making components reusable.",
          "Wrote unit tests with Jest and React Testing Library for core components.",
        ],
      },
      {
        id: "e2", title: "Frontend Intern", employer: "Bolan Digital", location: "Karachi", start: "2022-06", end: "2022-12",
        bullets: ["Helped migrate jQuery pages to React.", "Fixed UI bugs reported by QA."],
      },
    ],
    education: [{ id: "ed1", degree: "BS Computer Science", school: "Punjab Institute of Technology", start: "2018", end: "2022", grade: "CGPA 3.4/4" }],
    projects: [
      { id: "p1", name: "Rozgaar Tracker", summary: "Job application tracker with reminders.", tech: ["Next.js", "Tailwind", "TypeScript"] },
      { id: "p2", name: "Weather PWA", summary: "Offline-first weather app using service workers.", tech: ["JavaScript", "PWA"] },
    ],
    skills: [
      { id: "s1", name: "React", level: "Strong", confirmed: true },
      { id: "s2", name: "TypeScript", level: "Strong", confirmed: true },
      { id: "s3", name: "JavaScript", level: "Expert", confirmed: true },
      { id: "s4", name: "Next.js", level: "Working", confirmed: false },
      { id: "s5", name: "Tailwind CSS", level: "Strong", confirmed: true },
      { id: "s6", name: "Jest / RTL", level: "Working", confirmed: true },
      { id: "s7", name: "REST APIs", level: "Working", confirmed: false },
      { id: "s8", name: "Git", level: "Strong", confirmed: true },
    ],
    certifications: ["Meta Front-End Developer (Coursera), 2023"],
    factBank: [
      { id: "fb1", fact: "The logistics dashboard is used daily by 300+ dispatchers.", source: "RESUME", addedAt: "2026-10-19" },
      { id: "fb2", fact: "Wrote unit tests with Jest and React Testing Library.", source: "RESUME", addedAt: "2026-10-19" },
      { id: "fb3", fact: "Led the dashboard's move from JavaScript to TypeScript over 3 months.", source: "USER", addedAt: "2026-10-20" },
    ],
  },
  resumes: [v3, v2, v1],
  activeResumeId: "rv3",
  jobs,
  matches,
  suggestions: [
    { id: "sg1", jobId: "j1", kind: "SUMMARY", section: "Summary", before: "Frontend developer who enjoys building clean, fast interfaces with React.", after: "Frontend developer with 2.5 years building React and TypeScript dashboards, including a logistics app used daily by 300+ dispatchers.", reason: "Leads with the two must-haves this job cares about most, using facts already in your resume.", evidence: k("Built and maintained 14 React + TypeScript screens for a logistics dashboard used by 300+ dispatchers."), status: "PENDING", safe: true },
    { id: "sg2", jobId: "j1", kind: "REWRITE", section: "Experience", before: "Responsible for making components reusable.", after: "Created reusable React + TypeScript components shared across the dashboard's screens.", reason: "Starts with an action and names the technologies the job asks for. No new claims.", evidence: k("Responsible for making components reusable."), status: "PENDING", safe: true },
    { id: "sg3", jobId: "j1", kind: "QUESTION", section: "Experience", before: "Worked on the checkout flow, which reduced failed payments.", after: "Redesigned the React checkout flow, reducing failed payments by [your number].", reason: "A real number would make this much stronger. We won't guess it.", question: "Roughly how much did failed payments drop? Leave blank if you don't know.", evidence: k("Worked on the checkout flow, which reduced failed payments."), status: "PENDING", safe: false },
    { id: "sg4", jobId: "j1", kind: "KEYWORD", section: "Experience", before: "Built and maintained 14 React + TypeScript screens for a logistics dashboard used by 300+ dispatchers.", after: "Built and maintained 14 React + TypeScript screens, integrating REST APIs, for a logistics dashboard used by 300+ dispatchers.", reason: "“REST APIs” is a must-have. Only accept this if the dashboard really called REST APIs.", evidence: { section: "Skills", text: "JavaScript, React, TypeScript, HTML, CSS, Tailwind, Jest, Git, REST APIs" }, status: "PENDING", safe: false },
    { id: "sg5", jobId: "j1", kind: "REORDER", section: "Skills", before: "JavaScript, React, TypeScript, HTML, CSS, Tailwind, Jest, Git, REST APIs", after: "React, TypeScript, Next.js, REST APIs, JavaScript, Jest, Tailwind, HTML, CSS, Git", reason: "Puts this job's must-haves first. Next.js comes from your Rozgaar Tracker project.", evidence: { section: "Projects", text: "Rozgaar Tracker — job application tracker built with Next.js and Tailwind." }, status: "PENDING", safe: true },
    { id: "sg6", jobId: "j1", kind: "REWRITE", section: "Experience", before: "Helped migrate jQuery pages to React.", after: "Migrated legacy jQuery pages to React components during a 6-month internship.", reason: "Clearer ownership and context, without adding claims.", evidence: k("Helped migrate jQuery pages to React."), status: "PENDING", safe: true },
    { id: "sg7", jobId: "j1", kind: "REWRITE", section: "Experience", before: "Fixed UI bugs reported by QA.", after: "Fixed UI bugs reported by QA, working directly with testers to confirm each fix.", reason: "This adds a claim about how you worked. Accept only if true.", evidence: k("Fixed UI bugs reported by QA."), status: "PENDING", safe: false },
  ],
  coverLetters: [],
  applications: [
    {
      id: "a1", jobId: "j4", company: "Ravi Labs", title: "Frontend Engineer", status: "INTERVIEWING", resumeVersionId: "rv3",
      source: "LINKEDIN", appliedAt: "2026-09-29", updatedAt: "2026-10-16", nextAction: { label: "Technical round", due: "2026-10-23" },
      salary: "PKR 220k–280k", notes: "Recruiter said the technical round includes a live React exercise.", tags: ["dream"],
      contacts: [{ id: "c1", name: "Sana Malik", role: "Talent partner", email: "sana@example.com" }],
      rounds: [
        { id: "rd1", type: "HR", at: "2026-10-09", note: "30 min call, went well.", done: true },
        { id: "rd2", type: "TECHNICAL", at: "2026-10-23", note: "Live coding, 60 min.", done: false },
      ],
      history: [
        { status: "SAVED", at: "2026-09-28" }, { status: "APPLIED", at: "2026-09-29" },
        { status: "SCREENING", at: "2026-10-03" }, { status: "INTERVIEWING", at: "2026-10-09" },
      ],
    },
    {
      id: "a2", jobId: "j1", company: "Indus Systems", title: "Frontend Developer", status: "APPLIED", resumeVersionId: "rv3",
      source: "ROZEE_PK", appliedAt: "2026-10-18", updatedAt: "2026-10-18", nextAction: { label: "Follow up", due: "2026-10-24" },
      salary: "PKR 180k–240k", notes: "", tags: [], contacts: [], rounds: [],
      history: [{ status: "SAVED", at: "2026-10-18" }, { status: "APPLIED", at: "2026-10-18" }],
    },
    {
      id: "a3", jobId: "j2", company: "Clifton Digital", title: "React Developer", status: "APPLIED", resumeVersionId: "rv2",
      source: "COMPANY_SITE", appliedAt: "2026-10-12", updatedAt: "2026-10-12", nextAction: { label: "Follow up", due: "2026-10-21" },
      notes: "Applied through their careers page.", tags: ["remote"], contacts: [], rounds: [],
      history: [{ status: "SAVED", at: "2026-10-10" }, { status: "APPLIED", at: "2026-10-12" }],
    },
    {
      id: "a4", jobId: "j3", company: "Karakoram Soft", title: "Software Engineer I", status: "SCREENING", resumeVersionId: "rv2",
      source: "REFERRAL", sourceDetail: "Referred by Hamza (ex-classmate)", appliedAt: "2026-10-07", updatedAt: "2026-10-15",
      notes: "Hamza passed my CV to the hiring manager.", tags: ["referral"],
      contacts: [{ id: "c2", name: "Hamza Qureshi", role: "Referrer, SE II", note: "Ex-classmate" }], rounds: [],
      history: [{ status: "APPLIED", at: "2026-10-07" }, { status: "SCREENING", at: "2026-10-15" }],
    },
    {
      id: "a5", jobId: "j5", company: "Margalla Tech", title: "UI Engineer", status: "SAVED", resumeVersionId: "rv3",
      source: "LINKEDIN", updatedAt: "2026-10-20", notes: "Tailor before applying: emphasize component work.", tags: ["remote"],
      contacts: [], rounds: [], history: [{ status: "SAVED", at: "2026-10-20" }],
    },
    {
      id: "a6", jobId: "j6", company: "Shalimar Apps", title: "Junior Developer", status: "OFFER", resumeVersionId: "rv2",
      source: "JOB_FAIR", sourceDetail: "LUMS career fair, Sep 2026", appliedAt: "2026-09-13", updatedAt: "2026-10-17",
      nextAction: { label: "Reply to offer", due: "2026-10-26" }, salary: "PKR 150k", notes: "Offer letter received. Lower than Ravi Labs range.", tags: [],
      contacts: [{ id: "c3", name: "Bilal Ahmed", role: "Engineering manager" }],
      rounds: [{ id: "rd3", type: "TECHNICAL", at: "2026-09-30", done: true }, { id: "rd4", type: "FINAL", at: "2026-10-08", done: true }],
      history: [
        { status: "APPLIED", at: "2026-09-13" }, { status: "SCREENING", at: "2026-09-20" },
        { status: "INTERVIEWING", at: "2026-09-30" }, { status: "OFFER", at: "2026-10-17" },
      ],
    },
    {
      id: "a7", jobId: "j7", company: "Lyari Tech", title: "Web Developer", status: "APPLIED", resumeVersionId: "rv1",
      source: "INDEED", appliedAt: "2026-09-30", updatedAt: "2026-09-30", notes: "", tags: [], contacts: [], rounds: [],
      history: [{ status: "APPLIED", at: "2026-09-30" }],
    },
    {
      id: "a8", jobId: "j8", company: "Thal Analytics", title: "Software Engineer", status: "REJECTED", resumeVersionId: "rv1",
      source: "MUSTAKBIL", appliedAt: "2026-08-21", updatedAt: "2026-09-04", notes: "Rejection email: looking for backend experience.", tags: [],
      contacts: [], rounds: [], history: [{ status: "APPLIED", at: "2026-08-21" }, { status: "REJECTED", at: "2026-09-04" }],
    },
    {
      id: "a9", jobId: "j9", company: "Hunza Cloud", title: "Frontend Developer", status: "ASSESSMENT", resumeVersionId: "rv3",
      source: "RECRUITER", sourceDetail: "Recruiter message on LinkedIn", appliedAt: "2026-10-03", updatedAt: "2026-10-14",
      nextAction: { label: "Submit take-home", due: "2026-10-25" }, notes: "Take-home: build a small dashboard in 48h.", tags: ["remote"],
      contacts: [{ id: "c4", name: "Zara Hussain", role: "Recruiter" }],
      rounds: [{ id: "rd5", type: "TAKE_HOME", at: "2026-10-25", done: false }],
      history: [{ status: "APPLIED", at: "2026-10-03" }, { status: "SCREENING", at: "2026-10-08" }, { status: "ASSESSMENT", at: "2026-10-14" }],
    },
  ],
  interviews: [
    {
      id: "iv1", jobId: "j4", type: "BEHAVIORAL", difficulty: "STANDARD", persona: "FRIENDLY_RECRUITER", questionCount: 5,
      status: "COMPLETED", createdAt: "2026-10-15T18:00:00Z", overall: 72,
      questions: [
        { id: "q1", text: "Tell me about yourself and why you're interested in frontend work at Ravi Labs.", kind: "HR", whyAsked: "Opens the conversation and checks how well you connect your story to the role.", targets: "Role fit" },
        { id: "q2", text: "Describe a time you disagreed with a teammate about a technical decision. What happened?", kind: "BEHAVIORAL", whyAsked: "Tests collaboration and how you handle conflict.", targets: "Teamwork" },
        { id: "q3", text: "Tell me about a feature you're proud of. What was your part and what was the result?", kind: "BEHAVIORAL", whyAsked: "Checks ownership and whether you can show impact.", targets: "Logistics dashboard" },
        { id: "q4", text: "How do you make sure your React code is reliable before it ships?", kind: "BEHAVIORAL", whyAsked: "The job lists a testing culture as a must-have.", targets: "Testing culture" },
        { id: "q5", text: "Why this role, and why now?", kind: "HR", whyAsked: "Checks motivation and whether you researched the company.", targets: "Motivation" },
      ],
      answers: [
        { questionId: "q1", answer: "I'm a frontend developer at Kinara Software where I build React and TypeScript screens for a logistics dashboard. Before that I interned at Bolan Digital. I like Ravi Labs because it's an analytics product and I enjoy data-heavy interfaces.", seconds: 74 },
        { questionId: "q2", answer: "Once a teammate wanted to use a big UI library and I thought we should build our own components. We discussed it and in the end we used a mix.", followUp: { question: "What was the outcome of using a mix, and what did you learn?", answer: "It worked okay. I learned to listen more." }, seconds: 58 },
        { questionId: "q3", answer: "I'm proud of the dispatcher dashboard. I built most of the screens in React and TypeScript, and 300+ dispatchers use it every day. I also wrote tests for the core components.", seconds: 81 },
        { questionId: "q4", answer: "I write unit tests with Jest and React Testing Library for core components, and I test manually in the browser before opening a pull request. We also have code review.", seconds: 49 },
        { questionId: "q5", answer: "I want to grow and Ravi Labs is a good company.", followUp: { question: "What specifically about Ravi Labs or this role appeals to you?", answer: "The analytics product and the team." }, seconds: 31 },
      ],
      evaluations: [
        {
          questionId: "q1", overall: 80,
          rubric: [
            { dimension: "Relevance", score: 4, weight: 25, quote: "I enjoy data-heavy interfaces", comment: "Connects your experience to an analytics product." },
            { dimension: "Specificity", score: 4, weight: 25, quote: "React and TypeScript screens for a logistics dashboard", comment: "Concrete about what you build." },
            { dimension: "Structure", score: 4, weight: 25, quote: "Before that I interned at Bolan Digital", comment: "Present, past, why this role: easy to follow." },
            { dimension: "Clarity", score: 4, weight: 15, quote: "I'm a frontend developer at Kinara Software", comment: "Clear opening." },
            { dimension: "Conciseness", score: 4, weight: 10, quote: "", comment: "About 70 seconds: a good length." },
          ],
          whatWorked: "You linked your dashboard work to an analytics product.",
          whatWasMissing: "One result or number would make it memorable (for example the 300+ daily users).",
          modelAnswer: "I'm a frontend developer at Kinara Software, where I've built 14 React and TypeScript screens for a logistics dashboard that 300+ dispatchers use every day. Before that I interned at Bolan Digital, migrating jQuery pages to React. I'm drawn to Ravi Labs because your analytics product is the kind of data-heavy interface I enjoy building most.",
          modelAnswerSources: ["Resume: 14 React + TypeScript screens, 300+ dispatchers", "Resume: Bolan Digital internship"],
        },
        {
          questionId: "q2", overall: 54,
          rubric: [
            { dimension: "STAR structure", score: 2, weight: 25, quote: "in the end we used a mix", comment: "Situation and action are there; the result is vague." },
            { dimension: "Specificity", score: 2, weight: 25, quote: "a big UI library", comment: "Which library, which project, what trade-offs?" },
            { dimension: "Relevance", score: 4, weight: 20, quote: "build our own components", comment: "A real technical disagreement: good choice of story." },
            { dimension: "Clarity", score: 3, weight: 15, quote: "We discussed it", comment: "How you resolved it is unclear." },
            { dimension: "Conciseness", score: 4, weight: 15, quote: "", comment: "Short and on topic." },
          ],
          whatWorked: "You picked a genuine technical disagreement.",
          whatWasMissing: "No result. Say what the mix was, how it turned out, and what you'd repeat.",
          modelAnswer: "On the dispatcher dashboard, a teammate wanted to adopt a large UI library while I preferred our own components. I suggested we compare both on one screen. We kept the library for complex inputs and our own components for layout. The outcome and what I learned would go here. Add the real result before using this answer.",
          modelAnswerSources: ["Resume: reusable components at Kinara Software", "Your answer: library vs custom components"],
        },
        {
          questionId: "q3", overall: 84,
          rubric: [
            { dimension: "STAR structure", score: 4, weight: 25, quote: "I built most of the screens", comment: "Clear action and result." },
            { dimension: "Specificity", score: 5, weight: 25, quote: "300+ dispatchers use it every day", comment: "A concrete, verifiable impact." },
            { dimension: "Relevance", score: 4, weight: 20, quote: "React and TypeScript", comment: "Matches the role's must-haves." },
            { dimension: "Clarity", score: 4, weight: 15, quote: "", comment: "Easy to follow." },
            { dimension: "Conciseness", score: 4, weight: 15, quote: "", comment: "Good length." },
          ],
          whatWorked: "Strong ownership and a real usage number.",
          whatWasMissing: "Mention one challenge you solved along the way.",
          modelAnswer: "I'm proud of the dispatcher dashboard at Kinara Software. I built 14 of its React and TypeScript screens and wrote unit tests for the core components with Jest and React Testing Library. Today 300+ dispatchers use it every day.",
          modelAnswerSources: ["Resume: 14 screens, 300+ dispatchers", "Resume: Jest and React Testing Library"],
        },
        {
          questionId: "q4", overall: 76,
          rubric: [
            { dimension: "Relevance", score: 4, weight: 25, quote: "Jest and React Testing Library", comment: "Directly answers the testing question." },
            { dimension: "Specificity", score: 3, weight: 25, quote: "core components", comment: "Which kinds of tests, and what do they catch?" },
            { dimension: "Structure", score: 4, weight: 25, quote: "We also have code review", comment: "Layers your process logically." },
            { dimension: "Clarity", score: 4, weight: 15, quote: "", comment: "Clear." },
            { dimension: "Conciseness", score: 4, weight: 10, quote: "", comment: "Good length." },
          ],
          whatWorked: "A believable, layered quality process.",
          whatWasMissing: "An example of a bug your tests caught would make it concrete.",
          modelAnswer: "I write unit tests with Jest and React Testing Library for core components, check changes in the browser before opening a pull request, and every change goes through code review. When I led our move from JavaScript to TypeScript, the types caught a whole class of errors before release.",
          modelAnswerSources: ["Resume: Jest and React Testing Library", "Fact bank: led the JavaScript to TypeScript migration"],
        },
        {
          questionId: "q5", overall: 46,
          rubric: [
            { dimension: "Relevance", score: 2, weight: 25, quote: "Ravi Labs is a good company", comment: "Generic: could be said about any company." },
            { dimension: "Specificity", score: 2, weight: 25, quote: "The analytics product and the team", comment: "Name something specific you learned about them." },
            { dimension: "Structure", score: 3, weight: 25, quote: "", comment: "Short, but the follow-up helped." },
            { dimension: "Clarity", score: 4, weight: 15, quote: "", comment: "Clear." },
            { dimension: "Conciseness", score: 4, weight: 10, quote: "", comment: "Brief." },
          ],
          whatWorked: "You mentioned the analytics product after the follow-up.",
          whatWasMissing: "Research: one specific thing about Ravi Labs' product or team, tied to your experience.",
          modelAnswer: "I've spent two years building a data-heavy dashboard and want to go deeper into analytics interfaces. Ravi Labs' product is exactly that. [Add one specific thing you learned about Ravi Labs.]",
          modelAnswerSources: ["Resume: logistics dashboard"],
        },
      ],
    },
  ],
  notifications: [
    { id: "n1", type: "REMINDER_DUE", title: "Follow up with Clifton Digital", body: "You applied 9 days ago. A short, polite follow-up is due today.", applicationId: "a3", createdAt: "2026-10-21T06:00:00Z", read: false },
    { id: "n2", type: "GHOSTING_SUGGESTION", title: "No reply from Lyari Tech in 21 days", body: "Mark it as ghosted to keep your board accurate? You can always move it back.", applicationId: "a7", createdAt: "2026-10-21T06:00:00Z", read: false },
    { id: "n3", type: "REMINDER_DUE", title: "Ravi Labs technical round on Thursday", body: "Practice a technical session for this job before then.", applicationId: "a1", createdAt: "2026-10-20T06:00:00Z", read: true },
  ],
  usage: { analyses: 2, tailored: 1, coverLetters: 0, interviews: 1 },
  limits: { analyses: 6, tailored: 6, coverLetters: 6, interviews: 4 },
};
