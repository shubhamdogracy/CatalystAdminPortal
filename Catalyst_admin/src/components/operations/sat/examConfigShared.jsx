// ============================================================
// SAT EXAM CONFIG — Shared sub-components (components only)
// ============================================================

import { useState } from 'react';
import { satAdminService } from '../../../services/api';
import {
  inputCls, labelCls, numCls,
  SUBJ_STYLE, SUBJ_LABEL, TYPE_STYLE, SAT_TAXONOMY,
  diffSum, emptySubjectCfg, cfgFromExisting,
} from './examConfigConstants';

// ── Module 1 Config ───────────────────────────────────────────────────────────
export function Module1Config({ value, onChange }) {
  const total    = Number(value.total_questions) || 0;
  const used     = diffSum(value.difficulty_distribution);
  const exceeded = total > 0 && used > total;

  return (
    <div className={`bg-gray-50 rounded-[12px] p-4 flex flex-col gap-3 ${exceeded ? 'ring-1 ring-red-400' : ''}`}>
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Module 1 — Same for Everyone</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Total Questions</label>
          <input type="number" min="1" className={numCls} value={value.total_questions}
            onChange={e => onChange({ ...value, total_questions: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Time (minutes)</label>
          <input type="number" min="1" className={numCls} value={value.time_limit_minutes}
            onChange={e => onChange({ ...value, time_limit_minutes: e.target.value })} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls}>Difficulty Distribution (# of questions)</label>
          {total > 0 && (
            <span className={`text-[10px] font-semibold ${exceeded ? 'text-red-600' : 'text-gray-400'}`}>
              {used}/{total}{exceeded ? ' — exceeds total!' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {['easy', 'medium', 'hard'].map(d => (
            <div key={d} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize
                ${d === 'easy' ? 'bg-green-100 text-green-700' : d === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                {d}
              </span>
              <input type="number" min="0"
                className={`${numCls} ${exceeded ? 'border-red-300' : ''}`}
                value={value.difficulty_distribution[d]}
                onChange={e => onChange({ ...value, difficulty_distribution: { ...value.difficulty_distribution, [d]: e.target.value } })} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Subject Section (M1 + adaptive threshold + M2a + M2b) ────────────────────
export function SubjectSection({ title, borderCls, headerCls, value, onChange }) {
  const total  = Number(value.m1.total_questions) || 0;
  const update = (key, val) => onChange({ ...value, [key]: val });

  const m2Block = (key) => {
    const tier   = value[key];
    const used   = diffSum(tier.difficulty);
    const ok     = total > 0 && used === total;
    const isEasy = key === 'm2a';
    return (
      <div className={`bg-gray-50 rounded-[12px] p-4 flex flex-col gap-3 ${total > 0 && used > total ? 'ring-1 ring-red-400' : ''}`}>
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            {isEasy ? 'Module 2a — Easy Tier' : 'Module 2b — Hard Tier'}
          </p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isEasy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isEasy ? '2a' : '2b'}
          </span>
          <span className="ml-auto text-[10px] text-gray-400">
            {isEasy ? `M1 score < ${value.threshold}%` : `M1 score ≥ ${value.threshold}%`}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Total Questions</label>
            <div className="h-9 w-20 flex items-center justify-center rounded-[10px] border border-gray-200 text-sm bg-gray-100 text-gray-400">{total || '—'}</div>
            <p className="text-[10px] text-gray-400">From Module 1</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Time (minutes)</label>
            <input type="number" min="1" className={numCls} value={tier.time_limit_minutes}
              onChange={e => update(key, { ...tier, time_limit_minutes: e.target.value })} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls}>Difficulty Distribution (# questions)</label>
            {total > 0 && (
              <span className={`text-[10px] font-semibold ${ok ? 'text-green-600' : used > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {used}/{total}{ok ? ' ✓' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {['easy', 'medium', 'hard'].map(d => (
              <div key={d} className="flex flex-col items-center gap-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize
                  ${d === 'easy' ? 'bg-green-100 text-green-700' : d === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {d}
                </span>
                <input type="number" min="0" className={numCls}
                  value={tier.difficulty[d]}
                  onChange={e => update(key, { ...tier, difficulty: { ...tier.difficulty, [d]: e.target.value } })} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`border-2 ${borderCls} rounded-[14px] overflow-hidden flex flex-col h-full`}>
      <div className={`px-4 py-2.5 ${headerCls} shrink-0`}>
        <p className="text-xs font-bold uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-4 flex flex-col gap-4 overflow-y-auto" style={{ flex: '1 1 0', minHeight: 0 }}>
        <Module1Config value={value.m1} onChange={m1 => update('m1', m1)} />
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-[10px] px-3 py-2.5">
          <label className={`${labelCls} shrink-0`}>Adaptive Threshold</label>
          <input type="number" min="0" max="100" className={numCls} value={value.threshold}
            onChange={e => update('threshold', e.target.value)} />
          <span className="text-xs text-amber-700">% on M1 → ≥ this: Hard (2b) · below: Easy (2a)</span>
        </div>
        {m2Block('m2a')}
        {m2Block('m2b')}
      </div>
    </div>
  );
}

// ── Create / Edit Diagnostic or Mock Config Modal ─────────────────────────────
// `lockedType` — when provided, the type selector is replaced with a read-only display
export function CreateSubjectModal({ onClose, onSaved, existing, defaultType, lockedType }) {
  const isEdit = !!existing;

  const [name,    setName]    = useState(isEdit ? existing.name : '');
  const [type,    setType]    = useState(lockedType || existing?.type || defaultType || 'mock');
  const [rwCfg,   setRwCfg]   = useState(isEdit && existing.subject === 'reading_writing' ? cfgFromExisting(existing) : emptySubjectCfg());
  const [mathCfg, setMathCfg] = useState(isEdit && existing.subject === 'math'            ? cfgFromExisting(existing) : emptySubjectCfg());
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const buildPayload = (subjectName, subject, cfg) => {
    const total  = Number(cfg.m1.total_questions);
    const toDiff = (d) => ({ easy: Number(d.easy||0), medium: Number(d.medium||0), hard: Number(d.hard||0) });
    const toPct  = (n) => total > 0 ? Math.round((n / total) * 100) : 0;
    const m2aDiff = toDiff(cfg.m2a.difficulty);
    const m2bDiff = toDiff(cfg.m2b.difficulty);
    return {
      name: subjectName, subject, type,
      adaptive_threshold: Number(cfg.threshold),
      module_1: { total_questions: total, time_limit_minutes: Number(cfg.m1.time_limit_minutes), difficulty_distribution: toDiff(cfg.m1.difficulty_distribution) },
      module_2_easy:   { total_questions: total, time_limit_minutes: Number(cfg.m2a.time_limit_minutes), difficulty_distribution: m2aDiff },
      module_2_medium: { total_questions: total, time_limit_minutes: Number(cfg.m2a.time_limit_minutes), difficulty_distribution: m2aDiff },
      module_2_hard:   { total_questions: total, time_limit_minutes: Number(cfg.m2b.time_limit_minutes), difficulty_distribution: m2bDiff },
      score_bands: [
        { min_score: Number(cfg.threshold), label: 'Hard Tier', easy_pct: toPct(m2bDiff.easy), medium_pct: toPct(m2bDiff.medium), hard_pct: toPct(m2bDiff.hard) },
        { min_score: 0,                     label: 'Easy Tier', easy_pct: toPct(m2aDiff.easy), medium_pct: toPct(m2aDiff.medium), hard_pct: toPct(m2aDiff.hard) },
      ],
    };
  };

  const validateSubject = (label, cfg) => {
    const total = Number(cfg.m1.total_questions);
    if (!total)                              return `${label}: Module 1 total questions required.`;
    if (!Number(cfg.m1.time_limit_minutes))  return `${label}: Module 1 time required.`;
    if (diffSum(cfg.m1.difficulty_distribution) > total) return `${label}: Module 1 distribution exceeds total.`;
    if (!Number(cfg.m2a.time_limit_minutes)) return `${label}: Module 2a time required.`;
    if (diffSum(cfg.m2a.difficulty) !== total) return `${label}: Module 2a distribution must equal ${total}Q.`;
    if (!Number(cfg.m2b.time_limit_minutes)) return `${label}: Module 2b time required.`;
    if (diffSum(cfg.m2b.difficulty) !== total) return `${label}: Module 2b distribution must equal ${total}Q.`;
    return null;
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    if (isEdit) {
      const cfg = existing.subject === 'math' ? mathCfg : rwCfg;
      const err = validateSubject(existing.subject === 'math' ? 'Math' : 'R&W', cfg);
      if (err) { setError(err); return; }
      setLoading(true); setError('');
      try {
        await satAdminService.updateExamConfig(existing._id, buildPayload(name, existing.subject, cfg));
        onSaved(); onClose();
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    } else {
      const errRw   = validateSubject('R&W',  rwCfg);
      const errMath = validateSubject('Math', mathCfg);
      if (errRw)   { setError(errRw);   return; }
      if (errMath) { setError(errMath); return; }
      setLoading(true); setError('');
      try {
        await Promise.all([
          satAdminService.createExamConfig(buildPayload(`${name} — Reading & Writing`, 'reading_writing', rwCfg)),
          satAdminService.createExamConfig(buildPayload(`${name} — Math`, 'math', mathCfg)),
        ]);
        onSaved(); onClose();
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    }
  };

  const typeLabel = type === 'diagnostic' ? 'Diagnostic' : 'Mock';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] w-full max-w-3xl flex flex-col" style={{ height: '90vh' }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100" style={{ flexShrink: 0 }}>
          <h3 className="text-base font-bold text-gray-900">
            {isEdit ? `Edit — ${existing.subject === 'math' ? 'Math' : 'Reading & Writing'}` : `Create ${typeLabel} Test`}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>
        <div className="px-6 pt-5 flex flex-col gap-4" style={{ flex: '1 1 0', overflow: 'hidden', minHeight: 0 }}>
          <div className="grid grid-cols-2 gap-4 shrink-0">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{isEdit ? 'Test Name' : 'Series Name'}</label>
              <input className={inputCls}
                placeholder={isEdit ? '' : 'e.g. SAT Mock 1  →  creates Math & R&W versions'}
                value={name} onChange={e => setName(e.target.value)} />
              {!isEdit && name && (
                <p className="text-[10px] text-indigo-500">"{name} — Math" + "{name} — Reading &amp; Writing"</p>
              )}
            </div>
            {!lockedType && (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Test Type</label>
                <select className={inputCls} value={type} onChange={e => setType(e.target.value)} disabled={isEdit}>
                  <option value="mock">Mock</option>
                  <option value="diagnostic">Diagnostic</option>
                </select>
                {type === 'diagnostic' && <p className="text-[10px] text-orange-600">Standard: R&amp;W 11–11Q · Math 9–9Q per module</p>}
              </div>
            )}
            {lockedType && type === 'diagnostic' && (
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Test Type</label>
                <div className="h-9 px-3 rounded-[10px] border border-gray-200 text-sm bg-gray-50 text-gray-500 flex items-center">Diagnostic</div>
                <p className="text-[10px] text-orange-600">Standard: R&amp;W 11–11Q · Math 9–9Q per module</p>
              </div>
            )}
          </div>

          {isEdit ? (
            <div style={{ flex: '1 1 0', minHeight: 0 }} className="pb-5">
              {existing.subject === 'reading_writing' ? (
                <SubjectSection title="Reading & Writing" borderCls="border-blue-200" headerCls="bg-blue-50 text-blue-700" value={rwCfg} onChange={setRwCfg} />
              ) : (
                <SubjectSection title="Math" borderCls="border-purple-200" headerCls="bg-purple-50 text-purple-700" value={mathCfg} onChange={setMathCfg} />
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4 pb-5" style={{ flex: '1 1 0', minHeight: 0 }}>
              <div style={{ flex: '1 1 0', minHeight: 0 }}>
                <SubjectSection title="Reading & Writing" borderCls="border-blue-200" headerCls="bg-blue-50 text-blue-700" value={rwCfg} onChange={setRwCfg} />
              </div>
              <div style={{ flex: '1 1 0', minHeight: 0 }}>
                <SubjectSection title="Math" borderCls="border-purple-200" headerCls="bg-purple-50 text-purple-700" value={mathCfg} onChange={setMathCfg} />
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-3" style={{ flexShrink: 0 }}>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-[10px] px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-[10px] border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={loading}
              className="px-5 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : `Create ${typeLabel} Tests`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create / Edit Practice Config Modal ───────────────────────────────────────
export function CreatePracticeModal({ onClose, onSaved, existing }) {
  const initSubject  = existing?.subject   || 'math';
  const initTopic    = existing?.topic     || '';
  const initSubTopic = existing?.sub_topic || '';

  const [form, setForm] = useState({
    name:               existing?.name    || '',
    subject:            initSubject,
    topic:              initTopic,
    sub_topic:          initSubTopic,
    total_questions:    existing?.total_questions    || 10,
    time_limit_minutes: existing?.time_limit_minutes || 15,
    difficulty_distribution: {
      easy:   existing?.difficulty_distribution?.easy   ?? 4,
      medium: existing?.difficulty_distribution?.medium ?? 4,
      hard:   existing?.difficulty_distribution?.hard   ?? 2,
    },
    is_demo_accessible: existing?.is_demo_accessible || false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const topics    = Object.keys(SAT_TAXONOMY[form.subject] || {});
  const subTopics = form.topic ? (SAT_TAXONOMY[form.subject]?.[form.topic] || []) : [];

  const setSubject  = (subject)   => setForm(f => ({ ...f, subject, topic: '', sub_topic: '' }));
  const setTopic    = (topic)     => setForm(f => ({ ...f, topic, sub_topic: '' }));
  const setSubTopic = (sub_topic) => setForm(f => ({ ...f, sub_topic }));

  const totalSet = Number(form.difficulty_distribution.easy) + Number(form.difficulty_distribution.medium) + Number(form.difficulty_distribution.hard);

  const validate = () => {
    if (!form.name.trim())   return 'Test name is required.';
    if (!form.topic)         return 'Topic is required.';
    if (!form.sub_topic)     return 'Sub-topic is required.';
    if (totalSet !== Number(form.total_questions)) return `Difficulty distribution (${totalSet}) must equal total questions (${form.total_questions}).`;
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError('');
    try {
      const payload = {
        ...form,
        total_questions:    Number(form.total_questions),
        time_limit_minutes: Number(form.time_limit_minutes),
        difficulty_distribution: {
          easy:   Number(form.difficulty_distribution.easy),
          medium: Number(form.difficulty_distribution.medium),
          hard:   Number(form.difficulty_distribution.hard),
        },
      };
      if (existing) await satAdminService.updatePracticeConfig(existing._id, payload);
      else          await satAdminService.createPracticeConfig(payload);
      onSaved(); onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[18px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] w-full max-w-lg flex flex-col" style={{ height: '85vh' }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100" style={{ flexShrink: 0 }}>
          <h3 className="text-base font-bold text-gray-900">{existing ? 'Edit' : 'Create'} Practice Test</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4" style={{ flex: '1 1 0', overflowY: 'auto', minHeight: 0 }}>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Test Name</label>
            <input className={inputCls} placeholder="e.g. Linear Equations in One Variable Practice"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="bg-gray-50 rounded-[12px] p-4 flex flex-col gap-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Question Scope</p>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Subject</label>
              <select className={inputCls} value={form.subject} onChange={e => setSubject(e.target.value)}>
                <option value="math">Math</option>
                <option value="reading_writing">Reading &amp; Writing</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Topic</label>
              <select className={inputCls} value={form.topic} onChange={e => setTopic(e.target.value)}
                disabled={topics.length === 0}>
                <option value="">— Select topic —</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Sub-Topic</label>
              <select className={inputCls} value={form.sub_topic} onChange={e => setSubTopic(e.target.value)}
                disabled={subTopics.length === 0}>
                <option value="">— Select sub-topic —</option>
                {subTopics.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {form.topic && form.sub_topic && (
              <p className="text-[10px] text-indigo-600 bg-indigo-50 rounded-[8px] px-3 py-1.5">
                Questions will be pulled from the bank where subject = <strong>{SUBJ_LABEL[form.subject]}</strong>, topic = <strong>{form.topic}</strong>, sub-topic = <strong>{form.sub_topic}</strong>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Total Questions</label>
              <input type="number" min="1" max="50" className={inputCls} value={form.total_questions}
                onChange={e => setForm(f => ({ ...f, total_questions: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Time (min)</label>
              <input type="number" min="1" className={inputCls} value={form.time_limit_minutes}
                onChange={e => setForm(f => ({ ...f, time_limit_minutes: e.target.value }))} />
            </div>
          </div>

          <div className="bg-gray-50 rounded-[12px] p-4">
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Difficulty Distribution</label>
              <span className={`text-[10px] font-semibold ${totalSet === Number(form.total_questions) ? 'text-green-600' : 'text-red-500'}`}>
                {totalSet}/{form.total_questions}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {['easy', 'medium', 'hard'].map(d => (
                <div key={d} className="flex flex-col items-center gap-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize
                    ${d === 'easy' ? 'bg-green-100 text-green-700' : d === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {d}
                  </span>
                  <input type="number" min="0" className={numCls}
                    value={form.difficulty_distribution[d]}
                    onChange={e => setForm(f => ({ ...f, difficulty_distribution: { ...f.difficulty_distribution, [d]: e.target.value } }))} />
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_demo_accessible}
              onChange={e => setForm(f => ({ ...f, is_demo_accessible: e.target.checked }))}
              className="w-4 h-4 rounded accent-ops-primary" />
            <span className="text-sm text-gray-700">Accessible to demo/guest users</span>
          </label>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-[10px] px-3 py-2">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3" style={{ flexShrink: 0 }}>
          <button onClick={onClose} className="px-4 py-2 rounded-[10px] border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="px-5 py-2 rounded-[10px] bg-ops-primary text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {loading ? 'Saving…' : existing ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Difficulty badges ─────────────────────────────────────────────────────────
export function DiffBadges({ diff }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {['easy', 'medium', 'hard'].map(d => diff?.[d] > 0 && (
        <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded
          ${d === 'easy' ? 'bg-green-100 text-green-700' : d === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
          {diff[d]}{d[0].toUpperCase()}
        </span>
      ))}
    </div>
  );
}

// ── Subject config card (Mock / Diagnostic) ───────────────────────────────────
export function SubjectConfigCard({ config, onEdit }) {
  const m1  = config.module_1;
  const m2a = config.module_2_easy;
  const m2b = config.module_2_hard;

  return (
    <div className="bg-white rounded-[14px] border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{config.name}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${SUBJ_STYLE[config.subject]}`}>
              {SUBJ_LABEL[config.subject]}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${TYPE_STYLE[config.type] || 'bg-gray-100 text-gray-600'}`}>
              {config.type || 'mock'}
            </span>
            {config.adaptive_threshold != null && (
              <span className="text-[10px] text-gray-400">threshold {config.adaptive_threshold}%</span>
            )}
          </div>
        </div>
        <button onClick={() => onEdit(config)}
          className="px-3 py-1.5 rounded-[8px] border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 shrink-0">
          Edit
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[10px] border border-gray-200 p-2.5 flex flex-col gap-1.5">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Module 1</p>
          <p className="text-xs text-gray-700 font-semibold">{m1?.total_questions}Q · {m1?.time_limit_minutes}min</p>
          <DiffBadges diff={m1?.difficulty_distribution} />
        </div>
        <div className="rounded-[10px] border border-green-200 bg-green-50/40 p-2.5 flex flex-col gap-1.5">
          <p className="text-[10px] font-bold text-green-600 uppercase">2a — Easy</p>
          <p className="text-xs text-gray-700 font-semibold">{m2a?.total_questions}Q · {m2a?.time_limit_minutes}min</p>
          <DiffBadges diff={m2a?.difficulty_distribution} />
        </div>
        <div className="rounded-[10px] border border-red-200 bg-red-50/40 p-2.5 flex flex-col gap-1.5">
          <p className="text-[10px] font-bold text-red-600 uppercase">2b — Hard</p>
          <p className="text-xs text-gray-700 font-semibold">{m2b?.total_questions}Q · {m2b?.time_limit_minutes}min</p>
          <DiffBadges diff={m2b?.difficulty_distribution} />
        </div>
      </div>
    </div>
  );
}

// ── Diagnostic pair card (Math + R&W grouped as one test) ────────────────────
function SubjectMiniPanel({ label, config, onEdit, borderCls, headerCls }) {
  if (!config) return (
    <div className={`border-2 ${borderCls} rounded-[12px] overflow-hidden`}>
      <div className={`px-3 py-2 ${headerCls}`}>
        <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
      </div>
      <div className="p-3 text-xs text-gray-400 italic">Not configured</div>
    </div>
  );
  const m1 = config.module_1; const m2a = config.module_2_easy; const m2b = config.module_2_hard;
  return (
    <div className={`border-2 ${borderCls} rounded-[12px] overflow-hidden flex flex-col`}>
      <div className={`px-3 py-2 ${headerCls} flex items-center justify-between`}>
        <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
        <button onClick={() => onEdit(config)}
          className="text-[10px] px-2 py-0.5 rounded bg-white/60 hover:bg-white text-gray-600 font-medium">
          Edit
        </button>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-1">
          <div className="rounded-[8px] border border-gray-200 p-2 flex flex-col gap-0.5">
            <p className="text-[9px] font-bold text-gray-500 uppercase">M1</p>
            <p className="text-[11px] text-gray-700 font-semibold">{m1?.total_questions}Q</p>
            <p className="text-[10px] text-gray-400">{m1?.time_limit_minutes}min</p>
          </div>
          <div className="rounded-[8px] border border-green-200 bg-green-50/40 p-2 flex flex-col gap-0.5">
            <p className="text-[9px] font-bold text-green-600 uppercase">2a</p>
            <p className="text-[11px] text-gray-700 font-semibold">{m2a?.total_questions}Q</p>
            <p className="text-[10px] text-gray-400">{m2a?.time_limit_minutes}min</p>
          </div>
          <div className="rounded-[8px] border border-red-200 bg-red-50/40 p-2 flex flex-col gap-0.5">
            <p className="text-[9px] font-bold text-red-600 uppercase">2b</p>
            <p className="text-[11px] text-gray-700 font-semibold">{m2b?.total_questions}Q</p>
            <p className="text-[10px] text-gray-400">{m2b?.time_limit_minutes}min</p>
          </div>
        </div>
        {config.adaptive_threshold != null && (
          <p className="text-[10px] text-gray-400">Threshold: {config.adaptive_threshold}%</p>
        )}
      </div>
    </div>
  );
}

export function DiagnosticPairCard({ seriesName, mathConfig, rwConfig, onEdit, type = 'diagnostic' }) {
  const typeLabel = type === 'diagnostic' ? 'Diagnostic' : 'Mock';
  const typeBadge = type === 'diagnostic' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700';
  return (
    <div className="bg-white rounded-[14px] border border-gray-200 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{seriesName}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${typeBadge}`}>{typeLabel}</span>
            <span className="text-[10px] text-gray-400">2 subjects · Adaptive format</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SubjectMiniPanel label="Reading & Writing" config={rwConfig} onEdit={onEdit}
          borderCls="border-blue-200" headerCls="bg-blue-50 text-blue-700" />
        <SubjectMiniPanel label="Math" config={mathConfig} onEdit={onEdit}
          borderCls="border-purple-200" headerCls="bg-purple-50 text-purple-700" />
      </div>
    </div>
  );
}

// ── Practice config card ──────────────────────────────────────────────────────
export function PracticeConfigCard({ config, onEdit }) {
  return (
    <div className="bg-white rounded-[14px] border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{config.name}</h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${SUBJ_STYLE[config.subject]}`}>
              {SUBJ_LABEL[config.subject]}
            </span>
            {config.is_demo_accessible && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Demo</span>
            )}
          </div>
        </div>
        <button onClick={() => onEdit(config)}
          className="px-3 py-1.5 rounded-[8px] border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 shrink-0">
          Edit
        </button>
      </div>
      <div className="rounded-[10px] border border-gray-100 bg-gray-50 p-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="font-semibold text-gray-500">Topic:</span> {config.topic}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="font-semibold text-gray-500">Sub-Topic:</span> {config.sub_topic}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[11px] font-semibold text-gray-700">{config.total_questions}Q</span>
          <span className="text-[10px] text-gray-400">·</span>
          <span className="text-[11px] text-gray-500">{config.time_limit_minutes}min</span>
          <div className="flex gap-1 ml-auto">
            {['easy', 'medium', 'hard'].map(d =>
              config.difficulty_distribution?.[d] > 0 && (
                <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded
                  ${d === 'easy' ? 'bg-green-100 text-green-700' : d === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {config.difficulty_distribution[d]}{d[0].toUpperCase()}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
