import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { studentService, batchService, satMentorService } from '../../../services/api';

// ── Palette (mirrored from student dashboard) ─────────────────
const P = {
  // banner
  bannerFrom:  '#4B35C8',
  bannerTo:    '#7B52E0',
  // card tints (Diagnostic = orange, Batches = green, Progress = purple)
  orange:      '#F97316',
  orangeBg:    '#FFF3E8',
  orangeMid:   '#FDDCB8',
  green:       '#16A34A',
  greenBg:     '#EDFBF0',
  greenMid:    '#BBF7D0',
  purple:      '#6D28D9',
  purpleBg:    '#F0EEFF',
  purpleMid:   '#DDD6FE',
  // neutrals
  text:        '#1C1C2E',
  textSoft:    '#6B7280',
  textLight:   '#9CA3AF',
  bg:          '#FFFFFF',
  bgPage:      '#F8F8FF',
  border:      '#E5E7EB',
  borderLight: '#F3F4F6',
};

function initials(name = '') {
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
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

// Circular progress ring (matches student dashboard style)
function RingProgress({ pct, color, size = 56, stroke = 5 }) {
  const r   = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}25`} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${(circ * pct) / 100} ${circ}`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-black" style={{ color }}>{pct}%</span>
      </div>
    </div>
  );
}

