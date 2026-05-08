import { useState, useEffect, useCallback } from 'react';
import { satAdminService } from '../../../services/api';
import MathContent from '../../common/MathContent';

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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SatQuestionBankPage() {
  const [questions, setQuestions]   = useState([]);
  const [stats, setStats]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selected, setSelected]     = useState(null);

  const [filters, setFilters] = useState({ subject: '', difficulty: '', sub_topic: '' });
  const LIMIT = 20;

  const loadStats = useCallback(async () => {
    try { const r = await satAdminService.getStats(); setStats(r.data); } catch {
      console.error('Failed to load stats');
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filters.subject)   params.subject   = filters.subject;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.sub_topic) params.sub_topic  = filters.sub_topic;
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

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this question? It will no longer appear in tests.')) return;
    await satAdminService.deleteQuestion(id);
    loadQuestions();
    loadStats();
  };

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
        <select className={inputCls} value={filters.subject} onChange={e => { setFilters(f => ({ ...f, subject: e.target.value })); setPage(1); }}>
          <option value="">All Subjects</option>
          <option value="math">Math</option>
          <option value="reading_writing">Reading &amp; Writing</option>
        </select>
        <select className={inputCls} value={filters.difficulty} onChange={e => { setFilters(f => ({ ...f, difficulty: e.target.value })); setPage(1); }}>
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <input
          className={`${inputCls} w-52`}
          placeholder="Filter by sub-topic…"
          value={filters.sub_topic}
          onChange={e => { setFilters(f => ({ ...f, sub_topic: e.target.value })); setPage(1); }}
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
                {['Question', 'Subject', 'Difficulty', 'Sub Topic', 'Topic', ''].map(h => (
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
                  <td className="px-4 py-3 text-gray-600 text-xs">{q.sub_topic}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{q.topic}</td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleDeactivate(q._id)}
                      className="px-3 py-1 rounded-[8px] text-xs text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
                    >
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-[8px] border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-[8px] border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50">Next →</button>
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
    </div>
  );
}
