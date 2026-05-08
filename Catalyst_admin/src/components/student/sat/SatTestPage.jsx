import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { satStudentService } from '../../../services/api';
import MathContent from '../../common/MathContent';

// Strip HTML tags to a plain text preview (used only for compact review lists)
const stripHtml = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// ── Helpers ──────────────────────────────────────────────────
function fmtTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function buildPayload(questions, answers) {
  return questions.map((q) => ({
    question_id: q._id,
    selected:    answers[q._id] || null,
  }));
}

// ── Question display ─────────────────────────────────────────
function QuestionView({ question, selected, onSelect, number, total }) {
  if (!question) return null;

  const optMap = {
    A: question.option_a,
    B: question.option_b,
    C: question.option_c,
    D: question.option_d,
  };
  const isGridIn = question.format === 'grid_in';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
        <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-sm flex items-center justify-center shrink-0">
          {number}
        </span>
        Question {number} of {total}
        {question.topic && <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{question.topic}</span>}
        {isGridIn && <span className="ml-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">Grid-In</span>}
      </div>

      {/* Stem — renders HTML, LaTeX math, and SVG figures */}
      <MathContent
        html={question.stem}
        className="text-[15px] text-gray-900 leading-relaxed"
      />

      {/* MCQ options */}
      {!isGridIn && (
        <div className="flex flex-col gap-2.5">
          {['A', 'B', 'C', 'D'].map((opt) => {
            const html = optMap[opt];
            if (!html) return null;
            const isSelected = selected === opt;
            return (
              <button
                key={opt}
                onClick={() => onSelect(opt)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 mt-0.5 ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {opt}
                </span>
                <MathContent
                  html={html}
                  className={`text-sm leading-relaxed [&_p]:m-0 ${isSelected ? 'text-indigo-900 font-medium' : 'text-gray-700'}`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Grid-in input */}
      {isGridIn && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-500">Your Answer</label>
          <input
            type="text"
            value={selected || ''}
            onChange={e => onSelect(e.target.value)}
            placeholder="Type your answer…"
            className="w-40 h-11 px-4 rounded-xl border-2 border-gray-200 text-sm font-mono focus:outline-none focus:border-indigo-400"
          />
        </div>
      )}
    </div>
  );
}

// ── Between-modules screen ───────────────────────────────────
function ModuleTransition({ m1, onContinue, busy }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl mx-auto mb-5">✅</div>
        <h2 className="text-lg font-extrabold text-gray-900 mb-1">Module 1 Complete</h2>
        <p className="text-sm text-gray-400 mb-6">Great work! Time to move on.</p>

        <div className="flex justify-center gap-8 mb-6">
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{m1.percentage}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Score</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{m1.score}/{m1.max_score}</p>
            <p className="text-xs text-gray-500 mt-0.5">Points</p>
          </div>
        </div>

        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold mb-6"
          style={{
            background: m1.tier === 'hard' ? '#eff6ff' : '#f0fdf4',
            color:      m1.tier === 'hard' ? '#1d4ed8'  : '#15803d',
          }}
        >
          {m1.tier === 'hard' ? '📈 Advanced Module 2' : '📊 Standard Module 2'}
        </div>

        <button
          onClick={onContinue}
          disabled={busy}
          className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
        >
          {busy ? 'Loading…' : 'Begin Module 2 →'}
        </button>
      </div>
    </div>
  );
}

// ── Results screen ───────────────────────────────────────────
function ResultsScreen({ m1, m2, subject, testName, onBack }) {
  const totalScore = (m1?.score || 0) + (m2?.score || 0);
  const totalMax   = (m1?.max_score || 0) + (m2?.max_score || 0);
  const totalPct   = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const passed     = totalPct >= 60;

  const allBreakdown = [...(m1?.breakdown || []), ...(m2?.breakdown || [])];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 pt-10">
      <div className="w-full max-w-2xl flex flex-col gap-5">

        {/* Overall score */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Test Complete</p>
          <h2 className="text-lg font-extrabold text-gray-900 mb-0.5">{testName}</h2>
          <p className="text-xs text-gray-400 mb-6">{subject === 'math' ? 'Math' : 'Reading & Writing'}</p>

          <div className="flex items-center justify-center mb-4">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={passed ? '#10b981' : '#ef4444'}
                  strokeWidth="3"
                  strokeDasharray={`${totalPct} ${100 - totalPct}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-gray-900">{totalPct}%</span>
                <span className={`text-xs font-bold ${passed ? 'text-emerald-600' : 'text-red-500'}`}>
                  {passed ? 'Pass' : 'Fail'}
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500">{totalScore} / {totalMax} points</p>
        </div>

        {/* Module breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Module 1',                               result: m1 },
            { label: `Module 2 · ${m2?.tier === 'hard' ? 'Advanced' : 'Standard'}`, result: m2 },
          ].map(({ label, result }) => result && (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
              <p className="text-xs font-bold text-gray-500 mb-2">{label}</p>
              <p className="text-2xl font-extrabold text-gray-900">{result.percentage}%</p>
              <p className="text-xs text-gray-400 mt-1">{result.score}/{result.max_score} pts</p>
            </div>
          ))}
        </div>

        {/* Question review */}
        {allBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-gray-800">Question Review</h3>
              <span className="text-xs text-gray-400">
                {allBreakdown.filter((q) => q.is_correct).length}/{allBreakdown.length} correct
              </span>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {allBreakdown.map((q, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      q.is_correct ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {q.is_correct ? '✓' : '✗'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 truncate">{stripHtml(q.stem) || `Q${i + 1}`}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      You: <strong>{q.selected || '—'}</strong>
                      {!q.is_correct && (
                        <> · Correct: <strong className="text-emerald-600">{q.correct_answer}</strong></>
                      )}
                      {q.topic && ` · ${q.topic}`}
                    </p>
                    {!q.is_correct && q.explanation && (
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{q.explanation}</p>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-bold shrink-0 capitalize ${
                      q.difficulty === 'hard' ? 'text-red-400' :
                      q.difficulty === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                    }`}
                  >
                    {q.difficulty}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl font-bold text-sm text-white"
          style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
        >
          ← Back to Assignments
        </button>
      </div>
    </div>
  );
}

// ── Main SatTestPage ─────────────────────────────────────────
export default function SatTestPage() {
  const { assignmentId } = useParams();
  const navigate         = useNavigate();

  // ── State ────────────────────────────────────────────────
  const [phase,      setPhase]      = useState('loading');
  // 'loading' | 'module1' | 'm1_done' | 'module2' | 'complete' | 'error'
  const [testName] = useState('SAT Practice Test');
  const [subject,    setSubject]    = useState('');
  const [sessionId,  setSessionId]  = useState(null);
  const [questions,  setQuestions]  = useState([]);
  const [answers,    setAnswers]    = useState({});
  const [timeLimit,  setTimeLimit]  = useState(0);   // minutes
  const [startedAt,  setStartedAt]  = useState(null);
  const [currentQ,   setCurrentQ]   = useState(0);
  const [timeLeft,   setTimeLeft]   = useState(0);   // seconds
  const [m1,         setM1]         = useState(null);
  const [m2,         setM2]         = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  // Refs so the timer interval always has fresh values without re-running
  const phaseRef     = useRef(phase);
  const sessionRef   = useRef(sessionId);
  const questionsRef = useRef(questions);
  const answersRef   = useRef(answers);
  phaseRef.current     = phase;
  sessionRef.current   = sessionId;
  questionsRef.current = questions;
  answersRef.current   = answers;

  // ── Load / start session ─────────────────────────────────
  useEffect(() => {
    satStudentService
      .startSession({ assignment_id: assignmentId })
      .then((res) => {
        setSessionId(res.session_id);
        setSubject(res.subject);
        setQuestions(res.module_1.questions);
        setTimeLimit(res.module_1.time_limit_minutes);
        setStartedAt(res.module_1.started_at);
        setPhase('module1');
      })
      .catch((e) => { setError(e.message); setPhase('error'); });
  }, [assignmentId]);

  // ── Timer countdown ───────────────────────────────────────
  useEffect(() => {
    if (!startedAt || !timeLimit) return;
    const endMs = new Date(startedAt).getTime() + timeLimit * 60 * 1000;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) autoSubmit();
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, timeLimit]); // eslint-disable-line

  // ── Auto-submit (called by timer) ─────────────────────────
  const autoSubmit = () => {
    const p = phaseRef.current;
    if (p === 'module1') doSubmitM1(true);
    else if (p === 'module2') doSubmitM2(true);
  };

  // ── Core submit logic ─────────────────────────────────────
  const doSubmitM1 = useCallback(async (force = false) => {
    if (submitting) return;
    const qs  = questionsRef.current;
    const ans = answersRef.current;
    const sid = sessionRef.current;

    if (!force) {
      const done = Object.keys(ans).length;
      if (done < qs.length && !window.confirm(`${done}/${qs.length} answered. Submit anyway?`)) return;
    }

    setSubmitting(true);
    try {
      const res = await satStudentService.submitModule1(sid, { answers: buildPayload(qs, ans) });
      setM1({
        score:      res.module_1.score,
        max_score:  res.module_1.max_score,
        percentage: res.module_1.percentage,
        tier:       res.adaptive.tier,
        breakdown:  res.breakdown,
      });
      setPhase('m1_done');
    } catch (e) { setError(e.message); }
    finally     { setSubmitting(false); }
  }, [submitting]);

  const handleStartModule2 = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await satStudentService.getModule2(sessionRef.current);
      setQuestions(res.module_2.questions);
      setTimeLimit(res.module_2.time_limit_minutes);
      setStartedAt(res.module_2.started_at);
      setAnswers({});
      setCurrentQ(0);
      setPhase('module2');
    } catch (e) { setError(e.message); }
    finally     { setSubmitting(false); }
  }, []);

  const doSubmitM2 = useCallback(async (force = false) => {
    if (submitting) return;
    const qs  = questionsRef.current;
    const ans = answersRef.current;
    const sid = sessionRef.current;

    if (!force) {
      const done = Object.keys(ans).length;
      if (done < qs.length && !window.confirm(`${done}/${qs.length} answered. Submit anyway?`)) return;
    }

    setSubmitting(true);
    try {
      const res = await satStudentService.submitModule2(sid, { answers: buildPayload(qs, ans) });
      setM2({
        score:      res.module_2.score,
        max_score:  res.module_2.max_score,
        percentage: res.module_2.percentage,
        tier:       res.module_2.tier,
        breakdown:  res.breakdown,
      });
      setPhase('complete');
    } catch (e) { setError(e.message); }
    finally     { setSubmitting(false); }
  }, [submitting]);

  const handleSelectAnswer = (opt) => {
    const qId = questions[currentQ]?._id;
    if (!qId) return;
    setAnswers((prev) => ({ ...prev, [qId]: opt }));
  };

  // ── Render phases ─────────────────────────────────────────

  if (phase === 'complete') {
    return (
      <ResultsScreen
        m1={m1} m2={m2}
        subject={subject}
        testName={testName}
        onBack={() => navigate('/student/assignments')}
      />
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <span className="text-5xl">⚠️</span>
        <h2 className="text-lg font-extrabold text-gray-800">Something went wrong</h2>
        <p className="text-sm text-red-600 text-center max-w-sm">{error}</p>
        <button
          onClick={() => navigate('/student/assignments')}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600"
        >
          ← Back to Assignments
        </button>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-400">
        <div className="w-10 h-10 rounded-full border-[3px] border-gray-200 border-t-teal-500 animate-spin" />
        <p className="text-sm">Preparing your test…</p>
      </div>
    );
  }

  if (phase === 'm1_done') {
    return (
      <ModuleTransition m1={m1} onContinue={handleStartModule2} busy={submitting} />
    );
  }

  // ── Active module (module1 | module2) ────────────────────
  const moduleNum       = phase === 'module1' ? 1 : 2;
  const currentQuestion = questions[currentQ];
  const answeredCount   = Object.keys(answers).length;
  const isWarning       = timeLeft > 0 && timeLeft <= 120;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            {subject === 'math' ? 'Math' : 'Reading & Writing'} · Module {moduleNum}
            {moduleNum === 2 && m1?.tier && ` · ${m1.tier === 'hard' ? 'Advanced' : 'Standard'}`}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{answeredCount}/{questions.length} answered</p>
        </div>

        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-xl tabular-nums ${
            isWarning ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-800'
          }`}
        >
          {isWarning && <span className="text-base">⏰</span>}
          {fmtTime(timeLeft)}
        </div>

        <button
          onClick={() => moduleNum === 1 ? doSubmitM1() : doSubmitM2()}
          disabled={submitting}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
        >
          {submitting ? 'Submitting…' : `Submit Module ${moduleNum}`}
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* ── Question content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <QuestionView
            question={currentQuestion}
            selected={answers[currentQuestion?._id]}
            onSelect={handleSelectAnswer}
            number={currentQ + 1}
            total={questions.length}
          />
        </div>
      </div>

      {/* ── Footer: prev / question dots / next ── */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <button
          onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
          disabled={currentQ === 0}
          className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
        >
          ← Prev
        </button>

        {/* Question dots — scrollable if too many */}
        <div className="flex gap-1 flex-wrap justify-center max-w-[360px] overflow-hidden">
          {questions.map((q, i) => (
            <button
              key={q._id || i}
              onClick={() => setCurrentQ(i)}
              className={`w-7 h-7 rounded-full text-[11px] font-bold transition-colors ${
                i === currentQ
                  ? 'bg-indigo-500 text-white'
                  : answers[q._id]
                    ? 'bg-emerald-200 text-emerald-800'
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentQ((q) => Math.min(questions.length - 1, q + 1))}
          disabled={currentQ === questions.length - 1}
          className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
