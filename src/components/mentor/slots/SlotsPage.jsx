// ============================================================
// SLOTS PAGE — Create, edit, delete slots; calendar view
// ============================================================

import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

function MiniCalendar({ slots, selectedDate, onSelect }) {
  const [viewDate, setViewDate] = useState(new Date(2025, 3, 1));

  const year        = viewDate.getFullYear();
  const month       = viewDate.getMonth();
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  const slotDates = {};
  slots.forEach((s) => {
    if (!slotDates[s.date]) slotDates[s.date] = [];
    slotDates[s.date].push(s.status);
  });

  return (
    <div className="w-[300px] bg-white rounded-[14px] border border-gray-200 p-4 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <button className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 text-lg flex items-center justify-center leading-none" onClick={() => setViewDate(new Date(year, month - 1, 1))}>‹</button>
        <span className="text-sm font-bold text-gray-900">{monthNames[month]} {year}</span>
        <button className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 text-lg flex items-center justify-center leading-none" onClick={() => setViewDate(new Date(year, month + 1, 1))}>›</button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {dayNames.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-bold text-gray-400">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day        = i + 1;
          const iso        = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const hasSlots   = slotDates[iso];
          const isSelected = iso === selectedDate;
          const isToday    = iso === new Date().toISOString().split('T')[0];

          const dotColors = hasSlots
            ? [...new Set(hasSlots)].map((st) => st === 'booked' ? '#0d9488' : st === 'available' ? '#10b981' : '#9ca3af')
            : [];

          return (
            <button
              key={iso}
              className={`py-1 px-0.5 rounded-lg text-center text-xs flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
                isSelected ? 'bg-mentor-primary text-white font-bold' :
                isToday    ? 'bg-mentor-lighter text-mentor-primary font-bold' :
                'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => onSelect(isSelected ? null : iso)}
            >
              {day}
              {dotColors.length > 0 && (
                <div className="flex gap-0.5 justify-center">
                  {dotColors.slice(0, 3).map((c, di) => (
                    <span key={di} className="w-1 h-1 rounded-full block" style={{ background: c }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 justify-center mt-3 pt-3 border-t border-gray-100">
        {[{ color: '#0d9488', label: 'Booked' }, { color: '#10b981', label: 'Available' }, { color: '#9ca3af', label: 'Completed' }].map((l) => (
          <div key={l.label} className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full block" style={{ background: l.color }} />
            <span className="text-[11px] text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotModal({ slot, students, onSave, onClose }) {
  const [form, setForm] = useState({
    date:      slot?.date      || '',
    time:      slot?.time      || '',
    duration:  slot?.duration  || 60,
    type:      slot?.type      || 'open',
    studentId: slot?.studentId || '',
    topic:     slot?.topic     || '',
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] backdrop-blur-sm">
      <div className="bg-white rounded-[18px] w-[480px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">{slot ? 'Edit Slot' : 'Create New Slot'}</h3>
          <button className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-sm" onClick={onClose}>✕</button>
        </div>

        <div className="p-6 flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3.5">
            {[
              { label: 'Date *', type: 'date', key: 'date', isSelect: false },
              { label: 'Time *', type: 'time', key: 'time', isSelect: false },
            ].map(({ label, type, key }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">{label}</label>
                <input
                  className="px-3 py-2 rounded-[10px] border-[1.5px] border-gray-200 text-[13px] text-gray-900 outline-none"
                  type={type}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">Duration (minutes)</label>
              <select className="px-3 py-2 rounded-[10px] border-[1.5px] border-gray-200 text-[13px] text-gray-900 outline-none" value={form.duration} onChange={(e) => set('duration', Number(e.target.value))}>
                {[30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">Type</label>
              <select className="px-3 py-2 rounded-[10px] border-[1.5px] border-gray-200 text-[13px] text-gray-900 outline-none" value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="open">Open Slot</option>
                <option value="one-on-one">One-on-One</option>
              </select>
            </div>
          </div>

          {form.type === 'one-on-one' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">Assign to Student</label>
              <select className="px-3 py-2 rounded-[10px] border-[1.5px] border-gray-200 text-[13px] text-gray-900 outline-none" value={form.studentId} onChange={(e) => set('studentId', e.target.value)}>
                <option value="">Select student...</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Topic / Notes</label>
            <input
              className="px-3 py-2 rounded-[10px] border-[1.5px] border-gray-200 text-[13px] text-gray-900 outline-none"
              type="text"
              placeholder="e.g. React Hooks, Data Structures..."
              value={form.topic}
              onChange={(e) => set('topic', e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-gray-100 flex gap-2.5 justify-end">
          <button className="px-5 py-2 rounded-[10px] bg-gray-100 text-gray-700 font-semibold text-[13px]" onClick={onClose}>Cancel</button>
          <button className="px-5 py-2 rounded-[10px] bg-mentor-primary text-white font-semibold text-[13px]" onClick={() => onSave(form)}>
            {slot ? 'Update Slot' : 'Create Slot'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SlotCard({ slot, statusColor, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-3.5 border-b border-gray-100">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor[slot.status] || '#9ca3af' }} />
      <div className="w-20 shrink-0">
        <p className="text-sm font-bold text-gray-900">
          {new Date(slot.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
        </p>
        <p className="text-xs text-gray-500">{slot.time} · {slot.duration}min</p>
      </div>
      <div className="flex-1">
        {slot.studentName
          ? <p className="text-sm font-semibold text-gray-900">{slot.studentName}</p>
          : <p className="text-sm text-gray-400">Open Slot</p>}
        {slot.topic && <p className="text-xs text-gray-500 mt-0.5">{slot.topic}</p>}
      </div>
      <span
        className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
        style={{
          background: (statusColor[slot.status] || '#9ca3af') + '20',
          color: statusColor[slot.status] || '#9ca3af',
        }}
      >
        {slot.status}
      </span>
      {slot.status !== 'completed' && (
        <div className="flex gap-1.5">
          <button className="px-3 py-1 rounded-lg bg-mentor-lighter text-mentor-primary text-xs font-semibold border border-mentor-light" onClick={onEdit}>Edit</button>
          <button className="px-3 py-1 rounded-lg bg-red-50 text-red-500 text-xs font-semibold border border-red-200" onClick={onDelete}>Delete</button>
        </div>
      )}
    </div>
  );
}

export default function SlotsPage() {
  const { user } = useAuth();
  const [slots, setSlots]           = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal]   = useState(false);
  const [editSlot, setEditSlot]     = useState(null);
  const [view, setView]             = useState('list');

  const myStudents   = [];
  const visibleSlots = selectedDate ? slots.filter((s) => s.date === selectedDate) : slots;

  const handleSave = (form) => {
    if (editSlot) {
      setSlots((prev) => prev.map((s) => s.id === editSlot.id
        ? { ...s, ...form, studentName: myStudents.find(st => st.id === form.studentId)?.name || null }
        : s));
    } else {
      setSlots((prev) => [...prev, {
        id: `slot-${Date.now()}`, mentorId: user?.id, ...form,
        studentName: myStudents.find((st) => st.id === form.studentId)?.name || null,
        status: form.type === 'one-on-one' && form.studentId ? 'booked' : 'available',
      }]);
    }
    setShowModal(false);
    setEditSlot(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this slot?')) setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const statusColor = { booked: '#0d9488', available: '#10b981', completed: '#9ca3af' };

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Slot Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage your availability and bookings</p>
        </div>
        <div className="flex gap-2.5">
          <div className="flex bg-gray-100 rounded-[10px] p-0.5 gap-0.5">
            {['list', 'calendar'].map((v) => (
              <button
                key={v}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                  view === v ? 'bg-white text-mentor-primary font-bold shadow-sm' : 'text-gray-500'
                }`}
                onClick={() => setView(v)}
              >
                {v === 'list' ? '≡ List' : '📅 Calendar'}
              </button>
            ))}
          </div>
          <button
            className="px-5 py-2 rounded-[10px] bg-mentor-primary text-white font-semibold text-sm shadow-[0_4px_12px_rgba(13,148,136,0.3)]"
            onClick={() => { setEditSlot(null); setShowModal(true); }}
          >
            + Create Slot
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-3">
        {[
          { label: 'Total Slots', value: slots.length,                                  color: '#0d9488', bg: '#f0fdfa' },
          { label: 'Available',   value: slots.filter(s => s.status === 'available').length, color: '#10b981', bg: '#d1fae5' },
          { label: 'Booked',      value: slots.filter(s => s.status === 'booked').length,    color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Completed',   value: slots.filter(s => s.status === 'completed').length, color: '#6b7280', bg: '#f3f4f6' },
        ].map((c) => (
          <div key={c.label} className="flex-1 rounded-xl px-5 py-3.5 border border-black/5" style={{ background: c.bg }}>
            <p className="text-[22px] font-extrabold" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      {view === 'calendar' ? (
        <div className="flex gap-4">
          <MiniCalendar slots={slots} selectedDate={selectedDate} onSelect={setSelectedDate} />
          <div className="flex-1 bg-white rounded-[14px] border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-[15px] font-bold text-gray-900">
                {selectedDate
                  ? `Slots for ${new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}`
                  : 'Select a date from the calendar'}
              </h3>
              {selectedDate && <span className="text-[13px] text-gray-500">{visibleSlots.length} slot(s)</span>}
            </div>
            {visibleSlots.map((slot) => (
              <SlotCard key={slot.id} slot={slot} statusColor={statusColor}
                onEdit={() => { setEditSlot(slot); setShowModal(true); }}
                onDelete={() => handleDelete(slot.id)} />
            ))}
            {selectedDate && visibleSlots.length === 0 && (
              <div className="p-10 text-center text-gray-400">No slots on this day</div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[14px] border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-[15px] font-bold text-gray-900">All Slots</h3>
            {selectedDate && (
              <button className="text-[13px] text-red-500 font-semibold" onClick={() => setSelectedDate(null)}>Clear filter ✕</button>
            )}
          </div>
          {visibleSlots.length === 0
            ? <div className="p-10 text-center text-gray-400">No slots found</div>
            : visibleSlots.map((slot) => (
                <SlotCard key={slot.id} slot={slot} statusColor={statusColor}
                  onEdit={() => { setEditSlot(slot); setShowModal(true); }}
                  onDelete={() => handleDelete(slot.id)} />
              ))}
        </div>
      )}

      {showModal && (
        <SlotModal
          slot={editSlot}
          students={myStudents}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditSlot(null); }}
        />
      )}
    </div>
  );
}
