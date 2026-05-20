// ============================================================
// NOTIFICATIONS PAGE — All alerts for the mentor
// ============================================================

import { useState } from 'react';
import { useData } from '../../../context/DataContext';

const typeConfig = {
  slot_booked:          { icon: '📅', color: '#0d9488', bg: '#f0fdfa', label: 'Slot Booked' },
  session_reminder:     { icon: '⏰', color: '#7c3aed', bg: '#ede9fe', label: 'Session Reminder' },
  assignment_submitted: { icon: '📝', color: '#f59e0b', bg: '#fef3c7', label: 'Assignment' },
  student_activity:     { icon: '👤', color: '#ef4444', bg: '#fee2e2', label: 'Student Activity' },
};

const trashIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;

export default function NotificationsPage() {
  const { mentorNotifications, markMentorNotifRead, markAllMentorNotifsRead, deleteMentorNotif } = useData();
  const [filter, setFilter] = useState('all');

  const unreadCount = mentorNotifications.filter(n => !n.read).length;

  const filtered = filter === 'all'
    ? mentorNotifications
    : filter === 'unread'
    ? mentorNotifications.filter(n => !n.read)
    : mentorNotifications.filter(n => n.type === filter);

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            className="px-4 py-2 rounded-[10px] bg-mentor-lighter text-mentor-primary text-[13px] font-semibold border border-mentor-light"
            onClick={markAllMentorNotifsRead}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all',                  label: 'All' },
          { key: 'unread',               label: `Unread (${unreadCount})` },
          { key: 'slot_booked',          label: '📅 Slot Booked' },
          { key: 'session_reminder',     label: '⏰ Reminders' },
          { key: 'assignment_submitted', label: '📝 Assignments' },
          { key: 'student_activity',     label: '👤 Activity' },
        ].map(c => (
          <button
            key={c.key}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all ${
              filter === c.key
                ? 'bg-mentor-lighter text-mentor-primary border-mentor-light font-bold'
                : 'bg-gray-100 text-gray-500 border-transparent'
            }`}
            onClick={() => setFilter(c.key)}
          >
            {c.label}
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
            const cfg = typeConfig[notif.type] || typeConfig.student_activity;
            return (
              <div
                key={notif.id}
                className="rounded-xl px-4 py-3.5 border border-gray-200 flex gap-3.5 items-start transition-colors"
                style={{
                  background: notif.read ? '#fff' : '#fafffe',
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
                      className="w-7 h-7 rounded-lg bg-mentor-lighter text-mentor-primary flex items-center justify-center font-bold text-sm border border-mentor-light"
                      onClick={() => markMentorNotifRead(notif.id)}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center border border-red-100"
                    onClick={() => deleteMentorNotif(notif.id)}
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
