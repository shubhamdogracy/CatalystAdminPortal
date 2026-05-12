// ============================================================
// MENTOR SIDEBAR — Teal-themed collapsible navigation
// ============================================================

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BAvatar from 'boring-avatars';
import catalystLogo from '../../assets/catalyst-logo.png';

const icons = {
  dashboard:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  students:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  slots:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  sessions:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  analytics:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  assignments:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  sat:          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  communication:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  notifications:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  chevronLeft:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chevronRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  logout:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

const NAV_SECTIONS = [
  {
    label: 'DASHBOARD',
    items: [
      { key: 'dashboard', label: 'Home', path: '/mentor/dashboard', icon: icons.dashboard },
    ],
  },
  {
    label: 'MY MODULES',
    items: [
      { key: 'students',  label: 'My Students', path: '/mentor/students',  icon: icons.students,  color: '#10b981' },
      { key: 'analytics', label: 'Analytics',   path: '/mentor/analytics', icon: icons.analytics, color: '#7c3aed' },
    ],
  },
  {
    label: 'COMMUNICATION',
    items: [
      { key: 'communication', label: 'Chat', path: '/mentor/communication', icon: icons.communication, color: '#ec4899' },
    ],
  },
  {
    label: 'ALERTS',
    items: [
      { key: 'notifications', label: 'Notifications', path: '/mentor/notifications', icon: icons.notifications, color: '#ef4444', badgeKey: 'notif' },
    ],
  },
];

export default function MentorSidebar({ collapsed, onToggle, notifUnreadCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogout = () => { logout(); navigate('/'); };

  const getBadge = (badgeKey) => {
    if (badgeKey === 'notif') return notifUnreadCount;
    return 0;
  };

  return (
    <aside
      className="h-screen bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0 relative z-10 sidebar-transition"
      style={{ width: collapsed ? 72 : 260 }}
    >
      {/* Logo + Toggle */}
      <div className="h-16 px-4 flex items-center gap-2.5 border-b border-gray-100 shrink-0">
        {collapsed ? (
          <img src={catalystLogo} alt="Catalyst" className="w-9 h-9 object-cover object-left shrink-0" />
        ) : (
          <div className="flex-1 flex flex-col gap-0.5 overflow-hidden min-w-0">
            <img src={catalystLogo} alt="Catalyst" className="h-[30px] w-auto object-contain object-left max-w-[150px]" />
            <span className="text-[11px] text-mentor-primary font-semibold pl-0.5">Mentor Portal</span>
          </div>
        )}
        <button
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 shrink-0 ml-auto hover:bg-gray-200 transition-colors"
          onClick={onToggle}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <span className="w-4 h-4 block text-gray-400">
            {collapsed ? icons.chevronRight : icons.chevronLeft}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-2">
            {!collapsed && (
              <span className="block text-[10px] font-bold text-mentor-primary uppercase tracking-[0.8px] px-5 pt-2 pb-1">
                {section.label}
              </span>
            )}
            {section.items.map((item) => {
              const active = isActive(item.path);
              const badge  = getBadge(item.badgeKey);
              return (
                <button
                  key={item.key}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-[9px] my-px rounded-[10px] relative transition-colors ${
                    active ? 'bg-mentor-lighter' : 'hover:bg-gray-50'
                  } ${collapsed ? 'justify-center' : 'justify-start'}`}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : ''}
                >
                  <span
                    className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                    style={{
                      color: active ? '#0d9488' : (item.color || '#6b7280'),
                      background: active ? 'rgba(13,148,136,0.12)' : 'transparent',
                    }}
                  >
                    {item.icon}
                  </span>

                  {!collapsed && (
                    <span
                      className={`text-sm whitespace-nowrap flex-1 text-left ${
                        active ? 'text-mentor-primary font-semibold' : 'text-gray-700 font-normal'
                      }`}
                    >
                      {item.label}
                    </span>
                  )}

                  {badge > 0 && !collapsed && (
                    <span className="min-w-[20px] h-5 rounded-[10px] bg-red-500 text-white text-[11px] font-bold flex items-center justify-center px-1.5">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                  {badge > 0 && collapsed && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3.5 py-3 border-t border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-[34px] h-[34px] rounded-full overflow-hidden shrink-0">
            <BAvatar size={34} name={user?.name || 'Mentor'} variant="beam" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-[13px] font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis max-w-[130px]">
                {user?.name}
              </div>
              <div className="text-[11px] text-gray-500">Mentor</div>
            </div>
          )}
        </div>
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 shrink-0 hover:bg-gray-200 transition-colors"
          onClick={handleLogout}
          title="Logout"
        >
          <span className="w-[18px] h-[18px] block text-gray-500">{icons.logout}</span>
        </button>
      </div>
    </aside>
  );
}
