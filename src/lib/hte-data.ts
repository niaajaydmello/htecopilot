export type DocType = "GR" | "Circular" | "Notification" | "Policy" | "Scheme";

export interface HteDoc {
  id: string;
  title: string;
  number: string;
  type: DocType;
  department: string;
  year: number;
  date: string;
  summary: string;
  tags: string[];
  pages: number;
}

export const documents: HteDoc[] = [
  {
    id: "gr-2025-014",
    title: "Establishment of New Engineering Colleges — Revised Norms",
    number: "GR-HTE-2025/014",
    type: "GR",
    department: "Higher & Technical Education",
    year: 2025,
    date: "2025-03-12",
    summary:
      "Consolidated norms for AICTE approval, land requirement, infrastructure, faculty ratio and financial guarantee for new engineering institutions.",
    tags: ["Affiliation", "AICTE", "Infrastructure"],
    pages: 42,
  },
  {
    id: "cir-2025-16",
    title: "Post-Matric Scholarship Eligibility Update — SC/ST/OBC",
    number: "Circular-16/2025",
    type: "Circular",
    department: "Social Justice / HTE",
    year: 2025,
    date: "2025-05-04",
    summary:
      "Revised income ceilings, application timelines and documentation checklist for post-matric scholarship schemes in technical education.",
    tags: ["Scholarship", "Eligibility", "Deadline"],
    pages: 12,
  },
  {
    id: "gr-2024-089",
    title: "Faculty Recruitment Rules for Government Polytechnics",
    number: "GR-HTE-2024/089",
    type: "GR",
    department: "Higher & Technical Education",
    year: 2024,
    date: "2024-08-21",
    summary:
      "Cadre structure, qualification norms, reservation matrix and promotion pathway for teaching posts in government polytechnics.",
    tags: ["Faculty", "Recruitment", "Reservation"],
    pages: 58,
  },
  {
    id: "not-2024-aicte",
    title: "AICTE Approval Process Handbook 2024–25",
    number: "AICTE/APH/2024",
    type: "Notification",
    department: "AICTE",
    year: 2024,
    date: "2024-02-01",
    summary:
      "Complete step-by-step approval, extension of approval and closure workflow for AICTE-approved institutions.",
    tags: ["AICTE", "Approval", "Workflow"],
    pages: 210,
  },
  {
    id: "pol-2023-nep",
    title: "State Implementation Plan — NEP 2020 for Technical Education",
    number: "Policy-NEP/HTE/2023",
    type: "Policy",
    department: "Higher & Technical Education",
    year: 2023,
    date: "2023-11-09",
    summary:
      "Multiple entry-exit, credit framework, autonomy roadmap and multidisciplinary institution guidelines under NEP 2020.",
    tags: ["NEP", "Policy", "Credit Framework"],
    pages: 96,
  },
  {
    id: "sch-2025-innov",
    title: "Innovation & Research Grant Scheme for Engineering Institutes",
    number: "Scheme-IR/HTE/2025",
    type: "Scheme",
    department: "Higher & Technical Education",
    year: 2025,
    date: "2025-01-18",
    summary:
      "Up to ₹50 lakh matching grant for approved research clusters in AI, semiconductors, green energy and biotech.",
    tags: ["Research", "Grant", "Innovation"],
    pages: 24,
  },
  {
    id: "cir-2023-adm",
    title: "CAP Admission Guidelines — First Year Engineering",
    number: "Circular-CAP/2023",
    type: "Circular",
    department: "State CET Cell",
    year: 2023,
    date: "2023-06-14",
    summary:
      "Centralized Admission Process schedule, option form rules, reservation quota and grievance redressal mechanism.",
    tags: ["Admission", "CAP", "CET"],
    pages: 34,
  },
  {
    id: "gr-2022-exam",
    title: "Examination Reforms — Continuous Evaluation Framework",
    number: "GR-HTE-2022/031",
    type: "GR",
    department: "Higher & Technical Education",
    year: 2022,
    date: "2022-04-27",
    summary:
      "40:60 continuous-terminal weightage, moderation guidelines, revaluation timelines and digital answer-sheet norms.",
    tags: ["Examination", "Evaluation"],
    pages: 28,
  },
  {
    id: "gr-2021-affil",
    title: "College Affiliation Procedure — Consolidated Guidelines",
    number: "GR-HTE-2021/077",
    type: "GR",
    department: "Higher & Technical Education",
    year: 2021,
    date: "2021-09-30",
    summary:
      "LIC visit, no-objection certificate, university affiliation, joint inspection and fee-fixation workflow.",
    tags: ["Affiliation", "Procedure"],
    pages: 46,
  },
];

