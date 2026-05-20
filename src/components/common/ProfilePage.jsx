// ============================================================
// PROFILE PAGE — Shared user profile view for mentor & ops
// ============================================================

import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BAvatar from 'boring-avatars';

const userIcon   = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const mailIcon   = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const shieldIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const logoutIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;


export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isMentor = user?.role === 'mentor';

  const handleLogout = () => { logout(); navigate('/'); };

  const fields = [
    { icon: userIcon,   label: 'Full Name', value: user?.name  || '—' },
    { icon: mailIcon,   label: 'Email',     value: user?.email || '—' },
    { icon: shieldIcon, label: 'Role',      value: isMentor ? 'Mentor' : 'Operations' },
  ];

  return (
    <div className="p-10 flex justify-center items-start min-h-full bg-gray-50">
      <div className="bg-white rounded-2xl shadow-card px-12 py-10 w-full max-w-[480px] flex flex-col items-center gap-4">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full overflow-hidden mb-1">
          <BAvatar size={80} name={user?.name || 'User'} variant="beam" />
        </div>

        <h2 className="text-[22px] font-bold text-gray-900 m-0">{user?.name || 'Unknown User'}</h2>

        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{
            background: isMentor ? '#ccfbf1' : '#ede9fe',
            color:      isMentor ? '#0f766e' : '#6d28d9',
          }}
        >
          {isMentor ? 'Mentor' : 'Operations'}
        </span>

        <div className="w-full h-px bg-gray-100" />

        {/* Info fields */}
        <div className="w-full flex flex-col gap-4">
          {fields.map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3.5 px-4 py-3 bg-gray-50 rounded-[10px]">
              <div className="text-gray-500 flex shrink-0">{icon}</div>
              <div>
                <p className="text-[11px] text-gray-400 m-0 font-medium uppercase tracking-[0.05em]">{label}</p>
                <p className="text-[15px] text-gray-900 m-0 font-medium mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full h-px bg-gray-100" />

        {/* Logout */}
        <button
          className="flex items-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-[10px] text-sm font-semibold cursor-pointer mt-1 hover:bg-red-100 transition-colors"
          onClick={handleLogout}
        >
          {logoutIcon}
          Logout
        </button>
      </div>
    </div>
  );
}
