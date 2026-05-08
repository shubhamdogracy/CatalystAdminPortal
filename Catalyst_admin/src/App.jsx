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
import SatQuestionBankPage    from './components/operations/sat/SatQuestionBankPage';
import SatExamConfigsPage     from './components/operations/sat/SatExamConfigsPage';


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
            <Route path="sat/question-bank"      element={<SatQuestionBankPage />} />
            <Route path="sat/exam-configs"        element={<SatExamConfigsPage />} />
            <Route path="profile"                element={<ProfilePage />} />
            <Route path="notifications"  element={<OpsNotificationsPage />} />
            <Route path="reports" element={
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-10">
                <p className="text-5xl">📊</p>
                <p className="text-lg font-bold text-gray-700">Reports coming soon</p>
                <p className="text-sm">Advanced reporting and export features are in development.</p>
              </div>
            } />
          </Route>

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </DataProvider>
  );
}
