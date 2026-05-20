// ============================================================
// OPS NOTIFICATIONS PAGE — All alerts for the operations team
// Mentor onboarding, student enrollments, batch updates, etc.
// ============================================================

import { useState } from 'react';
import { useData } from '../../../context/DataContext';

const typeConfig = {
  mentor_added:     { icon: '🧑‍🏫', color: '#7c3aed', bg: '#ede9fe', label: 'Mentor Added' },
  mentor_inactive:  { icon: '⚠️',  color: '#f59e0b', bg: '#fef3c7', label: 'Mentor Inactive' },
  mentor_rating:    { icon: '⭐',  color: '#0d9488', bg: '#f0fdfa', label: 'Mentor Rating' },
  student_enrolled: { icon: '🎓', color: '#2563eb', bg: '#eff6ff', label: 'Student Enrolled' },
  batch_started:    { icon: '🚀', color: '#16a34a', bg: '#f0fdf4', label: 'Batch Started' },
  batch_ending:     { icon: '📆', color: '#ef4444', bg: '#fee2e2', label: 'Batch Ending' },
};

const trashIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;

const FILTER_OPTIONS = [
  { key: 'all',              label: 'All' },
  { key: 'unread',           label: 'Unread' },
  { key: 'mentor_added',     label: '🧑‍🏫 Mentors' },
  { key: 'student_enrolled', label: '🎓 Students' },
  { key: 'batch_started',    label: '🚀 Batches' },
  { key: 'batch_ending',     label: '📆 Deadlines' },
];

export default function OpsNotificationsPage() {
  const { opsNotifications, markOpsNotifRead, markAllOpsNotifsRead, deleteOpsNotif } = useData();
  const [filter, setFilter] = useState('all');

  const unreadCount = opsNotifications.filter(n => !n.read).length;

  const filtered = filter === 'all'
    ? opsNotifications
    : filter === 'unread'
    ? opsNotifications.filter(n => !n.read)
    : opsNotifications.filter(n => n.type === filter);

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            className="px-4 py-2 rounded-[10px] bg-ops-lighter text-ops-primary text-[13px] font-semibold border border-ops-light"
            onClick={markAllOpsNotifsRead}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map(c => (
          <button
            key={c.key}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all ${
              filter === c.key
                ? 'bg-ops-lighter text-ops-primary border-ops-light font-bold'
                : 'bg-gray-100 text-gray-500 border-transparent'
            }`}
            onClick={() => setFilter(c.key)}
          >
            {c.key === 'unread' ? `Unread (${unreadCount})` : c.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <p className="text-4xl">🔔</p>
            <p className="font-semibold text-gray-700 mt-2">No notifications here</p>
            <p className="text-[13px] text-gray-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          filtered.map(notif => {
            const cfg = typeConfig[notif.type] || typeConfig.mentor_added;
            return (
              <div
                key={notif.id}
                className="rounded-xl px-4 py-3.5 border border-gray-200 flex gap-3.5 items-start transition-colors"
                style={{
                  background: notif.read ? '#fff' : '#fdfbff',
                  borderLeft: `3px solid ${notif.read ? 'transparent' : cfg.color}`,
                }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                  <span className="text-xl">{cfg.icon}</span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      {cfg.label}
                    </span>
                    {!notif.read && <span className="w-[7px] h-[7px] rounded-full bg-red-500 shrink-0" />}
                  </div>
                  <p className="text-sm text-gray-700 mt-1.5">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{notif.time}</p>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  {!notif.read && (
                    <button
                      className="w-7 h-7 rounded-lg bg-ops-lighter text-ops-primary flex items-center justify-center font-bold text-sm border border-ops-light"
                      onClick={() => markOpsNotifRead(notif.id)}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center border border-red-100"
                    onClick={() => deleteOpsNotif(notif.id)}
                    title="Dismiss"
                  >
                    {trashIcon}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
