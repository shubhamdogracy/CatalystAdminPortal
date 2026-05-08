# Catalyst Cleanup — Diagnostic Test System Migration

**Date:** 2026-05-08  
**Branch:** `diagnostic_mentor`

---

## Background

Two separate diagnostic-test systems existed in parallel. We are consolidating onto the **new self-serve system** (`satexamconfigs`) and removing the **old assignment-based system** entirely.

| | Old System | New System |
|---|---|---|
| **How created** | Ops builds "Explore Tests" via `OpsExploreTestsPage` → stored in `assignments` collection | Ops creates exam configs via `SatExamConfigsPage` → stored in `satexamconfigs` collection |
| **How taken** | Student hits `/assignments/guest` → gets ops assignments → `SATTestTaker` component | Student hits `/sat/test/configs` → gets exam configs → `AdaptiveTaker` component in `SATTests.jsx` |
| **Results stored in** | `assignmentresponses` | `sattestsessions` |
| **Guest vs paid access** | Hardcoded banner copy ("1 diagnostic + 2 practice") | New runtime gate: guest=1 diagnostic, paid=all |

---

## Phase 1 — Already Done (previous session)

- Deleted `AssignmentsPage.jsx` and `SatAssignTab.jsx` (mentor assignments tab)
- Removed `AssignmentsPage` route and sidebar entry from mentor portal
- Removed entire `src/components/student/` directory from admin app
- Removed `assignmentService`, `studentAssignmentService`, `satStudentService` from admin `api.js`
- Trimmed `satMentorService` to only 4 self-serve session-history methods
- Removed student routes from `App.jsx`

**DB identified as safe to drop:** `satassignments`, `assignmentresponses`

---

## Phase 2 — This Session

### catalyst_admin — Files to Delete

| File/Folder | Reason |
|---|---|
| `src/components/operations/explore-tests/OpsExploreTestsPage.jsx` | Entire page creates old-style `assignments` docs for guest students — replaced by `SatExamConfigsPage` |
| `src/components/mentor/assignments/CreateAssignmentPage.jsx` | Only used by `OpsExploreTestsPage` (and the now-deleted `AssignmentsPage`) |
| `src/components/mentor/assignments/AssignmentProgressPage.jsx` | Only used by `OpsExploreTestsPage` |
| `src/components/mentor/assignments/components/` (entire folder) | All sub-components (`RichTextEditor`, `BatchEnrollModal`, `BulkUploadModal`, `QuestionEditor`, `SectionBuilder`, `sectionMeta`) only used by `CreateAssignmentPage` |

### catalyst_admin — Code Changes

| File | Change |
|---|---|
| `src/services/api.js` | Remove `opsAssignmentService` (only consumer was `OpsExploreTestsPage`) |
| `src/App.jsx` | Remove `OpsExploreTestsPage` import + `/operations/explore-tests` route |
| `src/components/operations/OpsSidebar.jsx` | Remove `explore-tests` nav item + `explore` icon |
| `src/components/operations/OpsLayout.jsx` | Remove `'/operations/explore-tests': 'Explore Tests'` from `PAGE_TITLES` |

### catalyst_student — Files to Delete

| File | Reason |
|---|---|
| `src/pages/Assignments/SATTestTaker.jsx` | Old component: takes tests stored in `assignments` collection (sections/modules/questions structure). Dead — no more batch or ops assignments. |
| `src/pages/Assignments/AdaptiveSATTestTaker.jsx` | Old component: takes `satassignments`-based adaptive tests. Dead — `satassignments` collection being dropped. |

### catalyst_student — Code Changes

