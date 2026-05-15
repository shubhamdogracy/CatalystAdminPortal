import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { satMentorService } from '../../../services/api';
import MathContent from '../../common/MathContent';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ── Shared constants ──────────────────────────────────────────
const SUBJ_LABEL = { math: 'Math', reading_writing: 'Reading & Writing' };
const CHART_PALETTE = ['#4472C4','#70AD47','#ED7D31','#FF69B4','#FFC000','#00B0F0'];
const MASTERY_CHART_COLORS = {
  MASTER:'#4472C4', ELITE:'#70AD47', EXPERT:'#ED7D31',
  ADVANCED:'#FFC000', INTERMEDIATE:'#FF69B4', NOVICE:'#A5A5A5',
};

function sanitizeText(text) {
  if (!text) return text;
  return text
    .replace(/‘/g, "'").replace(/’/g, "'")
    .replace(/“/g, '"').replace(/”/g, '"')
    .replace(/–/g, '–').replace(/—/g, '—')
    .replace(/�/g, "'").replace(/◆/g, "'");
}
function boldChoiceLabels(html) {
  if (!html) return html;
  return html.replace(
    /(Choice\s+[A-D]\s+is\s+(?:the\s+best\s+answer|correct|incorrect)\.?)/gi,
    '<strong>$1</strong>',
  );
}

function getMasteryLevel(pct) {
  if (pct >= 85) return { label: 'MASTER',       color: '#2563eb', bg: '#dbeafe', bar: '#10b981' };
  if (pct >= 70) return { label: 'ELITE',        color: '#0891b2', bg: '#cffafe', bar: '#06b6d4' };
  if (pct >= 55) return { label: 'EXPERT',       color: '#7c3aed', bg: '#ede9fe', bar: '#8b5cf6' };
  if (pct >= 40) return { label: 'ADVANCED',     color: '#d97706', bg: '#fef3c7', bar: '#f59e0b' };
  if (pct >= 25) return { label: 'INTERMEDIATE', color: '#ea580c', bg: '#ffedd5', bar: '#f97316' };
  return           { label: 'NOVICE',            color: '#ef4444', bg: '#fee2e2', bar: '#ef4444' };
}

function computeSatTopicMastery(session) {
  const groups = {};
  const groupName = session.subject === 'math' ? 'Mathematics Mastery' : 'Reading & Writing Mastery';
  const allQ = [
    ...(session.module_1?.breakdown || []),
    ...(session.module_2?.breakdown || []),
  ];
  allQ.forEach(q => {
    const topic = (q.topic || '').trim() || 'General';
    if (!groups[groupName]) groups[groupName] = {};
    if (!groups[groupName][topic]) groups[groupName][topic] = { correct: 0, total: 0, score: 0, maxScore: 0 };
    groups[groupName][topic].total++;
    groups[groupName][topic].maxScore += (q.points || 1);
    if (q.is_correct) {
      groups[groupName][topic].correct++;
      groups[groupName][topic].score += (q.points || 1);
    }
  });
  return groups;
}

function computePracticeTopicMastery(session, config) {
  const groups = {};
  const groupName = config?.topic || (config?.subject === 'math' ? 'Math' : 'Reading & Writing') || 'Practice';
  (session.breakdown || []).forEach(q => {
    const topic = (q.sub_topic || q.topic || '').trim() || 'General';
    if (!groups[groupName]) groups[groupName] = {};
    if (!groups[groupName][topic]) groups[groupName][topic] = { correct: 0, total: 0, score: 0, maxScore: 0 };
    groups[groupName][topic].total++;
    groups[groupName][topic].maxScore += (q.points || 1);
    if (q.is_correct) {
      groups[groupName][topic].correct++;
      groups[groupName][topic].score += (q.points || 1);
    }
  });
  return groups;
}

function generateSatAISummary(topicMastery, totalPct) {
  const passed = totalPct >= 60;
  const allTopics = [];
  for (const [group, topics] of Object.entries(topicMastery)) {
    for (const [topic, data] of Object.entries(topics)) {
      const pct = data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0;
      allTopics.push({ group, topic, pct, masteryLabel: getMasteryLevel(pct).label });
    }
  }
  const strong        = allTopics.filter(t => t.pct >= 70).sort((a, b) => b.pct - a.pct);
  const needsPractice = allTopics.filter(t => t.pct < 40).sort((a, b) => a.pct - b.pct);
  const developing    = allTopics.filter(t => t.pct >= 40 && t.pct < 70).sort((a, b) => b.pct - a.pct);

  let overallMsg;
  if (totalPct >= 85)      overallMsg = `Outstanding! A score of ${totalPct}% places this student at mastery level.`;
  else if (totalPct >= 70) overallMsg = `Great work! Scoring ${totalPct}% reflects strong understanding across modules.`;
  else if (totalPct >= 55) overallMsg = `Good effort. A score of ${totalPct}% shows solid progress — targeted practice can push into the advanced tier.`;
  else if (totalPct >= 40) overallMsg = `Score of ${totalPct}% shows foundational understanding. Focused practice on weaker areas will yield quick improvements.`;
  else                     overallMsg = `Score of ${totalPct}%. This is a starting point — targeted study on weak topics makes a significant difference.`;

  const strengthMsg = strong.length > 0
    ? `Strong in: ${strong.slice(0, 4).map(t => `${t.topic} (${t.pct}%)`).join(', ')}. These are power areas to keep leveraging.`
    : `No topic reached 70%+ yet — consistent practice across all areas will build momentum.`;

  let improveMsg;
  if (needsPractice.length > 0)
    improveMsg = `Prioritise: ${needsPractice.slice(0, 4).map(t => `${t.topic} (${t.pct}%)`).join(', ')}. These need the most focused attention.`;
  else if (developing.length > 0)
    improveMsg = `Keep working on: ${developing.slice(0, 3).map(t => `${t.topic} (${t.pct}%)`).join(', ')}. A little more practice unlocks the next tier.`;
  else
    improveMsg = `All topics performing well. Challenge with harder problems to push toward mastery.`;

  const devMsg = (developing.length > 0 && needsPractice.length > 0)
    ? `Good momentum in: ${developing.slice(0, 3).map(t => `${t.topic} (${t.pct}%)`).join(', ')}. A few more sessions can move these into the strong zone.`
    : '';

  const nextMsg = passed
    ? `Great result — passed! Drill developing topics to push them into the strong zone and attempt harder questions to extend mastery.`
    : `Review every wrong answer carefully, especially the explanations. Schedule focused practice on the lowest-scoring topics.`;

  return { overallMsg, strengthMsg, improveMsg, devMsg, nextMsg, strong, needsPractice, developing, allTopics, totalPct, passed };
}

