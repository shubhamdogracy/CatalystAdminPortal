import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService, mentorService, satMentorService } from '../../../services/api';

// Shared formula — identical to mentor portal
function computeTestProgress(adaptiveSessions, practiceSessions) {
  const avgPct = (sessions) => {
    const done = sessions.filter(s => s.status === 'complete' || s.status === 'completed');
    if (done.length === 0) return null;
    const sum = done.reduce((acc, s) => acc + (s.percentage ?? s.total_percentage ?? 0), 0);
    return Math.round(sum / done.length);
  };
  const diagnosticPct = avgPct(adaptiveSessions.filter(s => s.exam_config_id?.type === 'diagnostic'));
  const mockPct       = avgPct(adaptiveSessions.filter(s => s.exam_config_id?.type === 'mock' || (s.exam_config_id && !s.exam_config_id.type)));
  const practicePct   = avgPct(practiceSessions);
  const cats = [diagnosticPct, mockPct, practicePct].filter(v => v !== null);
  return cats.length > 0 ? Math.round(cats.reduce((a, b) => a + b, 0) / cats.length) : 0;
}

const inputClass = 'px-3 py-2 rounded-lg border-[1.5px] border-gray-200 text-[13px] outline-none bg-white text-gray-700';

function GrantAccessModal({ student, mentors, selectedMentorId, onMentorChange, selectedSubject, onSubjectChange, onConfirm, onClose, loading }) {
  const selectedMentor = mentors.find(m => m._id === selectedMentorId);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Grant Full Access</h3>
          <p className="text-[13px] text-gray-500 mt-1">
            This will convert <strong>{student.name}</strong> from a guest user to an active student.
          </p>
        </div>
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
          <p className="text-[12px] text-amber-700 font-medium">
            The student will gain access to all platform features: sessions, slots, communication, and practice content.
            Make sure payment has been confirmed before granting access.
          </p>
        </div>
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold text-gray-700">
              Assign Mentor <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              className={`${inputClass} w-full`}
              value={selectedMentorId}
              onChange={e => { onMentorChange(e.target.value); if (!e.target.value) onSubjectChange(''); }}
            >
              <option value="">Select a mentor...</option>
              {mentors.map(m => (
                <option key={m._id} value={m._id}>{m.name}{m.specialization ? ` — ${m.specialization}` : ''}</option>
              ))}
            </select>
          </div>

          {selectedMentorId && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-gray-700">
                Subject <span className="text-red-400">*</span>
              </label>
              <select
                className={`${inputClass} w-full`}
                value={selectedSubject}
                onChange={e => onSubjectChange(e.target.value)}
              >
                <option value="">Select subject...</option>
                <option value="maths">Maths</option>
                <option value="english">English</option>
              </select>
            </div>
          )}

          {selectedMentor && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-ops-primary to-purple-400 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                {selectedMentor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <span className="text-[12px] text-gray-600">{selectedMentor.name} will be assigned to this student</span>
            </div>
          )}
        </div>
        <div className="flex gap-2.5 px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || (!!selectedMentorId && !selectedSubject)}
            className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Granting…' : 'Grant Access'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OpsStudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents]         = useState([]);
  const [mentors, setMentors]           = useState([]);
  const [progressMap, setProgressMap]   = useState({});
  const [loading, setLoading]           = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);
  const [error, setError]               = useState('');
  const [grantTarget, setGrantTarget]   = useState(null);
  const [grantMentorId, setGrantMentorId] = useState('');
  const [grantSubject, setGrantSubject] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);

  const [search, setSearch]             = useState('');
  const [filterMentor, setFilterMentor] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterType, setFilterType]     = useState('all');

  const loadStudents = () => {
    setLoading(true);
    Promise.all([studentService.getAll(), mentorService.getAll()])
      .then(([sRes, mRes]) => {
        const list = sRes.data || [];
        setStudents(list);
        setMentors(mRes.data || []);
        setLoading(false);

        // Load test-based progress for all non-guest students in parallel
        const scorable = list.filter(s => s.accountType !== 'guest');
        if (scorable.length === 0) return;
        setProgressLoading(true);
        Promise.all(
          scorable.map(s =>
            Promise.all([
              satMentorService.getStudentSessions(s._id).catch(() => ({ data: [] })),
              satMentorService.getStudentPracticeSessions(s._id).catch(() => ({ data: [] })),
            ]).then(([aRes, pRes]) => ({
              id: s._id,
              prog: computeTestProgress(aRes.data || [], pRes.data || []),
            }))
          )
        ).then(results => {
          const map = {};
          results.forEach(({ id, prog }) => { map[id] = prog; });
          setProgressMap(map);
        }).finally(() => setProgressLoading(false));
      })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { loadStudents(); }, []);

  const courses = [...new Set(students.flatMap((s) => (s.batches || []).map(b => b?.subject)).filter(Boolean))];

  const guestCount   = students.filter(s => s.accountType === 'guest').length;
  const activeCount  = students.filter(s => s.accountType !== 'guest' && s.isActive).length;
  const inactiveCount = students.filter(s => s.accountType !== 'guest' && !s.isActive).length;

  const filtered = students.filter((s) => {
    const mentorIds      = (s.batches || []).map(b => b?.mentorId?._id?.toString()).filter(Boolean);
    const batchSubjects  = (s.batches || []).map(b => b?.subject).filter(Boolean);
    const isGuest        = s.accountType === 'guest';
    const statusLabel    = isGuest ? 'guest' : s.isActive ? 'active' : 'inactive';

    const matchSearch  = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchMentor  = filterMentor === 'all' || mentorIds.includes(filterMentor);
    const matchStatus  = filterStatus === 'all' || (!isGuest && statusLabel === filterStatus);
    const matchCourse  = filterCourse === 'all' || batchSubjects.includes(filterCourse);
    const matchType    = filterType === 'all'
      || (filterType === 'guest' && isGuest)
      || (filterType === 'student' && !isGuest);

    return matchSearch && matchMentor && matchStatus && matchCourse && matchType;
  });

  const getProgress = (id) => progressMap[id] ?? 0;

  const handleGrantAccess = async () => {
    if (!grantTarget) return;
    setGrantLoading(true);
    try {
      await studentService.grantAccess(grantTarget._id, grantMentorId || null, grantSubject || null);
      setGrantTarget(null);
      setGrantMentorId('');
      setGrantSubject('');
      setLoading(true);
      loadStudents();
    } catch (e) {
      setError(e.message);
    } finally {
      setGrantLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      {grantTarget && (
        <GrantAccessModal
          student={grantTarget}
          mentors={mentors}
          selectedMentorId={grantMentorId}
          onMentorChange={setGrantMentorId}
          selectedSubject={grantSubject}
          onSubjectChange={setGrantSubject}
          onConfirm={handleGrantAccess}
          onClose={() => { setGrantTarget(null); setGrantMentorId(''); setGrantSubject(''); }}
          loading={grantLoading}
        />
      )}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">All Students</h2>
          <p className="text-sm text-gray-500 mt-0.5">{students.length} total students across the platform</p>
        </div>
        <button
          className="px-5 py-2.5 rounded-[10px] bg-ops-primary text-white font-semibold text-sm shadow-[0_4px_12px_rgba(124,58,237,0.3)]"
          onClick={() => navigate('/operations/students/add')}
        >
          + Add Student
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total',        value: students.length,  color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Active',       value: activeCount,       color: '#10b981', bg: '#d1fae5' },
          { label: 'Inactive',     value: inactiveCount,     color: '#ef4444', bg: '#fee2e2' },
          { label: 'Guest / Trial',value: guestCount,        color: '#f59e0b', bg: '#fef3c7' },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl px-5 py-4 border border-black/[0.04] cursor-pointer transition-all hover:scale-[1.02]"
            style={{ background: c.bg }}
            onClick={() => setFilterType(c.label === 'Guest / Trial' ? 'guest' : c.label === 'Active' ? 'student' : 'all')}
          >
            <p className="text-[22px] font-extrabold" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2">
        {[
          { value: 'all',     label: 'All' },
          { value: 'student', label: 'Active Students' },
          { value: 'guest',   label: `Guest Users (${guestCount})` },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setFilterType(t.value)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors border ${
              filterType === t.value
                ? t.value === 'guest'
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-violet-100 text-violet-700 border-violet-300'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2.5 bg-white px-4 py-3 rounded-xl border border-gray-200">
        <input
          className={`${inputClass} flex-1`}
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={inputClass} value={filterMentor} onChange={(e) => setFilterMentor(e.target.value)}>
          <option value="all">All Mentors</option>
          {mentors.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
        <select className={inputClass} value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
          <option value="all">All Courses</option>
          {courses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={inputClass} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          disabled={filterType === 'guest'}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-gray-200 overflow-hidden overflow-x-auto">
        <div className="min-w-[780px]">
        <div className="flex px-5 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-[0.4px] gap-3">
          <span className="flex-[2]">Student</span>
          <span className="flex-[2]">Course / Batch</span>
          <span className="flex-[2]">Mentor</span>
          <span className="flex-1">Progress</span>
          <span className="flex-1">Status</span>
          <span className="w-[160px]">Actions</span>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No students match your filters</div>
        ) : filtered.map((s) => {
          const initials       = s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          const batches        = s.batches || [];
          const uniqueSubjects = [...new Set(batches.map(b => b?.subject).filter(Boolean))];
          const courseLabel    = uniqueSubjects.length === 0 ? '—' : uniqueSubjects.length === 1 ? uniqueSubjects[0] : `${uniqueSubjects.length} subjects`;
          const batchLabel     = batches.length === 0 ? '—' : batches.length === 1 ? (batches[0]?.name || '—') : `${batches.length} batches`;
          const mentorList     = [...new Map(batches.map(b => b?.mentorId).filter(Boolean).map(m => [m._id?.toString(), m])).values()];
          const isGuest        = s.accountType === 'guest';
          const isActive       = s.isActive !== false;
          const progress = getProgress(s._id);
          const pc       = progress >= 80 ? '#10b981' : progress >= 50 ? '#f59e0b' : '#ef4444';

          return (
            <div key={s._id} className={`flex items-center px-5 py-3 border-b border-gray-100 gap-3 ${isGuest ? 'bg-amber-50/40' : ''}`}>
              <div className="flex-[2] flex items-center gap-2.5">
                <div
                  className="w-[34px] h-[34px] rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0"
                  style={{ background: `hsl(${(s._id?.charCodeAt(0) || 0) * 25 % 360}, 60%, 50%)` }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                    {isGuest && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                        Guest
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{s.email}</p>
                  {isGuest && s.grade && (
                    <p className="text-[11px] text-amber-600">{s.grade} · {s.targetYear || 'Target TBD'}</p>
                  )}
                </div>
              </div>
              <div className="flex-[2]">
                <p className="text-[13px] text-gray-700">{courseLabel}</p>
                <p className="text-[11px] text-gray-400">{batchLabel}</p>
              </div>
              <div className="flex-[2] flex items-center gap-2">
                {mentorList.length > 0 ? (
                  <>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ops-primary to-purple-400 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                      {mentorList[0].name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <span className="text-[13px] text-gray-700 truncate">
                      {mentorList.length === 1 ? mentorList[0].name : `${mentorList[0].name} +${mentorList.length - 1}`}
                    </span>
                  </>
                ) : (
                  <span className="text-[13px] text-gray-400">Not assigned</span>
                )}
              </div>
              <div className="flex-1">
                {isGuest ? (
                  <p className="text-[12px] text-amber-600 font-medium">Trial</p>
                ) : (
                  <>
                    {progressLoading && progressMap[s._id] === undefined ? (
                      <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                    ) : (
                      <>
                        <p className="text-[13px] font-bold" style={{ color: pc }}>{progress}%</p>
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
                          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: pc }} />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="flex-1">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  style={
                    isGuest
                      ? { background: '#fef3c7', color: '#92400e' }
                      : isActive
                      ? { background: '#d1fae5', color: '#065f46' }
                      : { background: '#fee2e2', color: '#991b1b' }
                  }
                >
                  {isGuest ? 'guest' : isActive ? 'active' : 'inactive'}
                </span>
              </div>
              <div className="w-[160px] flex items-center gap-1.5">
                {isGuest ? (
                  <>
                    <button
                      onClick={() => navigate(`/operations/students/${s._id}`)}
                      className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-colors whitespace-nowrap"
                    >
                      View Reports
                    </button>
                    <button
                      onClick={() => setGrantTarget(s)}
                      className="px-2.5 py-1.5 rounded-lg text-[12px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors whitespace-nowrap"
                    >
                      Grant Access
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => navigate(`/operations/students/${s._id}`)}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-colors"
                  >
                    View
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