| File | Change |
|---|---|
| `src/services/api.js` | Remove `assignmentService` entirely (`getByBatch`, `getForGuest`, `getResponses`, `getResponse`, `start`, `submit`) — all assignment-response flow is dead |
| `src/pages/Assignments/Assignments.jsx` | Remove: `loadGuestAssignments`, batch part of `loadStudentAssignments`, `satAssignments` state + `satService.getMyAssignments` call, `AdaptiveSATCard` component, `PracticeAssignmentCard` component, `isGuest` branch, `SATTestTaker`/`AdaptiveSATTestTaker` renders, `takingSatTest` + `takingPracticeTest` state. **Result:** page becomes a simple batch-assignment list. Since batch assignments are also dead, this page may become empty — can be removed later if confirmed. |
| `src/components/auth/SignIn.jsx` | Update copy: remove "1 diagnostic test + 2 practice tests" hardcoded text. The access gate is now dynamic (see below). |
| `src/components/layout/Layout.jsx` | Update guest banner: remove hardcoded "1 diagnostic + 2 practice" copy — replace with dynamic access info. |
| `src/pages/SATTests/SATTests.jsx` | **Add paid/demo gate on diagnostic tests** (see New Logic section below) |

---

## New Logic — Paid vs Demo/Guest Access for Diagnostics

### Where: `SATTests.jsx` → `AdaptiveConfigList` component

### Rule

```
if (user is guest / demo)
  show only the FIRST diagnostic test from satexamconfigs
  (or whichever one ops marks as the "featured" one)
else (paid student)
  show ALL diagnostic tests
Mock tests → always show all regardless of account type
```

### How to detect demo/guest user

```js
const isGuest = student?.role === 'guest' || student?.accountType === 'guest';
```

### Filter to apply before rendering

```js
const filtered = configs.filter(c => {
  if (c.type === 'diagnostic' && isGuest) return false; // handled separately
  return c.type === filter || filter === 'all';
});

// Diagnostic tab for guest: show only 1
const diagnosticConfigs = isGuest
  ? configs.filter(c => c.type === 'diagnostic').slice(0, 1)
  : configs.filter(c => c.type === 'diagnostic');
```

### UX for guest on Diagnostic tab

- Show the 1 available diagnostic test normally
- Below it, add an upgrade prompt: "Unlock all diagnostic tests — speak to our team"

---

## DB Changes

### Drop entirely

| Collection | Reason |
|---|---|
| `satassignments` | Old mentor-to-student SAT assignment system. No code path writes or reads this anymore. |
| `assignmentresponses` | Tracked responses to old assignment-based tests. No code path touches this anymore. |
| `assignments` | All documents are either `ownedBy: 'ops'` (explore tests, dead) or batch-based (dead once `Assignments.jsx` is cleaned). Drop entire collection. |

### Keep (active in new flow)

| Collection | Used by |
|---|---|
| `satexamconfigs` | `SatExamConfigsPage` (admin creates), `SATTests.jsx` (student takes) |
| `sattestsessions` | All adaptive (diagnostic + mock) test sessions |
| `satpracticesessions` | All practice test sessions |
| `satfulllengthsessions` | Full-length test sessions |
| `satpracticetestoonfigs` | Practice test configs |
| `satfulllengthexamconfigs` | Full-length configs |
| `satquestionbanks` | 3.4K questions |
| `satstudentquestionhistories` | Adaptive routing — tracks questions seen per student |
| `satbulkimportlogs` | Ops bulk upload audit trail |
| `students`, `mentors`, `batches`, `sessions`, `slots`, `messages`, `operations` | Core platform |

---

## Summary

```
REMOVE (code)
├── catalyst_admin
│   ├── OpsExploreTestsPage.jsx  (+ explore-tests/ folder)
│   ├── CreateAssignmentPage.jsx
│   ├── AssignmentProgressPage.jsx
│   ├── assignments/components/ (entire folder)
│   ├── opsAssignmentService  (api.js)
│   ├── /operations/explore-tests  (App.jsx route)
│   └── explore-tests  (OpsSidebar nav item)
└── catalyst_student
    ├── SATTestTaker.jsx
    ├── AdaptiveSATTestTaker.jsx
    ├── assignmentService  (api.js)
    ├── Assignments.jsx  (heavy cleanup, may delete entirely)
    └── Hardcoded guest copy in SignIn + Layout

ADD (code)
└── catalyst_student
    └── SATTests.jsx — paid/demo gate on diagnostic tab

DROP (DB)
├── satassignments
├── assignmentresponses
└── assignments
```
