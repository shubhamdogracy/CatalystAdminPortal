// ============================================================
// OPERATIONS LAYOUT — Shell for all operations pages
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { chatService } from '../../services/api';
import OpsSidebar from './OpsSidebar';
import BAvatar from 'boring-avatars';

const PAGE_TITLES = {
  '/operations/dashboard':            'Platform Overview',
  '/operations/mentors':              'Mentors',
  '/operations/students':             'Students',
  '/operations/batches':              'Batch Management',
  '/operations/sat-tests/diagnostic': 'Diagnostic Tests',
  '/operations/sat-tests/practice':   'Practice Tests',
  '/operations/sat-tests/mock':       'Mock Tests',
  '/operations/sat/question-bank':    'Question Bank',
  '/operations/notifications':        'Notifications',
  '/operations/profile':              'My Profile',
};

const notifTypeConfig = {
  mentor_added:     { icon: '🧑‍🏫', color: '#7c3aed', bg: '#ede9fe' },
  mentor_inactive:  { icon: '⚠️',  color: '#f59e0b', bg: '#fef3c7' },
  mentor_rating:    { icon: '⭐',  color: '#0d9488', bg: '#f0fdfa' },
  student_enrolled: { icon: '🎓', color: '#2563eb', bg: '#eff6ff' },
  batch_started:    { icon: '🚀', color: '#16a34a', bg: '#f0fdf4' },
  batch_ending:     { icon: '📆', color: '#ef4444', bg: '#fee2e2' },
};

const bellIcon   = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const searchIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const userIcon   = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const logoutIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;


export default function OpsLayout() {
  const [collapsed, setCollapsed]             = useState(false);
  const [dropdownOpen, setDropdownOpen]       = useState(false);
  const [notifOpen, setNotifOpen]             = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  const dropdownRef = useRef(null);
  const notifRef    = useRef(null);
  const location    = useLocation();

  const { user, logout }                                              = useAuth();
  const { opsNotifications, markOpsNotifRead, markAllOpsNotifsRead } = useData();
  const navigate = useNavigate();

  const unreadCount  = opsNotifications.filter(n => !n.read).length;

  // Fetch initial chat unread count
  useEffect(() => {
    if (!user?._id) return;
    chatService.getConversations(user._id)
      .then(r => {
        const total = (r.data || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setChatUnreadCount(total);
      })
      .catch(() => {});
  }, [user?._id]);
  const recentNotifs = [...opsNotifications].slice(0, 5);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current    && !notifRef.current.contains(e.target))    setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageTitle = Object.entries(PAGE_TITLES).find(([k]) =>
    location.pathname.startsWith(k)
  )?.[1] || 'Operations';

  const handleViewProfile   = () => { setDropdownOpen(false); navigate('/operations/profile'); };
  const handleLogout        = () => { setDropdownOpen(false); logout(); navigate('/'); };
  const handleViewAllNotifs = () => { setNotifOpen(false); navigate('/operations/notifications'); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <OpsSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} chatUnreadCount={chatUnreadCount} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-xs text-gray-400 mt-px">Operations / {pageTitle}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3.5 py-2">
              <span className="text-gray-400 flex">{searchIcon}</span>
              <input
                className="border-none bg-transparent outline-none text-gray-700 w-[220px] text-[13px]"
                placeholder="Search mentors, students, batches..."
              />
            </div>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                className="w-[38px] h-[38px] rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 relative cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => { setNotifOpen(o => !o); setDropdownOpen(false); }}
                title="Notifications"
              >
                {bellIcon}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute top-[calc(100%+10px)] right-0 bg-white border border-gray-200 rounded-[14px] shadow-notif w-[340px] z-[1000] overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3.5 border-b border-gray-100">
                    <span className="text-sm font-bold text-gray-900">Notifications</span>
                    {unreadCount > 0 && (
                      <button className="text-xs text-ops-primary font-semibold" onClick={markAllOpsNotifsRead}>
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[320px] overflow-y-auto">
                    {recentNotifs.length === 0 ? (
                      <p className="px-4 py-7 text-center text-gray-400 text-[13px]">No notifications</p>
                    ) : (
                      recentNotifs.map(n => {
                        const cfg = notifTypeConfig[n.type] || notifTypeConfig.mentor_added;
                        return (
                          <div
                            key={n.id}
                            className="flex items-start gap-2.5 px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50"
                            style={{ background: n.read ? '#fff' : '#fdfbff' }}
                            onClick={() => { if (!n.read) markOpsNotifRead(n.id); }}
                          >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                              <span className="text-base">{cfg.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-gray-700 m-0 leading-snug">{n.message}</p>
                              <p className="text-[11px] text-gray-400 m-0 mt-0.5">{n.time}</p>
                            </div>
                            {!n.read && (
                              <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: cfg.color }} />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <button
                    className="w-full px-4 py-3 bg-gray-50 border-t border-gray-100 text-ops-primary text-[13px] font-semibold cursor-pointer text-center hover:bg-gray-100 transition-colors"
                    onClick={handleViewAllNotifs}
                  >
                    View all notifications →
                  </button>
                </div>
              )}
            </div>

            {/* Avatar + profile dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div
                className="w-9 h-9 rounded-full overflow-hidden cursor-pointer select-none"
                title={user?.name}
                onClick={() => { setDropdownOpen(o => !o); setNotifOpen(false); }}
              >
                <BAvatar size={36} name={user?.name || 'Ops'} variant="beam" />
              </div>

              {dropdownOpen && (
                <div className="absolute top-[calc(100%+10px)] right-0 bg-white border border-gray-200 rounded-xl shadow-dropdown min-w-[200px] z-[1000] overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50">
                    <p className="text-sm font-semibold text-gray-900 m-0">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500 m-0 mt-0.5">{user?.email || ''}</p>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <button
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 cursor-pointer text-left hover:bg-gray-50 transition-colors"
                    onClick={handleViewProfile}
                  >
                    <span className="flex text-gray-500">{userIcon}</span>
                    View Profile
                  </button>
                  <div className="h-px bg-gray-100" />
                  <button
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 cursor-pointer text-left hover:bg-red-50 transition-colors"
                    onClick={handleLogout}
                  >
                    <span className="flex text-red-500">{logoutIcon}</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto min-h-0 bg-gray-50">
          <Outlet context={{ setChatUnreadCount }} />
        </main>
      </div>
    </div>
  );
}
