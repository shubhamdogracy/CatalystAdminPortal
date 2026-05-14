// ============================================================
// SESSIONS PAGE — Upcoming + past sessions list
// ============================================================

import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

const meetIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;

function SessionCard({ session }) {
  const isUpcoming  = session.status === 'upcoming';
  const isCompleted = session.status === 'completed';
  const borderColor = isUpcoming ? '#0d9488' : isCompleted ? '#10b981' : '#9ca3af';

  return (
    <div
      className="bg-white rounded-xl px-5 py-4 border border-gray-200 flex items-center gap-4 shadow-panel"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="text-center min-w-[46px]">
        <p className="text-[11px] font-bold text-mentor-primary uppercase">
          {new Date(session.date).toLocaleDateString('en-IN', { month: 'short' })}
        </p>
        <p className="text-[22px] font-extrabold text-gray-900 leading-none">
          {new Date(session.date).getDate()}
        </p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[15px] font-bold text-gray-900">{session.topic}</p>
          <span
            className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{
              background: isUpcoming ? '#f0fdfa' : isCompleted ? '#d1fae5' : '#f3f4f6',
              color:      isUpcoming ? '#0d9488' : isCompleted ? '#065f46' : '#6b7280',
            }}
          >
            {session.status}
          </span>
        </div>
        <p className="text-[13px] text-gray-500 mt-0.5">with {session.studentName}</p>
        <p className="text-xs text-gray-400 mt-0.5 flex items-center">
          {session.time} · {session.duration} min
          {isCompleted && session.recording && (
            <a href={session.recording} target="_blank" rel="noreferrer" className="text-ops-primary ml-3 font-semibold">
              View Recording →
            </a>
          )}
        </p>
      </div>

      {isUpcoming && session.meetLink && (
        <a
          href={session.meetLink}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-mentor-primary text-white text-[13px] font-semibold shrink-0 whitespace-nowrap shadow-[0_4px_12px_rgba(13,148,136,0.3)]"
        >
          <span className="flex items-center">{meetIcon}</span>
          Join Session
        </a>
      )}
    </div>
  );
}

export default function SessionsPage() {
  const { user: _user } = useAuth();
  const [tab, setTab] = useState('upcoming');

  const sessions  = [];
  const upcoming  = [];
  const completed = [];
  const shown     = tab === 'upcoming' ? upcoming : completed;

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">Sessions</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage your teaching sessions and track history</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Sessions', value: sessions.length, color: '#0d9488', bg: '#f0fdfa' },
          { label: 'Upcoming',       value: upcoming.length, color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Completed',      value: completed.length, color: '#10b981', bg: '#d1fae5' },
          { label: 'This Week',      value: upcoming.filter(s => {
              const diff = (new Date(s.date) - new Date()) / (1000 * 60 * 60 * 24);
              return diff >= 0 && diff < 7;
            }).length, color: '#f59e0b', bg: '#fef3c7' },
        ].map((st) => (
          <div key={st.label} className="rounded-xl px-5 py-4 border border-black/5" style={{ background: st.bg }}>
            <p className="text-2xl font-extrabold" style={{ color: st.color }}>{st.value}</p>
            <p className="text-xs text-gray-500">{st.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {[
          { key: 'upcoming',  label: `Upcoming (${upcoming.length})` },
          { key: 'completed', label: `Past Sessions (${completed.length})` },
        ].map((t) => (
          <button
            key={t.key}
            className={`flex-1 py-2 rounded-[10px] text-[13px] transition-all ${
              tab === t.key ? 'bg-white text-mentor-primary font-bold shadow-sm' : 'text-gray-500 font-medium'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2.5">
        {shown.length === 0 ? (
          <div className="px-5 py-16 text-center text-gray-400 text-[15px]">
            {tab === 'upcoming' ? '🎉 No upcoming sessions. Create slots to let students book!' : 'No sessions recorded yet.'}
          </div>
        ) : (
          shown.map((s) => <SessionCard key={s.id} session={s} />)
        )}
      </div>
    </div>
  );
}
