import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService, satMentorService } from '../../../services/api';
import MathContent from '../../common/MathContent';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';


const SUBJ_LABEL = { math: 'Math', reading_writing: 'Reading & Writing' };

const backIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const TABS = ['Overview', 'Progress', 'Notes'];

function initials(name = '') {
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// ── Shared utilities ──────────────────────────────────────────

function sanitizeText(text) {
  if (!text) return text;
  return text
    .replace(//g, '‘').replace(//g, '’')
    .replace(//g, '“').replace(//g, '”')
    .replace(//g, '–').replace(//g, '—')
    .replace(/�/g, "'").replace(/◆/g, "'");
}

function getMasteryLevel(pct) {
  if (pct >= 85) return { label: 'MASTER',       color: '#2563eb', bg: '#dbeafe', bar: '#10b981' };
  if (pct >= 70) return { label: 'ELITE',        color: '#0891b2', bg: '#cffafe', bar: '#06b6d4' };
  if (pct >= 55) return { label: 'EXPERT',       color: '#7c3aed', bg: '#ede9fe', bar: '#8b5cf6' };
  if (pct >= 40) return { label: 'ADVANCED',     color: '#d97706', bg: '#fef3c7', bar: '#f59e0b' };
  if (pct >= 25) return { label: 'INTERMEDIATE', color: '#ea580c', bg: '#ffedd5', bar: '#f97316' };
  return           { label: 'NOVICE',            color: '#ef4444', bg: '#fee2e2', bar: '#ef4444' };
}

const CHART_PALETTE = ['#4472C4','#70AD47','#ED7D31','#FF69B4','#FFC000','#00B0F0'];
const MASTERY_CHART_COLORS = {
  MASTER:'#4472C4', ELITE:'#70AD47', EXPERT:'#ED7D31',
  ADVANCED:'#FFC000', INTERMEDIATE:'#FF69B4', NOVICE:'#A5A5A5',
};

// Build topic mastery from SAT session breakdown arrays
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

// ── Topic charts (column + pie + line) ───────────────────────
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
        <p>No topic data available. Topics must be set on questions.</p>
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
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">Line Chart</span>
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
            <p className="text-center text-[11px] text-gray-400 mt-1">T1, T2 … = topics in question order</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI Summary view ───────────────────────────────────────────
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
              {aiData.developing.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {aiData.developing.slice(0, 4).map(t => (
                    <span key={t.topic} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">{t.topic} · {t.pct}%</span>
                  ))}
                </div>
              )}
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

// ── SAT Score Modal — full 4-tab report ───────────────────────
function SatScoreModal({ session, assignment, onClose }) {
  const [activeTab, setActiveTab]       = useState('questions');
  const [activeModule, setActiveModule] = useState('m1');

  const topicMastery = useMemo(
    () => session ? computeSatTopicMastery(session) : {},
    [session],
  );
  const hasTopics = Object.keys(topicMastery).length > 0 &&
    Object.values(topicMastery).some(g => Object.keys(g).length > 0);

  const totalScore  = session ? (session.total_score ?? ((session.module_1?.score || 0) + (session.module_2?.score || 0))) : 0;
  const totalMax    = session ? ((session.module_1?.max_score || 0) + (session.module_2?.max_score || 0)) : 0;
  const totalPct    = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  const aiData = useMemo(
    () => hasTopics ? generateSatAISummary(topicMastery, totalPct) : null,
    [topicMastery, totalPct, hasTopics],
  );

  const MODAL_TABS = [
    { key: 'questions', label: 'Questions' },
    ...(hasTopics ? [{ key: 'topics', label: 'Topic Mastery' }] : []),
    ...(hasTopics ? [{ key: 'charts', label: 'Charts' }] : []),
    { key: 'summary', label: 'AI Summary' },
  ];

  if (!session) {
    return (
      <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-4xl mb-3">📊</p>
          <h3 className="text-base font-extrabold text-gray-800 mb-2">Results Unavailable</h3>
          <p className="text-sm text-gray-500 mb-5">Could not load the score report for this test.</p>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">Close</button>
        </div>
      </div>
    );
  }

  const testName = assignment?.exam_config_id?.name || assignment?.full_length_exam_config_id?.name || 'SAT Practice Test';
  const passed   = totalPct >= 60;
  const m1       = session.module_1;
  const m2       = session.module_2;
  const modules  = [
    m1 && { key: 'm1', label: 'Module 1', data: m1 },
    m2 && { key: 'm2', label: `Module 2 · ${m2?.tier === 'hard' ? 'Advanced' : 'Standard'}`, data: m2 },
  ].filter(Boolean);
  const activeModuleData = activeModule === 'm1' ? m1 : m2;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
           style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.35)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
             style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shrink-0"
                 style={{ background: 'rgba(255,255,255,0.2)' }}>
              📐
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Score Report</h3>
              <p className="text-xs text-indigo-300 mt-0.5">{testName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-white">
              <span className="text-sm font-extrabold">{totalScore}/{totalMax}</span>
              <span className="text-[11px] opacity-70">({totalPct}%)</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${passed ? 'bg-emerald-400 text-white' : 'bg-red-400 text-white'}`}>
                {passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/15 text-white hover:bg-white/30 flex items-center justify-center text-sm font-bold transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="shrink-0 border-b border-gray-100 bg-white px-5 pt-3 flex gap-1">
          {MODAL_TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="px-4 py-1.5 rounded-t-lg text-[12px] font-bold border-b-2 transition-all"
              style={activeTab === t.key
                ? { borderColor: '#4f46e5', color: '#4f46e5', background: '#fff' }
                : { borderColor: 'transparent', color: '#9ca3af' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Module tabs (questions tab only) */}
        {activeTab === 'questions' && modules.length > 0 && (
          <div className="shrink-0 border-b border-gray-100 bg-gray-50">
            <div className="flex gap-1 px-5 py-2">
              {modules.map(({ key, label, data }) => (
                <button key={key} onClick={() => setActiveModule(key)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all"
                  style={activeModule === key
                    ? { background: '#4f46e5', color: '#fff' }
                    : { background: '#f3f4f6', color: '#9ca3af' }}>
                  {label}
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold"
                        style={activeModule === key
                          ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                          : { background: '#e5e7eb', color: '#6b7280' }}>
                    {data.score}/{data.max_score}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Module meta bar (questions tab only) */}
        {activeTab === 'questions' && activeModuleData && (
          <div className="flex items-center gap-4 px-5 py-3 shrink-0" style={{ background: '#eef2ff' }}>
            <span className="font-bold text-indigo-700 text-sm">
              {activeModule === 'm1' ? 'Module 1' : `Module 2 · ${activeModuleData.tier === 'hard' ? 'Advanced' : 'Standard'}`}
            </span>
            <span className="text-gray-500 text-xs">⭐ {activeModuleData.score} / {activeModuleData.max_score} pts</span>
            <span className="text-gray-500 text-xs">{activeModuleData.breakdown?.length || 0} questions</span>
            <div className="ml-auto w-28 h-2 bg-indigo-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full"
                   style={{ width: `${activeModuleData.percentage}%`, background: activeModuleData.percentage >= 60 ? '#10b981' : '#ef4444' }} />
            </div>
          </div>
        )}

        {/* ── Questions tab ── */}
        {activeTab === 'questions' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {!activeModuleData?.breakdown?.length ? (
              <div className="py-12 text-center text-gray-400 text-sm">No question data available</div>
            ) : (
              activeModuleData.breakdown.map((q, i) => {
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
                            <MathContent html={sanitizeText(q.explanation)} className="text-[12px] text-amber-800 leading-relaxed [&_p]:m-0" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Topic Mastery tab ── */}
        {activeTab === 'topics' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
        )}

        {/* ── Charts tab ── */}
        {activeTab === 'charts' && (
          <div className="flex-1 overflow-y-auto">
            <TopicCharts topicMastery={topicMastery} />
          </div>
        )}

        {/* ── AI Summary tab ── */}
        {activeTab === 'summary' && (
          <div className="flex-1 overflow-y-auto">
            <AISummaryView aiData={aiData} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Collapsible SAT test section (diagnostic / mock / practice) ──
// Groups sessions that share a series name (e.g., "Diagnostic-Test-1 — Math" +
// "Diagnostic-Test-1 — Reading & Writing") into one combined card.
const SERIES_RE = / — (Math|Reading & Writing)$/;

// ── Score colour helpers ───────────────────────────────────────────────────────
const scoreColor = pct => pct >= 80 ? '#059669' : pct >= 60 ? '#0891b2' : pct >= 40 ? '#d97706' : '#dc2626';
const scoreBg    = pct => pct >= 80 ? '#ecfdf5' : pct >= 60 ? '#ecfeff' : pct >= 40 ? '#fffbeb' : '#fef2f2';

function SatTestSection({ label, icon, accentColor, sessions, loading, onView, viewLoadingId }) {
  const [expanded, setExpanded] = useState(false);
  const completed = sessions.filter(s => s.status === 'complete' || s.status === 'completed').length;

  const displayRows = useMemo(() => {
    const fullLengthRows = sessions
      .filter(s => s.session_type === 'full_length')
      .map(s => ({ type: 'full_length', session: s, latestAt: +new Date(s.createdAt || 0) }));

    const seriesMap = {};
    const singles   = [];

    sessions.filter(s => s.session_type !== 'full_length').forEach(s => {
      const name  = s.exam_config_id?.name || '';
      const match = name.match(SERIES_RE);
      if (match) {
        const series = name.replace(SERIES_RE, '').trim();
        if (!seriesMap[series]) seriesMap[series] = { math: [], rw: [] };
        const subj = s.exam_config_id?.subject || s.subject;
        if (subj === 'math') seriesMap[series].math.push(s);
        else                 seriesMap[series].rw.push(s);
      } else {
        singles.push({ type: 'single', session: s, latestAt: +new Date(s.createdAt || 0) });
      }
    });

    const seriesRows = Object.entries(seriesMap).map(([series, { math, rw }]) => {
      const all = [...math, ...rw];
      return {
        type: 'series', series, math, rw,
        latestAt: Math.max(...all.map(s => +new Date(s.createdAt || 0))),
      };
    });

    return [...fullLengthRows, ...seriesRows, ...singles]
      .sort((a, b) => b.latestAt - a.latestAt);
  }, [sessions]);

  const fmtDate = raw => raw
    ? new Date(raw).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const ViewBtn = ({ s }) => {
    const isDone = s.status === 'complete' || s.status === 'completed';
    if (!isDone) return (
      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${s.status === 'pending' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-600'}`}>
        {s.status === 'pending' ? 'Pending' : 'In Progress'}
      </span>
    );
    return (
      <button onClick={() => onView(s)} disabled={viewLoadingId === s._id}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white disabled:opacity-60 transition-all hover:shadow-sm active:scale-95"
        style={{ background: 'linear-gradient(135deg,#0d9488,#059669)' }}>
        {viewLoadingId === s._id
          ? <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block" />
          : 'View →'}
      </button>
    );
  };

  const completionPct = sessions.length > 0 ? Math.round((completed / sessions.length) * 100) : 0;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-200 ${expanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'}`}
         style={{ borderColor: expanded ? `${accentColor}55` : '#e5e7eb' }}>

      {/* ── Header ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50/70 transition-colors group">
        <div className="flex items-center gap-3">
          {/* Icon box */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm"
               style={{ background: `linear-gradient(135deg,${accentColor}22,${accentColor}44)`, border: `1.5px solid ${accentColor}33` }}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">{label}</p>
            {!loading && sessions.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-0.5">{completed} of {sessions.length} completed</p>
            )}
          </div>
          {!loading && sessions.length > 0 && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: `${accentColor}18`, color: accentColor }}>
              {completionPct}%
            </span>
          )}
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${expanded ? 'rotate-180' : ''}`}
             style={{ background: expanded ? `${accentColor}18` : '#f1f5f9' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               style={{ color: expanded ? accentColor : '#94a3b8' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* ── Body ── */}
      {expanded && (
        <div style={{ borderTop: `2px solid ${accentColor}22` }}>
          {loading ? (
            <div className="py-10 flex items-center justify-center gap-2.5 text-slate-400 text-sm bg-slate-50/40">
              <span className="w-4 h-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
              Loading sessions…
            </div>
          ) : displayRows.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-2 text-slate-400 bg-slate-50/40">
              <span className="text-3xl opacity-40">{icon}</span>
              <p className="text-sm">No {label.toLowerCase()} taken yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-slate-50/30">
              {displayRows.map((row, idx) => {

                /* ── Full-length or single-subject ── */
                if (row.type === 'full_length' || row.type === 'single') {
                  const s      = row.session;
                  const pct    = s.percentage ?? s.total_percentage ?? null;
                  const name   = s.full_length_exam_config_id?.name || s.exam_config_id?.name || 'Test';
                  const subj   = SUBJ_LABEL[s.exam_config_id?.subject] || '';
                  const date   = fmtDate(s.createdAt);
                  const isDone = s.status === 'complete' || s.status === 'completed';
                  return (
                    <div key={s._id}
                         className="flex items-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-50 transition-colors">
                      {/* Index badge */}
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                           style={{ background: `${accentColor}18`, color: accentColor }}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{[subj, date].filter(Boolean).join(' · ')}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {pct !== null && (
                          <span className="text-[12px] font-extrabold px-2 py-0.5 rounded-lg"
                                style={{ color: scoreColor(pct), background: scoreBg(pct) }}>
                            {pct}%
                          </span>
                        )}
                        {isDone ? (
                          <button onClick={() => onView(s)} disabled={viewLoadingId === s._id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white disabled:opacity-60 transition-all hover:shadow-md active:scale-95"
                            style={{ background: 'linear-gradient(135deg,#0d9488,#059669)' }}>
                            {viewLoadingId === s._id
                              ? <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                              : 'View Results →'}
                          </button>
                        ) : (
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${s.status === 'pending' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-600'}`}>
                            {s.status === 'pending' ? 'Pending' : 'In Progress'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                /* ── Series group ── */
                const { series, math, rw } = row;
                const latestMath = [...math].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
                const latestRw   = [...rw].sort((a, b)   => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
                const mathPct    = latestMath ? (latestMath.total_percentage ?? null) : null;
                const rwPct      = latestRw   ? (latestRw.total_percentage   ?? null) : null;
                const date       = fmtDate(latestMath?.createdAt || latestRw?.createdAt);
                const totalSessions = math.length + rw.length;

                return (
                  <div key={series} className="bg-white hover:bg-slate-50/60 transition-colors">
                    {/* Series header strip */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                             style={{ background: `${accentColor}18`, border: `1.5px solid ${accentColor}33` }}>
                          {icon}
                        </div>
                        <p className="text-[13px] font-bold text-slate-800">{series}</p>
                        {totalSessions > 2 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {totalSessions} sessions
                          </span>
                        )}
                      </div>
                      {date && <span className="text-[11px] text-slate-400">{date}</span>}
                    </div>

                    {/* Math + R&W panels */}
                    <div className="grid grid-cols-2 gap-3 px-5 pb-4">
                      {/* Math */}
                      <div className="rounded-xl p-3.5 flex flex-col gap-2" style={{ background: 'linear-gradient(135deg,#faf5ff,#f3e8ff)', border: '1.5px solid #e9d5ff' }}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded bg-purple-200 flex items-center justify-center">
                            <span className="text-[8px] font-black text-purple-700">M</span>
                          </div>
                          <p className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider">Math</p>
                        </div>
                        {latestMath ? (
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            {mathPct !== null ? (
                              <span className="text-[15px] font-black"
                                    style={{ color: scoreColor(mathPct) }}>{mathPct}%</span>
                            ) : <span className="text-[11px] text-slate-400">—</span>}
                            <ViewBtn s={latestMath} />
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">Not taken</p>
                        )}
                      </div>

                      {/* R&W */}
                      <div className="rounded-xl p-3.5 flex flex-col gap-2" style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1.5px solid #bfdbfe' }}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded bg-blue-200 flex items-center justify-center">
                            <span className="text-[8px] font-black text-blue-700">R</span>
                          </div>
                          <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">R&amp;W</p>
                        </div>
                        {latestRw ? (
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            {rwPct !== null ? (
                              <span className="text-[15px] font-black"
                                    style={{ color: scoreColor(rwPct) }}>{rwPct}%</span>
                            ) : <span className="text-[11px] text-slate-400">—</span>}
                            <ViewBtn s={latestRw} />
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">Not taken</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Practice result modal — Questions + AI Summary ───────────
function PracticeResultModal({ result, onClose }) {
  const { session, config } = result;
  const [activeTab, setActiveTab] = useState('questions');

  const topicMastery = useMemo(
    () => session ? computePracticeTopicMastery(session, config) : {},
    [session, config],
  );
  const hasTopics = Object.keys(topicMastery).length > 0 &&
    Object.values(topicMastery).some(g => Object.keys(g).length > 0);

  const pct    = session?.percentage || 0;
  const aiData = useMemo(
    () => hasTopics ? generateSatAISummary(topicMastery, pct) : null,
    [topicMastery, pct, hasTopics],
  );

  if (!session) {
    return (
      <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-4xl mb-3">📊</p>
          <h3 className="text-base font-extrabold text-gray-800 mb-2">Results Unavailable</h3>
          <p className="text-sm text-gray-500 mb-5">Could not load the score report.</p>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold">Close</button>
        </div>
      </div>
    );
  }

  const breakdown = session.breakdown || [];
  const correct   = breakdown.filter(b => b.is_correct).length;
  const passed    = pct >= 60;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
           style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.35)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
             style={{ background: 'linear-gradient(135deg,#0d9488,#0891b2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: 'rgba(255,255,255,0.2)' }}>📚</div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Practice Report</h3>
              <p className="text-xs text-teal-200 mt-0.5">{config?.name || 'Practice Test'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-white">
              <span className="text-sm font-extrabold">{correct}/{breakdown.length}</span>
              <span className="text-[11px] opacity-70">({pct}%)</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${passed ? 'bg-emerald-400 text-white' : 'bg-red-400 text-white'}`}>
                {passed ? 'PASSED' : 'NEEDS WORK'}
              </span>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/15 text-white hover:bg-white/30 flex items-center justify-center text-sm font-bold transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Tab bar — Questions | AI Summary */}
        <div className="shrink-0 border-b border-gray-100 bg-white px-5 pt-3 flex gap-1">
          {[{ key: 'questions', label: 'Questions' }, { key: 'summary', label: 'AI Summary' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="px-4 py-1.5 rounded-t-lg text-[12px] font-bold border-b-2 transition-all"
              style={activeTab === t.key
                ? { borderColor: '#0d9488', color: '#0d9488', background: '#fff' }
                : { borderColor: 'transparent', color: '#9ca3af' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Config meta bar */}
        {config && (
          <div className="flex items-center gap-4 px-5 py-2 shrink-0 bg-teal-50 border-b border-teal-100 text-xs text-teal-700 flex-wrap">
            {config.topic     && <span>Topic: <strong>{config.topic}</strong></span>}
            {config.sub_topic && <span>Sub-topic: <strong>{config.sub_topic}</strong></span>}
            {config.subject   && <span>Subject: <strong>{SUBJ_LABEL[config.subject] || config.subject}</strong></span>}
          </div>
        )}

        {/* Questions */}
        {activeTab === 'questions' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {!breakdown.length ? (
              <div className="py-12 text-center text-gray-400 text-sm">No question data available</div>
            ) : (
              breakdown.map((q, i) => {

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
                          {q.topic     && <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">{sanitizeText(q.topic)}</span>}
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
                          if      (isStudentAnswer && isAnswerKey)  { bg = '#f0fdf4'; border = '#6ee7b7'; color = '#065f46'; }
                          else if (isStudentAnswer && !isAnswerKey) { bg = '#fff1f2'; border = '#fca5a5'; color = '#991b1b'; }
                          else if (!isStudentAnswer && isAnswerKey) { bg = '#f0fdf4'; border = '#a7f3d0'; color = '#065f46'; }
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
                            <MathContent html={sanitizeText(q.explanation)} className="text-[12px] text-amber-800 leading-relaxed [&_p]:m-0" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* AI Summary */}
        {activeTab === 'summary' && (
          <div className="flex-1 overflow-y-auto">
            <AISummaryView aiData={aiData} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Practice history section — grouped by Subject → Topic → Sub-topic ─────────
function PracticeHistorySection({ sessions, loading, onView, viewLoadingId }) {
  const [expanded, setExpanded] = useState(false);

  const groups = useMemo(() => {
    const completed = sessions.filter(s => s.status === 'complete');
    const result = {};
    completed.forEach(s => {
      const cfg      = s.practice_config_id;
      const subject  = cfg?.subject  || s.subject  || 'general';
      const topic    = cfg?.topic    || 'General';
      const subTopic = cfg?.sub_topic || s.sub_topic || topic;
      if (!result[subject]) result[subject] = {};
      if (!result[subject][topic]) result[subject][topic] = {};
      if (!result[subject][topic][subTopic]) result[subject][topic][subTopic] = [];
      result[subject][topic][subTopic].push(s);
    });
    for (const subjectObj of Object.values(result)) {
      for (const topicObj of Object.values(subjectObj)) {
        for (const arr of Object.values(topicObj)) {
          arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
      }
    }
    return result;
  }, [sessions]);

  const completedCount = sessions.filter(s => s.status === 'complete').length;
  const hasData        = Object.keys(groups).length > 0;
  const completionPct  = sessions.length > 0 ? Math.round((completedCount / sessions.length) * 100) : 0;

  // Subject palette
  const SUBJ_PALETTE = {
    math:            { from: '#7c3aed', to: '#6d28d9', light: '#f5f3ff', badge: '#ede9fe', text: '#6d28d9' },
    reading_writing: { from: '#0891b2', to: '#0e7490', light: '#ecfeff', badge: '#cffafe', text: '#0891b2' },
    general:         { from: '#475569', to: '#334155', light: '#f8fafc', badge: '#e2e8f0', text: '#475569' },
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-200 ${expanded ? 'shadow-md border-emerald-300' : 'shadow-sm hover:shadow-md border-gray-200'}`}>

      {/* ── Header ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-emerald-50/40 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm"
               style={{ background: 'linear-gradient(135deg,#d1fae522,#6ee7b744)', border: '1.5px solid #6ee7b755' }}>
            📚
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">Practice Tests</p>
            {!loading && sessions.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-0.5">{completedCount} of {sessions.length} completed</p>
            )}
          </div>
          {!loading && sessions.length > 0 && (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {completionPct}%
            </span>
          )}
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${expanded ? 'rotate-180 bg-emerald-100' : 'bg-slate-100'}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               className={expanded ? 'text-emerald-600' : 'text-slate-400'}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* ── Body ── */}
      {expanded && (
        <div className="border-t-2 border-emerald-100">
          {loading ? (
            <div className="py-10 flex items-center justify-center gap-2.5 text-slate-400 text-sm bg-slate-50/40">
              <span className="w-4 h-4 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
              Loading practice history…
            </div>
          ) : !hasData ? (
            <div className="py-12 flex flex-col items-center gap-2 text-slate-400 bg-slate-50/40">
              <span className="text-3xl opacity-40">📚</span>
              <p className="text-sm">No practice tests taken yet.</p>
            </div>
          ) : (
            Object.entries(groups).map(([subject, topics]) => {
              const pal = SUBJ_PALETTE[subject] || SUBJ_PALETTE.general;
              return (
                <div key={subject}>
                  {/* Subject header */}
                  <div className="px-5 py-2.5 flex items-center gap-2"
                       style={{ background: `linear-gradient(135deg,${pal.from}18,${pal.to}28)`, borderBottom: `2px solid ${pal.from}22` }}>
                    <div className="w-5 h-5 rounded-md flex items-center justify-center"
                         style={{ background: pal.badge }}>
                      <span className="text-[9px] font-black" style={{ color: pal.text }}>
                        {subject === 'math' ? 'M' : subject === 'reading_writing' ? 'R' : 'G'}
                      </span>
                    </div>
                    <span className="text-[11px] font-extrabold uppercase tracking-[1.5px]"
                          style={{ color: pal.text }}>
                      {SUBJ_LABEL[subject] || subject}
                    </span>
                  </div>

                  {Object.entries(topics).map(([topic, subTopics]) => (
                    <div key={topic}>
                      {/* Topic header */}
                      <div className="px-5 py-2 flex items-center gap-2"
                           style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderLeft: `3px solid ${pal.from}44` }}>
                        <span className="text-[11px] font-bold text-slate-600">{topic}</span>
                        <span className="text-[10px] text-slate-400">
                          · {Object.values(subTopics).reduce((n, arr) => n + arr.length, 0)} attempts
                        </span>
                      </div>
                      {Object.entries(subTopics).map(([subTopic, attempts]) => (
                        <SubTopicRow key={subTopic} subTopic={subTopic} attempts={attempts}
                                     onView={onView} viewLoadingId={viewLoadingId} accentColor={pal.from} />
                      ))}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function SubTopicRow({ subTopic, attempts, onView, viewLoadingId, accentColor = '#0d9488' }) {
  const [showAttempts, setShowAttempts] = useState(false);

  const scores     = attempts.map(a => a.percentage ?? 0);
  const best       = Math.max(...scores);
  const latest     = scores[scores.length - 1] ?? 0;
  const prev       = scores.length > 1 ? scores[scores.length - 2] : null;
  const trend      = prev !== null ? latest - prev : null;
  const bars       = scores.slice(-8);

  const trendColor = trend === null ? '#94a3b8' : trend > 0 ? '#10b981' : trend < 0 ? '#ef4444' : '#94a3b8';
  const trendLabel = trend === null ? null : `${trend > 0 ? '+' : ''}${Math.round(trend)}%`;

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* ── Summary row ── */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-50/80 cursor-pointer transition-colors group"
        onClick={() => setShowAttempts(e => !e)}>

        {/* Attempt count badge */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-extrabold shrink-0"
             style={{ background: `${accentColor}18`, color: accentColor }}>
          {attempts.length}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-slate-800 truncate">{subTopic}</p>
          <p className="text-[11px] text-slate-400">{attempts.length} attempt{attempts.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Mini bar chart */}
        <div className="flex items-end gap-[3px] h-8 shrink-0" title="Score trend">
          {bars.map((pct, i) => (
            <div key={i} className="w-2.5 rounded-sm"
                 style={{
                   height: `${Math.max(5, Math.round(pct * 0.3))}px`,
                   background: scoreColor(pct),
                   opacity: 0.55 + (i / bars.length) * 0.45,
                 }} />
          ))}
        </div>

        {/* Score pills */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-center">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">Latest</p>
            <span className="text-[12px] font-extrabold px-2 py-0.5 rounded-lg"
                  style={{ color: scoreColor(latest), background: scoreBg(latest) }}>
              {latest}%
            </span>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">Best</p>
            <span className="text-[12px] font-extrabold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600">
              {best}%
            </span>
          </div>
          {trendLabel && (
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full min-w-[42px] text-center"
                  style={{ color: trendColor, background: `${trendColor}18` }}>
              {trendLabel}
            </span>
          )}
        </div>

        {/* Expand chevron */}
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 ${showAttempts ? 'rotate-180' : ''}`}
             style={{ background: showAttempts ? `${accentColor}18` : '#f1f5f9' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               style={{ color: showAttempts ? accentColor : '#94a3b8' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* ── Attempts list ── */}
      {showAttempts && (
        <div style={{ background: `${accentColor}06`, borderTop: `1px dashed ${accentColor}33` }}>
          {attempts.map((s, i) => {
            const date   = s.createdAt
              ? new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : '';
            const pct    = s.percentage ?? 0;
            const isDone = s.status === 'complete';

            // Color cycle for attempt badges
            const badgeColors = ['#6366f1','#0891b2','#0d9488','#d97706','#7c3aed','#db2777','#059669','#dc2626'];
            const badgeColor  = badgeColors[i % badgeColors.length];

            return (
              <div key={s._id}
                   className="flex items-center gap-3 px-6 py-3 border-b border-dashed last:border-0 hover:bg-white/60 transition-colors"
                   style={{ borderColor: `${accentColor}22` }}>
                {/* Attempt number */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white shrink-0 shadow-sm"
                     style={{ background: `linear-gradient(135deg,${badgeColor},${badgeColor}cc)` }}>
                  {i + 1}
                </div>

                {/* Label + date */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-slate-700 truncate">
                    {s.practice_config_id?.name || s.exam_config_id?.name || s.full_length_exam_config_id?.name || `Attempt ${i + 1}`}
                    <span className="text-slate-400 font-normal ml-1.5">· {date}</span>
                  </p>
                </div>

                {/* Progress bar + score */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                         style={{ width: `${pct}%`, background: `linear-gradient(90deg,${scoreColor(pct)},${scoreColor(pct)}bb)` }} />
                  </div>
                  <span className="text-[12px] font-extrabold w-10 text-right"
                        style={{ color: scoreColor(pct) }}>
                    {pct}%
                  </span>
                </div>

                {/* View button */}
                {isDone && (
                  <button
                    onClick={e => { e.stopPropagation(); onView(s); }}
                    disabled={viewLoadingId === s._id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white disabled:opacity-60 transition-all hover:shadow-md active:scale-95 shrink-0"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    {viewLoadingId === s._id
                      ? <span className="w-3 h-3 inline-block rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      : 'View →'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Full Length Result Modal (Math + R&W combined) ────────────
function FullLengthResultModal({ result, onClose }) {
  const data = result.data;
  const [activeSubject, setActiveSubject] = useState(data.rw ? 'rw' : 'math');
  const [activeTab, setActiveTab]         = useState('questions');
  const [activeModule, setActiveModule]   = useState('m1');

  useEffect(() => { setActiveTab('questions'); setActiveModule('m1'); }, [activeSubject]);

  const session = activeSubject === 'rw' ? data.rw : data.math;

  const topicMastery = useMemo(
    () => session ? computeSatTopicMastery(session) : {},
    [session],
  );
  const hasTopics = Object.keys(topicMastery).length > 0 &&
    Object.values(topicMastery).some(g => Object.keys(g).length > 0);

  const sessScore = session ? (session.total_score ?? ((session.module_1?.score || 0) + (session.module_2?.score || 0))) : 0;
  const sessMax   = session ? ((session.module_1?.max_score || 0) + (session.module_2?.max_score || 0)) : 0;
  const sessPct   = sessMax > 0 ? Math.round((sessScore / sessMax) * 100) : 0;

  const aiData = useMemo(
    () => hasTopics ? generateSatAISummary(topicMastery, sessPct) : null,
    [topicMastery, sessPct, hasTopics],
  );

  const testName = data.full_length_exam_config_id?.name || 'Full Length Test';

  const mathScore  = data.math ? (data.math.total_score ?? ((data.math.module_1?.score || 0) + (data.math.module_2?.score || 0))) : 0;
  const mathMax    = data.math ? ((data.math.module_1?.max_score || 0) + (data.math.module_2?.max_score || 0)) : 0;
  const rwScore    = data.rw   ? (data.rw.total_score   ?? ((data.rw.module_1?.score   || 0) + (data.rw.module_2?.score   || 0))) : 0;
  const rwMax      = data.rw   ? ((data.rw.module_1?.max_score   || 0) + (data.rw.module_2?.max_score   || 0)) : 0;
  const totalScore = mathScore + rwScore;
  const totalMax   = mathMax + rwMax;
  const totalPct   = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const passed     = totalPct >= 60;

  const MODAL_TABS = [
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
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
           style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.35)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
             style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shrink-0"
                 style={{ background: 'rgba(255,255,255,0.2)' }}>📝</div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Full Length Score Report</h3>
              <p className="text-xs text-indigo-300 mt-0.5">{testName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-white">
              <span className="text-sm font-extrabold">{totalScore}/{totalMax}</span>
              <span className="text-[11px] opacity-70">({totalPct}%)</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${passed ? 'bg-emerald-400 text-white' : 'bg-red-400 text-white'}`}>
                {passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/15 text-white hover:bg-white/30 flex items-center justify-center text-sm font-bold transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Subject selector */}
        <div className="shrink-0 flex border-b border-gray-200 bg-gray-50 px-5">
          {[
            data.rw   && { key: 'rw',   label: 'Reading & Writing', score: rwScore,   max: rwMax },
            data.math && { key: 'math', label: 'Mathematics',       score: mathScore, max: mathMax },
          ].filter(Boolean).map(s => (
            <button key={s.key} onClick={() => setActiveSubject(s.key)}
              className={`flex-1 py-3 text-[12px] font-bold border-b-2 transition-all ${activeSubject === s.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-400'}`}>
              {s.label}
              <span className="ml-1.5 text-[11px] font-normal opacity-70">{s.score}/{s.max}</span>
            </button>
          ))}
        </div>

        {/* Tab bar */}
        <div className="shrink-0 border-b border-gray-100 bg-white px-5 pt-3 flex gap-1">
          {MODAL_TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className="px-4 py-1.5 rounded-t-lg text-[12px] font-bold border-b-2 transition-all"
              style={activeTab === t.key
                ? { borderColor: '#4f46e5', color: '#4f46e5', background: '#fff' }
                : { borderColor: 'transparent', color: '#9ca3af' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Module tabs (questions only) */}
        {activeTab === 'questions' && modules.length > 0 && (
          <div className="shrink-0 border-b border-gray-100 bg-gray-50">
            <div className="flex gap-1 px-5 py-2">
              {modules.map(({ key, label, data: mdata }) => (
                <button key={key} onClick={() => setActiveModule(key)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all"
                  style={activeModule === key
                    ? { background: '#4f46e5', color: '#fff' }
                    : { background: '#f3f4f6', color: '#9ca3af' }}>
                  {label}
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold"
                        style={activeModule === key
                          ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                          : { background: '#e5e7eb', color: '#6b7280' }}>
                    {mdata.score}/{mdata.max_score}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Module meta bar (questions only) */}
        {activeTab === 'questions' && activeModuleData && (
          <div className="flex items-center gap-4 px-5 py-3 shrink-0" style={{ background: '#eef2ff' }}>
            <span className="font-bold text-indigo-700 text-sm">
              {activeModule === 'm1' ? 'Module 1' : `Module 2 · ${activeModuleData.tier === 'hard' ? 'Advanced' : 'Standard'}`}
            </span>
            <span className="text-gray-500 text-xs">⭐ {activeModuleData.score} / {activeModuleData.max_score} pts</span>
            <span className="text-gray-500 text-xs">{activeModuleData.breakdown?.length || 0} questions</span>
            <div className="ml-auto w-28 h-2 bg-indigo-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full"
                   style={{ width: `${activeModuleData.percentage}%`, background: activeModuleData.percentage >= 60 ? '#10b981' : '#ef4444' }} />
            </div>
          </div>
        )}

        {/* Questions */}
        {activeTab === 'questions' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {!activeModuleData?.breakdown?.length ? (
              <div className="py-12 text-center text-gray-400 text-sm">No question data available</div>
            ) : (
              activeModuleData.breakdown.map((q, i) => {
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
                          {q.topic     && <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">{sanitizeText(q.topic)}</span>}
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
                          if      (isStudentAnswer && isAnswerKey)  { bg = '#f0fdf4'; border = '#6ee7b7'; color = '#065f46'; }
                          else if (isStudentAnswer && !isAnswerKey) { bg = '#fff1f2'; border = '#fca5a5'; color = '#991b1b'; }
                          else if (!isStudentAnswer && isAnswerKey) { bg = '#f0fdf4'; border = '#a7f3d0'; color = '#065f46'; }
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
                            <MathContent html={sanitizeText(q.explanation)} className="text-[12px] text-amber-800 leading-relaxed [&_p]:m-0" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Topic Mastery */}
        {activeTab === 'topics' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                {Object.entries(topics).map(([topic, tdata]) => {
                  const pct     = tdata.maxScore > 0 ? Math.round((tdata.score / tdata.maxScore) * 100) : 0;
                  const mastery = getMasteryLevel(pct);
                  return (
                    <div key={topic} className="grid grid-cols-[1fr_auto_160px] items-center px-4 py-3 border-t border-gray-100 bg-white">
                      <div>
                        <p className="text-[13px] text-gray-700">{topic}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{tdata.correct}/{tdata.total} correct</p>
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
        )}

        {/* Charts */}
        {activeTab === 'charts' && (
          <div className="flex-1 overflow-y-auto">
            <TopicCharts topicMastery={topicMastery} />
          </div>
        )}

        {/* AI Summary */}
        {activeTab === 'summary' && (
          <div className="flex-1 overflow-y-auto">
            <AISummaryView aiData={aiData} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loading overlay ───────────────────────────────────────────
function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1100]">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4" style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}>
        <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-gray-700">Loading report…</p>
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [student, setStudent]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [activeTab, setActiveTab]   = useState('Overview');
  const [newNote, setNewNote]       = useState('');
  const [notes, setNotes]           = useState([]);
  const [adaptiveSessions,  setAdaptiveSessions]  = useState([]);
  const [practiceSessions,  setPracticeSessions]  = useState([]);
  const [satSessionsLoading, setSatSessionsLoading] = useState(true);

  const [adaptiveResult, setAdaptiveResult]               = useState(null);
  const [adaptiveResultLoading, setAdaptiveResultLoading] = useState(null);
  const [practiceResult, setPracticeResult]               = useState(null);
  const [practiceResultLoading, setPracticeResultLoading] = useState(null);
  const [fullLengthResult, setFullLengthResult]           = useState(null);
  const [studentAssignments, setStudentAssignments]       = useState([]);

  useEffect(() => {
    studentService.getById(id)
      .then(res => setStudent(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    setSatSessionsLoading(true);
    Promise.all([
      satMentorService.getStudentSessions(id).catch(err => { console.error('[SAT] Failed to load adaptive sessions:', err?.message || err); return { data: [] }; }),
      satMentorService.getStudentPracticeSessions(id).catch(err => { console.error('[SAT] Failed to load practice sessions:', err?.message || err); return { data: [] }; }),
      satMentorService.getAssignments().catch(() => ({ data: [] })),
    ]).then(([adaptiveRes, practiceRes, assignRes]) => {
      setAdaptiveSessions(adaptiveRes.data || []);
      setPracticeSessions(practiceRes.data || []);
      const allAssign = assignRes.data || [];
      setStudentAssignments(allAssign.filter(a =>
        (a.student_id?._id?.toString() || a.student_id?.toString()) === id
      ));
      setSatSessionsLoading(false);
    });
  }, [id]);

  const handleViewAdaptiveResult = async (session) => {
    if (adaptiveResultLoading) return;
    setAdaptiveResultLoading(session._id);
    try {
      if (session.session_type === 'full_length') {
        const res = await satMentorService.getFullLengthResults(session._id);
        setFullLengthResult({ data: res.data });
      } else {
        const res = await satMentorService.getSessionResults(session._id);
        setAdaptiveResult({ session: res.data, assignment: { exam_config_id: session.exam_config_id } });
      }
    } catch (err) {
      console.error('[SAT] Failed to load session results:', err?.message || err);
      if (session.session_type === 'full_length') {
        setFullLengthResult(null);
      } else {
        setAdaptiveResult({ session: null, assignment: { exam_config_id: session.exam_config_id } });
      }
    } finally {
      setAdaptiveResultLoading(null);
    }
  };

  const handleViewPracticeResult = async (session) => {
    if (practiceResultLoading) return;
    setPracticeResultLoading(session._id);
    try {
      const res = await satMentorService.getPracticeResults(session._id);
      setPracticeResult({ session: res.data, config: session.practice_config_id });
    } catch (err) {
      console.error('[SAT] Failed to load practice results:', err?.message || err);
      setPracticeResult({ session: null, config: session.practice_config_id });
    } finally {
      setPracticeResultLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-4">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-3">
        <p className="text-4xl">👤</p>
        <p className="text-lg font-bold text-gray-700">Student not found</p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="text-mentor-primary font-semibold text-sm" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  const isActive      = student.isActive !== false;
  const batch         = student.batches?.[0];
  const mentor        = batch?.mentorId;
  const sessionsDone  = student.completedSessions || 0;
  const totalSess     = student.totalSessions || batch?.totalSessions || 0;
  const batchPct      = Math.round(((batch?.completedSessions || 0) / (batch?.totalSessions || 1)) * 100);
  // Sessions from full-length tests carry a synthetic exam_config_id: { type } object.
  // Sessions from standalone tests have exam_config_id populated from DB (always has type due to schema default).
  // Guard against null exam_config_id (e.g. config deleted after session was created).
  const diagnosticSessions = adaptiveSessions.filter(s =>
    s.exam_config_id?.type === 'diagnostic'
  );
  const mockSessions = adaptiveSessions.filter(s =>
    s.exam_config_id?.type === 'mock' || (s.exam_config_id && !s.exam_config_id.type)
  );
  const totalTests = adaptiveSessions.length + practiceSessions.length;

  // Per-category score averages (only completed sessions)
  const avgPct = (sessions) => {
    const done = sessions.filter(s => s.status === 'complete' || s.status === 'completed');
    if (done.length === 0) return null;
    const sum = done.reduce((acc, s) => acc + (s.percentage ?? s.total_percentage ?? 0), 0);
    return Math.round(sum / done.length);
  };
  const diagnosticPct = avgPct(diagnosticSessions);
  const mockPct       = avgPct(mockSessions);
  const practicePct   = avgPct(practiceSessions);

  // Overall progress = average of categories that have data
  const categoryPcts = [diagnosticPct, mockPct, practicePct].filter(v => v !== null);
  const prog         = categoryPcts.length > 0
    ? Math.round(categoryPcts.reduce((a, b) => a + b, 0) / categoryPcts.length)
    : 0;
  const progressColor = prog >= 80 ? '#10b981' : prog >= 50 ? '#f59e0b' : '#ef4444';


  const addNote = () => {
    if (newNote.trim()) {
      setNotes(n => [...n, { text: newNote.trim(), date: new Date().toLocaleDateString('en-IN') }]);
      setNewNote('');
    }
  };

  return (
    <div className="p-6 flex flex-col gap-4 fade-in">
      <button className="flex items-center gap-1.5 text-mentor-primary font-semibold text-sm" onClick={() => navigate(-1)}>
        {backIcon} Back
      </button>

      {/* Hero card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 flex items-center gap-5">
        <div className="w-[72px] h-[72px] rounded-full text-white font-extrabold text-[26px] flex items-center justify-center shrink-0"
             style={{ background: `hsl(${(student._id?.charCodeAt(0) || 0) * 25 % 360}, 60%, 50%)` }}>
          {initials(student.name)}
        </div>
        <div className="flex-1">
          <h2 className="text-[22px] font-extrabold text-gray-900">{student.name}</h2>
          <p className="text-gray-500 mt-1">{student.email}{student.phone ? ` · ${student.phone}` : ''}</p>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            {batch && <span className="px-3 py-1 rounded-full bg-mentor-lighter text-mentor-primary text-xs font-semibold border border-mentor-light capitalize">{batch.subject}</span>}
            {batch && <span className="px-3 py-1 rounded-full bg-mentor-lighter text-mentor-primary text-xs font-semibold border border-mentor-light">{batch.name}</span>}
            <span className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: isActive ? '#d1fae5' : '#fee2e2', color: isActive ? '#065f46' : '#991b1b' }}>
              {isActive ? 'active' : 'inactive'}
            </span>
          </div>
        </div>
        <div className="relative flex items-center justify-center shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="7" />
            <circle cx="40" cy="40" r="34" fill="none" stroke={progressColor} strokeWidth="7"
              strokeDasharray={`${(2 * Math.PI * 34 * prog) / 100} ${2 * Math.PI * 34}`}
              strokeLinecap="round" transform="rotate(-90 40 40)" />
          </svg>
          <div className="absolute flex flex-col items-center leading-snug">
            <span className="text-lg font-extrabold" style={{ color: progressColor }}>{prog}%</span>
            <span className="text-[10px] text-gray-400">Progress</span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Tests Taken',      value: totalTests > 0 ? totalTests : '—', color: '#6366f1' },
          { label: 'Diagnostic Avg',   value: diagnosticPct !== null ? `${diagnosticPct}%` : '—', color: '#0891b2' },
          { label: 'Mock Avg',         value: mockPct !== null ? `${mockPct}%` : '—',             color: '#7c3aed' },
          { label: 'Practice Avg',     value: practicePct !== null ? `${practicePct}%` : '—',     color: '#10b981' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl px-5 py-4 border border-gray-200 text-center">
            <p className="text-xl font-extrabold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {TABS.map(tab => (
          <button key={tab}
            className={`flex-1 py-2 rounded-[10px] text-[13px] transition-all ${activeTab === tab ? 'bg-white text-mentor-primary font-bold shadow-sm' : 'text-gray-500 font-medium'}`}
            onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-[14px] border border-gray-200 overflow-hidden min-h-[200px]">

        {/* ── Overview ── */}
        {activeTab === 'Overview' && (
          <div className="flex flex-col divide-y divide-gray-100">
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <div className="p-6">
                <h4 className="text-sm font-bold text-gray-900 mb-4">Personal Info</h4>
                {[
                  { label: 'Full Name', value: student.name },
                  { label: 'Email',     value: student.email },
                  { label: 'Phone',     value: student.phone || '—' },
                  { label: 'Enrolled',  value: student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                  { label: 'Status',    value: isActive ? 'Active' : 'Inactive' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-2.5 border-b border-gray-50">
                    <span className="text-[13px] text-gray-500">{row.label}</span>
                    <span className="text-[13px] font-semibold text-gray-900">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="p-6">
                <h4 className="text-sm font-bold text-gray-900 mb-4">Enrollment Details</h4>
                {[
                  { label: 'Subject',      value: batch?.subject || '—' },
                  { label: 'Batch',        value: batch?.name || '—' },
                  { label: 'Mentor',       value: mentor?.name || '—' },
                  { label: 'Batch Status', value: batch?.status || '—' },
                  { label: 'Sessions',     value: batch ? `${batch.completedSessions || 0} / ${batch.totalSessions || 0}` : '—' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-2.5 border-b border-gray-50">
                    <span className="text-[13px] text-gray-500">{row.label}</span>
                    <span className="text-[13px] font-semibold text-gray-900 capitalize">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Progress ── */}
        {activeTab === 'Progress' && (() => {
          const statusLabel = prog >= 80 ? 'Excellent' : prog >= 50 ? 'On Track' : 'Needs Focus';
          const statusColor = prog >= 80 ? '#10b981'   : prog >= 50 ? '#f59e0b'  : '#ef4444';

          const ProgressTrack = ({ label, pct, gradient, note, icon }) => (
            <div className="bg-white rounded-2xl px-4 py-3.5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <span className="text-[13px] font-bold text-slate-700">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {note && <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{note}</span>}
                  <span className="text-[14px] font-extrabold"
                        style={{ background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${pct}%`, background: gradient }} />
              </div>
            </div>
          );

          return (
            <div className="flex flex-col overflow-hidden">

              {/* ── Hero banner ── */}
              <div className="relative overflow-hidden px-6 py-6"
                   style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 45%,#4c1d95 100%)' }}>
                {/* Decorative blobs */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
                     style={{ background: 'radial-gradient(circle,rgba(167,139,250,0.25),transparent 70%)' }} />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full pointer-events-none"
                     style={{ background: 'radial-gradient(circle,rgba(96,165,250,0.2),transparent 70%)' }} />

                <div className="flex items-center gap-5 relative z-10">
                  {/* Circular progress ring */}
                  <div className="relative w-[76px] h-[76px] shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
                      <circle cx="40" cy="40" r="34" fill="none" strokeWidth="7" strokeLinecap="round"
                              stroke="url(#heroRing)"
                              strokeDasharray={`${(2 * Math.PI * 34 * prog) / 100} ${2 * Math.PI * 34}`} />
                      <defs>
                        <linearGradient id="heroRing" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[17px] font-black text-white leading-none">{prog}%</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-extrabold text-[15px] leading-snug">Learning Progress</p>
                    <p className="text-indigo-300 text-[11px] mt-0.5">Overall completion across all activities</p>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <div>
                        <p className="text-white font-extrabold text-sm leading-tight">{totalTests}</p>
                        <p className="text-indigo-300 text-[10px]">Tests Taken</p>
                      </div>
                      {diagnosticPct !== null && (<>
                        <div className="w-px h-7 bg-white/15" />
                        <div>
                          <p className="text-white font-extrabold text-sm leading-tight">{diagnosticPct}%</p>
                          <p className="text-indigo-300 text-[10px]">Diagnostic</p>
                        </div>
                      </>)}
                      {mockPct !== null && (<>
                        <div className="w-px h-7 bg-white/15" />
                        <div>
                          <p className="text-white font-extrabold text-sm leading-tight">{mockPct}%</p>
                          <p className="text-indigo-300 text-[10px]">Mock</p>
                        </div>
                      </>)}
                      {practicePct !== null && (<>
                        <div className="w-px h-7 bg-white/15" />
                        <div>
                          <p className="text-white font-extrabold text-sm leading-tight">{practicePct}%</p>
                          <p className="text-indigo-300 text-[10px]">Practice</p>
                        </div>
                      </>)}
                      <div className="w-px h-7 bg-white/15" />
                      <div>
                        <p className="text-sm font-extrabold leading-tight" style={{ color: statusColor }}>{statusLabel}</p>
                        <p className="text-indigo-300 text-[10px]">Status</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 flex flex-col gap-5">

                {/* ── Progress tracks ── */}
                <div className="flex flex-col gap-2.5">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[1.5px]">Progress Breakdown</p>
                  <ProgressTrack label="Overall Average" pct={prog}
                    gradient="linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)"
                    note={`avg of ${categoryPcts.length} categor${categoryPcts.length === 1 ? 'y' : 'ies'}`}
                    icon="📈" />
                  {diagnosticPct !== null && (
                    <ProgressTrack label="Diagnostic Tests" pct={diagnosticPct}
                      gradient="linear-gradient(90deg,#0891b2,#06b6d4,#22d3ee)"
                      note={`${diagnosticSessions.filter(s => s.status === 'complete' || s.status === 'completed').length} completed`}
                      icon="🔬" />
                  )}
                  {mockPct !== null && (
                    <ProgressTrack label="Mock Tests" pct={mockPct}
                      gradient="linear-gradient(90deg,#7c3aed,#a855f7,#c084fc)"
                      note={`${mockSessions.filter(s => s.status === 'complete' || s.status === 'completed').length} completed`}
                      icon="📝" />
                  )}
                  {practicePct !== null && (
                    <ProgressTrack label="Practice Tests" pct={practicePct}
                      gradient="linear-gradient(90deg,#059669,#10b981,#34d399)"
                      note={`${practiceSessions.filter(s => s.status === 'complete' || s.status === 'completed').length} completed`}
                      icon="📚" />
                  )}
                </div>

                {/* ── Milestones ── */}
                {(() => {
                  // ── Keyframe injection ──────────────────────────────────────
                  const css = `
                    .ms-card { transition: transform 0.35s cubic-bezier(.34,1.56,.64,1), box-shadow 0.35s ease; }
                    .ms-card:hover { transform: translateY(-8px) scale(1.04); }
                    .ms-card.achieved:hover { box-shadow: 0 24px 64px var(--ms-glow) !important; }
                    .ms-card:hover .ms-icon { animation: msFloat 1.8s ease-in-out infinite; }
                    .ms-card:hover .ms-shimmer { animation: msShimmer 0.75s ease forwards; }
                    .ms-card.achieved .ms-ring { animation: msRingPulse 2.5s ease-in-out infinite; }
                    .ms-card:hover .ms-orb { animation: msOrbSpin 4s linear infinite; }
                    @keyframes msFloat {
                      0%,100% { transform: translateY(0) rotate(0deg); }
                      30%     { transform: translateY(-10px) rotate(-4deg); }
                      70%     { transform: translateY(-6px) rotate(3deg); }
                    }
                    @keyframes msShimmer {
                      0%   { transform: translateX(-120%) skewX(-20deg); opacity:.6; }
                      100% { transform: translateX(220%) skewX(-20deg); opacity:0; }
                    }
                    @keyframes msRingPulse {
                      0%,100% { opacity:.35; transform:scale(1); }
                      50%     { opacity:.7;  transform:scale(1.08); }
                    }
                    @keyframes msOrbSpin {
                      from { transform: rotate(0deg)   translateX(28px) rotate(0deg); }
                      to   { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
                    }
                    @keyframes msSparkle {
                      0%,100% { opacity:0; transform:scale(0) rotate(0deg); }
                      50%     { opacity:1; transform:scale(1) rotate(180deg); }
                    }
                    .ms-card.achieved .ms-sparkle-1 { animation: msSparkle 2s ease-in-out 0s infinite; }
                    .ms-card.achieved .ms-sparkle-2 { animation: msSparkle 2s ease-in-out 0.6s infinite; }
                    .ms-card.achieved .ms-sparkle-3 { animation: msSparkle 2s ease-in-out 1.2s infinite; }
                  `;

                  // ── SVG Icons ───────────────────────────────────────────────
                  const SeedlingIcon = ({ on }) => (
                    <svg viewBox="0 0 72 72" width="72" height="72" fill="none">
                      <ellipse cx="36" cy="64" rx="18" ry="4" fill={on ? '#bbf7d0' : '#e2e8f0'} opacity="0.6"/>
                      {/* Stem */}
                      <path d="M36 64 C36 54 34 46 35 36 C35.5 30 36 26 36 22" stroke={on ? '#16a34a' : '#94a3b8'} strokeWidth="3" strokeLinecap="round"/>
                      {/* Left leaf */}
                      <path d="M35 48 C26 44 14 34 17 20 C26 20 35 34 35 48Z" fill={on ? '#4ade80' : '#d1d5db'}/>
                      <path d="M17 20 C20 28 26 38 35 48" stroke={on ? '#15803d' : '#9ca3af'} strokeWidth="1.2" strokeLinecap="round"/>
                      {/* Right leaf */}
                      <path d="M36 42 C45 35 57 27 54 13 C45 14 37 28 36 42Z" fill={on ? '#86efac' : '#e5e7eb'}/>
                      <path d="M54 13 C51 21 45 31 36 42" stroke={on ? '#15803d' : '#9ca3af'} strokeWidth="1.2" strokeLinecap="round"/>
                      {/* Small centre bud */}
                      <circle cx="36" cy="20" r="7" fill={on ? '#22c55e' : '#9ca3af'}/>
                      <circle cx="36" cy="20" r="4.5" fill={on ? '#4ade80' : '#d1d5db'}/>
                      <circle cx="34" cy="18" r="2" fill="white" opacity="0.55"/>
                      {/* Soil dots */}
                      {on && <><circle cx="24" cy="63" r="1.5" fill="#86efac" opacity="0.7"/><circle cx="47" cy="63" r="1" fill="#4ade80" opacity="0.5"/></>}
                    </svg>
                  );

                  const RocketIcon = ({ on }) => (
                    <svg viewBox="0 0 72 72" width="72" height="72" fill="none">
                      {/* Outer flame */}
                      <path d="M27 58 Q30 70 36 66 Q42 70 45 58" fill={on ? '#f97316' : '#9ca3af'}/>
                      {/* Inner flame */}
                      <path d="M30 58 Q33 64 36 61 Q39 64 42 58" fill={on ? '#fbbf24' : '#d1d5db'}/>
                      {/* Rocket body */}
                      <path d="M22 52 L22 38 Q22 16 36 8 Q50 16 50 38 L50 52 Z" fill={on ? '#6366f1' : '#94a3b8'}/>
                      {/* Body top shade */}
                      <path d="M22 38 Q22 16 36 8 Q50 16 50 38 L46 38 Q46 22 36 14 Q26 22 26 38 Z" fill="white" opacity="0.12"/>
                      {/* Porthole ring */}
                      <circle cx="36" cy="34" r="10" fill={on ? '#1d4ed8' : '#64748b'}/>
                      {/* Porthole glass */}
                      <circle cx="36" cy="34" r="8" fill={on ? '#bfdbfe' : '#e2e8f0'}/>
                      <circle cx="36" cy="34" r="5.5" fill={on ? '#eff6ff' : '#f8fafc'}/>
                      <circle cx="33.5" cy="31.5" r="2.2" fill="white" opacity="0.75"/>
                      {/* Left fin */}
                      <path d="M22 52 L11 62 L22 59 Z" fill={on ? '#4f46e5' : '#64748b'}/>
                      {/* Right fin */}
                      <path d="M50 52 L61 62 L50 59 Z" fill={on ? '#4f46e5' : '#64748b'}/>
                      {/* Stars */}
                      {on && <>
                        <circle cx="10" cy="22" r="1.8" fill="#fbbf24"/>
                        <circle cx="60" cy="18" r="1.2" fill="#a78bfa"/>
                        <circle cx="7"  cy="38" r="1"   fill="#fbbf24"/>
                        <circle cx="64" cy="34" r="1.5" fill="#fbbf24"/>
                        <circle cx="15" cy="10" r="1"   fill="#a78bfa"/>
                      </>}
                    </svg>
                  );

                  const CrownIcon = ({ on }) => (
                    <svg viewBox="0 0 72 72" width="72" height="72" fill="none">
                      {/* Drop shadow */}
                      <ellipse cx="36" cy="66" rx="22" ry="3.5" fill={on ? '#fde68a' : '#e2e8f0'} opacity="0.5"/>
                      {/* Crown body */}
                      <path d="M10 52 L10 40 L20 24 L36 40 L52 24 L62 40 L62 52 Z" fill={on ? '#f59e0b' : '#94a3b8'}/>
                      {/* Crown inner highlight */}
                      <path d="M10 40 L20 24 L36 40 L52 24 L62 40 L62 34 L52 18 L36 34 L20 18 L10 34 Z" fill="white" opacity="0.14"/>
                      {/* Base band */}
                      <rect x="10" y="50" width="52" height="9" rx="4.5" fill={on ? '#d97706' : '#64748b'}/>
                      {/* Band shine */}
                      <rect x="10" y="50" width="52" height="4" rx="2" fill="white" opacity="0.12"/>
                      {/* Red gem */}
                      <circle cx="22" cy="54.5" r="4.5" fill={on ? '#dc2626' : '#94a3b8'}/>
                      <circle cx="22" cy="54.5" r="2.8" fill={on ? '#fca5a5' : '#d1d5db'}/>
                      <circle cx="20.8" cy="53.2" r="1.1" fill="white" opacity="0.6"/>
                      {/* Blue gem */}
                      <circle cx="36" cy="54.5" r="4.5" fill={on ? '#2563eb' : '#94a3b8'}/>
                      <circle cx="36" cy="54.5" r="2.8" fill={on ? '#93c5fd' : '#d1d5db'}/>
                      <circle cx="34.8" cy="53.2" r="1.1" fill="white" opacity="0.6"/>
                      {/* Green gem */}
                      <circle cx="50" cy="54.5" r="4.5" fill={on ? '#059669' : '#94a3b8'}/>
                      <circle cx="50" cy="54.5" r="2.8" fill={on ? '#6ee7b7' : '#d1d5db'}/>
                      <circle cx="48.8" cy="53.2" r="1.1" fill="white" opacity="0.6"/>
                      {/* Top jewel */}
                      <circle cx="36" cy="15" r="9" fill={on ? '#f59e0b' : '#9ca3af'}/>
                      <circle cx="36" cy="15" r="6.5" fill={on ? '#fbbf24' : '#d1d5db'}/>
                      <circle cx="33.5" cy="12.5" r="2.5" fill="white" opacity="0.6"/>
                      {/* Sparkle stars */}
                      {on && <>
                        <path d="M6 18 L7.2 13 L8.4 18 L13 19 L8.4 20 L7.2 25 L6 20 L1 19 Z" fill="#fbbf24" opacity="0.85"/>
                        <path d="M60 12 L61 8  L62 12 L66 13 L62 14 L61 18 L60 14 L56 13 Z" fill="#fbbf24" opacity="0.7"/>
                        <circle cx="63" cy="24" r="1.5" fill="#fbbf24" opacity="0.6"/>
                        <circle cx="9"  cy="32" r="1.5" fill="#fbbf24" opacity="0.6"/>
                      </>}
                    </svg>
                  );

                  const MILESTONES = [
                    {
                      label: 'Beginner', sub: 'First steps taken', threshold: 30,
                      from: '#10b981', to: '#059669', glow: 'rgba(16,185,129,0.45)',
                      bg: 'linear-gradient(145deg,#ecfdf5,#d1fae5)',
                      orbColor: '#6ee7b7',
                      Icon: SeedlingIcon,
                    },
                    {
                      label: 'Intermediate', sub: 'Picking up speed', threshold: 60,
                      from: '#6366f1', to: '#4f46e5', glow: 'rgba(99,102,241,0.45)',
                      bg: 'linear-gradient(145deg,#eef2ff,#e0e7ff)',
                      orbColor: '#a5b4fc',
                      Icon: RocketIcon,
                    },
                    {
                      label: 'Advanced', sub: 'Mastery unlocked', threshold: 90,
                      from: '#f59e0b', to: '#d97706', glow: 'rgba(245,158,11,0.45)',
                      bg: 'linear-gradient(145deg,#fffbeb,#fef3c7)',
                      orbColor: '#fde68a',
                      Icon: CrownIcon,
                    },
                  ];

                  return (
                    <div>
                      <style>{css}</style>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[1.5px] mb-3">Milestones</p>
                      <div className="grid grid-cols-3 gap-4">
                        {MILESTONES.map(m => {
                          const achieved  = prog >= m.threshold;
                          const fillPct   = Math.min(100, Math.round((prog / m.threshold) * 100));
                          const remaining = Math.max(0, m.threshold - prog);
                          return (
                            <div
                              key={m.label}
                              className={`ms-card ${achieved ? 'achieved' : ''} relative rounded-3xl overflow-hidden cursor-default`}
                              style={{
                                '--ms-glow': m.glow,
                                background: achieved ? m.bg : 'linear-gradient(145deg,#f8fafc,#f1f5f9)',
                                border: achieved ? `2px solid ${m.from}60` : '2px solid #e2e8f0',
                                boxShadow: achieved ? `0 8px 28px ${m.glow}` : '0 2px 8px rgba(0,0,0,0.06)',
                                minHeight: '210px',
                              }}>

                              {/* Pulsing outer ring (achieved only) */}
                              {achieved && (
                                <div className="ms-ring absolute inset-0 rounded-3xl pointer-events-none"
                                     style={{ border: `3px solid ${m.from}`, opacity: 0.3 }} />
                              )}

                              {/* Orbiting dot (achieved only) */}
                              {achieved && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '-10px' }}>
                                  <div className="ms-orb w-3 h-3 rounded-full shadow-sm"
                                       style={{ background: m.orbColor, filter: `drop-shadow(0 0 4px ${m.from})` }} />
                                </div>
                              )}

                              {/* Shimmer sweep on hover */}
                              <div className="ms-shimmer absolute inset-0 pointer-events-none"
                                   style={{ background: `linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.55) 50%,transparent 60%)`,
                                            transform: 'translateX(-120%) skewX(-20deg)' }} />

                              {/* Sparkles (achieved only) */}
                              {achieved && <>
                                <div className="ms-sparkle-1 absolute top-3 left-4 text-sm pointer-events-none">✦</div>
                                <div className="ms-sparkle-2 absolute top-4 right-5 text-xs pointer-events-none" style={{ color: m.from }}>★</div>
                                <div className="ms-sparkle-3 absolute top-8 left-8 text-[10px] pointer-events-none" style={{ color: m.orbColor }}>✦</div>
                              </>}

                              {/* Achieved badge */}
                              {achieved ? (
                                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white shadow-md"
                                     style={{ background: `linear-gradient(135deg,${m.from},${m.to})` }}>
                                  ✓ Done
                                </div>
                              ) : (
                                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs">
                                  🔒
                                </div>
                              )}

                              {/* Icon */}
                              <div className="ms-icon flex items-center justify-center pt-7 pb-2"
                                   style={{ filter: achieved ? 'none' : 'grayscale(0.65) opacity(0.45)' }}>
                                <m.Icon on={achieved} />
                              </div>

                              {/* Label */}
                              <div className="px-4 pb-5 text-center">
                                <p className="text-[14px] font-extrabold leading-tight"
                                   style={{ color: achieved ? m.from : '#94a3b8' }}>{m.label}</p>
                                <p className="text-[10px] font-semibold mt-0.5"
                                   style={{ color: achieved ? m.to : '#cbd5e1' }}>{m.sub}</p>

                                {/* Progress bar toward this milestone */}
                                <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-black/10">
                                  <div className="h-full rounded-full transition-all duration-700"
                                       style={{ width: `${fillPct}%`, background: achieved ? `linear-gradient(90deg,${m.from},${m.to})` : '#d1d5db' }} />
                                </div>

                                {!achieved ? (
                                  <p className="mt-1.5 text-[10px] font-bold text-slate-400">{remaining}% to go</p>
                                ) : (
                                  <p className="mt-1.5 text-[10px] font-bold" style={{ color: m.from }}>{m.threshold}%+ reached 🎉</p>
                                )}
                              </div>

                              {/* Bottom colour strip */}
                              <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-3xl"
                                   style={{ background: achieved ? `linear-gradient(90deg,${m.from},${m.to})` : '#e2e8f0' }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* ── SAT Test History ── */}
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom,#6366f1,#a855f7)' }} />
                      <p className="text-[13px] font-extrabold text-slate-800 tracking-tight">SAT Test History</p>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-indigo-100 to-transparent" />
                  </div>
                  <SatTestSection
                    label="Diagnostic Tests"
                    icon="🔍"
                    accentColor="#f97316"
                    sessions={diagnosticSessions}
                    loading={satSessionsLoading}
                    onView={handleViewAdaptiveResult}
                    viewLoadingId={adaptiveResultLoading}
                  />
                  <SatTestSection
                    label="Mock Tests"
                    icon="📋"
                    accentColor="#4f46e5"
                    sessions={mockSessions}
                    loading={satSessionsLoading}
                    onView={handleViewAdaptiveResult}
                    viewLoadingId={adaptiveResultLoading}
                  />
                  <PracticeHistorySection
                    sessions={practiceSessions}
                    loading={satSessionsLoading}
                    onView={handleViewPracticeResult}
                    viewLoadingId={practiceResultLoading}
                  />
                </div>

              </div>
            </div>
          );
        })()}

        {/* ── Notes ── */}
        {activeTab === 'Notes' && (
          <div>
            <div className="p-5 border-b border-gray-100 flex gap-3 items-end">
              <textarea
                className="flex-1 px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-gray-200 resize-y text-sm outline-none text-gray-700 focus:border-mentor-primary transition-colors"
                placeholder="Add a note about this student..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                rows={3}
              />
              <button
                className="px-5 py-2.5 rounded-[10px] bg-mentor-primary text-white font-semibold text-[13px] shrink-0 disabled:opacity-50"
                disabled={!newNote.trim()}
                onClick={addNote}>
                Add Note
              </button>
            </div>
            <div className="py-2">
              {notes.length === 0 ? (
                <div className="p-10 text-center text-gray-400">No notes yet. Add your first note above.</div>
              ) : (
                [...notes].reverse().map((note, i) => (
                  <div key={i} className="flex gap-3 px-6 py-3.5 border-b border-gray-100 items-start">
                    <span className="text-base shrink-0">📌</span>
                    <div className="flex-1">
                      <p className="text-gray-700 text-sm">{note.text}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{note.date}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {(adaptiveResultLoading || practiceResultLoading) && <LoadingOverlay />}

      {adaptiveResult && (
        <SatScoreModal
          session={adaptiveResult.session}
          assignment={adaptiveResult.assignment}
          onClose={() => setAdaptiveResult(null)}
        />
      )}

      {fullLengthResult && (
        <FullLengthResultModal
          result={fullLengthResult}
          onClose={() => setFullLengthResult(null)}
        />
      )}

      {practiceResult && (
        <PracticeResultModal
          result={practiceResult}
          onClose={() => setPracticeResult(null)}
        />
      )}
    </div>
  );
}