export const trendingTopics = [
  "Scholarships",
  "Admissions",
  "Faculty Recruitment",
  "College Affiliation",
  "Examinations",
  "Research Grants",
  "Reservation Policy",
  "AICTE Approval",
  "NEP 2020",
  "Fee Regulation",
];

export const recentSearches = [
  "How do I start a new engineering course?",
  "Post-matric scholarship eligibility 2025",
  "Faculty recruitment reservation matrix",
  "CAP round 2 grievance timeline",
  "AICTE extension of approval checklist",
];

export const exampleQueries = [
  "How do I start a new engineering course?",
  "Scholarship eligibility for OBC students",
  "Faculty recruitment rules for polytechnics",
  "College affiliation process step-by-step",
  "Admission guidelines for CAP round 2",
];

export interface GroundedAnswer {
  query: string;
  summary: string;
  explanation: string;
  eligibility: string[];
  documents: string[];
  timeline: { step: string; duration: string }[];
  rules: string[];
  notes: string[];
  exceptions: string[];
  confidence: number;
  sources: {
    docId: string;
    title: string;
    number: string;
    page: number;
    excerpt: string;
  }[];
  related: string[];
}

export function generateAnswer(query: string): GroundedAnswer {
  return {
    query,
    summary:
      "To establish a new engineering college in Maharashtra, an applicant must obtain AICTE approval, satisfy land and infrastructure norms under GR-HTE-2025/014, and receive university affiliation following the LIC inspection procedure.",
    explanation:
      "The process is a coordinated three-track approval — AICTE (technical), Directorate of Technical Education (state), and the affiliating university. GR-HTE-2025/014 revised land requirements to 2.5 acres in metro areas and 5 acres elsewhere, and requires a ₹2 crore FDR as financial guarantee. AICTE approval must be secured before the state No-Objection Certificate is issued, and both precede university affiliation.",
    eligibility: [
      "Registered Trust, Society or Section-8 Company with 3+ years standing",
      "Minimum land of 2.5 acres (metro) or 5 acres (non-metro), contiguous plot",
      "Financial guarantee: ₹2 crore FDR in a nationalised bank",
      "Faculty ratio 1:20 with at least 25% Ph.D. holders",
    ],
    documents: [
      "AICTE application form (APH-2024) with fees",
      "Land ownership / 30-year lease documents",
      "Building plan approved by local authority",
      "Financial guarantee FDR receipt",
      "State NOC application with prescribed enclosures",
    ],
    timeline: [
      { step: "AICTE online application", duration: "Aug – Oct" },
      { step: "State NOC scrutiny", duration: "4–6 weeks" },
      { step: "AICTE inspection", duration: "6–8 weeks" },
      { step: "University LIC visit", duration: "3–4 weeks" },
      { step: "Affiliation & admission approval", duration: "2 weeks" },
    ],
    rules: [
      "GR-HTE-2025/014 §4.2 — revised land norms",
      "AICTE APH-2024 Chapter 3 — inspection process",
      "GR-HTE-2021/077 — university affiliation workflow",
    ],
    notes: [
      "Fee-fixation must be applied for separately with FRA within 45 days of approval.",
      "First-year intake is capped at 60% of sanctioned strength.",
    ],
    exceptions: [
      "Institutions in tribal sub-plan districts get a 25% relaxation on land norms.",
      "Government/Aided institutions are exempted from the FDR requirement.",
    ],
    confidence: 0.97,
    sources: [
      {
        docId: "gr-2025-014",
        title: "Establishment of New Engineering Colleges — Revised Norms",
        number: "GR-HTE-2025/014",
        page: 12,
        excerpt:
          "The minimum contiguous land requirement shall be 2.5 acres for metropolitan regions and 5 acres for non-metropolitan regions, with a financial guarantee of ₹2,00,00,000 by way of FDR…",
      },
      {
        docId: "not-2024-aicte",
        title: "AICTE Approval Process Handbook 2024–25",
        number: "AICTE/APH/2024",
        page: 47,
        excerpt:
          "All new institution applications shall be submitted through the AICTE web portal between the notified dates and must include the state government NOC prior to inspection…",
      },
      {
        docId: "gr-2021-affil",
        title: "College Affiliation Procedure — Consolidated Guidelines",
        number: "GR-HTE-2021/077",
        page: 8,
        excerpt:
          "The affiliating university shall constitute a Local Inquiry Committee (LIC) within 21 days of receipt of the affiliation proposal…",
      },
    ],
    related: [
      "Fee-fixation procedure with FRA",
      "AICTE extension of approval",
      "Change of name / location procedure",
      "Reservation quota under CAP",
    ],
  };
}

