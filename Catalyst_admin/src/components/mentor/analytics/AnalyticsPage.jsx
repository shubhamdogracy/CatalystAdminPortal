// ============================================================
// ANALYTICS PAGE — Charts for student performance & sessions
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { studentService, satMentorService } from '../../../services/api';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-[10px] px-3.5 py-2.5 shadow-md">
      <p className="text-xs font-bold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

function ChartPanel({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-[14px] border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 pb-3 border-b border-gray-100">
        <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [students, setStudents]         = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const studs = await studentService.getByMentor(user.id);
        if (cancelled) return;
        const list = studs?.students ?? studs ?? [];
        setStudents(list);

        // Compute per-student progress from real sessions
        const entries = await Promise.all(
          list.map(async (s) => {
            try {
              const [adaptive, practice] = await Promise.all([
                satMentorService.getStudentSessions(s._id),
                satMentorService.getStudentPracticeSessions(s._id),
              ]);
              const prog = computeTestProgress(
                adaptive?.sessions ?? adaptive ?? [],
                practice?.sessions ?? practice ?? [],
              );
              return { name: s.name, progress: prog };
            } catch {
              return { name: s.name, progress: 0 };
            }
          })
        );
        if (!cancelled) setProgressData(entries);
      } catch (err) {
        console.error('Analytics load error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const activeStudents = students.filter(s => s.status === 'active' || s.accountType !== 'guest');
  const avgProgress    = progressData.length > 0
    ? Math.round(progressData.reduce((a, s) => a + s.progress, 0) / progressData.length)
    : 0;

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">Analytics</h2>
        <p className="text-sm text-gray-500 mt-0.5">Track student performance and session insights</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Avg Student Progress', value: loading ? '—' : `${avgProgress}%`,    color: '#0d9488', icon: '📈' },
          { label: 'Active Students',      value: loading ? '—' : activeStudents.length, color: '#10b981', icon: '👥' },
          { label: 'Total Students',       value: loading ? '—' : students.length,       color: '#7c3aed', icon: '🎓' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-[14px] px-5 py-[18px] border border-gray-200 shadow-panel">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 font-medium">{k.label}</p>
                <p className="text-[28px] font-extrabold mt-1" style={{ color: k.color }}>{k.value}</p>
              </div>
              <span className="text-2xl">{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-2 gap-4">
        <ChartPanel title="Student Progress Overview" subtitle="Current test-based progress per student">
          {loading ? (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Loading…</div>
          ) : progressData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No student data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={progressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} tickFormatter={(v) => v.split(' ')[0]} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="progress" fill="#0d9488" radius={[6, 6, 0, 0]} name="Progress %" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        <ChartPanel title="Weekly Sessions" subtitle="Sessions data not yet available via API">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={[]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="sessions"  stroke="#7c3aed" strokeWidth={2.5} name="Scheduled" />
              <Line type="monotone" dataKey="completed" stroke="#0d9488" strokeWidth={2.5} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 text-center mt-2">Session tracking coming soon</p>
        </ChartPanel>

        <ChartPanel title="Student Engagement" subtitle="Engagement data not yet available via API">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={[]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="engagement" stroke="#0d9488" strokeWidth={2.5} fill="url(#engGrad)" name="Engagement %" />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 text-center mt-2">Engagement tracking coming soon</p>
        </ChartPanel>

        <ChartPanel title="Progress Breakdown" subtitle="Per-student performance summary">
          {loading ? (
            <div className="flex flex-col gap-2.5 pt-2">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-[100px] h-3 bg-gray-200 rounded animate-pulse" />
                  <div className="flex-1 h-2 bg-gray-200 rounded-full animate-pulse" />
                  <div className="w-9 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : progressData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No data</div>
          ) : (
            <div className="flex flex-col gap-2.5 pt-2">
              {progressData.map((s) => {
                const color = s.progress >= 80 ? '#10b981' : s.progress >= 50 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-[13px] text-gray-700 w-[100px] shrink-0">{s.name.split(' ')[0]}</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.progress}%`, background: color }} />
                    </div>
                    <span className="text-[13px] font-bold w-9 text-right" style={{ color }}>{s.progress}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartPanel>
      </div>
    </div>
  );
}
