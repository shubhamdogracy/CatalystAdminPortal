import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService } from '../../../services/api';

export default function MentorsListPage() {
  const navigate = useNavigate();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    mentorService.getAll()
      .then(res => setMentors(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = mentors.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.specialization || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalBatches = mentors.reduce((a, m) => a + (m.batchCount || 0), 0);

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Mentors</h2>
          <p className="text-sm text-gray-500 mt-0.5">{mentors.length} mentors on the platform</p>
        </div>
        <button
          className="px-5 py-2 rounded-[10px] bg-ops-primary text-white font-semibold text-sm shadow-[0_4px_12px_rgba(124,58,237,0.3)]"
          onClick={() => navigate('/operations/mentors/add')}
        >
          + Add Mentor
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Mentors',  value: mentors.length,                                    color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Active',         value: mentors.filter(m => m.isActive).length,             color: '#10b981', bg: '#d1fae5' },
          { label: 'Total Batches',  value: totalBatches,                                       color: '#0d9488', bg: '#f0fdfa' },
          { label: 'Avg Batches',    value: mentors.length ? (totalBatches / mentors.length).toFixed(1) : 0, color: '#f59e0b', bg: '#fef3c7' },
        ].map((c) => (
          <div key={c.label} className="rounded-xl px-5 py-4 border border-black/[0.04]" style={{ background: c.bg }}>
            <p className="text-[22px] font-extrabold" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-1">
        <input
          className="w-full py-2.5 border-none outline-none text-sm text-gray-700"
          placeholder="Search mentors by name or specialization..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-200 h-[180px] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👨‍🏫</p>
          <p className="font-semibold text-gray-600">No mentors found</p>
          <p className="text-sm mt-1">{search ? 'Try a different search' : 'Add your first mentor to get started'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((mentor) => {
            const initials = mentor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            return (
              <div
                key={mentor._id}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow shadow-panel flex flex-col gap-3 cursor-pointer"
                onClick={() => navigate(`/operations/mentors/${mentor._id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-ops-primary to-purple-400 text-white font-bold text-[15px] flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-gray-900 truncate">{mentor.name}</p>
                    <p className="text-xs text-gray-400 truncate">{mentor.specialization || 'General'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${mentor.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {mentor.isActive ? 'active' : 'inactive'}
                  </span>
                </div>

                <div className="flex border-t border-gray-100 pt-3">
                  {[
                    { label: 'Batches',    value: mentor.batchCount ?? 0, color: '#7c3aed' },
                    { label: 'Experience', value: mentor.experience ? `${mentor.experience}y` : '—', color: '#0d9488' },
                    { label: 'Email',      value: mentor.email.split('@')[0], color: '#6b7280' },
                  ].map((stat) => (
                    <div key={stat.label} className="flex-1 text-center">
                      <p className="text-[13px] font-bold truncate" style={{ color: stat.color }}>{stat.value}</p>
                      <p className="text-[11px] text-gray-400">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-2.5">
                  <span className="text-[13px] text-ops-primary font-semibold">View Details →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