export default function MentorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [students, setStudents]       = useState([]);
  const [batches, setBatches]         = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!user?._id) return;
    Promise.all([
      studentService.getByMentor(user._id),
      batchService.getAll({ mentorId: user._id }),
    ])
      .then(([sRes, bRes]) => {
        const list = (sRes.data || []).map(({ student, batch }) => ({ ...student, batch }));
        setStudents(list);
        setBatches(bRes.data || []);
        setLoading(false);

        if (list.length === 0) return;
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
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?._id]);

  const getProgress = (id) => progressMap[id] ?? 0;

  const hour         = new Date().getHours();
  const greeting     = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const activeStudents = students.filter(s => s.isActive !== false).length;
  const activeBatches  = batches.filter(b => b.status === 'active').length;
  const avgProgress    = students.length
    ? Math.round(students.reduce((acc, s) => acc + getProgress(s._id), 0) / students.length)
    : 0;

  return (
    <div className="p-6 flex flex-col gap-5 fade-in" style={{ background: P.bgPage, minHeight: '100%' }}>

      {/* ── Welcome Banner ── */}
      <div className="relative rounded-2xl overflow-hidden px-7 py-6 flex items-center justify-between"
           style={{ background: `linear-gradient(135deg, ${P.bannerFrom} 0%, ${P.bannerTo} 60%, #9B72F0 100%)` }}>
        {/* decorative blobs */}
        <div className="absolute right-32 top-0 w-40 h-full opacity-20 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse at center, #fff 0%, transparent 70%)' }} />
        <div className="absolute right-8 -bottom-6 w-28 h-28 rounded-full opacity-10 pointer-events-none"
             style={{ background: '#fff' }} />

        <div className="relative z-10">
          <h2 className="text-xl font-extrabold text-white mb-1">
            {greeting}, {user?.name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-white/70 text-sm">
            {loading
              ? 'Loading your dashboard…'
              : `You have ${students.length} student${students.length !== 1 ? 's' : ''} across ${batches.length} batch${batches.length !== 1 ? 'es' : ''}.`}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          {/* overall progress pill */}
          <div className="px-4 py-1.5 rounded-full flex items-center gap-2"
               style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}>
            <span className="text-white/80 text-xs font-medium">Overall Progress</span>
            <span className="text-white text-sm font-extrabold">{loading ? '—' : `${avgProgress}%`}</span>
          </div>
          <button
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
            onClick={() => navigate('/mentor/communication')}
          >
            💬 Messages
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── (styled like student dashboard test-type cards) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
            <p className="text-[14px] font-extrabold" style={{ color: P.text }}>Mentor Overview</p>
          </div>
          <div className="px-3 py-1 rounded-full flex items-center gap-1.5 text-[12px] font-semibold"
               style={{ background: P.purpleBg, color: P.purple, border: `1px solid ${P.purpleMid}` }}>
            Avg Progress <span className="font-black">{loading ? '—' : `${avgProgress}%`}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">

          {/* Total Students — orange card */}
          <button
            onClick={() => navigate('/mentor/students')}
            className="relative rounded-2xl p-5 text-left overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ background: P.orangeBg, border: `1px solid ${P.orangeMid}` }}
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-40 pointer-events-none"
                 style={{ background: P.orangeMid }} />
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div>
                <p className="text-[12px] font-bold mb-0.5" style={{ color: P.orange }}>👥 Total Students</p>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center"
                   style={{ background: P.orangeMid }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={P.orange} strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <RingProgress pct={students.length > 0 ? Math.min(Math.round((activeStudents / students.length) * 100), 100) : 0} color={P.orange} />
              <div className="flex flex-col gap-1 text-[12px]">
                <div className="flex justify-between gap-6">
                  <span style={{ color: P.textSoft }}>Total</span>
                  <span className="font-extrabold" style={{ color: P.text }}>{loading ? '—' : students.length}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span style={{ color: P.textSoft }}>Active</span>
                  <span className="font-extrabold" style={{ color: P.orange }}>{activeStudents}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span style={{ color: P.textSoft }}>Inactive</span>
                  <span className="font-extrabold" style={{ color: P.textSoft }}>{students.length - activeStudents}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 h-1.5 rounded-full overflow-hidden relative z-10" style={{ background: P.orangeMid }}>
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${students.length > 0 ? Math.min((activeStudents / students.length) * 100, 100) : 0}%`, background: P.orange }} />
            </div>
          </button>

          {/* My Batches — green card */}
          <div className="relative rounded-2xl p-5 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
               style={{ background: P.greenBg, border: `1px solid ${P.greenMid}` }}>
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-40 pointer-events-none"
                 style={{ background: P.greenMid }} />
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div>
                <p className="text-[12px] font-bold mb-0.5" style={{ color: P.green }}>📚 My Batches</p>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center"
                   style={{ background: P.greenMid }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={P.green} strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <RingProgress pct={batches.length > 0 ? Math.min(Math.round((activeBatches / batches.length) * 100), 100) : 0} color={P.green} />
              <div className="flex flex-col gap-1 text-[12px]">
                <div className="flex justify-between gap-6">
                  <span style={{ color: P.textSoft }}>Total</span>
                  <span className="font-extrabold" style={{ color: P.text }}>{loading ? '—' : batches.length}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span style={{ color: P.textSoft }}>Active</span>
                  <span className="font-extrabold" style={{ color: P.green }}>{activeBatches}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span style={{ color: P.textSoft }}>Inactive</span>
                  <span className="font-extrabold" style={{ color: P.textSoft }}>{batches.length - activeBatches}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 h-1.5 rounded-full overflow-hidden relative z-10" style={{ background: P.greenMid }}>
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${batches.length > 0 ? Math.min((activeBatches / batches.length) * 100, 100) : 0}%`, background: P.green }} />
            </div>
          </div>

          {/* Avg Progress — purple card */}
          <div className="relative rounded-2xl p-5 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
               style={{ background: P.purpleBg, border: `1px solid ${P.purpleMid}` }}>
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-40 pointer-events-none"
                 style={{ background: P.purpleMid }} />
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div>
                <p className="text-[12px] font-bold mb-0.5" style={{ color: P.purple }}>📈 Avg Progress</p>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center"
                   style={{ background: P.purpleMid }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={P.purple} strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <RingProgress pct={avgProgress} color={P.purple} />
              <div className="flex flex-col gap-1 text-[12px]">
                <div className="flex justify-between gap-6">
                  <span style={{ color: P.textSoft }}>Average</span>
                  <span className="font-extrabold" style={{ color: P.text }}>{loading ? '—' : `${avgProgress}%`}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span style={{ color: P.textSoft }}>Students</span>
                  <span className="font-extrabold" style={{ color: P.purple }}>{students.length}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span style={{ color: P.textSoft }}>Score avg</span>
                  <span className="font-extrabold" style={{ color: P.textSoft }}>test-based</span>
                </div>
              </div>
            </div>
            <div className="mt-4 h-1.5 rounded-full overflow-hidden relative z-10" style={{ background: P.purpleMid }}>
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${avgProgress}%`, background: P.purple }} />
            </div>
          </div>

        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="grid grid-cols-[1.15fr_0.85fr] gap-4">

        {/* My Students */}
        <div className="rounded-2xl overflow-hidden"
             style={{ background: P.bg, border: `1px solid ${P.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>

          <div className="px-5 py-3.5 flex items-center justify-between"
               style={{ borderBottom: `1px solid ${P.border}` }}>
            <div className="flex items-center gap-2">
              <span className="text-base">⭐</span>
              <h3 className="text-[14px] font-extrabold" style={{ color: P.text }}>My Students</h3>
              {!loading && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                      style={{ background: P.purpleBg, color: P.purple, border: `1px solid ${P.purpleMid}` }}>
                  {students.length}
                </span>
              )}
            </div>
            <button
              className="text-[12px] font-semibold px-3 py-1 rounded-full transition-colors hover:opacity-80"
              style={{ background: P.purpleBg, color: P.purple, border: `1px solid ${P.purpleMid}` }}
              onClick={() => navigate('/mentor/students')}
            >
              View all →
            </button>
          </div>

          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                  <div className="w-9 h-9 rounded-full shrink-0" style={{ background: P.borderLight }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 rounded w-28" style={{ background: P.borderLight }} />
                    <div className="h-2 rounded w-20" style={{ background: P.borderLight }} />
                  </div>
                  <div className="w-16 h-1.5 rounded-full" style={{ background: P.borderLight }} />
                </div>
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm" style={{ color: P.textLight }}>
              No students assigned yet
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: P.borderLight }}>
              {students.slice(0, 6).map((s) => {
                const prog     = getProgress(s._id);
                const isActive = s.isActive !== false;
                const hue      = (s._id?.charCodeAt(0) || 0) * 25 % 360;
                return (
                  <button
                    key={s._id}
                    className="flex items-center gap-3 px-5 py-3 w-full text-left transition-colors"
                    onMouseEnter={e => e.currentTarget.style.background = P.bgPage}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => navigate(`/mentor/students/${s._id}`)}
                  >
                    <div className="w-9 h-9 rounded-full text-white font-bold text-[11px] flex items-center justify-center shrink-0"
                         style={{ background: `hsl(${hue},55%,52%)` }}>
                      {initials(s.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: P.text }}>{s.name}</p>
                      <p className="text-[11px] truncate capitalize" style={{ color: P.textSoft }}>
                        {s.batch?.subject || '—'} · {s.batch?.name || 'Unassigned'}
                      </p>
                    </div>
                    <div className="min-w-[90px]">
                      <div className="flex justify-end mb-1">
                        <span className="text-[12px] font-extrabold" style={{ color: P.purple }}>{prog}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: P.purpleMid }}>
                        <div className="h-full rounded-full transition-all duration-500"
                             style={{ width: `${prog}%`, background: P.purple }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-1 shrink-0"
                          style={isActive
                            ? { background: P.greenBg, color: P.green, border: `1px solid ${P.greenMid}` }
                            : { background: P.borderLight, color: P.textLight }}>
                      {isActive ? 'active' : 'inactive'}
                    </span>
                  </button>
                );
              })}
              {students.length > 6 && (
                <button
                  className="w-full py-3 text-[12px] font-semibold text-center transition-colors"
                  style={{ color: P.purple }}
                  onMouseEnter={e => e.currentTarget.style.background = P.purpleBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => navigate('/mentor/students')}
                >
                  +{students.length - 6} more students →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* My Batches */}
          <div className="rounded-2xl overflow-hidden flex-1"
               style={{ background: P.bg, border: `1px solid ${P.border}`, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>

            <div className="px-5 py-3.5 flex items-center justify-between"
                 style={{ borderBottom: `1px solid ${P.border}` }}>
              <div className="flex items-center gap-2">
                <span className="text-base">📋</span>
                <h3 className="text-[14px] font-extrabold" style={{ color: P.text }}>My Batches</h3>
              </div>
              {!loading && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                      style={{ background: P.greenBg, color: P.green, border: `1px solid ${P.greenMid}` }}>
                  {batches.length}
                </span>
              )}
            </div>

            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: P.borderLight }} />)}
              </div>
            ) : batches.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm" style={{ color: P.textLight }}>No batches yet</div>
            ) : (
              <div className="p-3 flex flex-col gap-2">
                {batches.map((b, idx) => {
                  const pct     = Math.round(((b.completedSessions || 0) / (b.totalSessions || 1)) * 100);
                  const isActive = b.status === 'active';
                  return (
                    <div key={b._id} className="rounded-xl px-4 py-3"
                         style={{ background: P.bgPage, border: `1px solid ${P.border}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-[13px] font-semibold truncate" style={{ color: P.text }}>{b.name}</p>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                style={isActive
                                  ? { background: P.greenBg, color: P.green }
                                  : { background: P.borderLight, color: P.textLight }}>
                            {b.status}
                          </span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-[13px] font-bold" style={{ color: P.text }}>{b.studentCount ?? 0}</p>
                          <p className="text-[10px]" style={{ color: P.textLight }}>students</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: P.purpleMid }}>
                          <div className="h-full rounded-full transition-all duration-500"
                               style={{ width: `${pct}%`, background: P.purple }} />
                        </div>
                        <span className="text-[11px] font-bold w-7 text-right" style={{ color: P.purple }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Access */}
          <div className="rounded-2xl p-4"
               style={{ background: `linear-gradient(135deg, ${P.bannerFrom}, ${P.bannerTo})` }}>
            <p className="text-[10px] font-bold uppercase tracking-[1.5px] mb-3 text-white/60">
              Quick Access
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Students', icon: '👥', path: '/mentor/students' },
                { label: 'Messages', icon: '💬', path: '/mentor/communication' },
                { label: 'Profile',  icon: '👤', path: '/mentor/profile' },
              ].map(q => (
                <button
                  key={q.path}
                  className="py-3.5 rounded-xl flex flex-col items-center gap-1.5 transition-all hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                  onClick={() => navigate(q.path)}
                >
                  <span className="text-xl">{q.icon}</span>
                  <span className="text-[11px] font-semibold text-white/80">{q.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