export const suggestedQuestions = [
  "Scholarships",
  "Admissions",
  "Faculty",
  "Affiliation",
  "Examinations",
  "Research Grants",
  "Reservation",
  "College Approval",
];

export const timelineEvents = [
  { year: 2021, title: "Affiliation procedure consolidated", docId: "gr-2021-affil" },
  { year: 2022, title: "Continuous evaluation framework", docId: "gr-2022-exam" },
  { year: 2023, title: "NEP 2020 state implementation plan", docId: "pol-2023-nep" },
  { year: 2023, title: "CAP admission guidelines", docId: "cir-2023-adm" },
  { year: 2024, title: "Faculty recruitment rules updated", docId: "gr-2024-089" },
  { year: 2024, title: "AICTE approval handbook 2024–25", docId: "not-2024-aicte" },
  { year: 2025, title: "Innovation & research grant scheme", docId: "sch-2025-innov" },
  { year: 2025, title: "New engineering college norms revised", docId: "gr-2025-014" },
  { year: 2025, title: "Post-matric scholarship update", docId: "cir-2025-16" },
];

export const comparisonRows = [
  { field: "Land requirement (metro)", oldV: "1.5 acres", newV: "2.5 acres", change: "modified" },
  { field: "Financial guarantee (FDR)", oldV: "₹1 crore", newV: "₹2 crore", change: "modified" },
  { field: "Faculty ratio", oldV: "1:15", newV: "1:20", change: "modified" },
  { field: "Ph.D. faculty minimum", oldV: "—", newV: "25%", change: "added" },
  { field: "Tribal district relaxation", oldV: "10%", newV: "25%", change: "modified" },
  { field: "First-year intake cap", oldV: "80%", newV: "60%", change: "modified" },
  { field: "Section-8 Company eligibility", oldV: "—", newV: "Allowed", change: "added" },
  { field: "Diesel-generator mandate", oldV: "Required", newV: "—", change: "removed" },
];

export const analytics = {
  topTopics: [
    { name: "Admissions", value: 412 },
    { name: "Scholarships", value: 356 },
    { name: "Affiliation", value: 268 },
    { name: "Faculty", value: 221 },
    { name: "Exams", value: 189 },
    { name: "Research", value: 142 },
  ],
  usageByMonth: [
    { m: "Jan", q: 120 },
    { m: "Feb", q: 180 },
    { m: "Mar", q: 240 },
    { m: "Apr", q: 210 },
    { m: "May", q: 320 },
    { m: "Jun", q: 380 },
    { m: "Jul", q: 460 },
  ],
};
