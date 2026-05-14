import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BAvatar from 'boring-avatars';
import catalystLogo from '../../assets/catalyst-logo.png';

const icons = {
  dashboard:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  mentors:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  students:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  batches:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  structuredTests: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  diagnostic:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  practice:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  mock:            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  questionBank:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  chevLeft:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chevRight:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  chevDown:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  logout:          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

const NAV = [
  { section: 'DASHBOARD', items: [
    { key: 'dashboard', label: 'Overview', path: '/operations/dashboard', icon: icons.dashboard, iconBg: '#ede9fe', iconColor: '#6d28d9' },
  ]},
  { section: 'MANAGEMENT', items: [
    { key: 'mentors',  label: 'Mentors',  path: '/operations/mentors',  icon: icons.mentors,  iconBg: '#f3e5f5', iconColor: '#7b1fa2' },
    { key: 'students', label: 'Students', path: '/operations/students', icon: icons.students, iconBg: '#fce4ec', iconColor: '#c2185b' },
    { key: 'batches',  label: 'Batches',  path: '/operations/batches',  icon: icons.batches,  iconBg: '#fff8e1', iconColor: '#f57f17' },
  ]},
  { section: 'SAT TESTS', items: [
    {
      key: 'structured-tests',
      label: 'Structured Tests',
      icon: icons.structuredTests,
      iconBg: '#e0f7fa',
      iconColor: '#00838f',
      children: [
        { key: 'diagnostic', label: 'Diagnostic Tests', path: '/operations/sat-tests/diagnostic', icon: icons.diagnostic, iconBg: '#e0f7fa', iconColor: '#00838f' },
        { key: 'practice',   label: 'Practice Tests',   path: '/operations/sat-tests/practice',   icon: icons.practice,   iconBg: '#e8f5e9', iconColor: '#2e7d32' },
        { key: 'mock',       label: 'Mock Tests',       path: '/operations/sat-tests/mock',       icon: icons.mock,       iconBg: '#fff8e1', iconColor: '#ef6c00' },
      ],
    },
  ]},
  { section: 'RESOURCES', items: [
    { key: 'question-bank', label: 'Question Bank', path: '/operations/sat/question-bank', icon: icons.questionBank, iconBg: '#ede9fe', iconColor: '#5e35b1' },
  ]},
];

// Active accent for ops portal
const OPS_ACTIVE_BG   = '#ede9fe';
const OPS_ACTIVE_TEXT = '#6d28d9';

export default function OpsSidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [openGroups, setOpenGroups] = useState({ 'structured-tests': true });

  const isActive      = (path) => location.pathname.startsWith(path);
  const isGroupActive = (item) => item.children?.some((c) => isActive(c.path)) ?? false;
  const toggleGroup   = (key)  => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    NAV.forEach((section) => {
      section.items.forEach((item) => {
        if (item.children?.some((c) => location.pathname.startsWith(c.path))) {
          setOpenGroups((prev) => ({ ...prev, [item.key]: true }));
        }
      });
    });
  }, [location.pathname]);

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
            <span className="text-[11px] font-semibold pl-0.5" style={{ color: '#7c3aed' }}>Operations</span>
          </div>
        )}
        <button
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors hover:bg-gray-100"
          style={{ border: '1px solid #e5e7eb' }}
          onClick={onToggle}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <span className="w-3.5 h-3.5 block text-gray-400">
            {collapsed ? icons.chevRight : icons.chevLeft}
          </span>
        </button>
      </div>

      {/* ── User Profile Block ── */}
      {!collapsed && (
        <div className="mx-3 mb-3 px-3 py-3 rounded-xl flex items-center gap-3 shrink-0"
             style={{ background: '#f8f9fa', border: '1px solid #f0f0f0' }}>
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
            <BAvatar size={36} name={user?.name || 'Ops'} variant="beam" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-gray-900 truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] font-semibold tracking-widest mt-0.5" style={{ color: '#9ca3af' }}>OPERATIONS</p>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="flex justify-center mb-3 shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden">
            <BAvatar size={36} name={user?.name || 'Ops'} variant="beam" />
          </div>
        </div>
      )}

      <div className="mx-3 mb-2 shrink-0" style={{ height: '1px', background: '#f0f0f0' }} />

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        {NAV.map((section) => (
          <div key={section.section} className="mb-1">
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest px-2 pt-3 pb-1.5" style={{ color: '#9ca3af' }}>
                {section.section}
              </p>
            )}
            {section.items.map((item) => {

              /* ── Group item ── */
              if (item.children) {
                const groupActive = isGroupActive(item);
                const isOpen      = openGroups[item.key];
                return (
                  <div key={item.key}>
                    <button
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-xl mb-0.5 transition-all"
                      style={{
                        background: groupActive ? OPS_ACTIVE_BG : 'transparent',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                      }}
                      onMouseEnter={e => { if (!groupActive) e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={e => { if (!groupActive) e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => !collapsed && toggleGroup(item.key)}
                      title={collapsed ? item.label : ''}
                    >
                      <span className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                            style={{ background: item.iconBg, color: item.iconColor }}>
                        <span className="w-[17px] h-[17px] block">{item.icon}</span>
                      </span>
                      {!collapsed && (
                        <>
                          <span className="text-[13.5px] whitespace-nowrap flex-1 text-left"
                                style={{ color: groupActive ? OPS_ACTIVE_TEXT : '#374151', fontWeight: groupActive ? 600 : 500 }}>
                            {item.label}
                          </span>
                          <span className="w-3.5 h-3.5 block text-gray-400 shrink-0 transition-transform duration-200"
                                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            {icons.chevDown}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Children */}
                    {!collapsed && isOpen && (
                      <div className="pl-3 mb-1">
                        {item.children.map((child) => {
                          const active = isActive(child.path);
                          return (
                            <button
                              key={child.key}
                              className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl mb-0.5 transition-all"
                              style={{ background: active ? OPS_ACTIVE_BG : 'transparent' }}
                              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb'; }}
                              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                              onClick={() => navigate(child.path)}
                            >
                              <span className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                                    style={{ background: child.iconBg, color: child.iconColor }}>
                                <span className="w-[15px] h-[15px] block">{child.icon}</span>
                              </span>
                              <span className="text-[13px] whitespace-nowrap flex-1 text-left"
                                    style={{ color: active ? OPS_ACTIVE_TEXT : '#4b5563', fontWeight: active ? 600 : 400 }}>
                                {child.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              /* ── Regular item ── */
              const active = isActive(item.path);
              return (
                <button
                  key={item.key}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-xl mb-0.5 transition-all"
                  style={{
                    background: active ? OPS_ACTIVE_BG : 'transparent',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : ''}
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                        style={{ background: item.iconBg, color: item.iconColor }}>
                    <span className="w-[17px] h-[17px] block">{item.icon}</span>
                  </span>
                  {!collapsed && (
                    <span className="text-[13.5px] whitespace-nowrap flex-1 text-left"
                          style={{ color: active ? OPS_ACTIVE_TEXT : '#374151', fontWeight: active ? 600 : 500 }}>
                      {item.label}
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
          onClick={() => { logout(); navigate('/'); }}
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
