import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mentorService, studentService, batchService } from '../../../services/api';

const backIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;

function initials(name = '') {
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

/* ── Main Component ────────────────────────────────────────── */
export default function MentorDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [mentor, setMentor]     = useState(null);
  const [students, setStudents] = useState([]);
  const [batches, setBatches]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const loadData = useCallback(() => {
    Promise.all([
      mentorService.getById(id),
      studentService.getByMentor(id),
      batchService.getAll({ mentorId: id }),
    ])
      .then(([mRes, sRes, bRes]) => {
        setMentor(mRes.data);
        setStudents((sRes.data || []).map(({ student, batch }) => ({ ...student, batch })));
        setBatches(bRes.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-3">
        <p className="text-5xl">👨‍🏫</p>
        <p className="text-lg font-bold text-gray-700">Mentor not found</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="text-ops-primary font-semibold text-sm" onClick={() => navigate('/operations/mentors')}>Go back</button>
      </div>
    );
  }

  const avgProgress = students.length
    ? Math.round(students.reduce((a, s) => a + (s.progress || 0), 0) / students.length)
    : 0;

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      <button className="flex items-center gap-1.5 text-ops-primary font-semibold text-sm" onClick={() => navigate('/operations/mentors')}>
        {backIcon} Back to Mentors
      </button>

      {/* Hero */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 flex items-center gap-5">
        <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-ops-primary to-purple-400 text-white font-extrabold text-[26px] flex items-center justify-center shrink-0">
          {initials(mentor.name)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-[22px] font-extrabold text-gray-900">{mentor.name}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${mentor.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
              {mentor.isActive ? 'active' : 'inactive'}
            </span>
          </div>
          <p className="text-gray-500 mt-1">{mentor.email}{mentor.phone ? ` · ${mentor.phone}` : ''}</p>
          <p className="text-gray-700 font-medium mt-1.5">{mentor.specialization || 'General'}</p>
          {mentor.experience ? <p className="text-xs text-gray-400 mt-1">{mentor.experience} years of experience</p> : null}
          {mentor.bio && <p className="text-xs text-gray-500 mt-1 italic">{mentor.bio}</p>}
        </div>
        <div className="text-right">
          <p className="text-[26px] font-extrabold text-ops-primary">{mentor.batchCount ?? batches.length}</p>
          <p className="text-xs text-gray-400">Batches</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Students',  value: students.length,                                    color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Batches',         value: batches.length,                                     color: '#0d9488', bg: '#f0fdfa' },
          { label: 'Active Students', value: students.filter(s => s.isActive !== false).length,  color: '#10b981', bg: '#d1fae5' },
          { label: 'Avg Progress',    value: students.length ? `${avgProgress}%` : '—',          color: '#f59e0b', bg: '#fef3c7' },
        ].map(st => (
          <div key={st.label} className="rounded-xl px-5 py-4 border border-black/[0.04] text-center" style={{ background: st.bg }}>
            <p className="text-[26px] font-extrabold" style={{ color: st.color }}>{st.value}</p>
            <p className="text-xs text-gray-500">{st.label}</p>
          </div>
        ))}
      </div>

      {/* Students */}
      <div className="bg-white rounded-[14px] border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-gray-900">Assigned Students ({students.length})</h3>
          <button
            className="px-3.5 py-1.5 rounded-lg bg-ops-primary/10 text-ops-primary text-xs font-semibold border border-ops-primary/20"
            onClick={() => navigate('/operations/batches')}
          >
            Manage via Batches →
          </button>
        </div>

        {students.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No students assigned to this mentor yet</div>
        ) : (
          <>
            <div className="flex px-5 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-[0.4px] gap-3">
              <span className="flex-[2]">Student</span>
              <span className="flex-[2]">Batch / Subject</span>
              <span className="flex-1">Progress</span>
              <span className="flex-1">Status</span>
            </div>
            {students.map(s => {
              const prog     = s.progress || 0;
              const pc       = prog >= 80 ? '#10b981' : prog >= 50 ? '#f59e0b' : '#ef4444';
              const isActive = s.isActive !== false;
              return (
                <div key={s._id} className="flex items-center px-5 py-3 border-b border-gray-100 gap-3">
                  <div className="flex-[2] flex items-center gap-2.5">
                    <div
                      className="w-[34px] h-[34px] rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0"
                      style={{ background: `hsl(${(s._id?.charCodeAt(0) || 0) * 25 % 360}, 60%, 50%)` }}
                    >
                      {initials(s.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.email}</p>
                    </div>
                  </div>
                  <div className="flex-[2]">
                    <p className="text-[13px] text-gray-700">{s.batch?.name || '—'}</p>
                    <p className="text-[11px] text-gray-400 capitalize">{s.batch?.subject || '—'}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold" style={{ color: pc }}>{prog}%</p>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div className="h-full rounded-full" style={{ width: `${prog}%`, background: pc }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: isActive ? '#d1fae5' : '#fee2e2', color: isActive ? '#065f46' : '#991b1b' }}
                    >
                      {isActive ? 'active' : 'inactive'}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Batches */}
      <div className="bg-white rounded-[14px] border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-[15px] font-bold text-gray-900">Batches ({batches.length})</h3>
        </div>
        {batches.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No batches assigned yet</div>
        ) : batches.map(b => {
          const pct = Math.round(((b.completedSessions || 0) / (b.totalSessions || 1)) * 100);
          return (
            <div
              key={b._id}
              className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => navigate(`/operations/batches/${b._id}`)}
            >
              <div className="flex-[2]">
                <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                <p className="text-xs text-gray-400 capitalize">{b.subject}</p>
              </div>
              <div className="flex-1 text-[13px] text-gray-600">{b.studentCount ?? 0} student</div>
              <div className="flex-[2] flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-ops-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-bold text-ops-primary w-9">{pct}%</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${b.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {b.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
