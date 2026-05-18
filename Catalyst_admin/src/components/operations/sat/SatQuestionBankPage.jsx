import { useState, useEffect, useCallback } from 'react';
import { satAdminService } from '../../../services/api';
import MathContent from '../../common/MathContent';
import { SAT_TAXONOMY } from './examConfigConstants';

const DIFF_STYLE = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard:   'bg-red-100 text-red-700',
};
const SUBJ_STYLE = {
  math:            'bg-purple-100 text-purple-700',
  reading_writing: 'bg-blue-100 text-blue-700',
};
const SUBJ_LABEL = { math: 'Math', reading_writing: 'R&W' };

const Badge = ({ label, cls }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${cls}`}>{label}</span>
);

const inputCls = 'h-9 px-3 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary bg-white';

// ── Question Detail Modal ─────────────────────────────────────────────────────
function QuestionModal({ q, onClose }) {
  const opts = ['A', 'B', 'C', 'D'];
  const optMap = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge label={SUBJ_LABEL[q.subject] || q.subject} cls={SUBJ_STYLE[q.subject] || 'bg-gray-100 text-gray-600'} />
            <Badge label={q.difficulty} cls={DIFF_STYLE[q.difficulty] || 'bg-gray-100 text-gray-600'} />
            {q.format === 'grid_in' && <Badge label="Grid-In" cls="bg-orange-100 text-orange-700" />}
            <span className="text-xs text-gray-400">{q.topic} › {q.sub_topic}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 shrink-0">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Stem */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Question</p>
            <MathContent
              html={q.stem}
              className="text-gray-900 text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
            />
          </div>

          {/* Options (MCQ only) */}
          {q.format !== 'grid_in' && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Options</p>
              <div className="flex flex-col gap-2">
                {opts.filter(k => optMap[k]).map(k => (
                  <div
                    key={k}
                    className={`flex items-start gap-3 px-3 py-2 rounded-[10px] border text-sm
                      ${q.correct_answer?.toUpperCase() === k
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-gray-50'}`}
                  >
                    <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${q.correct_answer?.toUpperCase() === k ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {k}
                    </span>
                    <MathContent html={optMap[k]} className="[&_p]:m-0 text-gray-800" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid-in answer */}
          {q.format === 'grid_in' && q.correct_answer && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Correct Answer</p>
              <span className="inline-block px-3 py-1.5 rounded-[8px] bg-green-50 border border-green-300 text-green-800 font-mono text-sm">
                {q.correct_answer}
              </span>
            </div>
          )}

          {/* Explanation */}
          {q.explanation && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Explanation</p>
              <MathContent
                html={q.explanation}
                className="text-gray-700 text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 bg-gray-50 rounded-[10px] p-3"
              />
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 border-t border-gray-100 pt-3">
            {q.question_id  && <span>ID: <span className="text-gray-600 font-mono">{q.question_id}</span></span>}
            {q.skill_tag    && <span>Skill: <span className="text-gray-600">{q.skill_tag}</span></span>}
            {q.source       && <span>Source: <span className="text-gray-600">{q.source}</span></span>}
            {q.is_calculator_allowed !== undefined && (
              <span>Calculator: <span className="text-gray-600">{q.is_calculator_allowed ? 'Yes' : 'No'}</span></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Question Modal ───────────────────────────────────────────────────────
function EditQuestionModal({ q, onClose, onSaved }) {
  const [form, setForm] = useState({
    stem:           q.stem           || '',
    option_a:       q.option_a       || '',
    option_b:       q.option_b       || '',
    option_c:       q.option_c       || '',
    option_d:       q.option_d       || '',
    explanation:    q.explanation    || '',
    correct_answer: q.correct_answer || 'A',
    difficulty:     q.difficulty     || 'medium',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [preview, setPreview] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.stem.trim()) { setError('Question stem is required'); return; }
    setSaving(true); setError('');
    try {
      await satAdminService.updateQuestion(q._id, form);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const labelCls = 'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block';
  const areaCls  = 'w-full rounded-[10px] border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-ops-primary resize-none bg-white';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] w-full max-w-3xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900">Edit Question</h3>
            <button
              onClick={() => setPreview(p => !p)}
              className={`px-3 py-1 rounded-[8px] text-xs font-semibold transition-colors border ${
                preview ? 'bg-ops-primary text-white border-ops-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {preview ? 'Edit Mode' : 'Preview'}
            </button>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 shrink-0">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {preview ? (
            /* ── Preview pane ── */
            <div className="flex flex-col gap-4">
              <div>
                <p className={labelCls}>Question Stem</p>
                <div className="border border-gray-200 rounded-[10px] p-3 bg-gray-50">
                  <MathContent html={form.stem} className="text-gray-900 text-sm leading-relaxed [&_p]:mb-2" />
                </div>
              </div>
              {q.format !== 'grid_in' && (
                <div>
                  <p className={labelCls}>Options</p>
                  <div className="flex flex-col gap-2">
                    {['A', 'B', 'C', 'D'].map(k => {
                      const val = form[`option_${k.toLowerCase()}`];
                      if (!val) return null;
                      const isCorrect = form.correct_answer?.toUpperCase() === k;
                      return (
                        <div key={k} className={`flex items-start gap-3 px-3 py-2 rounded-[10px] border text-sm ${isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                          <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{k}</span>
                          <MathContent html={val} className="[&_p]:m-0 text-gray-800" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {form.explanation && (
                <div>
                  <p className={labelCls}>Explanation</p>
                  <div className="border border-gray-200 rounded-[10px] p-3 bg-gray-50">
                    <MathContent html={form.explanation} className="text-gray-700 text-sm leading-relaxed [&_p]:mb-2" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Edit pane ── */
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>Question Stem</label>
                <textarea rows={4} className={areaCls} value={form.stem} onChange={set('stem')} placeholder="Enter question stem (supports $LaTeX$ and HTML)" />
              </div>

              {q.format !== 'grid_in' && (
                <div className="grid grid-cols-2 gap-3">
                  {['A', 'B', 'C', 'D'].map(k => (
                    <div key={k}>
                      <label className={labelCls}>Option {k}</label>
                      <textarea rows={2} className={areaCls} value={form[`option_${k.toLowerCase()}`]} onChange={set(`option_${k.toLowerCase()}`)} placeholder={`Option ${k}`} />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Correct Answer</label>
                  <select className="h-9 px-3 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary w-full bg-white" value={form.correct_answer} onChange={set('correct_answer')}>
                    {(q.format === 'grid_in' ? [] : ['A', 'B', 'C', 'D']).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Difficulty</label>
                  <select className="h-9 px-3 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary w-full bg-white" value={form.difficulty} onChange={set('difficulty')}>
                    {['easy', 'medium', 'hard'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Explanation (optional)</label>
                <textarea rows={3} className={areaCls} value={form.explanation} onChange={set('explanation')} placeholder="Explanation (supports $LaTeX$ and HTML)" />
              </div>

              <p className="text-xs text-gray-400">Use <code className="bg-gray-100 px-1 rounded">$...$</code> for inline math and <code className="bg-gray-100 px-1 rounded">$$...$$</code> for display math.</p>
            </div>
          )}

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-[10px] px-3 py-2">{error}</p>}

          <div className="flex gap-3 justify-end border-t border-gray-100 pt-4">
            <button onClick={onClose} className="px-4 py-2 rounded-[10px] border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onDone }) {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    if (!file) { setError('Please select a file'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await satAdminService.bulkUpload(fd);
      setResult(res.data);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] w-full max-w-lg">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Upload Question Bank</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {!result ? (
            <>
              <p className="text-sm text-gray-500">Upload a <strong>CSV or Excel (.xlsx)</strong> file. Column headers are case-insensitive.</p>

              <div className="border-2 border-dashed border-gray-200 rounded-[12px] p-6 text-center">
                <div className="text-3xl mb-2">📄</div>
                <p className="text-sm text-gray-600 mb-3">{file ? file.name : 'No file selected'}</p>
                <label className="cursor-pointer px-4 py-2 rounded-[10px] bg-ops-lighter text-ops-primary text-sm font-semibold hover:bg-ops-light transition-colors">
                  {file ? 'Change File' : 'Choose File'}
                  <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" className="hidden" onChange={e => { setFile(e.target.files[0]); setError(''); }} />
                </label>
                <p className="text-xs text-gray-400 mt-3">
                  <span className="font-semibold text-gray-500 block mb-1">Required columns:</span>
                  subject, topic, sub_topic, difficulty, stem, correct_answer
                  <span className="font-semibold text-gray-500 block mt-2 mb-1">Optional columns:</span>
                  question_id, cb_question_id, cb_external_id, skill_tag, format, passage_id,
                  option_a–d, explanation, hint_1–3, review_status, source, is_calculator_allowed
                </p>
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-[10px] px-3 py-2">{error}</p>}

              <div className="flex gap-3 justify-end">
                <button onClick={onClose} className="px-4 py-2 rounded-[10px] border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSubmit} disabled={loading || !file} className="px-5 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {loading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Rows', val: result.total_rows, color: 'bg-gray-50' },
                  { label: 'Imported',   val: result.successful, color: 'bg-green-50 text-green-700' },
                  { label: 'Skipped',    val: result.failed,     color: 'bg-red-50 text-red-600' },
                ].map(c => (
                  <div key={c.label} className={`rounded-[12px] p-3 text-center ${c.color}`}>
                    <div className="text-2xl font-bold">{c.val}</div>
                    <div className="text-xs mt-0.5 text-gray-500">{c.label}</div>
                  </div>
                ))}
              </div>

              {result.row_errors?.length > 0 && (
                <div className="bg-red-50 rounded-[12px] p-3 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-600 mb-2">Skipped rows:</p>
                  {result.row_errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-500">Row {e.row_number}: {e.reason}</p>
                  ))}
                </div>
              )}

              <button onClick={onClose} className="w-full py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700">Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Deactivate Modal ──────────────────────────────────────────────────────────
function DeactivateModal({ q, onClose, onDeactivated, onCreateVersion }) {
  const [loading, setLoading]       = useState(true);
  const [servedCount, setServedCount] = useState(0);
  const [reason, setReason]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [step, setStep]             = useState('check');

  useEffect(() => {
    satAdminService.getServedCount(q._id)
      .then(r => {
        const count = r.data?.served_count ?? 0;
        setServedCount(count);
        setStep(count > 0 ? 'choose' : 'confirm');
      })
      .catch(() => setStep('confirm'))
      .finally(() => setLoading(false));
  }, [q._id]);

  const handleDeactivate = async () => {
    setSubmitting(true); setError('');
    try {
      await satAdminService.deactivateQuestion(q._id, { reason });
      onDeactivated();
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to deactivate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Deactivate Question</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-ops-primary border-t-transparent rounded-full animate-spin" />
              Checking if question has been served to students…
            </div>
          ) : step === 'choose' ? (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-[12px] px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">
                  This question has been served to {servedCount} student{servedCount !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Past responses and scores will not be affected. Choose how to proceed:
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                  Reason for deactivation (optional)
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-[10px] border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-ops-primary resize-none"
                  placeholder="e.g. Wrong answer key, ambiguous wording…"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-[10px] px-3 py-2">{error}</p>}

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { onCreateVersion(q, reason); onClose(); }}
                  className="w-full py-2.5 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                >
                  Deactivate &amp; Create Corrected Version (v{(q.version || 1) + 1})
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-[10px] border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Deactivating…' : 'Deactivate Only (no replacement)'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                This question has not been served to any student. It will be deactivated and removed from future assignments.
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Reason (optional)</label>
                <textarea
                  rows={2}
                  className="w-full rounded-[10px] border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-ops-primary resize-none"
                  placeholder="e.g. Duplicate, incorrect content…"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500 bg-red-50 rounded-[10px] px-3 py-2">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button onClick={onClose} className="px-4 py-2 rounded-[10px] border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={handleDeactivate}
                  disabled={submitting}
                  className="px-5 py-2 rounded-[10px] bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Deactivating…' : 'Confirm Deactivate'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Version Modal ─────────────────────────────────────────────────────────
function NewVersionModal({ q, prefillReason, onClose, onCreated }) {
  const [form, setForm] = useState({
    stem:           q.stem           || '',
    option_a:       q.option_a       || '',
    option_b:       q.option_b       || '',
    option_c:       q.option_c       || '',
    option_d:       q.option_d       || '',
    explanation:    q.explanation    || '',
    correct_answer: q.correct_answer || 'A',
    difficulty:     q.difficulty     || 'medium',
  });
  const [deactivateReason, setDeactivateReason] = useState(prefillReason || '');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [preview, setPreview] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const newVersion = (q.version || 1) + 1;

  const handleSave = async () => {
    if (!form.stem.trim()) { setError('Question stem is required'); return; }
    setSaving(true); setError('');
    try {
      await satAdminService.createNewVersion(q._id, { ...form, deactivate_reason: deactivateReason });
      onCreated();
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to create new version');
    } finally {
      setSaving(false);
    }
  };

  const labelCls = 'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block';
  const areaCls  = 'w-full rounded-[10px] border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-ops-primary resize-none bg-white';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] w-full max-w-3xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900">Create Version {newVersion}</h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ops-lighter text-ops-primary">
              v{newVersion}
            </span>
            <button
              onClick={() => setPreview(p => !p)}
              className={`px-3 py-1 rounded-[8px] text-xs font-semibold transition-colors border ${
                preview ? 'bg-ops-primary text-white border-ops-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {preview ? 'Edit Mode' : 'Preview'}
            </button>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 shrink-0">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="bg-blue-50 border border-blue-200 rounded-[12px] px-4 py-3 text-xs text-blue-700">
            <p className="font-semibold mb-0.5">v{q.version || 1} will be deactivated and replaced by v{newVersion}.</p>
            <p>Past student responses remain linked to v{q.version || 1} and are unaffected. New students will receive v{newVersion}.</p>
          </div>

          <div>
            <label className={labelCls}>Reason for deactivating v{q.version || 1} (optional)</label>
            <input
              className="h-9 w-full px-3 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary bg-white"
              placeholder="e.g. Wrong answer key, ambiguous wording…"
              value={deactivateReason}
              onChange={e => setDeactivateReason(e.target.value)}
            />
          </div>

          {preview ? (
            <div className="flex flex-col gap-4">
              <div>
                <p className={labelCls}>Question Stem</p>
                <div className="border border-gray-200 rounded-[10px] p-3 bg-gray-50">
                  <MathContent html={form.stem} className="text-gray-900 text-sm leading-relaxed [&_p]:mb-2" />
                </div>
              </div>
              {q.format !== 'grid_in' && (
                <div>
                  <p className={labelCls}>Options</p>
                  <div className="flex flex-col gap-2">
                    {['A', 'B', 'C', 'D'].map(k => {
                      const val = form[`option_${k.toLowerCase()}`];
                      if (!val) return null;
                      const isCorrect = form.correct_answer?.toUpperCase() === k;
                      return (
                        <div key={k} className={`flex items-start gap-3 px-3 py-2 rounded-[10px] border text-sm ${isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                          <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{k}</span>
                          <MathContent html={val} className="[&_p]:m-0 text-gray-800" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {form.explanation && (
                <div>
                  <p className={labelCls}>Explanation</p>
                  <div className="border border-gray-200 rounded-[10px] p-3 bg-gray-50">
                    <MathContent html={form.explanation} className="text-gray-700 text-sm leading-relaxed [&_p]:mb-2" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>Question Stem</label>
                <textarea rows={4} className={areaCls} value={form.stem} onChange={set('stem')} placeholder="Enter question stem (supports $LaTeX$ and HTML)" />
              </div>

              {q.format !== 'grid_in' && (
                <div className="grid grid-cols-2 gap-3">
                  {['A', 'B', 'C', 'D'].map(k => (
                    <div key={k}>
                      <label className={labelCls}>Option {k}</label>
                      <textarea rows={2} className={areaCls} value={form[`option_${k.toLowerCase()}`]} onChange={set(`option_${k.toLowerCase()}`)} placeholder={`Option ${k}`} />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Correct Answer</label>
                  <select className="h-9 px-3 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary w-full bg-white" value={form.correct_answer} onChange={set('correct_answer')}>
                    {(q.format === 'grid_in' ? [] : ['A', 'B', 'C', 'D']).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Difficulty</label>
                  <select className="h-9 px-3 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-ops-primary w-full bg-white" value={form.difficulty} onChange={set('difficulty')}>
                    {['easy', 'medium', 'hard'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Explanation (optional)</label>
                <textarea rows={3} className={areaCls} value={form.explanation} onChange={set('explanation')} placeholder="Explanation (supports $LaTeX$ and HTML)" />
              </div>

              <p className="text-xs text-gray-400">Use <code className="bg-gray-100 px-1 rounded">$...$</code> for inline math and <code className="bg-gray-100 px-1 rounded">$$...$$</code> for display math.</p>
            </div>
          )}

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-[10px] px-3 py-2">{error}</p>}

          <div className="flex gap-3 justify-end border-t border-gray-100 pt-4">
            <button onClick={onClose} className="px-4 py-2 rounded-[10px] border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : `Publish v${newVersion}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Version History Modal ─────────────────────────────────────────────────────
function VersionHistoryModal({ q, onClose }) {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    satAdminService.getVersionHistory(q._id)
      .then(r => setHistory(r.data))
      .catch(() => setHistory([q]))
      .finally(() => setLoading(false));
  }, [q._id]);

  const sorted = [...history].sort((a, b) => (b.version || 1) - (a.version || 1));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-bold text-gray-900">Version History</h3>
            <p className="text-xs text-gray-400 mt-0.5">{history.length} version{history.length !== 1 ? 's' : ''} in chain</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-[12px] animate-pulse" />)}
            </div>
          ) : (
            <div className="flex flex-col">
              {sorted.map((v, idx) => {
                const isLatest    = idx === 0;
                const isExpanded  = expanded === v._id;
                const isDeactivated = v.status === 'deactivated';
                return (
                  <div key={v._id} className="relative pl-8">
                    {idx < sorted.length - 1 && (
                      <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    <div className={`absolute left-1.5 top-4 w-3 h-3 rounded-full border-2 ${
                      isLatest ? 'bg-ops-primary border-ops-primary' :
                      isDeactivated ? 'bg-red-400 border-red-400' :
                      'bg-gray-300 border-gray-300'
                    }`} />

                    <div className={`mb-4 rounded-[12px] border ${isLatest ? 'border-ops-primary/30 bg-ops-lighter/20' : 'border-gray-200 bg-gray-50'}`}>
                      <div
                        className="px-4 py-3 flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setExpanded(isExpanded ? null : v._id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isLatest ? 'bg-ops-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                            v{v.version || 1}
                          </span>
                          {isLatest  && <span className="text-[11px] font-semibold text-ops-primary">Latest</span>}
                          {isDeactivated && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-600">Deactivated</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {v.deactivated_at
                              ? `Deactivated ${new Date(v.deactivated_at).toLocaleDateString()}`
                              : v.createdAt
                                ? `Created ${new Date(v.createdAt).toLocaleDateString()}`
                                : ''}
                          </span>
                        </div>
                        <span className="text-gray-400 text-xs ml-2">{isExpanded ? '▲' : '▼'}</span>
                      </div>

                      {v.deactivated_reason && (
                        <div className="px-4 pb-2">
                          <p className="text-xs text-red-500 italic">Reason: {v.deactivated_reason}</p>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3 flex flex-col gap-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Question Stem</p>
                            <MathContent html={v.stem} className="text-gray-900 text-sm leading-relaxed [&_p]:mb-2" />
                          </div>
                          {v.format !== 'grid_in' && (
                            <div className="flex flex-col gap-1.5">
                              {['A', 'B', 'C', 'D'].map(k => {
                                const val = v[`option_${k.toLowerCase()}`];
                                if (!val) return null;
                                const isCorrect = v.correct_answer?.toUpperCase() === k;
                                return (
                                  <div key={k} className={`flex items-start gap-2 px-3 py-1.5 rounded-[8px] border text-xs ${isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                    <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>{k}</span>
                                    <MathContent html={val} className="[&_p]:m-0 text-gray-700" />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {v.explanation && (
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Explanation</p>
                              <MathContent html={v.explanation} className="text-gray-600 text-xs leading-relaxed bg-gray-50 rounded-[8px] p-2 [&_p]:mb-1" />
                            </div>
                          )}
                          {v.served_count !== undefined && (
                            <p className="text-xs text-gray-400">Served to {v.served_count} student{v.served_count !== 1 ? 's' : ''}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SatQuestionBankPage() {
  const [questions, setQuestions]   = useState([]);
  const [stats, setStats]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [showUpload, setShowUpload]           = useState(false);
  const [selected, setSelected]               = useState(null);
  const [editing, setEditing]                 = useState(null);
  const [deactivating, setDeactivating]       = useState(null);
  const [creatingVersion, setCreatingVersion] = useState(null);
  const [versionPrefillReason, setVersionPrefillReason] = useState('');
  const [viewingHistory, setViewingHistory]   = useState(null);

  const [filters, setFilters] = useState({ subject: '', topic: '', sub_topic: '', question_id: '' });
  const LIMIT = 20;

  const topicOptions    = filters.subject ? Object.keys(SAT_TAXONOMY[filters.subject] || {}) : [];
  const subTopicOptions = filters.subject && filters.topic ? (SAT_TAXONOMY[filters.subject]?.[filters.topic] || []) : [];

  const loadStats = useCallback(async () => {
    try { const r = await satAdminService.getStats(); setStats(r.data); } catch {
      console.error('Failed to load stats');
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filters.subject)     params.subject     = filters.subject;
      if (filters.topic)       params.topic       = filters.topic;
      if (filters.sub_topic)   params.sub_topic   = filters.sub_topic;
      if (filters.question_id) params.question_id = filters.question_id;
      const r = await satAdminService.getQuestions(params);
      setQuestions(r.data);
      setTotal(r.total);
    } catch {
      console.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadQuestions(); }, [loadQuestions]);


  const totalActive = stats.reduce((s, r) => s + r.count, 0);
  const mathTotal   = stats.filter(r => r._id.subject === 'math').reduce((s, r) => s + r.count, 0);
  const rwTotal     = stats.filter(r => r._id.subject === 'reading_writing').reduce((s, r) => s + r.count, 0);
  const byDiff      = ['easy', 'medium', 'hard'].map(d => ({ d, count: stats.filter(r => r._id.difficulty === d).reduce((s, r) => s + r.count, 0) }));

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">SAT Question Bank</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and upload questions used for adaptive test assembly</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
          <span className="text-base">↑</span> Upload Questions
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Active',      val: totalActive, icon: '📚', color: 'text-ops-primary' },
          { label: 'Math',              val: mathTotal,   icon: '📐', color: 'text-purple-600' },
          { label: 'Reading & Writing', val: rwTotal,     icon: '📖', color: 'text-blue-600' },
          ...byDiff.map(({ d, count }) => ({
            label: d.charAt(0).toUpperCase() + d.slice(1),
            val:   count,
            icon:  d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴',
            color: 'text-gray-700',
          })),
        ].slice(0, 4).map((c, i) => (
          <div key={i} className="bg-white rounded-[14px] border border-gray-200 p-4 flex items-center gap-3">
            <span className="text-2xl">{c.icon}</span>
            <div>
              <div className={`text-2xl font-bold ${c.color}`}>{c.val}</div>
              <div className="text-xs text-gray-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Difficulty breakdown */}
      <div className="bg-white rounded-[14px] border border-gray-200 p-4 flex gap-6 items-center">
        <span className="text-sm font-semibold text-gray-600 shrink-0">By Difficulty:</span>
        {byDiff.map(({ d, count }) => (
          <div key={d} className="flex items-center gap-2">
            <Badge label={d} cls={DIFF_STYLE[d]} />
            <span className="text-sm font-bold text-gray-700">{count}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[14px] border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        {/* Subject */}
        <select
          className={inputCls}
          value={filters.subject}
          onChange={e => {
            setFilters(f => ({ ...f, subject: e.target.value, topic: '', sub_topic: '' }));
            setPage(1);
          }}
        >
          <option value="">All Subjects</option>
          <option value="math">Math</option>
          <option value="reading_writing">Reading &amp; Writing</option>
        </select>

        {/* Topic — enabled only when subject is selected */}
        <select
          className={inputCls}
          value={filters.topic}
          disabled={!filters.subject}
          onChange={e => {
            setFilters(f => ({ ...f, topic: e.target.value, sub_topic: '' }));
            setPage(1);
          }}
        >
          <option value="">All Topics</option>
          {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Sub-topic — enabled only when topic is selected */}
        <select
          className={inputCls}
          value={filters.sub_topic}
          disabled={!filters.topic}
          onChange={e => { setFilters(f => ({ ...f, sub_topic: e.target.value })); setPage(1); }}
        >
          <option value="">All Sub-topics</option>
          {subTopicOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Search by Question ID */}
        <input
          className={`${inputCls} w-48`}
          placeholder="Search by Question ID…"
          value={filters.question_id}
          onChange={e => { setFilters(f => ({ ...f, question_id: e.target.value })); setPage(1); }}
        />

        <span className="ml-auto text-sm text-gray-400">{total} question{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 flex flex-col gap-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold text-gray-600">No questions found</p>
            <p className="text-sm mt-1">Upload a file or adjust your filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Question', 'Subject', 'Difficulty', 'Topic', 'Sub Topic', 'Ver.', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {questions.map(q => (
                <tr
                  key={q._id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelected(q)}
                >
                  <td className="px-4 py-3 max-w-xs">
                    <MathContent
                      html={q.stem}
                      className="text-gray-900 text-sm line-clamp-2 [&_p]:m-0 [&_.katex]:text-sm"
                    />
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <Badge label={SUBJ_LABEL[q.subject] || q.subject} cls={SUBJ_STYLE[q.subject] || 'bg-gray-100 text-gray-600'} />
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <Badge label={q.difficulty} cls={DIFF_STYLE[q.difficulty] || 'bg-gray-100 text-gray-600'} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{q.topic}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{q.sub_topic}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500">
                      v{q.version || 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewingHistory(q)}
                        className="px-3 py-1 rounded-[8px] text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        History
                      </button>
                      <button
                        onClick={() => setDeactivating(q)}
                        className="px-3 py-1 rounded-[8px] text-xs text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
                      >
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
            {/* Prev */}
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-[8px] border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50"
            >← Prev</button>

            {/* Numbered pages */}
            {(() => {
              const pages = [];
              const near = new Set(
                [1, 2, page - 1, page, page + 1, totalPages - 1, totalPages].filter(p => p >= 1 && p <= totalPages)
              );
              const sorted = [...near].sort((a, b) => a - b);
              let prev = null;
              for (const p of sorted) {
                if (prev !== null && p - prev > 1) pages.push('...');
                pages.push(p);
                prev = p;
              }
              return pages.map((p, i) =>
                p === '...'
                  ? <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
                  : <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-[32px] px-2 py-1.5 rounded-[8px] border text-xs transition-colors
                        ${p === page
                          ? 'bg-ops-primary text-white border-ops-primary font-semibold'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                    >{p}</button>
              );
            })()}

            {/* Next */}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-[8px] border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50"
            >Next →</button>

            {/* Go to page */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">Go to page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                defaultValue={page}
                key={page}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const v = Math.min(Math.max(1, Number(e.target.value)), totalPages);
                    setPage(v);
                  }
                }}
                className="w-14 h-7 px-2 rounded-[8px] border border-gray-200 text-xs text-center focus:outline-none focus:border-ops-primary"
              />
              <span className="text-xs text-gray-400">of {totalPages}</span>
            </div>
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onDone={() => { loadQuestions(); loadStats(); }}
        />
      )}

      {selected && <QuestionModal q={selected} onClose={() => setSelected(null)} />}
      {editing && (
        <EditQuestionModal
          q={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { loadQuestions(); loadStats(); }}
        />
      )}
      {deactivating && (
        <DeactivateModal
          q={deactivating}
          onClose={() => setDeactivating(null)}
          onDeactivated={() => { loadQuestions(); loadStats(); }}
          onCreateVersion={(q, reason) => {
            setCreatingVersion(q);
            setVersionPrefillReason(reason);
          }}
        />
      )}
      {creatingVersion && (
        <NewVersionModal
          q={creatingVersion}
          prefillReason={versionPrefillReason}
          onClose={() => { setCreatingVersion(null); setVersionPrefillReason(''); }}
          onCreated={() => { loadQuestions(); loadStats(); }}
        />
      )}
      {viewingHistory && (
        <VersionHistoryModal
          q={viewingHistory}
          onClose={() => setViewingHistory(null)}
        />
      )}
    </div>
  );
}
