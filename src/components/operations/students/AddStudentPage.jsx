import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService, mentorService, batchService } from '../../../services/api';

const backIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;

const inputClass = 'w-full px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-gray-200 text-[13px] text-gray-900 outline-none bg-white focus:border-ops-primary transition-colors';

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-gray-700">{label}</label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

const genPassword = () => `Catalyst@${Math.floor(1000 + Math.random() * 9000)}`;

export default function AddStudentPage() {
  const navigate = useNavigate();

  const [mentors, setMentors] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [form, setForm]       = useState({ name: '', email: '', phone: '', mentorId: '', batchId: '', password: genPassword() });
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    Promise.all([mentorService.getAll(), batchService.getAll()])
      .then(([mRes, bRes]) => {
        setMentors(mRes.data);
        setBatches(bRes.data);
      })
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, []);

  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: '' })); };

  const availableBatches = batches.filter((b) => !form.mentorId || b.mentor?._id === form.mentorId || b.mentorId === form.mentorId);

  const selectedMentor = mentors.find((m) => m._id === form.mentorId);
  const selectedBatch  = batches.find((b) => b._id === form.batchId);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name     = 'Name is required';
    if (!form.email.trim()) e.email    = 'Email is required';
    if (!form.password)     e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    setApiError('');
    try {
      const res = await studentService.create({
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        phone:    form.phone.trim() || undefined,
        batchId:  form.batchId || undefined,
        password: form.password,
      });
      // Backend returns `promoted: true` when a guest account was upgraded
      setSuccess(res.promoted ? 'promoted' : 'created');
      setTimeout(() => navigate('/operations/students'), 2500);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    const promoted = success === 'promoted';
    return (
      <div className="p-16 flex flex-col items-center gap-4 text-center">
        <div className="text-[64px]">{promoted ? '⬆️' : '🎉'}</div>
        <h2 className="text-[22px] font-extrabold text-gray-900">
          {promoted ? 'Guest Account Upgraded!' : 'Student Added Successfully!'}
        </h2>
        <p className="text-gray-500">
          {promoted
            ? 'The existing guest account has been promoted to a full student account.'
            : 'Redirecting you back to the students list...'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      <button className="flex items-center gap-1.5 text-ops-primary font-semibold text-sm" onClick={() => navigate('/operations/students')}>
        {backIcon} Back to Students
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-w-[760px]">
        <div className="px-7 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-extrabold text-gray-900">Add New Student</h2>
          <p className="text-sm text-gray-500 mt-1">Fill in the details to create a student account and assign them to a batch.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-7 flex flex-col gap-6">
          {apiError && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{apiError}</p>}

          {/* Personal Information */}
          <div className="flex flex-col gap-3.5">
            <h3 className="text-[13px] font-bold text-ops-primary uppercase tracking-[0.5px]">Personal Information</h3>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Full Name *" error={errors.name}>
                <input className={inputClass} type="text" placeholder="e.g. Riya Kapoor" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Email Address *" error={errors.email}>
                <input className={inputClass} type="email" placeholder="student@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="Phone Number" error={errors.phone}>
                <input className={inputClass} type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Enrollment Details */}
          <div className="flex flex-col gap-3.5">
            <h3 className="text-[13px] font-bold text-ops-primary uppercase tracking-[0.5px]">Enrollment Details</h3>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Assign Mentor" error={errors.mentorId}>
                <select
                  className={inputClass}
                  value={form.mentorId}
                  onChange={(e) => { set('mentorId', e.target.value); set('batchId', ''); }}
                  disabled={loadingData}
                >
                  <option value="">{loadingData ? 'Loading...' : 'Select mentor (optional)...'}</option>
                  {mentors.map((m) => (
                    <option key={m._id} value={m._id}>{m.name} — {m.specialization || 'General'}</option>
                  ))}
                </select>
              </Field>
              <Field label="Assign to Batch" error={errors.batchId}>
                <select
                  className={inputClass}
                  value={form.batchId}
                  onChange={(e) => set('batchId', e.target.value)}
                  disabled={loadingData || (!form.mentorId && availableBatches.length === 0)}
                >
                  <option value="">Select batch (optional)...</option>
                  {availableBatches.map((b) => (
                    <option key={b._id} value={b._id}>{b.name} — {b.course}</option>
                  ))}
                </select>
              </Field>
            </div>
            {selectedBatch && (
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-[13px] text-blue-700">
                Course: <span className="font-semibold">{selectedBatch.course}</span>
                {selectedBatch.status && <span className="ml-3 capitalize">· Status: {selectedBatch.status}</span>}
              </div>
            )}
          </div>

          {/* Mentor preview */}
          {selectedMentor && (
            <div className="flex items-center gap-3 px-4 py-3.5 bg-ops-lighter rounded-xl border border-ops-light">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ops-primary to-purple-400 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {selectedMentor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <p className="font-bold text-gray-900">{selectedMentor.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedMentor.specialization || 'General'}
                  {selectedMentor.batchCount != null ? ` · ${selectedMentor.batchCount} batch(es)` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Login Credentials */}
          <div className="flex flex-col gap-3.5">
            <h3 className="text-[13px] font-bold text-ops-primary uppercase tracking-[0.5px]">Login Credentials</h3>
            <Field label="Password *" error={errors.password}>
              <div className="relative">
                <input
                  className={inputClass}
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  style={{ paddingRight: '80px' }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200" onClick={() => setShowPwd(p => !p)}>
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" className="text-[11px] px-2 py-0.5 rounded bg-ops-lighter text-ops-primary hover:bg-ops-light" onClick={() => set('password', genPassword())}>
                    Gen
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">Share this with the student so they can log in to the student portal.</p>
            </Field>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm" onClick={() => navigate('/operations/students')}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-7 py-2.5 rounded-xl bg-ops-primary text-white font-bold text-sm shadow-[0_4px_14px_rgba(124,58,237,0.35)] disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Student Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
