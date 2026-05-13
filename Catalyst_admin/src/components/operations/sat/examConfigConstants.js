// ============================================================
// SAT EXAM CONFIG — Shared constants & helper functions
// ============================================================

// ── Style constants ───────────────────────────────────────────────────────────
export const inputCls = 'h-9 px-3 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary bg-white w-full';
export const labelCls = 'text-xs font-semibold text-gray-700';
export const numCls   = 'h-9 px-3 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary bg-white w-20 text-center';

export const SUBJ_STYLE = { math: 'bg-purple-100 text-purple-700', reading_writing: 'bg-blue-100 text-blue-700' };
export const SUBJ_LABEL = { math: 'Math', reading_writing: 'Reading & Writing' };
export const TYPE_STYLE = { mock: 'bg-emerald-100 text-emerald-700', diagnostic: 'bg-orange-100 text-orange-700' };

// ── SAT topic taxonomy ────────────────────────────────────────────────────────
export const SAT_TAXONOMY = {
  math: {
    'Advanced Math': [
      'Equivalent expressions',
      'Nonlinear equations in one variable and systems of equations in two variables',
      'Nonlinear functions',
    ],
    'Algebra': [
      'Linear equations in one variable',
      'Linear equations in two variables',
      'Linear functions',
      'Linear inequalities in one or two variables',
      'Systems of two linear equations in two variables',
    ],
    'Geometry and Trigonometry': [
      'Area and volume',
      'Circles',
      'Lines, angles, and triangles',
      'Right triangles and trigonometry',
    ],
    'Problem-Solving and Data Analysis': [
      'Evaluating statistical claims: Observational studies and experiments',
      'Inference from sample statistics and margin of error',
      'One-variable data: Distributions and measures of center and spread',
      'Percentages',
      'Probability and conditional probability',
      'Ratios, rates, proportional relationships, and units',
      'Two-variable data: Models and scatterplots',
    ],
  },
  reading_writing: {
    'Craft and Structure': [
      'Cross-Text Connections',
      'Text Structure and Purpose',
      'Words in Context',
    ],
    'Expression of Ideas': [
      'Rhetorical Synthesis',
      'Transitions',
    ],
    'Information and Ideas': [
      'Central Ideas and Details',
      'Command of Evidence',
      'Inferences',
    ],
    'Standard English Conventions': [
      'Boundaries',
      'Form, Structure, and Sense',
    ],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export const diffSum = (dd) => Number(dd.easy || 0) + Number(dd.medium || 0) + Number(dd.hard || 0);

export const emptySubjectCfg = () => ({
  m1:        { total_questions: '', time_limit_minutes: '', difficulty_distribution: { easy: '', medium: '', hard: '' } },
  m2a:       { time_limit_minutes: '', difficulty: { easy: '', medium: '', hard: '' } },
  m2b:       { time_limit_minutes: '', difficulty: { easy: '', medium: '', hard: '' } },
  threshold: 60,
});

// Maps one subject block from the unified SatTestConfig document into form state.
// Pass existing.subjects.reading_writing or existing.subjects.math.
export const cfgFromSubject = (subj) => ({
  m1: {
    total_questions:    subj?.module_1?.total_questions    ?? '',
    time_limit_minutes: subj?.module_1?.time_limit_minutes ?? '',
    difficulty_distribution: {
      easy:   subj?.module_1?.difficulty_distribution?.easy   ?? '',
      medium: subj?.module_1?.difficulty_distribution?.medium ?? '',
      hard:   subj?.module_1?.difficulty_distribution?.hard   ?? '',
    },
  },
  m2a: {
    time_limit_minutes: subj?.module_2_easy?.time_limit_minutes ?? '',
    difficulty: {
      easy:   subj?.module_2_easy?.difficulty_distribution?.easy   ?? '',
      medium: subj?.module_2_easy?.difficulty_distribution?.medium ?? '',
      hard:   subj?.module_2_easy?.difficulty_distribution?.hard   ?? '',
    },
  },
  m2b: {
    time_limit_minutes: subj?.module_2_hard?.time_limit_minutes ?? '',
    difficulty: {
      easy:   subj?.module_2_hard?.difficulty_distribution?.easy   ?? '',
      medium: subj?.module_2_hard?.difficulty_distribution?.medium ?? '',
      hard:   subj?.module_2_hard?.difficulty_distribution?.hard   ?? '',
    },
  },
  threshold: subj?.adaptive_threshold ?? 60,
});
