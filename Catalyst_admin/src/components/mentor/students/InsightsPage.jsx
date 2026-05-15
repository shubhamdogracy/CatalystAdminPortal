import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { satMentorService, studentService } from '../../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const SERIES_RE = / — (Math|Reading & Writing)$/;

// ── Score scaling (same simplified approach as StudentProfile) ─────────────────
function scaleSectionEstimate(score, maxScore, tier = 'easy') {
  if (!maxScore) return null;
  const ratio = score / maxScore;
  const raw = tier === 'hard' ? 350 + ratio * 450 : 200 + ratio * 440;
  return Math.round(Math.min(800, Math.max(200, raw)) / 10) * 10;
}

function sessionSectionScore(s) {
  if (!s) return null;
  const score    = (s.module_1?.score    || 0) + (s.module_2?.score    || 0);
  const maxScore = (s.module_1?.max_score || 0) + (s.module_2?.max_score || 0);
  if (maxScore > 0) return scaleSectionEstimate(score, maxScore, s.module_2?.tier || 'easy');
  const pct = s.total_percentage ?? s.percentage ?? null;
  if (pct !== null) return Math.round(Math.min(800, Math.max(200, 200 + (pct / 100) * 600)) / 10) * 10;
  return null;
}

function buildChartData(sessions) {
  const seriesMap = {};
  const singles   = [];

  sessions
    .filter(s => s.status === 'complete' || s.status === 'completed')
    .filter(s => s.session_type !== 'full_length')
    .forEach(s => {
      const name  = s.exam_config_id?.name || '';
      const match = name.match(SERIES_RE);
      if (match) {
        const key  = name.replace(SERIES_RE, '').trim();
        const subj = s.exam_config_id?.subject || s.subject;
        const at   = +new Date(s.createdAt || 0);
        if (!seriesMap[key]) seriesMap[key] = { math: null, rw: null, at: 0, key };
        if (subj === 'math') {
          if (!seriesMap[key].math || at > +new Date(seriesMap[key].math.createdAt || 0)) seriesMap[key].math = s;
        } else {
          if (!seriesMap[key].rw   || at > +new Date(seriesMap[key].rw.createdAt   || 0)) seriesMap[key].rw   = s;
        }
        seriesMap[key].at = Math.max(seriesMap[key].at, at);
      } else {
        singles.push(s);
      }
    });

  const rows = [
    ...Object.values(seriesMap).map(({ key, math, rw, at }) => {
      const mathSc = sessionSectionScore(math);
      const rwSc   = sessionSectionScore(rw);
      const total  = mathSc !== null && rwSc !== null
        ? Math.min(1600, Math.max(400, mathSc + rwSc))
        : (mathSc ?? rwSc);
      return {
        name: key,
        total,
        math: mathSc,
        rw: rwSc,
        at,
        isPair: !!(mathSc && rwSc),
        mathDate: math ? new Date(math.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
        rwDate:   rw   ? new Date(rw.createdAt).toLocaleDateString('en-IN',   { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
        date:     new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
    }),
    ...singles
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
      .map(s => {
        const subj = s.exam_config_id?.subject || s.subject;
        const sc   = sessionSectionScore(s);
        const at   = +new Date(s.createdAt || 0);
        return {
          name: s.exam_config_id?.name || 'Test',
          total: sc,
          math: subj === 'math' ? sc : null,
          rw: subj !== 'math' ? sc : null,
          at,
          isPair: false,
          date: new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        };
      }),
  ].sort((a, b) => a.at - b.at);

  return rows.map((r, i) => ({ ...r, label: `T${i + 1}` }));
}

const satBand = score => {
  if (score >= 1400) return { label: 'Exceptional', color: '#059669' };
  if (score >= 1200) return { label: 'Strong',      color: '#2563eb' };
  if (score >= 1000) return { label: 'Competitive', color: '#7c3aed' };
  if (score >= 800)  return { label: 'Developing',  color: '#d97706' };
  return                   { label: 'Foundational', color: '#ef4444' };
};

const secBand = score => {
  if (score >= 700) return { label: 'Exceptional', color: '#059669' };
  if (score >= 600) return { label: 'Strong',      color: '#2563eb' };
  if (score >= 500) return { label: 'Competitive', color: '#7c3aed' };
  if (score >= 400) return { label: 'Developing',  color: '#d97706' };
  return                   { label: 'Foundational', color: '#ef4444' };
};

function ScoreChip({ score, isPair }) {
  const band = isPair ? satBand(score) : secBand(score);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: band.color + '18', color: band.color }}>
      {band.label}
    </span>
  );
}

function CustomTooltip({ active, payload, hasPair }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-2xl px-4 py-3 shadow-xl text-[12px]"
         style={{ background: 'white', border: '1px solid #e2e8f0', minWidth: 160 }}>
      <p className="font-extrabold text-slate-800 mb-2 text-[13px]">{d.name}</p>
      <p className="text-[11px] text-slate-400 mb-2">{d.date}</p>
      {d.total !== null && d.total !== undefined && (
        <p className="font-bold text-slate-700">
          {hasPair ? 'Total' : 'Score'}: <span className="text-indigo-600 text-[15px] font-black">{d.total}</span>
        </p>
      )}
      {hasPair && d.math !== null && d.math !== undefined && (
        <p className="mt-1 text-purple-600 font-semibold">Math: {d.math}</p>
      )}
      {hasPair && d.rw !== null && d.rw !== undefined && (
        <p className="mt-0.5 text-sky-600 font-semibold">R&W: {d.rw}</p>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const { studentId, testType } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [sessions, setSessions] = useState([]);
  const [student,  setStudent]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const isOps     = location.pathname.startsWith('/operations');
  const basePath  = isOps ? '/operations' : '/mentor';
  const isDiag    = testType === 'diagnostic';
  const accentColor = isDiag ? '#0891b2' : '#7c3aed';
  const label     = isDiag ? 'Diagnostic Tests' : 'Mock Tests';

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    Promise.all([
      satMentorService.getStudentSessions(studentId).catch(() => ({ data: [] })),
      studentService.getById(studentId).catch(() => ({ data: null })),
    ]).then(([sessRes, stuRes]) => {
      const all = Array.isArray(sessRes?.data) ? sessRes.data : [];
      setSessions(all.filter(s => s.exam_config_id?.type === testType));
      setStudent(stuRes?.data || null);
    }).catch(err => setError(err?.message || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [studentId, testType]);

  const data    = useMemo(() => buildChartData(sessions), [sessions]);
  const hasPair = data.some(d => d.isPair);
  const hasData = data.length > 0;

  const first  = hasData ? data[0].total                : null;
  const latest = hasData ? data[data.length - 1].total  : null;
  const best   = hasData ? Math.max(...data.map(d => d.total ?? 0)) : null;
  const delta  = first !== null && latest !== null && data.length > 1 ? latest - first : null;

  const yDomain    = hasPair ? [300, 1650] : [150, 850];
  const yTicks     = hasPair ? [400, 600, 800, 1000, 1200, 1400, 1600] : [200, 300, 400, 500, 600, 700, 800];
  const yTarget    = hasPair ? 1200 : 650;

  const handleBack = () => {
    navigate(`${basePath}/students/${studentId}`, { state: { tab: 'Progress' } });
  };

  const studentName = student
    ? [student.first_name, student.last_name].filter(Boolean).join(' ') || student.name || 'Student'
    : 'Student';

  return (
    <div className="min-h-full flex flex-col bg-[#f8f9fb]">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Student Profile
        </button>
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-800">{studentName}</span>
          <span>·</span>
          <span>{label}</span>
          <span>·</span>
          <span className="font-semibold" style={{ color: accentColor }}>Score Insights</span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col gap-6">

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-gray-100 min-h-[400px]">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
            <p className="text-sm font-bold text-gray-500">Loading insights…</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-gray-100 min-h-[400px]">
            <span className="text-4xl">⚠️</span>
            <p className="text-sm font-bold text-gray-700">Could not load data</p>
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : !hasData ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-gray-100 min-h-[400px]">
            <span className="text-5xl opacity-20">📈</span>
            <p className="text-base font-bold text-gray-600">No completed {label.toLowerCase()} yet</p>
            <p className="text-sm text-gray-400">Scores will appear here once tests are submitted</p>
          </div>
        ) : (
          <>
            {/* ── Section title ── */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
                   style={{ background: `linear-gradient(145deg,${accentColor}28,${accentColor}10)`, border: `1.5px solid ${accentColor}30` }}>
                {isDiag ? '🔬' : '📝'}
              </div>
              <div>
                <h1 className="text-[18px] font-extrabold text-slate-800">{label} — Score Trend</h1>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  {data.length} attempt{data.length !== 1 ? 's' : ''} · Estimated SAT score from module results
                </p>
              </div>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'First Score',  value: first,  extra: first  !== null ? <ScoreChip score={first}  isPair={hasPair} /> : null },
                { label: 'Latest Score', value: latest, extra: latest !== null ? <ScoreChip score={latest} isPair={hasPair} /> : null },
                { label: 'Best Score',   value: best,   extra: null },
                {
                  label: 'Overall Change',
                  value: delta !== null ? (delta >= 0 ? `+${delta}` : `${delta}`) : '—',
                  valueColor: delta === null ? '#94a3b8' : delta > 0 ? '#059669' : delta < 0 ? '#dc2626' : '#64748b',
                  extra: null,
                },
              ].map(({ label: lbl, value, extra, valueColor }) => (
                <div key={lbl} className="bg-white rounded-2xl px-5 py-4 border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{lbl}</p>
                  <p className="text-[26px] font-black mt-1 leading-none"
                     style={{ color: valueColor ?? accentColor }}>
                    {value ?? '—'}
                  </p>
                  {extra && <div className="mt-1.5">{extra}</div>}
                </div>
              ))}
            </div>

            {/* ── Chart card ── */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <p className="text-[14px] font-extrabold text-slate-700">Score Progression</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-[3px] rounded-full" style={{ background: accentColor }} />
                    <span className="text-[11px] text-slate-500 font-semibold">
                      {hasPair ? 'Total (400–1600)' : 'Score'}
                    </span>
                  </div>
                  {hasPair && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <svg width="16" height="4" viewBox="0 0 16 4">
                          <line x1="0" y1="2" x2="16" y2="2" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 2" />
                        </svg>
                        <span className="text-[11px] text-slate-500 font-semibold">Math (200–800)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg width="16" height="4" viewBox="0 0 16 4">
                          <line x1="0" y1="2" x2="16" y2="2" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="4 2" />
                        </svg>
                        <span className="text-[11px] text-slate-500 font-semibold">R&amp;W (200–800)</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-[1px]" style={{ borderTop: '1.5px dashed #94a3b8' }} />
                    <span className="text-[11px] text-slate-400 font-medium">Target</span>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={yDomain}
                    ticks={yTicks}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip content={<CustomTooltip hasPair={hasPair} />} />
                  <ReferenceLine y={yTarget} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1.5} />
                  <Line
                    type="monotone" dataKey="total" stroke={accentColor} strokeWidth={3}
                    dot={{ r: 6, fill: accentColor, stroke: 'white', strokeWidth: 2.5 }}
                    activeDot={{ r: 8, stroke: accentColor, strokeWidth: 2, fill: 'white' }}
                    connectNulls
                  />
                  {hasPair && (
                    <Line
                      type="monotone" dataKey="math" stroke="#8b5cf6" strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={{ r: 4, fill: '#8b5cf6', stroke: 'white', strokeWidth: 1.5 }}
                      connectNulls
                    />
                  )}
                  {hasPair && (
                    <Line
                      type="monotone" dataKey="rw" stroke="#0ea5e9" strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={{ r: 4, fill: '#0ea5e9', stroke: 'white', strokeWidth: 1.5 }}
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>

              {data.length < 2 && (
                <p className="text-center text-[12px] text-slate-400 mt-3 font-medium">
                  Complete more tests to see a progression trend
                </p>
              )}
            </div>

            {/* ── Score history table ── */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <p className="text-[14px] font-extrabold text-slate-700">Score History</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">#</th>
                      <th className="text-left px-6 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Test</th>
                      <th className="text-left px-6 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Date</th>
                      {hasPair && <th className="text-center px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Math</th>}
                      {hasPair && <th className="text-center px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">R&amp;W</th>}
                      <th className="text-center px-6 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{hasPair ? 'Total' : 'Score'}</th>
                      <th className="text-center px-6 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Band</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => {
                      const band = row.total !== null
                        ? (hasPair ? satBand(row.total) : secBand(row.total))
                        : null;
                      const isLatest = i === data.length - 1;
                      return (
                        <tr key={row.label}
                            className={`border-b border-slate-50 transition-colors ${isLatest ? '' : 'hover:bg-slate-50'}`}
                            style={isLatest ? { background: `${accentColor}06` } : {}}>
                          <td className="px-6 py-4">
                            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold inline-flex"
                                  style={{ background: `${accentColor}18`, color: accentColor }}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800">{row.name}</p>
                            {isLatest && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                                    style={{ background: `${accentColor}18`, color: accentColor }}>
                                Latest
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-[12px]">{row.date}</td>
                          {hasPair && (
                            <td className="px-4 py-4 text-center">
                              {row.math !== null
                                ? <span className="font-bold text-purple-600">{row.math}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                          )}
                          {hasPair && (
                            <td className="px-4 py-4 text-center">
                              {row.rw !== null
                                ? <span className="font-bold text-sky-600">{row.rw}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                          )}
                          <td className="px-6 py-4 text-center">
                            {row.total !== null
                              ? <span className="text-[18px] font-black" style={{ color: accentColor }}>{row.total}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {band && <ScoreChip score={row.total} isPair={hasPair} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
