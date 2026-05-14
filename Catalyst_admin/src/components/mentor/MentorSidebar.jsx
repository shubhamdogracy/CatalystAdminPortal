import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BAvatar from 'boring-avatars';
import catalystLogo from '../../assets/catalyst-logo.png';

const icons = {
  dashboard:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  students:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  analytics:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  communication: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  notifications: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  profile:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  logout:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevronLeft:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chevronRight:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
};

const NAV_SECTIONS = [
  {
    label: 'DASHBOARD',
    items: [
      { key: 'dashboard', label: 'Home', path: '/mentor/dashboard', icon: icons.dashboard, iconBg: '#e8f5e9', iconColor: '#388e3c' },
    ],
  },
  {
    label: 'MY MODULES',
    items: [
      { key: 'students',  label: 'My Students', path: '/mentor/students',  icon: icons.students,  iconBg: '#e3f2fd', iconColor: '#1565c0' },
      { key: 'analytics', label: 'Analytics',   path: '/mentor/analytics', icon: icons.analytics, iconBg: '#f3e5f5', iconColor: '#6a1b9a' },
    ],
  },
  {
    label: 'COMMUNICATION',
    items: [
      { key: 'communication', label: 'Chat', path: '/mentor/communication', icon: icons.communication, iconBg: '#fce4ec', iconColor: '#c2185b' },
    ],
  },
  {
    label: 'ALERTS',
    items: [
      { key: 'notifications', label: 'Notifications', path: '/mentor/notifications', icon: icons.notifications, iconBg: '#fff3e0', iconColor: '#e65100', badgeKey: 'notif' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { key: 'profile', label: 'My Profile', path: '/mentor/profile', icon: icons.profile, iconBg: '#e8eaf6', iconColor: '#3949ab' },
    ],
  },
];

export default function MentorSidebar({ collapsed, onToggle, notifUnreadCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname.startsWith(path);
  const handleLogout = () => { logout(); navigate('/'); };
  const getBadge = (badgeKey) => badgeKey === 'notif' ? notifUnreadCount : 0;

  return (
    <aside
      className="h-screen bg-white border-r border-gray-100 flex flex-col overflow-hidden shrink-0 sidebar-transition"
      style={{ width: collapsed ? 72 : 256 }}
    >
      {/* ── Logo ── */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
        {collapsed ? (
          <img src={catalystLogo} alt="Catalyst" className="w-9 h-9 object-cover object-left" />
        ) : (
          <div className="flex flex-col gap-0.5 min-w-0">
            <img src={catalystLogo} alt="Catalyst" className="h-7 w-auto object-contain object-left max-w-[140px]" />
            <span className="text-[11px] font-semibold pl-0.5" style={{ color: '#0d9488' }}>Mentor Portal</span>
          </div>
        )}
        <button
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors hover:bg-gray-100"
          style={{ border: '1px solid #e5e7eb' }}
          onClick={onToggle}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <span className="w-3.5 h-3.5 block text-gray-400">
            {collapsed ? icons.chevronRight : icons.chevronLeft}
          </span>
        </button>
      </div>

      {/* ── User Profile Block ── */}
      {!collapsed && (
        <div className="mx-3 mb-3 px-3 py-3 rounded-xl flex items-center gap-3 shrink-0"
             style={{ background: '#f8f9fa', border: '1px solid #f0f0f0' }}>
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
            <BAvatar size={36} name={user?.name || 'Mentor'} variant="beam" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-gray-900 truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] font-semibold tracking-widest mt-0.5" style={{ color: '#9ca3af' }}>MENTOR</p>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="flex justify-center mb-3 shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden">
            <BAvatar size={36} name={user?.name || 'Mentor'} variant="beam" />
          </div>
        </div>
      )}

      <div className="mx-3 mb-2 shrink-0" style={{ height: '1px', background: '#f0f0f0' }} />

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest px-2 pt-3 pb-1.5" style={{ color: '#9ca3af' }}>
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const active = isActive(item.path);
              const badge  = getBadge(item.badgeKey);
              return (
                <button
                  key={item.key}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-xl mb-0.5 transition-all"
                  style={{
                    background: active ? '#e8f5e9' : 'transparent',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : ''}
                >
                  {/* Icon box */}
                  <span
                    className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                    style={{
                      background: active ? item.iconColor + '22' : item.iconBg,
                      color: active ? item.iconColor : item.iconColor,
                    }}
                  >
                    <span className="w-[17px] h-[17px] block">{item.icon}</span>
                  </span>

                  {!collapsed && (
                    <span
                      className="text-[13.5px] whitespace-nowrap flex-1 text-left font-medium"
                      style={{ color: active ? '#0d9488' : '#374151', fontWeight: active ? 600 : 500 }}
                    >
                      {item.label}
                    </span>
                  )}

                  {badge > 0 && !collapsed && (
                    <span className="min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                  {badge > 0 && collapsed && (
                    <span className="absolute top-1.5 right-1.5 w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Sign Out ── */}
      <div className="px-3 pb-4 pt-2 shrink-0" style={{ borderTop: '1px solid #f0f0f0' }}>
        <button
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-all"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          onClick={handleLogout}
          title="Sign Out"
        >
          <span className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                style={{ background: '#fee2e2', color: '#dc2626' }}>
            <span className="w-[17px] h-[17px] block">{icons.logout}</span>
          </span>
          {!collapsed && (
            <span className="text-[13.5px] font-medium" style={{ color: '#dc2626' }}>Sign Out</span>
          )}
        </button>
      </div>
    </aside>
  );
}
