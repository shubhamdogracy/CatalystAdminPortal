// ============================================================
// APP — Root router configuration
// Two completely isolated route trees: /mentor/* and /operations/*
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// ── Auth ────────────────────────────────────────────────────
import LoginPage from './components/auth/LoginPage';

// ── Mentor routes ───────────────────────────────────────────
import MentorLayout       from './components/mentor/MentorLayout';
import MentorDashboard    from './components/mentor/dashboard/MentorDashboard';
import StudentsPage       from './components/mentor/students/StudentsPage';
import StudentProfile     from './components/mentor/students/StudentProfile';
import SlotsPage          from './components/mentor/slots/SlotsPage';
import SessionsPage       from './components/mentor/sessions/SessionsPage';
import AnalyticsPage      from './components/mentor/analytics/AnalyticsPage';
import AssignmentsPage    from './components/mentor/assignments/AssignmentsPage';
import CommunicationPage  from './components/mentor/communication/CommunicationPage';
import NotificationsPage  from './components/mentor/notifications/NotificationsPage';
import ProfilePage        from './components/common/ProfilePage';

// ── Operations routes ───────────────────────────────────────
import OpsLayout          from './components/operations/OpsLayout';
import OpsDashboard       from './components/operations/dashboard/OpsDashboard';
import MentorsListPage    from './components/operations/mentors/MentorsListPage';
import MentorDetailPage   from './components/operations/mentors/MentorDetailPage';
import AddMentorPage      from './components/operations/mentors/AddMentorPage';
import OpsStudentsPage    from './components/operations/students/OpsStudentsPage';
import AddStudentPage     from './components/operations/students/AddStudentPage';
import BatchesPage            from './components/operations/batches/BatchesPage';
import BatchDetailPage        from './components/operations/batches/BatchDetailPage';
import OpsNotificationsPage    from './components/operations/notifications/OpsNotificationsPage';
import DiagnosticTestsPage    from './components/operations/sat/DiagnosticTestsPage';
import PracticeTestsPage      from './components/operations/sat/PracticeTestsPage';
import MockTestsPage          from './components/operations/sat/MockTestsPage';
import SatQuestionBankPage    from './components/operations/sat/SatQuestionBankPage';


// ── Student routes ──────────────────────────────────────────
import StudentLayout          from './components/student/StudentLayout';
import StudentDashboard       from './components/student/dashboard/StudentDashboard';
import StudentAssignmentsPage from './components/student/assignments/StudentAssignmentsPage';
import SatTestPage            from './components/student/sat/SatTestPage';

export default function App() {
  return (
    <DataProvider>
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          {/* ── Public: Login ── */}
          <Route path="/" element={<LoginPage />} />

          {/* ── Mentor routes (role guard) ── */}
          <Route
            path="/mentor"
            element={
              <ProtectedRoute requiredRole="mentor">
                <MentorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"     element={<MentorDashboard />} />
            <Route path="students"      element={<StudentsPage />} />
            <Route path="students/:id"  element={<StudentProfile />} />
            <Route path="slots"         element={<SlotsPage />} />
            <Route path="sessions"      element={<SessionsPage />} />
            <Route path="analytics"     element={<AnalyticsPage />} />
            <Route path="assignments"   element={<AssignmentsPage />} />
            <Route path="communication" element={<CommunicationPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile"       element={<ProfilePage />} />
          </Route>

          {/* ── Operations routes (role guard) ── */}
          <Route
            path="/operations"
            element={
              <ProtectedRoute requiredRole="operations">
                <OpsLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"     element={<OpsDashboard />} />
            <Route path="mentors"       element={<MentorsListPage />} />
            <Route path="mentors/add"   element={<AddMentorPage />} />
            <Route path="mentors/:id"   element={<MentorDetailPage />} />
            <Route path="students"      element={<OpsStudentsPage />} />
            <Route path="students/add"  element={<AddStudentPage />} />
            <Route path="batches"       element={<BatchesPage />} />
            <Route path="batches/:id"   element={<BatchDetailPage />} />
            <Route path="sat-tests/diagnostic"     element={<DiagnosticTestsPage />} />
            <Route path="sat-tests/practice"       element={<PracticeTestsPage />} />
            <Route path="sat-tests/mock"           element={<MockTestsPage />} />
            <Route path="sat/question-bank"        element={<SatQuestionBankPage />} />
            <Route path="profile"                  element={<ProfilePage />} />
            <Route path="notifications"            element={<OpsNotificationsPage />} />
          </Route>

          {/* ── Student routes (role guard) ── */}
          <Route
            path="/student"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"   element={<StudentDashboard />} />
            <Route path="assignments" element={<StudentAssignmentsPage />} />
            <Route path="profile"     element={<ProfilePage />} />
          </Route>

          {/* ── SAT test-taking (full screen, no sidebar) ── */}
          <Route
            path="/student/sat-test/:assignmentId"
            element={
              <ProtectedRoute requiredRole="student">
                <SatTestPage />
              </ProtectedRoute>
            }
          />

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </DataProvider>
  );
}
