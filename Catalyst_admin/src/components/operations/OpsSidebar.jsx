// ============================================================
// OPERATIONS SIDEBAR — Purple-themed navigation
// ============================================================

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
  chevLeft:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chevRight:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  chevDown:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  logout:          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  questionBank:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="7" x2="16" y2="7"/><line x1="12" y1="11" x2="16" y2="11"/><line x1="9" y1="7" x2="9.01" y2="7"/><line x1="9" y1="11" x2="9.01" y2="11"/></svg>,
  satConfig:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M14.83 9.17a4 4 0 0 1 0 5.66M9.17 9.17a4 4 0 0 0 0 5.66"/></svg>,
};

const NAV = [
  { section: 'DASHBOARD', items: [
    { key: 'dashboard', label: 'Overview', path: '/operations/dashboard', icon: icons.dashboard },
  ]},
  { section: 'MANAGEMENT', items: [
    { key: 'mentors',  label: 'Mentors',  path: '/operations/mentors',  icon: icons.mentors,  color: '#7c3aed' },
    { key: 'students', label: 'Students', path: '/operations/students', icon: icons.students, color: '#ec4899' },
    { key: 'batches',  label: 'Batches',  path: '/operations/batches',  icon: icons.batches,  color: '#f59e0b' },
  ]},
  { section: 'SAT TESTS', items: [
    {
      key: 'structured-tests',
      label: 'Structured Tests',
      icon: icons.structuredTests,
      color: '#0891b2',
      children: [
        { key: 'diagnostic-tests', label: 'Diagnostic Tests', path: '/operations/sat-tests/diagnostic', icon: icons.diagnostic, color: '#0891b2' },
        { key: 'practice-tests',   label: 'Practice Tests',   path: '/operations/sat-tests/practice',   icon: icons.practice,   color: '#10b981' },
        { key: 'mock-tests',       label: 'Mock Tests',       path: '/operations/sat-tests/mock',       icon: icons.mock,       color: '#f59e0b' },
      ],
    },
  ]},
  { section: 'RESOURCES', items: [
    { key: 'sat-question-bank', label: 'Question Bank', path: '/operations/sat/question-bank', icon: icons.questionBank, color: '#7c3aed' },
  ]},
];

export default function OpsSidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [openGroups, setOpenGroups] = useState({ 'structured-tests': true });

  const isActive = (path) => location.pathname.startsWith(path);

  const isGroupActive = (item) =>
    item.children?.some((c) => isActive(c.path)) ?? false;

  const toggleGroup = (key) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  // Auto-expand group when navigating directly to a child route
  useEffect(() => {
    NAV.forEach((section) => {
      section.items.forEach((item) => {
        if (item.children) {
          const hasActive = item.children.some((c) => location.pathname.startsWith(c.path));
          if (hasActive) {
            setOpenGroups((prev) => ({ ...prev, [item.key]: true }));
          }
        }
      });
    });
  }, [location.pathname]);

  return (
    <aside
      className="h-screen bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0 sidebar-transition"
      style={{ width: collapsed ? 72 : 260 }}
    >
      {/* Logo */}
      <div className="h-16 px-4 flex items-center gap-2.5 border-b border-gray-100 shrink-0">
        {collapsed ? (
          <img src={catalystLogo} alt="Catalyst" className="w-9 h-9 object-cover object-left shrink-0" />
        ) : (
          <div className="flex-1 flex flex-col gap-0.5 overflow-hidden min-w-0">
            <img src={catalystLogo} alt="Catalyst" className="h-[30px] w-auto object-contain object-left max-w-[150px]" />
            <span className="text-[11px] text-ops-primary font-semibold pl-0.5">Operations</span>
          </div>
        )}
        <button
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 shrink-0 ml-auto hover:bg-gray-200 transition-colors"
          onClick={onToggle}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <span className="w-4 h-4 block text-gray-400">
            {collapsed ? icons.chevRight : icons.chevLeft}
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map((section) => (
          <div key={section.section} className="mb-2">
            {!collapsed && (
              <span className="block text-[10px] font-bold text-ops-primary uppercase tracking-[0.8px] px-5 pt-2 pb-1">
                {section.section}
              </span>
            )}
            {section.items.map((item) => {
              /* ── Group item (has children) ── */
              if (item.children) {
                const groupActive = isGroupActive(item);
                const isOpen = openGroups[item.key];
                return (
                  <div key={item.key}>
                    <button
                      className={`w-full flex items-center gap-2.5 px-3.5 py-[9px] my-px rounded-[10px] transition-colors ${
                        groupActive ? 'bg-ops-lighter' : 'hover:bg-gray-50'
                      } ${collapsed ? 'justify-center' : 'justify-start'}`}
                      onClick={() => !collapsed && toggleGroup(item.key)}
                      title={collapsed ? item.label : ''}
                    >
                      <span
                        className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                        style={{
                          color: groupActive ? '#7c3aed' : (item.color || '#6b7280'),
                          background: groupActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                        }}
                      >
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <>
                          <span
                            className={`text-sm whitespace-nowrap flex-1 text-left ${
                              groupActive ? 'text-ops-primary font-semibold' : 'text-gray-700 font-normal'
                            }`}
                          >
                            {item.label}
                          </span>
                          <span
                            className="w-4 h-4 block text-gray-400 shrink-0 transition-transform duration-200"
                            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          >
                            {icons.chevDown}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Children — only visible when sidebar is expanded and group is open */}
                    {!collapsed && isOpen && (
                      <div className="pl-4 mt-0.5 mb-1">
                        {item.children.map((child) => {
                          const active = isActive(child.path);
                          return (
                            <button
                              key={child.key}
                              className={`w-full flex items-center gap-2 px-3 py-[8px] my-px rounded-[10px] transition-colors ${
                                active ? 'bg-ops-lighter' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => navigate(child.path)}
                            >
                              <span
                                className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                                style={{
                                  color: active ? '#7c3aed' : (child.color || '#6b7280'),
                                  background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
                                }}
                              >
                                {child.icon}
                              </span>
                              <span
                                className={`text-[13px] whitespace-nowrap flex-1 text-left ${
                                  active ? 'text-ops-primary font-semibold' : 'text-gray-600 font-normal'
                                }`}
                              >
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
                  className={`w-full flex items-center gap-2.5 px-3.5 py-[9px] my-px rounded-[10px] transition-colors ${
                    active ? 'bg-ops-lighter' : 'hover:bg-gray-50'
                  } ${collapsed ? 'justify-center' : 'justify-start'}`}
                  onClick={() => navigate(item.path)}
                  title={collapsed ? item.label : ''}
                >
                  <span
                    className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                    style={{
                      color: active ? '#7c3aed' : (item.color || '#6b7280'),
                      background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
                    }}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span
                      className={`text-sm whitespace-nowrap flex-1 text-left ${
                        active ? 'text-ops-primary font-semibold' : 'text-gray-700 font-normal'
                      }`}
                    >
                      {item.label}
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
            <BAvatar size={34} name={user?.name || 'Ops'} variant="beam" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-[13px] font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis max-w-[130px]">
                {user?.name}
              </div>
              <div className="text-[11px] text-ops-primary font-medium">Operations</div>
            </div>
          )}
        </div>
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 shrink-0 hover:bg-gray-200 transition-colors"
          onClick={() => { logout(); navigate('/'); }}
          title="Logout"
        >
          <span className="w-[18px] h-[18px] block text-gray-500">{icons.logout}</span>
        </button>
      </div>
    </aside>
  );
}
