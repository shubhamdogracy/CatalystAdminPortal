import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mentorService } from '../../../services/api';

const backIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;

const SPECIALIZATIONS = [
  'Maths', 'English'
];

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

export default function AddMentorPage() {
  const navigate = useNavigate();

  const [form, setForm]       = useState({ name: '', email: '', phone: '', specialization: '', experience: '', linkedin: '', bio: '', password: genPassword() });
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())        e.name           = 'Name is required';
    if (!form.email.trim())       e.email          = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.specialization)     e.specialization = 'Please select a specialization';
    if (!form.experience.trim())  e.experience     = 'Experience is required';
    else if (isNaN(form.experience) || Number(form.experience) < 0) e.experience = 'Enter a valid number';
    if (!form.password.trim())    e.password       = 'Password is required';
    return e;
  };

  const initials = form.name.trim().split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    setApiError('');
    try {
      await mentorService.create({
        name:           form.name.trim(),
        email:          form.email.trim().toLowerCase(),
        phone:          form.phone.trim() || undefined,
        specialization: form.specialization,
        experience:     Number(form.experience),
        linkedin:       form.linkedin.trim() || undefined,
        bio:            form.bio.trim() || undefined,
        password:       form.password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/operations/mentors'), 2000);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="p-16 flex flex-col items-center gap-4 text-center">
        <div className="text-[64px]">🎉</div>
        <h2 className="text-[22px] font-extrabold text-gray-900">Mentor Added Successfully!</h2>
        <p className="text-gray-500">Redirecting you back to the mentors list...</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      <button className="flex items-center gap-1.5 text-ops-primary font-semibold text-sm" onClick={() => navigate('/operations/mentors')}>
        {backIcon} Back to Mentors
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-w-[760px]">
        <div className="px-7 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-extrabold text-gray-900">Add New Mentor</h2>
          <p className="text-sm text-gray-500 mt-1">Fill in the details to onboard a new mentor onto the platform.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-7 flex flex-col gap-6">
          {apiError && <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{apiError}</p>}

          {/* Personal Information */}
          <div className="flex flex-col gap-3.5">
            <h3 className="text-[13px] font-bold text-ops-primary uppercase tracking-[0.5px]">Personal Information</h3>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Full Name *" error={errors.name}>
                <input className={inputClass} type="text" placeholder="Enter full name" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Email Address *" error={errors.email}>
                <input className={inputClass} type="email" placeholder="mentor@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="Phone Number" error={errors.phone}>
                <input className={inputClass} type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="LinkedIn Profile" error={errors.linkedin}>
                <input className={inputClass} type="url" placeholder="https://linkedin.com/in/..." value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Professional Details */}
          <div className="flex flex-col gap-3.5">
            <h3 className="text-[13px] font-bold text-ops-primary uppercase tracking-[0.5px]">Professional Details</h3>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Specialization *" error={errors.specialization}>
                <select className={inputClass} value={form.specialization} onChange={(e) => set('specialization', e.target.value)}>
                  <option value="">Select specialization...</option>
                  {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Years of Experience *" error={errors.experience}>
                <input className={inputClass} type="number" min="0" max="50" placeholder="e.g. 5" value={form.experience} onChange={(e) => set('experience', e.target.value)} />
              </Field>
            </div>
            <Field label="Short Bio" error={errors.bio}>
              <textarea className={`${inputClass} min-h-[88px] resize-y`} placeholder="Brief professional background..." value={form.bio} onChange={(e) => set('bio', e.target.value)} />
            </Field>
          </div>

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
              <p className="text-[11px] text-gray-400 mt-0.5">Share this password with the mentor so they can log in.</p>
            </Field>
          </div>

          {/* Preview */}
          {form.name && (
            <div className="flex items-center gap-3 px-4 py-3.5 bg-ops-lighter rounded-xl border border-ops-light">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ops-primary to-purple-400 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {initials || '?'}
              </div>
              <div>
                <p className="font-bold text-gray-900">{form.name}</p>
                <p className="text-xs text-gray-500">
                  {form.specialization || 'No specialization selected'}
                  {form.experience ? ` · ${form.experience} yrs exp` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm" onClick={() => navigate('/operations/mentors')}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-7 py-2.5 rounded-xl bg-ops-primary text-white font-bold text-sm shadow-[0_4px_14px_rgba(124,58,237,0.35)] disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Mentor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
