import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { batchService } from '../../../services/api';

const inputClass = 'w-full px-3 py-2.5 rounded-[10px] border-[1.5px] border-gray-200 text-[13px] outline-none bg-white focus:border-ops-primary transition-colors';
const SUBJECTS = ['english', 'maths'];
const STATUS_STYLE = {
  active:    'bg-green-100 text-green-800',
  upcoming:  'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-600',
};

/* ── Create Batch Modal ─────────────────────────────────────── */
function CreateBatchModal({ mentors, students, onSave, onClose }) {
  const [form, setForm]     = useState({ name: '', subject: '', mentorId: '', studentId: '', startDate: '', totalSessions: 60 });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.mentorId || !form.studentId) return;
    setSaving(true);
    setError('');
    try {
      const res = await batchService.create({
        ...form,
        totalSessions: Number(form.totalSessions),
        startDate: form.startDate || undefined,
      });
      onSave(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] backdrop-blur-sm">
      <div className="bg-white rounded-[18px] w-[460px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-900">Create New Batch</h3>
          <button className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-sm" onClick={onClose}>✕</button>
        </div>

        <div className="p-6 flex flex-col gap-3.5">
          {error && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Batch Name *</label>
            <input className={inputClass} placeholder="e.g. English Morning Batch" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Subject *</label>
            <select className={inputClass} value={form.subject} onChange={e => set('subject', e.target.value)}>
              <option value="">Select subject...</option>
              {SUBJECTS.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Assign Mentor *</label>
            <select className={inputClass} value={form.mentorId} onChange={e => set('mentorId', e.target.value)}>
              <option value="">Select mentor...</option>
              {mentors.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Assign Student *</label>
            <select className={inputClass} value={form.studentId} onChange={e => set('studentId', e.target.value)}>
              <option value="">Select student...</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.name} — {s.email}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Start Date</label>
            <input className={inputClass} type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Total Sessions</label>
            <input className={inputClass} type="number" min={1} value={form.totalSessions} onChange={e => set('totalSessions', e.target.value)} />
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-gray-100 flex gap-2.5 justify-end">
          <button className="px-5 py-2 rounded-[10px] bg-gray-100 text-gray-700 font-semibold text-[13px]" onClick={onClose}>Cancel</button>
          <button
            disabled={saving || !form.name || !form.subject || !form.mentorId || !form.studentId}
            className="px-5 py-2 rounded-[10px] bg-ops-primary text-white font-semibold text-[13px] disabled:opacity-50"
            onClick={handleSave}
          >
            {saving ? 'Creating...' : 'Create Batch'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export default function BatchesPage() {
  const navigate = useNavigate();
  const [batches, setBatches]       = useState([]);
  const [mentors, setMentors]       = useState([]);
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch]         = useState('');
  const [error, setError]           = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([batchService.getAll(), batchService.getMentors(), batchService.getStudents()])
      .then(([bRes, mRes, sRes]) => { setBatches(bRes.data); setMentors(mRes.data); setStudents(sRes.data); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtered = batches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.subject || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalStudents = batches.reduce((a, b) => a + (b.studentCount || 0), 0);
  const activeBatches = batches.filter(b => b.status === 'active').length;
  const avgCompletion = batches.length
    ? Math.round(batches.reduce((a, b) => a + ((b.completedSessions || 0) / (b.totalSessions || 1)) * 100, 0) / batches.length)
    : 0;

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Batch Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Click a batch to view enrolled students and manage them</p>
        </div>
        <button
          className="px-5 py-2.5 rounded-[10px] bg-ops-primary text-white font-semibold text-sm shadow-[0_4px_12px_rgba(124,58,237,0.3)]"
          onClick={() => setShowCreate(true)}
        >
          + Create Batch
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Batches',  value: batches.length,   color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Active',         value: activeBatches,    color: '#10b981', bg: '#d1fae5' },
          { label: 'Total Students', value: totalStudents,    color: '#0d9488', bg: '#f0fdfa' },
          { label: 'Avg Completion', value: `${avgCompletion}%`, color: '#f59e0b', bg: '#fef3c7' },
        ].map(c => (
          <div key={c.label} className="rounded-xl px-5 py-4 border border-black/[0.04]" style={{ background: c.bg }}>
            <p className="text-[22px] font-extrabold" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      <input
        className="px-4 py-2.5 rounded-xl border-[1.5px] border-gray-200 text-[13px] outline-none bg-white text-gray-700 focus:border-ops-primary transition-colors"
        placeholder="Search batches by name or course..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-3 gap-3.5">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-[14px] p-[18px] border border-gray-200 h-[220px] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold text-gray-600">No batches found</p>
          <p className="text-sm mt-1">{search ? 'Try a different search' : 'Create your first batch to get started'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3.5">
          {filtered.map(batch => {
            const pct = Math.round(((batch.completedSessions || 0) / (batch.totalSessions || 1)) * 100);
            return (
              <div
                key={batch._id}
                className="bg-white rounded-[14px] p-[18px] border border-gray-200 shadow-panel flex flex-col gap-0 cursor-pointer hover:border-ops-primary hover:shadow-[0_4px_16px_rgba(124,58,237,0.12)] transition-all duration-150"
                onClick={() => navigate(`/operations/batches/${batch._id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[15px] font-bold text-gray-900">{batch.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{batch.subject}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[batch.status] || STATUS_STYLE.active}`}>
                    {batch.status}
                  </span>
                </div>

                {batch.mentor && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-ops-lighter rounded-lg">
                    <div className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-ops-primary to-purple-400 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {batch.mentor.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <span className="text-[13px] text-gray-700 font-medium">{batch.mentor.name}</span>
                  </div>
                )}

                <div className="mb-3">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-gray-500">Session Progress</span>
                    <span className="text-xs font-bold text-ops-primary">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-ops-primary to-purple-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{batch.completedSessions || 0} / {batch.totalSessions} sessions</p>
                </div>

                <div className="flex border-t border-gray-100 pt-3">
                  {[
                    { label: 'Students', value: batch.studentCount ?? 0 },
                    { label: 'Start',    value: batch.startDate ? new Date(batch.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—' },
                    { label: 'End',      value: batch.endDate   ? new Date(batch.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })   : '—' },
                  ].map(st => (
                    <div key={st.label} className="flex-1 text-center">
                      <p className="text-[13px] font-bold text-gray-700">{st.value}</p>
                      <p className="text-[11px] text-gray-400">{st.label}</p>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-ops-primary/60 text-center mt-2 font-medium">Click to view details →</p>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateBatchModal
          mentors={mentors}
          students={students}
          onSave={() => { loadData(); setShowCreate(false); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