// ── Chart tooltip ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs min-w-[110px]">
      {label && <p className="font-bold text-gray-500 mb-1 uppercase tracking-wide">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-semibold">
          {p.name !== 'pct' ? `${p.name}: ` : ''}{p.value}%
        </p>
      ))}
    </div>
  );
}

// ── Topic Charts ───────────────────────────────────────────────
function TopicCharts({ topicMastery }) {
  const groupEntries = Object.entries(topicMastery);
  const columnGroups = groupEntries.map(([group, topics]) => ({
    group,
    data: Object.entries(topics).map(([topic, d], idx) => ({
      name: topic.length > 18 ? topic.slice(0, 16) + '…' : topic,
      fullName: topic,
      pct: d.maxScore > 0 ? Math.round((d.score / d.maxScore) * 100) : 0,
      paletteIdx: idx,
    })),
  }));

  const masteryCount = {};
  for (const topics of Object.values(topicMastery)) {
    for (const [, d] of Object.entries(topics)) {
      const pct = d.maxScore > 0 ? Math.round((d.score / d.maxScore) * 100) : 0;
      const label = getMasteryLevel(pct).label;
      masteryCount[label] = (masteryCount[label] || 0) + 1;
    }
  }
  const pieData = Object.entries(masteryCount).map(([name, value]) => ({
    name, value, color: MASTERY_CHART_COLORS[name] || '#A5A5A5',
  }));

  const maxLen = Math.max(...groupEntries.map(([, t]) => Object.keys(t).length), 1);
  const lineData = Array.from({ length: maxLen }, (_, i) => {
    const entry = { label: `T${i + 1}` };
    groupEntries.forEach(([group, topics]) => {
      const topicArr = Object.entries(topics);
      if (i < topicArr.length) {
        const [, d] = topicArr[i];
        entry[group] = d.maxScore > 0 ? Math.round((d.score / d.maxScore) * 100) : 0;
      }
    });
    return entry;
  });

  if (groupEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm">
        <span className="text-4xl mb-3">📊</span>
        <p>No topic data available.</p>
      </div>
    );
  }

  const shortGroup = g => g.replace(' Mastery', '').replace('Mathematics', 'Math');

  return (
    <div className="p-5 space-y-6">
      {columnGroups.map(({ group, data }) => (
        <div key={group} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100"
               style={{ background: 'linear-gradient(90deg,#1e293b,#334155)' }}>
            <p className="text-sm font-bold text-white">{group}</p>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">Column Chart</span>
          </div>
          <div className="px-4 pt-4 pb-3">
            <ResponsiveContainer width="100%" height={Math.max(180, data.length * 52)}>
              <BarChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: data.length > 4 ? 48 : 16 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={data.length > 5 ? -35 : 0} textAnchor={data.length > 5 ? 'end' : 'middle'} interval={0} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pct" name="Score" radius={[5,5,0,0]} label={{ position: 'top', fontSize: 11, fill: '#64748b', formatter: v => `${v}%` }}>
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={CHART_PALETTE[entry.paletteIdx % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {data.map((d, idx) => (
                <div key={d.fullName} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: CHART_PALETTE[idx % CHART_PALETTE.length] }} />
                  <span className="text-gray-600">{d.fullName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {pieData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100"
               style={{ background: 'linear-gradient(90deg,#1e293b,#334155)' }}>
            <p className="text-sm font-bold text-white">Mastery Level Distribution</p>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">Pie Chart</span>
          </div>
          <div className="p-4 flex flex-col sm:flex-row items-center gap-8">
            <div style={{ width: 240, height: 240, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={105} paddingAngle={2} dataKey="value"
                    label={({ name, percent }) => `${name.charAt(0) + name.slice(1).toLowerCase()} ${Math.round(percent * 100)}%`}
                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}>
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v} topic${v !== 1 ? 's' : ''}`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-3">
              {pieData.map(entry => (
                <div key={entry.name} className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded shrink-0" style={{ background: entry.color }} />
                  <div>
                    <p className="text-[13px] font-bold text-gray-800">{entry.name}</p>
                    <p className="text-[11px] text-gray-400">{entry.value} topic{entry.value !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {lineData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100"
               style={{ background: 'linear-gradient(90deg,#1e293b,#334155)' }}>
            <p className="text-sm font-bold text-white">Performance Trend by Section</p>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lineData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={value => <span style={{ fontSize: 12, color: '#374151' }}>{shortGroup(value)}</span>} />
                {groupEntries.map(([group], idx) => (
                  <Line key={group} type="monotone" dataKey={group} name={group}
                    stroke={CHART_PALETTE[idx % CHART_PALETTE.length]} strokeWidth={2.5}
                    dot={{ r: 5, fill: CHART_PALETTE[idx % CHART_PALETTE.length], stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 7 }} connectNulls={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI Summary ─────────────────────────────────────────────────
function AISummaryView({ aiData }) {
  if (!aiData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm">
        <span className="text-3xl mb-2">🤖</span>
        <p>No topic data — add topics to questions to enable AI analysis.</p>
      </div>
    );
  }
  return (
    <div className="p-5 space-y-3">
      <div className="rounded-xl p-4 border" style={{ background: aiData.passed ? '#f0fdf4' : '#fff7ed', borderColor: aiData.passed ? '#6ee7b7' : '#fed7aa' }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{aiData.passed ? '🎯' : '📈'}</span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider mb-1.5" style={{ color: aiData.passed ? '#065f46' : '#9a3412' }}>Overall Performance</p>
            <p className="text-[13px] leading-relaxed text-gray-700">{aiData.overallMsg}</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl p-4 border border-emerald-200 bg-emerald-50">
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0">💪</span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 mb-1.5">Strong Areas</p>
            <p className="text-[13px] leading-relaxed text-gray-700">{aiData.strengthMsg}</p>
            {aiData.strong.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {aiData.strong.slice(0, 5).map(t => (
                  <span key={t.topic} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">{t.topic} · {t.pct}%</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-xl p-4 border border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0">🎯</span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-red-700 mb-1.5">Focus Areas</p>
            <p className="text-[13px] leading-relaxed text-gray-700">{aiData.improveMsg}</p>
            {aiData.needsPractice.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {aiData.needsPractice.slice(0, 5).map(t => (
                  <span key={t.topic} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">{t.topic} · {t.pct}%</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {aiData.devMsg && (
        <div className="rounded-xl p-4 border border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">🔆</span>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 mb-1.5">Developing Areas</p>
              <p className="text-[13px] leading-relaxed text-gray-700">{aiData.devMsg}</p>
            </div>
          </div>
        </div>
      )}
      <div className="rounded-xl p-4 border border-indigo-200 bg-indigo-50">
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0">🚀</span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 mb-1.5">Next Steps</p>
            <p className="text-[13px] leading-relaxed text-gray-700">{aiData.nextMsg}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Question list renderer ─────────────────────────────────────
function QuestionList({ breakdown }) {
  if (!breakdown?.length) {
    return <div className="py-12 text-center text-gray-400 text-sm">No question data available</div>;
  }
  return (
    <div className="space-y-3">
      {breakdown.map((q, i) => {
        const isCorrect   = q.is_correct;
        const notAnswered = !q.selected;
        return (
          <div key={q.question_id || i}
            className={`rounded-2xl border overflow-hidden ${notAnswered ? 'border-gray-200' : isCorrect ? 'border-emerald-200' : 'border-red-200'}`}>
            <div className="flex items-center gap-3 px-4 py-3"
                 style={{ background: notAnswered ? '#f9fafb' : isCorrect ? '#f0fdf4' : '#fff1f2' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                   style={{ background: notAnswered ? '#9ca3af' : isCorrect ? '#10b981' : '#ef4444' }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <MathContent
                  html={sanitizeText(q.stem) || `Question ${i + 1}`}
                  className="text-[13px] font-semibold [&_p]:m-0 [&_.katex]:text-[13px]"
                  style={{ color: notAnswered ? '#6b7280' : isCorrect ? '#065f46' : '#991b1b' }}
                />
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {q.topic && <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">{sanitizeText(q.topic)}</span>}
                  {q.sub_topic && <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{sanitizeText(q.sub_topic)}</span>}
                  {q.difficulty && (
                    <span className={`text-[10px] font-bold capitalize rounded-full px-2 py-0.5 ${q.difficulty === 'hard' ? 'bg-red-50 text-red-500' : q.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {q.difficulty}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {notAnswered ? (
                  <span className="text-[11px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Not attempted</span>
                ) : isCorrect ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Correct · +1 pt</span>
                ) : (
                  <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">✗ Wrong · 0 pts</span>
                )}
              </div>
            </div>
            {(q.option_a || q.option_b) && (
              <div className="px-4 py-4 bg-white space-y-1.5">
                {['A','B','C','D'].map(letter => {
                  const choiceText      = q['option_' + letter.toLowerCase()];
                  if (!choiceText) return null;
                  const isStudentAnswer = q.selected === letter;
                  const isAnswerKey     = q.correct_answer === letter;
                  let bg = '#f9fafb', border = '#e5e7eb', color = '#374151';
                  if      (isStudentAnswer && isAnswerKey)   { bg = '#f0fdf4'; border = '#6ee7b7'; color = '#065f46'; }
                  else if (isStudentAnswer && !isAnswerKey)  { bg = '#fff1f2'; border = '#fca5a5'; color = '#991b1b'; }
                  else if (!isStudentAnswer && isAnswerKey)  { bg = '#f0fdf4'; border = '#a7f3d0'; color = '#065f46'; }
                  return (
                    <div key={letter} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border"
                         style={{ background: bg, borderColor: border }}>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-extrabold shrink-0"
                           style={{ background: border, color }}>{letter}</div>
                      <MathContent html={sanitizeText(choiceText)} className="text-[13px] flex-1 [&_p]:m-0 [&_.katex]:text-[13px]" style={{ color }} />
                      <div className="flex items-center gap-1 shrink-0">
                        {isStudentAnswer && <span className="text-[10px] font-bold" style={{ color }}>Your answer</span>}
                        {isAnswerKey      && <span className="text-[10px] font-extrabold text-emerald-600">✓ Key</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {q.explanation && (
              <div className="px-4 pb-4 bg-white">
                <div className="flex gap-2.5 p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="text-base shrink-0">💡</span>
                  <div>
                    <p className="text-[11px] font-extrabold text-amber-700 uppercase tracking-wide mb-1">Explanation</p>
                    <MathContent html={boldChoiceLabels(sanitizeText(q.explanation))} className="text-[12px] text-amber-800 leading-relaxed [&_p]:m-0" />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Topic Mastery Table ────────────────────────────────────────
function TopicMasteryTable({ topicMastery }) {
  return (
    <div className="space-y-4">
      {Object.entries(topicMastery).map(([groupName, topics]) => (
        <div key={groupName} className="rounded-xl overflow-hidden border border-gray-200">
          <div className="bg-gray-800 px-4 py-3">
            <p className="text-sm font-bold text-white">{groupName}</p>
          </div>
          <div className="grid grid-cols-[1fr_auto_160px] bg-gray-700 px-4 py-2">
            <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-widest">Topic</span>
            <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-widest text-center px-6">Mastery</span>
            <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-widest text-right">Score</span>
          </div>
          {Object.entries(topics).map(([topic, data]) => {
            const pct     = data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0;
            const mastery = getMasteryLevel(pct);
            return (
              <div key={topic} className="grid grid-cols-[1fr_auto_160px] items-center px-4 py-3 border-t border-gray-100 bg-white">
                <div>
                  <p className="text-[13px] text-gray-700">{topic}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{data.correct}/{data.total} correct</p>
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mx-6"
                      style={{ background: mastery.bg, color: mastery.color }}>
                  {mastery.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: mastery.bar }} />
                  </div>
                  <span className="text-[10px] font-bold shrink-0 w-8 text-right" style={{ color: mastery.bar }}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Score badge helpers ────────────────────────────────────────
// const scoreColor = pct => pct >= 80 ? '#059669' : pct >= 60 ? '#0891b2' : pct >= 40 ? '#d97706' : '#dc2626';
// const scoreBg    = pct => pct >= 80 ? '#ecfdf5' : pct >= 60 ? '#ecfeff' : pct >= 40 ? '#fffbeb' : '#fef2f2';

// ── SAT score utils (projected score from 4 modules) ──────────
function getWeightedScore(breakdown = []) {
  let weighted = 0, maxWeighted = 0;
  breakdown.forEach(b => {
    const w = b.difficulty === 'hard' ? 3 : b.difficulty === 'medium' ? 2 : 1;
    maxWeighted += w;
    if (b.is_correct) weighted += w;
  });
  return { weighted, maxWeighted };
}

function scaleSection(weighted, maxWeighted, tier) {
  if (maxWeighted === 0) return 400;
  const ratio = weighted / maxWeighted;
  const raw   = tier === 'hard' ? 350 + ratio * 450 : 200 + ratio * 440;
  return Math.round(raw / 10) * 10;
}

function computeProjectedSATScore(rwM1, rwM2, mathM1, mathM2) {
  const rw1 = getWeightedScore(rwM1?.breakdown);
  const rw2 = getWeightedScore(rwM2?.breakdown);
  const m1  = getWeightedScore(mathM1?.breakdown);
  const m2  = getWeightedScore(mathM2?.breakdown);
  const rwTier   = rwM2?.tier   || 'easy';
  const mathTier = mathM2?.tier || 'easy';
  const rwScore   = scaleSection(rw1.weighted + rw2.weighted, rw1.maxWeighted + rw2.maxWeighted, rwTier);
  const mathScore = scaleSection(m1.weighted  + m2.weighted,  m1.maxWeighted  + m2.maxWeighted,  mathTier);
  const total = Math.min(1600, Math.max(400, rwScore + mathScore));
  const margin = 60, secMgn = 30;
  const topicMap = {};
  [[rwM1, 'rw'], [rwM2, 'rw'], [mathM1, 'math'], [mathM2, 'math']].forEach(([mod, section]) => {
    (mod?.breakdown || []).forEach(b => {
      const key = (b.topic || '').trim();
      if (!key) return;
      if (!topicMap[key]) topicMap[key] = { correct: 0, total: 0, section };
      topicMap[key].total++;
      if (b.is_correct) topicMap[key].correct++;
    });
  });
  const topicList = Object.entries(topicMap)
    .map(([name, d]) => ({ name, section: d.section, pct: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);
  return {
    total,
    totalRange: [Math.max(400, total - margin), Math.min(1600, total + margin)],
    rw:   { score: rwScore,   tier: rwTier,   range: [Math.max(200, rwScore   - secMgn), Math.min(800, rwScore   + secMgn)] },
    math: { score: mathScore, tier: mathTier, range: [Math.max(200, mathScore - secMgn), Math.min(800, mathScore + secMgn)] },
    topicList,
    strongest: topicList[0]?.name || '—',
    focusArea: topicList[topicList.length - 1]?.name || '—',
  };
}

const barColor = pct => pct >= 70 ? '#10b981' : pct >= 45 ? '#f59e0b' : '#ef4444';

function scoreGrade(total) {
  if (total >= 1400) return { label: 'Exceptional', color: '#059669' };
  if (total >= 1200) return { label: 'Strong',      color: '#2563eb' };
  if (total >= 1000) return { label: 'Competitive', color: '#7c3aed' };
  if (total >= 800)  return { label: 'Developing',  color: '#d97706' };
  return                   { label: 'Foundational', color: '#ef4444' };
}

function ProjectedSATScore({ rwM1, rwM2, mathM1, mathM2 }) {
  const d     = useMemo(() => computeProjectedSATScore(rwM1, rwM2, mathM1, mathM2), [rwM1, rwM2, mathM1, mathM2]);
  const grade = scoreGrade(d.total);
  const totalBarPct = ((d.total      - 400) / 1200) * 100;
  const rwBarPct    = ((d.rw.score   - 200) / 600)  * 100;
  const mathBarPct  = ((d.math.score - 200) / 600)  * 100;
  const rangeLPct   = ((d.totalRange[0] - 400) / 1200) * 100;
  const rangeWPct   = ((d.totalRange[1] - d.totalRange[0]) / 1200) * 100;

  return (
    <div className="p-5 pb-8 space-y-5 max-w-2xl mx-auto w-full">
      <div className="relative rounded-3xl overflow-hidden select-none"
           style={{ background: 'linear-gradient(135deg, #3730a3 0%, #6d28d9 55%, #a21caf 100%)' }}>
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20 pointer-events-none"
             style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full opacity-15 pointer-events-none"
             style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="relative z-10 px-8 pt-7 pb-6 text-center">
          <p className="text-[10px] font-extrabold text-purple-200 uppercase tracking-[0.2em] mb-2">Projected SAT Score</p>
          <p className="font-black text-white leading-none mb-1" style={{ fontSize: '5rem' }}>{d.total}</p>
          <span className="inline-block px-4 py-1 rounded-full text-xs font-extrabold mb-3"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
            {grade.label}
          </span>
          <p className="text-sm text-purple-200">Likely range &nbsp;<strong className="text-white font-extrabold">{d.totalRange[0]} – {d.totalRange[1]}</strong></p>
          <div className="mt-5 px-2">
            <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="absolute top-0 h-full rounded-full pointer-events-none"
                   style={{ left: `${rangeLPct}%`, width: `${rangeWPct}%`, background: 'rgba(255,255,255,0.25)' }} />
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${totalBarPct}%`, background: 'linear-gradient(90deg, rgba(255,255,255,0.85), rgba(255,255,255,0.95))' }} />
            </div>
            <div className="flex justify-between text-[10px] text-purple-300 mt-1.5 font-semibold">
              <span>400</span><span>700</span><span>1000</span><span>1300</span><span>1600</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 shadow-sm border border-blue-100"
             style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">R</div>
            <p className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wide leading-tight">Reading &amp;<br />Writing</p>
          </div>
          <p className="text-5xl font-black text-blue-900 mb-0.5">{d.rw.score}</p>
          <p className="text-[11px] text-blue-500 mb-3">Range {d.rw.range[0]} – {d.rw.range[1]}</p>
          <div className="h-2.5 rounded-full overflow-hidden bg-blue-200">
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${rwBarPct}%`, background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)' }} />
          </div>
        </div>
        <div className="rounded-2xl p-5 shadow-sm border border-purple-100"
             style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">√x</div>
            <p className="text-[11px] font-extrabold text-purple-700 uppercase tracking-wide leading-tight">Math</p>
          </div>
          <p className="text-5xl font-black text-purple-900 mb-0.5">{d.math.score}</p>
          <p className="text-[11px] text-purple-500 mb-3">Range {d.math.range[0]} – {d.math.range[1]}</p>
          <div className="h-2.5 rounded-full overflow-hidden bg-purple-200">
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${mathBarPct}%`, background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)' }} />
          </div>
        </div>
      </div>

      {d.topicList.length > 0 && (
        <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
          <p className="text-sm font-extrabold text-gray-800 mb-4">Performance Breakdown</p>
          <div className="space-y-3">
            {d.topicList.slice(0, 8).map(t => (
              <div key={t.name} className="flex items-center gap-3">
                <span className="text-[12px] text-gray-600 w-40 shrink-0 truncate" title={t.name}>{t.name}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${t.pct}%`, background: barColor(t.pct) }} />
                </div>
                <span className="text-[11px] font-extrabold shrink-0 w-9 text-right tabular-nums" style={{ color: barColor(t.pct) }}>{t.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: '📘', label: 'R&W Module 2', value: d.rw.tier === 'hard' ? 'Hard route taken' : 'Standard route',
            bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', labelColor: '#6366f1', valueColor: '#3730a3' },
          { icon: '📐', label: 'Math Module 2', value: d.math.tier === 'hard' ? 'Hard route taken' : 'Standard route',
            bg: 'linear-gradient(135deg, #faf5ff, #ede9fe)', labelColor: '#8b5cf6', valueColor: '#5b21b6' },
          { icon: '🏆', label: 'Strongest Area', value: d.strongest,
            bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', labelColor: '#16a34a', valueColor: '#14532d' },
          { icon: '🎯', label: 'Focus Area', value: d.focusArea,
            bg: 'linear-gradient(135deg, #fff7ed, #ffedd5)', labelColor: '#ea580c', valueColor: '#7c2d12' },
        ].map(chip => (
          <div key={chip.label} className="rounded-2xl p-4 shadow-sm border border-white/40" style={{ background: chip.bg }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base">{chip.icon}</span>
              <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: chip.labelColor }}>{chip.label}</p>
            </div>
            <p className="text-[13px] font-extrabold truncate leading-tight" style={{ color: chip.valueColor }}>{chip.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Combined topic mastery (all 4 modules) ─────────────────────
function computeCombinedTopicMastery(rwM1, rwM2, mathM1, mathM2) {
  const groups = {};
  [
    { label: 'R&W Module 1',  data: rwM1   },
    { label: 'R&W Module 2',  data: rwM2   },
    { label: 'Math Module 1', data: mathM1 },
    { label: 'Math Module 2', data: mathM2 },
  ].forEach(({ label, data }) => {
    if (!data?.breakdown?.length) return;
    data.breakdown.forEach(q => {
      const topic = (q.topic || '').trim() || 'General';
      if (!groups[label]) groups[label] = {};
      if (!groups[label][topic]) groups[label][topic] = { correct: 0, total: 0, score: 0, maxScore: 0 };
      groups[label][topic].total++;
      groups[label][topic].maxScore += (q.points || 1);
      if (q.is_correct) { groups[label][topic].correct++; groups[label][topic].score += (q.points || 1); }
    });
  });
  return groups;
}

// ── Adaptive Pair Result View (Math + R&W combined) ────────────
function AdaptivePairResultView({ mathSession, rwSession, isDiagnostic, seriesName }) {
  const [view, setView]               = useState(isDiagnostic ? 'sat_score' : 'questions');
  const [activeModule, setActiveModule] = useState(rwSession ? 'rw_m1' : 'math_m1');

  const rwM1   = rwSession?.module_1;
  const rwM2   = rwSession?.module_2;
  const mathM1 = mathSession?.module_1;
  const mathM2 = mathSession?.module_2;

  const rwScore   = (rwM1?.score   || 0) + (rwM2?.score   || 0);
  const rwMax     = (rwM1?.max_score || 0) + (rwM2?.max_score || 0);
  const mathScore = (mathM1?.score  || 0) + (mathM2?.score  || 0);
  const mathMax   = (mathM1?.max_score || 0) + (mathM2?.max_score || 0);
  const totalScore = rwScore + mathScore;
  const totalMax   = rwMax   + mathMax;
  const totalPct   = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const passed     = totalPct >= 60;

  const topicMastery = useMemo(
    () => computeCombinedTopicMastery(rwM1, rwM2, mathM1, mathM2),
    [rwM1, rwM2, mathM1, mathM2],
  );
  const hasTopics = Object.keys(topicMastery).length > 0 &&
    Object.values(topicMastery).some(g => Object.keys(g).length > 0);

  const aiData = useMemo(
    () => hasTopics ? generateSatAISummary(topicMastery, totalPct) : null,
    [topicMastery, totalPct, hasTopics],
  );

  const modules = [
    rwM1   && { key: 'rw_m1',   label: 'R&W Module 1',  data: rwM1,   color: '#4f46e5' },
    rwM2   && { key: 'rw_m2',   label: 'R&W Module 2',  data: rwM2,   color: '#4f46e5' },
    mathM1 && { key: 'math_m1', label: 'Math Module 1', data: mathM1, color: '#7c3aed' },
    mathM2 && { key: 'math_m2', label: 'Math Module 2', data: mathM2, color: '#7c3aed' },
  ].filter(Boolean);
  const activeModData = modules.find(m => m.key === activeModule);

  const TABS = [
    ...(isDiagnostic ? [{ key: 'sat_score', label: '🎯 SAT Score' }] : []),
    { key: 'questions', label: 'Questions' },
    ...(hasTopics ? [{ key: 'topics',   label: 'Topic Mastery' }] : []),
    ...(hasTopics ? [{ key: 'charts',   label: 'Charts'        }] : []),
    { key: 'summary',   label: 'AI Summary' },
  ];

  return (
    <div className="flex flex-col min-h-0">
      {/* Score header */}
      <div className="px-6 py-4 flex items-center gap-4 flex-wrap"
           style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
               style={{ background: 'rgba(255,255,255,0.15)' }}>📋</div>
          <div>
            <p className="text-white font-extrabold text-base">{seriesName || 'SAT Test'}</p>
            <p className="text-indigo-300 text-xs mt-0.5">{isDiagnostic ? 'Diagnostic Test' : 'Mock Test'}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4 flex-wrap">
          {rwMax > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold"
                    style={{ background: 'rgba(96,165,250,0.25)', color: '#93c5fd' }}>R&amp;W</span>
              <span className="text-sm font-extrabold text-white">{rwScore}/{rwMax}</span>
              <span className="text-[11px] text-blue-300">{rwMax > 0 ? Math.round((rwScore/rwMax)*100) : 0}%</span>
            </div>
          )}
          {rwMax > 0 && mathMax > 0 && <div className="h-5 w-px" style={{ background: 'rgba(255,255,255,0.15)' }} />}
          {mathMax > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold"
                    style={{ background: 'rgba(167,139,250,0.25)', color: '#c4b5fd' }}>Math</span>
              <span className="text-sm font-extrabold text-white">{mathScore}/{mathMax}</span>
              <span className="text-[11px] text-purple-300">{mathMax > 0 ? Math.round((mathScore/mathMax)*100) : 0}%</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white">
            <span className="text-lg font-extrabold">{totalScore}/{totalMax}</span>
            <span className="text-sm opacity-70">({totalPct}%)</span>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-extrabold ${passed ? 'bg-emerald-400 text-white' : 'bg-red-400 text-white'}`}>
            {passed ? '✓ PASSED' : '✗ FAILED'}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 bg-white px-6 flex gap-0.5 pt-3 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className="shrink-0 px-4 py-2 text-[13px] font-bold border-b-2 transition-all whitespace-nowrap"
            style={view === t.key
              ? { borderColor: '#4f46e5', color: '#4f46e5' }
              : { borderColor: 'transparent', color: '#9ca3af' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* SAT Score */}
      {view === 'sat_score' && (
        <div className="flex-1 overflow-y-auto">
          <ProjectedSATScore rwM1={rwM1} rwM2={rwM2} mathM1={mathM1} mathM2={mathM2} />
        </div>
      )}

      {/* Questions */}
      {view === 'questions' && (
        <>
          {modules.length > 0 && (
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-2 flex gap-2 flex-wrap">
              {modules.map(({ key, label, data, color }) => (
                <button key={key} onClick={() => setActiveModule(key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all"
                  style={activeModule === key
                    ? { background: color, color: '#fff' }
                    : { background: '#e5e7eb', color: '#6b7280' }}>
                  {label}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={activeModule === key ? { background: 'rgba(255,255,255,0.25)' } : { background: '#d1d5db' }}>
                    {data.score}/{data.max_score}
                  </span>
                </button>
              ))}
            </div>
          )}
          {activeModData && (
            <div className="flex items-center gap-4 px-6 py-2.5 bg-indigo-50 border-b border-indigo-100 flex-wrap">
              <span className="font-bold text-indigo-700 text-sm">{activeModData.label}</span>
              <span className="text-gray-500 text-xs">⭐ {activeModData.data.score} / {activeModData.data.max_score} pts</span>
              <span className="text-gray-500 text-xs">{activeModData.data.breakdown?.length || 0} questions</span>
              {activeModData.data.tier && (
                <span className="text-gray-500 text-xs capitalize">{activeModData.data.tier === 'hard' ? 'Advanced' : 'Standard'} tier</span>
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-6">
            <QuestionList breakdown={activeModData?.data?.breakdown} />
          </div>
        </>
      )}

      {/* Topic Mastery */}
      {view === 'topics' && (
        <div className="flex-1 overflow-y-auto p-6">
          <TopicMasteryTable topicMastery={topicMastery} />
        </div>
      )}

      {/* Charts */}
      {view === 'charts' && (
        <div className="flex-1 overflow-y-auto">
          <TopicCharts topicMastery={topicMastery} />
        </div>
      )}

      {/* AI Summary */}
      {view === 'summary' && (
        <div className="flex-1 overflow-y-auto p-6">
          <AISummaryView aiData={aiData} />
        </div>
      )}
    </div>
  );
}

// ── Adaptive / SAT Score Page ──────────────────────────────────
function AdaptiveResultView({ session, examConfig }) {
  const [activeTab, setActiveTab]       = useState('questions');
  const [activeModule, setActiveModule] = useState('m1');

  const topicMastery = useMemo(() => session ? computeSatTopicMastery(session) : {}, [session]);
  const hasTopics = Object.keys(topicMastery).length > 0 &&
    Object.values(topicMastery).some(g => Object.keys(g).length > 0);

  const totalScore = session ? (session.total_score ?? ((session.module_1?.score || 0) + (session.module_2?.score || 0))) : 0;
  const totalMax   = session ? ((session.module_1?.max_score || 0) + (session.module_2?.max_score || 0)) : 0;
  const totalPct   = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const passed     = totalPct >= 60;

  const aiData = useMemo(() => hasTopics ? generateSatAISummary(topicMastery, totalPct) : null, [topicMastery, totalPct, hasTopics]);

  const TABS = [
    { key: 'questions', label: 'Questions' },
    ...(hasTopics ? [{ key: 'topics', label: 'Topic Mastery' }] : []),
    ...(hasTopics ? [{ key: 'charts', label: 'Charts' }] : []),
    { key: 'summary', label: 'AI Summary' },
  ];

  const m1 = session?.module_1;
  const m2 = session?.module_2;
  const modules = [
    m1 && { key: 'm1', label: 'Module 1', data: m1 },
    m2 && { key: 'm2', label: `Module 2 · ${m2?.tier === 'hard' ? 'Advanced' : 'Standard'}`, data: m2 },
  ].filter(Boolean);
  const activeModuleData = activeModule === 'm1' ? m1 : m2;

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-5xl mb-4">📊</span>
        <p className="text-base font-bold text-gray-600">Results Unavailable</p>
        <p className="text-sm mt-1">Could not load the score report for this test.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Score summary bar */}
      <div className="px-6 py-4 flex items-center gap-4 flex-wrap"
           style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
               style={{ background: 'rgba(255,255,255,0.15)' }}>📐</div>
          <div>
            <p className="text-white font-extrabold text-base">{examConfig?.name || 'SAT Practice Test'}</p>
            <p className="text-indigo-300 text-xs mt-0.5">{SUBJ_LABEL[session.subject] || session.subject || ''}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white">
            <span className="text-lg font-extrabold">{totalScore}/{totalMax}</span>
            <span className="text-sm opacity-70">({totalPct}%)</span>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-extrabold ${passed ? 'bg-emerald-400 text-white' : 'bg-red-400 text-white'}`}>
            {passed ? '✓ PASSED' : '✗ FAILED'}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 bg-white px-6 flex gap-1 pt-3">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-4 py-2 text-[13px] font-bold border-b-2 transition-all"
            style={activeTab === t.key
              ? { borderColor: '#4f46e5', color: '#4f46e5' }
              : { borderColor: 'transparent', color: '#9ca3af' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Module selector */}
      {activeTab === 'questions' && modules.length > 0 && (
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-2 flex gap-2">
          {modules.map(({ key, label, data }) => (
            <button key={key} onClick={() => setActiveModule(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all"
              style={activeModule === key
                ? { background: '#4f46e5', color: '#fff' }
                : { background: '#e5e7eb', color: '#6b7280' }}>
              {label}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={activeModule === key ? { background: 'rgba(255,255,255,0.25)' } : { background: '#d1d5db' }}>
                {data.score}/{data.max_score}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Module meta */}
      {activeTab === 'questions' && activeModuleData && (
        <div className="flex items-center gap-4 px-6 py-2.5 bg-indigo-50 border-b border-indigo-100 flex-wrap">
          <span className="font-bold text-indigo-700 text-sm">
            {activeModule === 'm1' ? 'Module 1' : `Module 2 · ${activeModuleData.tier === 'hard' ? 'Advanced' : 'Standard'}`}
          </span>
          <span className="text-gray-500 text-xs">⭐ {activeModuleData.score} / {activeModuleData.max_score} pts</span>
          <span className="text-gray-500 text-xs">{activeModuleData.breakdown?.length || 0} questions</span>
          <div className="ml-auto w-32 h-2 bg-indigo-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full"
                 style={{ width: `${activeModuleData.percentage}%`, background: activeModuleData.percentage >= 60 ? '#10b981' : '#ef4444' }} />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'questions' && <QuestionList breakdown={activeModuleData?.breakdown} />}
        {activeTab === 'topics' && <TopicMasteryTable topicMastery={topicMastery} />}
        {activeTab === 'charts' && <TopicCharts topicMastery={topicMastery} />}
        {activeTab === 'summary' && <AISummaryView aiData={aiData} />}
      </div>
    </div>
  );
}

// ── Practice Result View ───────────────────────────────────────
function PracticeResultView({ session, config }) {
  const [activeTab, setActiveTab] = useState('questions');

  const topicMastery = useMemo(() => session ? computePracticeTopicMastery(session, config) : {}, [session, config]);
  const hasTopics = Object.keys(topicMastery).length > 0 &&
    Object.values(topicMastery).some(g => Object.keys(g).length > 0);

  const pct    = session?.percentage || 0;
  const breakdown = session?.breakdown || [];
  const correct   = breakdown.filter(b => b.is_correct).length;
  const passed    = pct >= 60;

  const aiData = useMemo(() => hasTopics ? generateSatAISummary(topicMastery, pct) : null, [topicMastery, pct, hasTopics]);

  const TABS = [
    { key: 'questions', label: 'Questions' },
    { key: 'summary', label: 'AI Summary' },
  ];

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-5xl mb-4">📚</span>
        <p className="text-base font-bold text-gray-600">Results Unavailable</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-6 py-4 flex items-center gap-4 flex-wrap"
           style={{ background: 'linear-gradient(135deg,#0d9488,#0891b2)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
               style={{ background: 'rgba(255,255,255,0.2)' }}>📚</div>
          <div>
            <p className="text-white font-extrabold text-base">{config?.name || 'Practice Test'}</p>
            <p className="text-teal-200 text-xs mt-0.5">{config?.topic || SUBJ_LABEL[config?.subject] || ''}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white">
            <span className="text-lg font-extrabold">{correct}/{breakdown.length}</span>
            <span className="text-sm opacity-70">({pct}%)</span>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-extrabold ${passed ? 'bg-emerald-400 text-white' : 'bg-red-400 text-white'}`}>
            {passed ? '✓ PASSED' : '✗ NEEDS WORK'}
          </span>
        </div>
      </div>

      {config && (
        <div className="flex items-center gap-4 px-6 py-2 bg-teal-50 border-b border-teal-100 text-xs text-teal-700 flex-wrap">
          {config.subject   && <span>Subject: <strong>{SUBJ_LABEL[config.subject] || config.subject}</strong></span>}
          {config.topic     && <span>Topic: <strong>{config.topic}</strong></span>}
          {config.sub_topic && <span>Sub-topic: <strong>{config.sub_topic}</strong></span>}
        </div>
      )}

      <div className="border-b border-gray-200 bg-white px-6 flex gap-1 pt-3">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-4 py-2 text-[13px] font-bold border-b-2 transition-all"
            style={activeTab === t.key
              ? { borderColor: '#0d9488', color: '#0d9488' }
              : { borderColor: 'transparent', color: '#9ca3af' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'questions' && <QuestionList breakdown={breakdown} />}
        {activeTab === 'summary' && <AISummaryView aiData={aiData} />}
      </div>
    </div>
  );
}

// ── Full Length Result View ────────────────────────────────────
function FullLengthResultView({ data }) {
  const [activeSubject, setActiveSubject] = useState(data.rw ? 'rw' : 'math');
  const [activeTab, setActiveTab]         = useState('questions');
  const [activeModule, setActiveModule]   = useState('m1');

  useEffect(() => { setActiveTab('questions'); setActiveModule('m1'); }, [activeSubject]);

  const session = activeSubject === 'rw' ? data.rw : data.math;
  const topicMastery = useMemo(() => session ? computeSatTopicMastery(session) : {}, [session]);
  const hasTopics = Object.keys(topicMastery).length > 0 &&
    Object.values(topicMastery).some(g => Object.keys(g).length > 0);

  const sessScore = session ? (session.total_score ?? ((session.module_1?.score || 0) + (session.module_2?.score || 0))) : 0;
  const sessMax   = session ? ((session.module_1?.max_score || 0) + (session.module_2?.max_score || 0)) : 0;
  const sessPct   = sessMax > 0 ? Math.round((sessScore / sessMax) * 100) : 0;

  const aiData = useMemo(() => hasTopics ? generateSatAISummary(topicMastery, sessPct) : null, [topicMastery, sessPct, hasTopics]);

  const mathScore  = data.math ? (data.math.total_score ?? ((data.math.module_1?.score || 0) + (data.math.module_2?.score || 0))) : 0;
  const mathMax    = data.math ? ((data.math.module_1?.max_score || 0) + (data.math.module_2?.max_score || 0)) : 0;
  const rwScore    = data.rw   ? (data.rw.total_score   ?? ((data.rw.module_1?.score   || 0) + (data.rw.module_2?.score   || 0))) : 0;
  const rwMax      = data.rw   ? ((data.rw.module_1?.max_score   || 0) + (data.rw.module_2?.max_score   || 0)) : 0;
  const totalScore = mathScore + rwScore;
  const totalMax   = mathMax + rwMax;
  const totalPct   = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const passed     = totalPct >= 60;

  const TABS = [
    { key: 'questions', label: 'Questions' },
    ...(hasTopics ? [{ key: 'topics', label: 'Topic Mastery' }] : []),
    ...(hasTopics ? [{ key: 'charts', label: 'Charts' }] : []),
    { key: 'summary', label: 'AI Summary' },
  ];

  const m1 = session?.module_1;
  const m2 = session?.module_2;
  const modules = [
    m1 && { key: 'm1', label: 'Module 1', data: m1 },
    m2 && { key: 'm2', label: `Module 2 · ${m2?.tier === 'hard' ? 'Advanced' : 'Standard'}`, data: m2 },
  ].filter(Boolean);
  const activeModuleData = activeModule === 'm1' ? m1 : m2;

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-6 py-4 flex items-center gap-4 flex-wrap"
           style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
               style={{ background: 'rgba(255,255,255,0.2)' }}>📝</div>
          <div>
            <p className="text-white font-extrabold text-base">{data.full_length_exam_config_id?.name || 'Full Length Test'}</p>
            <p className="text-indigo-300 text-xs mt-0.5">Full Length SAT</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white">
            <span className="text-lg font-extrabold">{totalScore}/{totalMax}</span>
            <span className="text-sm opacity-70">({totalPct}%)</span>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-extrabold ${passed ? 'bg-emerald-400 text-white' : 'bg-red-400 text-white'}`}>
            {passed ? '✓ PASSED' : '✗ FAILED'}
          </span>
        </div>
      </div>

      {/* Subject tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-6">
        {[
          data.rw   && { key: 'rw',   label: 'Reading & Writing', score: rwScore,   max: rwMax },
          data.math && { key: 'math', label: 'Mathematics',       score: mathScore, max: mathMax },
        ].filter(Boolean).map(s => (
          <button key={s.key} onClick={() => setActiveSubject(s.key)}
            className={`flex-1 py-3 text-[13px] font-bold border-b-2 transition-all ${activeSubject === s.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400'}`}>
            {s.label}
            <span className="ml-1.5 text-[11px] font-normal opacity-70">{s.score}/{s.max}</span>
          </button>
        ))}
      </div>

      <div className="border-b border-gray-100 bg-white px-6 flex gap-1 pt-3">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-4 py-2 text-[13px] font-bold border-b-2 transition-all"
            style={activeTab === t.key
              ? { borderColor: '#4f46e5', color: '#4f46e5' }
              : { borderColor: 'transparent', color: '#9ca3af' }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'questions' && modules.length > 0 && (
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-2 flex gap-2">
          {modules.map(({ key, label, data: mdata }) => (
            <button key={key} onClick={() => setActiveModule(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all"
              style={activeModule === key ? { background: '#4f46e5', color: '#fff' } : { background: '#e5e7eb', color: '#6b7280' }}>
              {label}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={activeModule === key ? { background: 'rgba(255,255,255,0.25)' } : { background: '#d1d5db' }}>
                {mdata.score}/{mdata.max_score}
              </span>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'questions' && activeModuleData && (
        <div className="flex items-center gap-4 px-6 py-2.5 bg-indigo-50 border-b border-indigo-100 flex-wrap">
          <span className="font-bold text-indigo-700 text-sm">
            {activeModule === 'm1' ? 'Module 1' : `Module 2 · ${activeModuleData.tier === 'hard' ? 'Advanced' : 'Standard'}`}
          </span>
          <span className="text-gray-500 text-xs">⭐ {activeModuleData.score} / {activeModuleData.max_score} pts</span>
          <span className="text-gray-500 text-xs">{activeModuleData.breakdown?.length || 0} questions</span>
          <div className="ml-auto w-32 h-2 bg-indigo-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full"
                 style={{ width: `${activeModuleData.percentage}%`, background: activeModuleData.percentage >= 60 ? '#10b981' : '#ef4444' }} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'questions' && <QuestionList breakdown={activeModuleData?.breakdown} />}
        {activeTab === 'topics' && <TopicMasteryTable topicMastery={topicMastery} />}
        {activeTab === 'charts' && <TopicCharts topicMastery={topicMastery} />}
        {activeTab === 'summary' && <AISummaryView aiData={aiData} />}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function TestResultPage() {
  const { studentId, sessionId } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { type, examConfig, practiceConfig, pairedSessionId, primaryIsMath, isDiagnostic, seriesName } = location.state || {};

  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    if (type === 'adaptive_pair') {
      const primaryFetch = satMentorService.getSessionResults(sessionId);
      const pairedFetch  = pairedSessionId
        ? satMentorService.getSessionResults(pairedSessionId)
        : Promise.resolve({ data: null });

      Promise.all([primaryFetch, pairedFetch])
        .then(([primaryRes, pairedRes]) => {
          const primary = primaryRes.data;
          const paired  = pairedRes.data;
          const math = primaryIsMath ? primary : paired;
          const rw   = primaryIsMath ? paired  : primary;
          setResult({ math, rw });
        })
        .catch(err => setError(err?.message || 'Failed to load results'))
        .finally(() => setLoading(false));
      return;
    }

    const fetch = type === 'practice'
      ? satMentorService.getPracticeResults(sessionId)
      : type === 'full_length'
        ? satMentorService.getFullLengthResults(sessionId)
        : satMentorService.getSessionResults(sessionId);

    fetch
      .then(res => setResult(res.data))
      .catch(err => setError(err?.message || 'Failed to load results'))
      .finally(() => setLoading(false));
  }, [sessionId, type, pairedSessionId, primaryIsMath]);

  const handleBack = () => {
    if (studentId) {
      const basePath = location.pathname.startsWith('/operations') ? '/operations' : '/mentor';
      navigate(`${basePath}/students/${studentId}`, { state: { tab: 'Progress' } });
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Student Profile
        </button>
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-800">Test Result</span>
          <span>·</span>
          <span>
            {type === 'practice' ? 'Practice Test' : type === 'full_length' ? 'Full Length Test' : 'SAT Test'}
          </span>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-6 gap-0">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white rounded-2xl border border-gray-200 min-h-[400px]">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
            <p className="text-sm font-bold text-gray-500">Loading report…</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-gray-200 min-h-[400px]">
            <span className="text-4xl">⚠️</span>
            <p className="text-base font-bold text-gray-700">Could not load results</p>
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={handleBack} className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">
              Go Back
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col"
               style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            {type === 'practice' && (
              <PracticeResultView session={result} config={practiceConfig} />
            )}
            {type === 'full_length' && result && (
              <FullLengthResultView data={result} />
            )}
            {type === 'adaptive_pair' && result && (
              <AdaptivePairResultView
                mathSession={result.math}
                rwSession={result.rw}
                isDiagnostic={isDiagnostic}
                seriesName={seriesName}
              />
            )}
            {(type === 'adaptive' || !type) && (
              <AdaptiveResultView session={result} examConfig={examConfig} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
