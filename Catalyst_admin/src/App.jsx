// ============================================================
// APP — Root router configuration
// Two completely isolated route trees: /mentor/* and /operations/*
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute   from './components/common/ProtectedRoute';
import PublicOnlyRoute  from './components/common/PublicOnlyRoute';
import NotFound         from './components/common/NotFound';

// ── Auth ────────────────────────────────────────────────────
import LoginPage from './components/auth/LoginPage';

// ── Mentor routes ───────────────────────────────────────────
import MentorLayout       from './components/mentor/MentorLayout';
import MentorDashboard    from './components/mentor/dashboard/MentorDashboard';
import StudentsPage       from './components/mentor/students/StudentsPage';
import StudentProfile     from './components/mentor/students/StudentProfile';
import TestResultPage     from './components/mentor/students/TestResultPage';
import SlotsPage          from './components/mentor/slots/SlotsPage';
import SessionsPage       from './components/mentor/sessions/SessionsPage';
import AnalyticsPage      from './components/mentor/analytics/AnalyticsPage';
import CommunicationPage  from './components/mentor/communication/CommunicationPage';
import NotificationsPage  from './components/mentor/notifications/NotificationsPage';
import ProfilePage        from './components/common/ProfilePage';
import SatAssignPage      from './components/mentor/sat/SatAssignPage';

// ── Operations routes ───────────────────────────────────────
import OpsLayout          from './components/operations/OpsLayout';
import OpsDashboard       from './components/operations/dashboard/OpsDashboard';
import MentorsListPage    from './components/operations/mentors/MentorsListPage';
import MentorDetailPage   from './components/operations/mentors/MentorDetailPage';
import AddMentorPage      from './components/operations/mentors/AddMentorPage';
import OpsStudentsPage    from './components/operations/students/OpsStudentsPage';
import AddStudentPage     from './components/operations/students/AddStudentPage';
import OpsStudentProfile  from './components/mentor/students/StudentProfile';
import BatchesPage            from './components/operations/batches/BatchesPage';
import BatchDetailPage        from './components/operations/batches/BatchDetailPage';
import OpsNotificationsPage    from './components/operations/notifications/OpsNotificationsPage';
import DiagnosticTestsPage    from './components/operations/sat/DiagnosticTestsPage';
import PracticeTestsPage      from './components/operations/sat/PracticeTestsPage';
import MockTestsPage          from './components/operations/sat/MockTestsPage';
import SatQuestionBankPage    from './components/operations/sat/SatQuestionBankPage';



export default function App() {
    return (
        <DataProvider>
            <AuthProvider>
                <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
                    <Routes>
                        {/* ── Public: Login — redirect to dashboard if already authenticated ── */}
                        <Route path="/" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />

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
                            <Route path="students/:studentId/result/:sessionId" element={<TestResultPage />} />
                            <Route path="slots"         element={<SlotsPage />} />
                            <Route path="sessions"      element={<SessionsPage />} />
                            <Route path="analytics"     element={<AnalyticsPage />} />
                            {/*<Route path="assignments"   element={<AssignmentsPage />} />*/}
                            <Route path="sat-tests"      element={<SatAssignPage />} />
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
                            <Route path="students/:id"  element={<OpsStudentProfile />} />
                            <Route path="students/:studentId/result/:sessionId" element={<TestResultPage />} />
                            <Route path="batches"       element={<BatchesPage />} />
                            <Route path="batches/:id"   element={<BatchDetailPage />} />
                            <Route path="sat-tests/diagnostic"     element={<DiagnosticTestsPage />} />
                            <Route path="sat-tests/practice"       element={<PracticeTestsPage />} />
                            <Route path="sat-tests/mock"           element={<MockTestsPage />} />
                            <Route path="sat/question-bank"        element={<SatQuestionBankPage />} />
                            <Route path="profile"                  element={<ProfilePage />} />
                            <Route path="notifications"            element={<OpsNotificationsPage />} />
                        </Route>

                        {/* ── 404 ── */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </DataProvider>
    );
}
