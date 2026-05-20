import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { studentService, satMentorService } from '../../../services/api';

const searchIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

function initials(name = '') {
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function ProgressBar({ value }) {
  const color = value >= 80 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold w-[30px] text-right" style={{ color }}>{value}%</span>
    </div>
  );
}

// Shared formula — must match StudentProfile exactly
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

export default function StudentsPage() {
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [students, setStudents]         = useState([]);
  const [progressMap, setProgressMap]   = useState({});
  const [loading, setLoading]           = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [sortBy, setSortBy]             = useState('name');

  useEffect(() => {
    if (!user?._id) return;
    studentService.getByMentor(user._id)
      .then(res => {
        const list = (res.data || []).map(({ student, batch }) => ({ ...student, batch }));
        setStudents(list);
        setLoading(false);

        if (list.length === 0) return;
        setProgressLoading(true);
        Promise.all(
          list.map(s =>
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
  }, [user?._id]);

  const getProgress = (id) => progressMap[id] ?? 0;

  const courses = [...new Set(students.map(s => s.batch?.subject).filter(Boolean))];

  const filtered = students
    .filter(s => {
      const isActive = s.isActive !== false;
      const status   = isActive ? 'active' : 'inactive';
      const course   = s.batch?.subject || '';
      return (
        (s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())) &&
        (filterStatus === 'all' || status === filterStatus) &&
        (filterCourse === 'all' || course === filterCourse)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name')     return a.name.localeCompare(b.name);
      if (sortBy === 'progress') return getProgress(b._id) - getProgress(a._id);
      if (sortBy === 'joined')   return new Date(b.enrollmentDate || 0) - new Date(a.enrollmentDate || 0);
      return 0;
    });

  const activeCount = students.filter(s => s.isActive !== false).length;
  const avgProgress = students.length
    ? Math.round(students.reduce((acc, s) => acc + getProgress(s._id), 0) / students.length)
    : 0;

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">My Students</h2>
          <p className="text-sm text-gray-500 mt-0.5">{students.length} students assigned to you</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total',        value: students.length,                color: '#0d9488', bg: '#f0fdfa' },
          { label: 'Active',       value: activeCount,                    color: '#10b981', bg: '#d1fae5' },
          { label: 'Inactive',     value: students.length - activeCount,  color: '#ef4444', bg: '#fee2e2' },
          { label: 'Avg Progress', value: progressLoading ? '…' : `${avgProgress}%`, color: '#7c3aed', bg: '#ede9fe' },
        ].map(c => (
          <div key={c.label} className="rounded-xl px-5 py-4 border border-black/5" style={{ background: c.bg }}>
            <p className="text-[22px] font-extrabold" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs text-gray-500 font-medium">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white px-4 py-3 rounded-xl border border-gray-200">
        <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
          <span className="text-gray-400 flex">{searchIcon}</span>
          <input
            className="border-none bg-transparent outline-none text-[13px] text-gray-700 w-full"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2.5 items-center">
          {[
            { value: filterStatus, onChange: setFilterStatus, options: [['all','All Status'],['active','Active'],['inactive','Inactive']] },
            { value: filterCourse, onChange: setFilterCourse, options: [['all','All Courses'], ...courses.map(c => [c, c])] },
            { value: sortBy,       onChange: setSortBy,       options: [['name','Sort: Name'],['progress','Sort: Progress'],['joined','Sort: Joined']] },
          ].map((sel, i) => (
            <select
              key={i}
              className="px-3 py-2 rounded-lg border-[1.5px] border-gray-200 text-[13px] text-gray-700 bg-white outline-none"
              value={sel.value}
              onChange={e => sel.onChange(e.target.value)}
            >
              {sel.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      <div className="bg-white rounded-[14px] border border-gray-200 overflow-hidden overflow-x-auto">
        <div className="min-w-[680px]">
        <div className="flex px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-[0.4px] gap-3">
          <span className="flex-[2]">Student</span>
          <span className="flex-[2]">Course / Batch</span>
          <span className="flex-[2]">Progress</span>
          <span className="flex-1">Enrolled</span>
          <span className="flex-1">Status</span>
          <span className="flex-1">Action</span>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            {students.length === 0 ? 'No students assigned to you yet' : 'No students match your filters'}
          </div>
        ) : (
          filtered.map(student => {
            const isActive = student.isActive !== false;
            const prog     = getProgress(student._id);
            return (
              <div key={student._id} className="flex items-center px-5 py-3.5 border-b border-gray-100 gap-3 hover:bg-gray-50 transition-colors">
                <div className="flex-[2] flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-full text-white font-bold text-[13px] flex items-center justify-center shrink-0"
                    style={{ background: `hsl(${(student._id?.charCodeAt(0) || 0) * 25 % 360}, 60%, 50%)` }}
                  >
                    {initials(student.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                    <p className="text-xs text-gray-400">{student.email}</p>
                  </div>
                </div>
                <div className="flex-[2]">
                  <p className="text-[13px] text-gray-700 font-medium capitalize">{student.batch?.subject || '—'}</p>
                  <p className="text-[11px] text-gray-400">{student.batch?.name || '—'}</p>
                </div>
                <div className="flex-[2]">
                  {progressLoading && progressMap[student._id] === undefined
                    ? <div className="h-1.5 bg-gray-100 rounded-full animate-pulse w-full" />
                    : <ProgressBar value={prog} />
                  }
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-gray-500">
                    {student.enrollmentDate
                      ? new Date(student.enrollmentDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                      : '—'}
                  </p>
                </div>
                <div className="flex-1">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{ background: isActive ? '#d1fae5' : '#fee2e2', color: isActive ? '#065f46' : '#991b1b' }}
                  >
                    {isActive ? 'active' : 'inactive'}
                  </span>
                </div>
                <div className="flex-1">
                  <button
                    className="px-3 py-1.5 rounded-lg bg-mentor-lighter text-mentor-primary text-xs font-semibold border border-mentor-light"
                    onClick={() => navigate(`/mentor/students/${student._id}`)}
                  >
                    View Profile
                  </button>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
}
