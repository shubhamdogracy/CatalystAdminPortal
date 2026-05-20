// ============================================================
// OPERATIONS DASHBOARD — Platform-wide overview (live data)
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService, batchService, studentService } from '../../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function initials(name = '') {
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function StatCard({ title, value, subtitle, icon, color, onClick, loading }) {
  return (
    <button
      className="bg-white rounded-[14px] p-5 border border-gray-200 shadow-card text-left transition-shadow hover:shadow-md"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[13px] text-gray-500 font-medium mb-1.5">{title}</p>
          {loading
            ? <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mt-1" />
            : <p className="text-[32px] font-extrabold leading-none" style={{ color }}>{value}</p>
          }
          {subtitle && !loading && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
          <span className="text-[22px]">{icon}</span>
        </div>
      </div>
    </button>
  );
}

export default function OpsDashboard() {
  const navigate = useNavigate();

  const [mentors,  setMentors]  = useState([]);
  const [batches,  setBatches]  = useState([]);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      mentorService.getAll().then(r => r.data).catch(() => []),
      batchService.getAll().then(r => r.data).catch(() => []),
      studentService.getAll().then(r => r.data).catch(() => []),
    ]).then(([m, b, s]) => {
      setMentors(m);
      setBatches(b);
      setStudents(s);
    }).finally(() => setLoading(false));
  }, []);

  const activeBatches = batches.filter(b => b.status === 'active');
  const activeStudents = students.filter(s => s.isActive !== false).length;

  // Per-mentor: sum studentCount and completedSessions across their batches
  const mentorStats = mentors.map(m => {
    const myBatches = batches.filter(b => b.mentorId?.toString() === m._id?.toString());
    const totalStudents  = myBatches.reduce((a, b) => a + (b.studentCount || 0), 0);
    const completedSess  = myBatches.reduce((a, b) => a + (b.completedSessions || 0), 0);
    return { ...m, totalStudents, completedSessions: completedSess };
  });

  const chartData = mentorStats.map(m => ({
    name:     m.name.split(' ')[0],
    students: m.totalStudents,
    sessions: m.completedSessions,
  }));

  return (
    <div className="p-6 flex flex-col gap-5 fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-ops-primary to-purple-400 rounded-2xl px-7 py-5 flex items-center justify-between shadow-banner-ops">
        <div>
          <h2 className="text-xl font-bold text-white m-0">Platform Overview</h2>
          <p className="text-sm text-white/80 mt-1">Monitor all mentors, students, and batches from here.</p>
        </div>
        <button
          className="px-5 py-2.5 rounded-[10px] bg-white/20 text-white font-semibold text-sm border border-white/30 hover:bg-white/30 transition-colors"
          onClick={() => navigate('/operations/students/add')}
        >
          + Add Student
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Total Students" value={students.length}
          subtitle={`${activeStudents} active`}
          icon="🎓" color="#7c3aed" loading={loading}
          onClick={() => navigate('/operations/students')}
        />
        <StatCard
          title="Mentors" value={mentors.length}
          subtitle="Platform instructors" icon="👨‍🏫" color="#0d9488" loading={loading}
          onClick={() => navigate('/operations/mentors')}
        />
        <StatCard
          title="Active Batches" value={activeBatches.length}
          subtitle={`${batches.length} total`} icon="📦" color="#f59e0b" loading={loading}
          onClick={() => navigate('/operations/batches')}
        />
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Mentors list */}
        <div className="bg-white rounded-[14px] border border-gray-200 shadow-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-gray-900">All Mentors</h3>
            <button className="text-[13px] text-ops-primary font-semibold" onClick={() => navigate('/operations/mentors')}>
              View all →
            </button>
          </div>
          {loading ? (
            <div className="p-4 flex flex-col gap-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : mentors.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No mentors found</p>
          ) : (
            mentorStats.map(m => (
              <button
                key={m._id}
                className="flex items-center gap-3 px-5 py-3 w-full text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                onClick={() => navigate(`/operations/mentors/${m._id}`)}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ops-primary to-purple-400 text-white font-bold text-[13px] flex items-center justify-center shrink-0">
                  {initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.specialization || '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold text-ops-primary">{m.totalStudents} students</p>
                  <p className="text-[11px] text-gray-400">{m.isActive ? 'Active' : 'Inactive'}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Performance Chart */}
        <div className="bg-white rounded-[14px] border border-gray-200 shadow-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-gray-900">Mentor Performance</h3>
            <span className="text-xs text-gray-400">Students & Sessions</span>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="h-[220px] bg-gray-100 rounded-xl animate-pulse" />
            ) : chartData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="students" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Students" />
                  <Bar dataKey="sessions" fill="#0d9488" radius={[4, 4, 0, 0]} name="Sessions" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Active Batches */}
      <div className="bg-white rounded-[14px] border border-gray-200 shadow-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-gray-900">Active Batches</h3>
          <button className="text-[13px] text-ops-primary font-semibold" onClick={() => navigate('/operations/batches')}>
            View all →
          </button>
        </div>
        {loading ? (
          <div className="p-4 flex flex-col gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : activeBatches.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No active batches</p>
        ) : (
          <div className="pb-2">
            {activeBatches.map(batch => {
              const total = batch.totalSessions || 1;
              const pct   = Math.round(((batch.completedSessions || 0) / total) * 100);
              return (
                <div key={batch._id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex-[2]">
                    <p className="text-sm font-semibold text-gray-900">{batch.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{batch.subject}{batch.mentor?.name ? ` · ${batch.mentor.name}` : ''}</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-[13px] text-gray-700">{batch.studentCount ?? 0} students</p>
                  </div>
                  <div className="flex-[2]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-ops-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-ops-primary w-8">{pct}%</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {batch.completedSessions || 0}/{batch.totalSessions || 0} sessions
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
