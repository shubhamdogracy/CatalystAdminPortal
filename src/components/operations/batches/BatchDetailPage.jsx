import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { batchService } from '../../../services/api';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name = '') {
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

/* ── Change Student Modal ──────────────────────────────────── */
function ChangeStudentModal({ batchId, currentStudentId, onChanged, onClose }) {
  const [all, setAll]           = useState([]);
  const [selected, setSelected] = useState('');
  const [search, setSearch]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    batchService.getStudents()
      .then(res => setAll(res.data))
      .catch(err => setError(err.message));
  }, []);

  const filtered = all
    .filter(s => s._id !== currentStudentId)
    .filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    );

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await batchService.update(batchId, { studentId: selected });
      onChanged();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] backdrop-blur-sm">
      <div className="bg-white rounded-[18px] w-[480px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h3 className="text-base font-bold text-gray-900">Change Student</h3>
          <button className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-sm" onClick={onClose}>✕</button>
        </div>

        <div className="p-4 border-b border-gray-100 shrink-0">
          <input
            className="w-full px-3 py-2 rounded-lg border-[1.5px] border-gray-200 text-[13px] outline-none bg-gray-50 focus:border-ops-primary transition-colors"
            placeholder="Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded mx-4 mt-3 px-3 py-2">{error}</p>}
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No students found.</p>
          ) : (
            filtered.map(s => (
              <div
                key={s._id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors ${selected === s._id ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                onClick={() => setSelected(s._id)}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected === s._id ? 'bg-ops-primary border-ops-primary' : 'border-gray-300 bg-white'}`}>
                  {selected === s._id && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ops-primary to-purple-400 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  {initials(s.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">{s.name}</p>
                  <p className="text-[11px] text-gray-400 truncate">{s.email}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-gray-100 flex gap-2.5 justify-end shrink-0">
          <button className="px-5 py-2 rounded-[10px] bg-gray-100 text-gray-700 font-semibold text-[13px]" onClick={onClose}>Cancel</button>
          <button
            disabled={!selected || saving}
            className="px-5 py-2 rounded-[10px] bg-ops-primary text-white font-semibold text-[13px] disabled:opacity-40"
            onClick={handleSave}
          >
            {saving ? 'Saving...' : 'Change Student'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */
export default function BatchDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [batch, setBatch]                     = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [editMode, setEditMode]               = useState(false);
  const [showChangeStudent, setShowChangeStudent] = useState(false);

  const loadBatch = useCallback(() => {
    batchService.getById(id)
      .then(res => { setBatch(res.data); setError(''); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadBatch(); }, [loadBatch]);

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-10">
        <p className="text-5xl">🔍</p>
        <p className="text-lg font-bold text-gray-700">Batch not found</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="mt-2 px-5 py-2 rounded-[10px] bg-ops-primary text-white font-semibold text-sm" onClick={() => navigate('/operations/batches')}>
          Back to Batches
        </button>
      </div>
    );
  }

  const student  = batch.student;
  const students = student ? [student] : [];
  const mentor   = batch.mentor;
  const pct      = Math.round(((batch.completedSessions || 0) / (batch.totalSessions || 1)) * 100);

  return (
    <div className="p-6 flex flex-col gap-5 fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors" onClick={() => navigate('/operations/batches')}>←</button>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-gray-900">{batch.name}</h2>
          <p className="text-sm text-gray-500 capitalize">{batch.subject}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-[12px] font-semibold ${batch.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {batch.status}
        </span>
        <button
          className={`px-5 py-2 rounded-[10px] font-semibold text-sm transition-colors ${editMode ? 'bg-gray-200 text-gray-700' : 'bg-ops-primary text-white shadow-[0_4px_12px_rgba(124,58,237,0.3)]'}`}
          onClick={() => setEditMode(v => !v)}
        >
          {editMode ? 'Done Editing' : 'Edit Batch'}
        </button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Enrolled Student', value: students.length, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Session Progress', value: `${pct}%`,       color: '#10b981', bg: '#d1fae5' },
          { label: 'Start Date',       value: fmt(batch.startDate), color: '#0d9488', bg: '#f0fdfa' },
          { label: 'End Date',         value: fmt(batch.endDate),   color: '#f59e0b', bg: '#fef3c7' },
        ].map(c => (
          <div key={c.label} className="rounded-xl px-5 py-4 border border-black/[0.04]" style={{ background: c.bg }}>
            <p className="text-[20px] font-extrabold" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Mentor + Progress */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[14px] p-5 border border-gray-200 shadow-panel">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assigned Mentor</p>
          {mentor ? (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-ops-primary to-purple-400 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {initials(mentor.name)}
              </div>
              <div>
                <p className="text-[14px] font-bold text-gray-900">{mentor.name}</p>
                <p className="text-[12px] text-gray-500">{mentor.specialization || 'General'}</p>
                <p className="text-[11px] text-gray-400">{mentor.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No mentor assigned</p>
          )}
        </div>

        <div className="bg-white rounded-[14px] p-5 border border-gray-200 shadow-panel">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Session Progress</p>
          <div className="flex justify-between mb-2">
            <span className="text-[13px] text-gray-600">{batch.completedSessions || 0} of {batch.totalSessions} sessions</span>
            <span className="text-[13px] font-bold text-ops-primary">{pct}%</span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-ops-primary to-purple-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Batch ID: {batch.batchId || batch._id}</p>
        </div>
      </div>

      {/* Student section */}
      <div className="bg-white rounded-[14px] border border-gray-200 shadow-panel overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">Enrolled Student</h3>
            <p className="text-xs text-gray-400 mt-0.5">{students.length} student in this batch</p>
          </div>
          {editMode && (
            <button className="px-4 py-2 rounded-[10px] bg-ops-primary text-white font-semibold text-[13px] shadow-[0_4px_12px_rgba(124,58,237,0.25)]" onClick={() => setShowChangeStudent(true)}>
              ↔ Change Student
            </button>
          )}
        </div>

        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-2">
            <p className="text-3xl">👤</p>
            <p className="text-sm font-semibold text-gray-500">No student enrolled yet</p>
            {editMode && <p className="text-xs text-gray-400">Click "Change Student" to assign one</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {students.map(s => {
              const prog = s.progress || 0;
              const isActive = s.isActive !== false;
              return (
                <div key={s._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ops-primary/80 to-purple-400 text-white font-bold text-[12px] flex items-center justify-center shrink-0">
                    {initials(s.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900">{s.name}</p>
                    <p className="text-[12px] text-gray-400 truncate">{s.email}{s.phone ? ` · ${s.phone}` : ''}</p>
                  </div>
                  <div className="w-32 hidden sm:block">
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] text-gray-400">Progress</span>
                      <span className="text-[11px] font-bold text-ops-primary">{prog}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-ops-primary to-purple-400 rounded-full" style={{ width: `${prog}%` }} />
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                    {isActive ? 'active' : 'inactive'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showChangeStudent && (
        <ChangeStudentModal
          batchId={id}
          currentStudentId={student?._id}
          onChanged={() => { setShowChangeStudent(false); loadBatch(); }}
          onClose={() => setShowChangeStudent(false)}
        />
      )}
    </div>
  );
}
