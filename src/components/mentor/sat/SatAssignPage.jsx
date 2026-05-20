import { useState, useEffect } from 'react';
import { satMentorService, studentService } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const SUBJ_LABEL = { math: 'Math', reading_writing: 'Reading & Writing' };

const STATUS_CFG = {
  pending:     { label: 'Pending',     bg: '#fef3c7', color: '#d97706' },
  in_progress: { label: 'In Progress', bg: '#dbeafe', color: '#1d4ed8' },
  completed:   { label: 'Completed',   bg: '#d1fae5', color: '#065f46' },
};

const TEST_ICON = { practice: '📚', diagnostic: '🔍', mock: '📋', full_length: '📝' };
const TEST_COLOR = { practice: '#0d9488', diagnostic: '#f97316', mock: '#4f46e5', full_length: '#7c3aed' };

// ── Sub-tab test grid ─────────────────────────────────────────
function TestGrid({ tests, testType, subType, onAssign }) {
  if (!tests.length) {
    return (
      <div className="py-16 text-center bg-white rounded-2xl border border-gray-200 text-gray-400">
        <p className="text-3xl mb-3">📭</p>
        <p className="text-sm">No tests configured yet</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {tests.map(test => {
        const effectiveType = subType || test.type || testType;
        const icon  = TEST_ICON[effectiveType] || TEST_ICON[testType] || '📋';
        const color = TEST_COLOR[effectiveType] || TEST_COLOR[testType] || '#6b7280';
        return (
          <div key={test._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
            <div className="px-4 pt-4 pb-3 flex-1">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0"
                     style={{ background: `${color}18` }}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-gray-900 leading-snug">{test.name}</p>
                  {test.subject && <p className="text-[11px] text-gray-500 mt-0.5">{SUBJ_LABEL[test.subject] || test.subject}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {test.type && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: `${color}15`, color }}>
                    {test.type}
                  </span>
                )}
                {test.topic    && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">{test.topic}</span>}
                {test.sub_topic && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{test.sub_topic}</span>}
                {test.total_questions && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{test.total_questions}Q</span>
                )}
                {test.time_limit_minutes && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{test.time_limit_minutes}m</span>
                )}
                {test.module_1?.total_questions && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{test.module_1.total_questions}Q / module</span>
                )}
              </div>
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => onAssign({ testType, testId: test._id, testName: test.name })}
                className="w-full py-2 rounded-xl text-[12px] font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: color }}>
                Assign to Student
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function SatAssignPage() {
  const { user } = useAuth();

  const [activeTab,  setActiveTab]  = useState('available');
  const [subTab,     setSubTab]     = useState('practice');
  const [available,  setAvailable]  = useState({ subject_tests: [], full_length_tests: [], practice_tests: [] });
  const [assignments, setAssignments] = useState([]);
  const [students,   setStudents]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Assign modal state
  const [assignModal,   setAssignModal]   = useState(null);
  const [assignStudent, setAssignStudent] = useState('');
  const [assignDue,     setAssignDue]     = useState('');
  const [assigning,     setAssigning]     = useState(false);
  const [assignError,   setAssignError]   = useState('');

  useEffect(() => {
    const mentorId = user?._id || user?.id;
    Promise.all([
      satMentorService.getAvailableTests().catch(() => ({ data: {} })),
      satMentorService.getAssignments().catch(() => ({ data: [] })),
      mentorId
        ? studentService.getByMentor(mentorId).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
    ]).then(([testsRes, assignRes, studentsRes]) => {
      setAvailable(testsRes.data || { subject_tests: [], full_length_tests: [], practice_tests: [] });
      setAssignments(assignRes.data || []);
      setStudents(studentsRes.data || []);
      setLoading(false);
    });
  }, [user]);

  const refreshAssignments = () => {
    const params = statusFilter ? { status: statusFilter } : {};
    satMentorService.getAssignments(params)
      .then(res => setAssignments(res.data || []))
      .catch(() => {});
  };

  const handleAssign = async () => {
    if (!assignStudent || !assignModal) return;
    setAssigning(true);
    setAssignError('');
    try {
      const payload = { student_id: assignStudent, test_type: assignModal.testType };
      if (assignDue) payload.due_date = assignDue;
      if (assignModal.testType === 'subject')      payload.exam_config_id             = assignModal.testId;
      if (assignModal.testType === 'full_length')  payload.full_length_exam_config_id = assignModal.testId;
      if (assignModal.testType === 'practice')     payload.practice_config_id         = assignModal.testId;
      await satMentorService.assignTest(payload);
      setAssignModal(null);
      setAssignStudent('');
      setAssignDue('');
      refreshAssignments();
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const closeModal = () => { setAssignModal(null); setAssignError(''); setAssignStudent(''); setAssignDue(''); };

  const diagnosticTests  = available.subject_tests?.filter(t => t.type === 'diagnostic') || [];
  const mockTests        = available.subject_tests?.filter(t => t.type === 'mock')        || [];
  const practiceTests    = available.practice_tests    || [];
  const fullLengthTests  = available.full_length_tests || [];

  const filteredAssignments = statusFilter
    ? assignments.filter(a => a.status === statusFilter)
    : assignments;

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5 fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">SAT Tests</h2>
        <p className="text-sm text-gray-500 mt-0.5">Assign practice, diagnostic, and mock tests to your students</p>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'available',   label: 'Available Tests' },
          { key: 'assignments', label: `My Assignments${assignments.length ? ` (${assignments.length})` : ''}` },
        ].map(t => (
          <button key={t.key}
            className={`px-5 py-2 rounded-[10px] text-[13px] transition-all ${activeTab === t.key ? 'bg-white text-mentor-primary font-bold shadow-sm' : 'text-gray-500 font-medium'}`}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Available Tests ── */}
      {activeTab === 'available' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'practice',    label: `Practice`,    count: practiceTests.length },
              { key: 'diagnostic',  label: `Diagnostic`,  count: diagnosticTests.length },
              { key: 'mock',        label: `Mock`,        count: mockTests.length },
              { key: 'full_length', label: `Full Length`, count: fullLengthTests.length },
            ].map(t => (
              <button key={t.key}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all border ${subTab === t.key ? 'bg-mentor-primary text-white border-mentor-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-mentor-primary'}`}
                onClick={() => setSubTab(t.key)}>
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${subTab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {subTab === 'practice' && (
            <TestGrid tests={practiceTests} testType="practice" onAssign={setAssignModal} />
          )}
          {subTab === 'diagnostic' && (
            <TestGrid tests={diagnosticTests} testType="subject" subType="diagnostic" onAssign={setAssignModal} />
          )}
          {subTab === 'mock' && (
            <TestGrid tests={mockTests} testType="subject" subType="mock" onAssign={setAssignModal} />
          )}
          {subTab === 'full_length' && (
            <TestGrid tests={fullLengthTests} testType="full_length" onAssign={setAssignModal} />
          )}
        </div>
      )}

      {/* ── My Assignments ── */}
      {activeTab === 'assignments' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-600">Filter by status:</span>
            {[
              { key: '',           label: 'All' },
              { key: 'pending',    label: 'Pending' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'completed',  label: 'Completed' },
            ].map(f => (
              <button key={f.key}
                className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all border ${statusFilter === f.key ? 'bg-mentor-primary text-white border-mentor-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-mentor-primary'}`}
                onClick={() => setStatusFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {filteredAssignments.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <p className="text-3xl mb-3">📋</p>
                <p className="text-sm">No assignments found</p>
                <p className="text-xs mt-1">Assign a test from the "Available Tests" tab</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredAssignments.map(a => {
                  const name    = a.exam_config_id?.name || a.full_length_exam_config_id?.name || a.practice_config_id?.name || 'Test';
                  const subject = a.exam_config_id?.subject || a.practice_config_id?.subject;
                  const type    = a.exam_config_id?.type || a.test_type;
                  const icon    = a.test_type === 'practice' ? '📚' : a.test_type === 'full_length' ? '📝' : a.exam_config_id?.type === 'diagnostic' ? '🔍' : '📋';
                  const sc      = STATUS_CFG[a.status] || STATUS_CFG.pending;
                  const rawDate = a.createdAt;
                  const dateStr = rawDate ? new Date(rawDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                  return (
                    <div key={a._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-mentor-lighter text-base">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-800 truncate">{name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {[
                            a.student_id?.name,
                            subject ? (SUBJ_LABEL[subject] || subject) : null,
                            type && type !== a.test_type ? (type.charAt(0).toUpperCase() + type.slice(1)) : null,
                            dateStr,
                            a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : null,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0"
                            style={{ background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Assign Modal ── */}
      {assignModal && (
        <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
               style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
                 style={{ background: 'linear-gradient(135deg,#0f766e,#0d9488)' }}>
              <div>
                <h3 className="text-sm font-extrabold text-white">Assign Test</h3>
                <p className="text-xs text-teal-200 mt-0.5 truncate max-w-[280px]">{assignModal.testName}</p>
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-xl bg-white/15 text-white hover:bg-white/30 flex items-center justify-center font-bold transition-colors">
                ✕
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Select Student *</label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-gray-200 text-sm outline-none focus:border-mentor-primary transition-colors bg-white"
                  value={assignStudent}
                  onChange={e => setAssignStudent(e.target.value)}>
                  <option value="">— Choose a student —</option>
                  {students.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
                {students.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No students assigned to you yet</p>
                )}
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Due Date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="date"
                  className="w-full px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-gray-200 text-sm outline-none focus:border-mentor-primary transition-colors"
                  value={assignDue}
                  onChange={e => setAssignDue(e.target.value)} />
              </div>
              {assignError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{assignError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={closeModal}
                  className="flex-1 py-2.5 rounded-[10px] border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleAssign} disabled={!assignStudent || assigning}
                  className="flex-1 py-2.5 rounded-[10px] bg-mentor-primary text-white text-[13px] font-bold disabled:opacity-50 transition-opacity">
                  {assigning ? 'Assigning…' : 'Assign Test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
