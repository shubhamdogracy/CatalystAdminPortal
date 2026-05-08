import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentService, satMentorService } from '../../../services/api';
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
                        <p className="text-[13px] font-semibold truncate"
                           style={{ color: notAnswered ? '#6b7280' : isCorrect ? '#065f46' : '#991b1b' }}>
                          {sanitizeText(q.stem) || `Question ${i + 1}`}
                        </p>
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
                              <span className="text-[13px] flex-1" style={{ color }}>{sanitizeText(choiceText)}</span>
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
                            <p className="text-[12px] text-amber-800 leading-relaxed">{sanitizeText(q.explanation)}</p>
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
function SatTestSection({ label, icon, accentColor, sessions, loading, onView, viewLoadingId }) {
  const [expanded, setExpanded] = useState(false);
  const completed = sessions.filter(s => s.status === 'complete').length;
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          {!loading && sessions.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-500">
              {completed}/{sessions.length}
            </span>
          )}
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
             className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-gray-100">
          {loading ? (
            <div className="py-8 flex items-center justify-center text-gray-400 text-sm gap-2">
              <span className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
              Loading…
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No {label.toLowerCase()} taken yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sessions.map(s => {
                const pct  = s.percentage ?? s.total_percentage ?? 0;
                const name = s.exam_config_id?.name || s.practice_config_id?.name || 'Test';
                const subj = SUBJ_LABEL[s.exam_config_id?.subject || s.practice_config_id?.subject] || '';
                const date = s.created_at
                  ? new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '';
                return (
                  <div key={s._id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                         style={{ background: `${accentColor}18` }}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800 truncate">{name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {[subj, date].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[12px] font-bold ${pct >= 60 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {pct}%
                      </span>
                      {s.status === 'complete' && (
                        <button onClick={() => onView(s)} disabled={viewLoadingId === s._id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 transition-colors">
                          {viewLoadingId === s._id
                            ? <span className="w-3 h-3 rounded-full border-2 border-indigo-300 border-t-indigo-700 animate-spin" />
                            : 'View Results'}
                        </button>
                      )}
                      {s.status !== 'complete' && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                          In Progress
                        </span>
                      )}
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

// ── Practice result modal ─────────────────────────────────────
function PracticeResultModal({ result, onClose }) {
  const { session, config } = result;
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
  const pct       = session.percentage || 0;
  const passed    = pct >= 60;
  const breakdown = session.breakdown || [];
  const correct   = breakdown.filter(b => b.is_correct).length;
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
        {/* Config meta */}
        {config && (
          <div className="flex items-center gap-4 px-5 py-2.5 shrink-0 bg-teal-50 border-b border-teal-100 text-xs text-teal-700 flex-wrap">
            {config.topic     && <span>Topic: <strong>{config.topic}</strong></span>}
            {config.sub_topic && <span>Subtopic: <strong>{config.sub_topic}</strong></span>}
            {config.subject   && <span>Subject: <strong>{SUBJ_LABEL[config.subject] || config.subject}</strong></span>}
          </div>
        )}
        {/* Questions */}
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
                    <p className="text-[13px] font-semibold flex-1 min-w-0 truncate"
                       style={{ color: notAnswered ? '#6b7280' : isCorrect ? '#065f46' : '#991b1b' }}>
                      {sanitizeText(q.stem) || `Question ${i + 1}`}
                    </p>
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
                            <span className="text-[13px] flex-1" style={{ color }}>{sanitizeText(choiceText)}</span>
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
                          <p className="text-[12px] text-amber-800 leading-relaxed">{sanitizeText(q.explanation)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
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

  const [adaptiveResult, setAdaptiveResult]         = useState(null);
  const [adaptiveResultLoading, setAdaptiveResultLoading] = useState(null);
  const [practiceResult, setPracticeResult]         = useState(null);
  const [practiceResultLoading, setPracticeResultLoading] = useState(null);

  useEffect(() => {
    studentService.getById(id)
      .then(res => setStudent(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    setSatSessionsLoading(true);
    Promise.all([
      satMentorService.getStudentSessions(id).catch(() => ({ data: [] })),
      satMentorService.getStudentPracticeSessions(id).catch(() => ({ data: [] })),
    ]).then(([adaptiveRes, practiceRes]) => {
      setAdaptiveSessions(adaptiveRes.data || []);
      setPracticeSessions(practiceRes.data || []);
      setSatSessionsLoading(false);
    });
  }, [id]);

  const handleViewAdaptiveResult = async (session) => {
    if (adaptiveResultLoading) return;
    setAdaptiveResultLoading(session._id);
    try {
      const res = await satMentorService.getSessionResults(session._id);
      setAdaptiveResult({ session: res.data, assignment: { exam_config_id: session.exam_config_id } });
    } catch {
      setAdaptiveResult({ session: null, assignment: { exam_config_id: session.exam_config_id } });
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
    } catch {
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

  const prog          = student.progress || 0;
  const progressColor = prog >= 80 ? '#10b981' : prog >= 50 ? '#f59e0b' : '#ef4444';
  const isActive      = student.isActive !== false;
  const batch         = student.batches?.[0];
  const mentor        = batch?.mentorId;
  const sessionsDone  = student.completedSessions || 0;
  const totalSess     = student.totalSessions || batch?.totalSessions || 0;
  const batchPct      = Math.round(((batch?.completedSessions || 0) / (batch?.totalSessions || 1)) * 100);
  const diagnosticSessions = adaptiveSessions.filter(s => s.exam_config_id?.type === 'diagnostic');
  const mockSessions       = adaptiveSessions.filter(s => s.exam_config_id?.type === 'mock');
  const totalTests         = adaptiveSessions.length + practiceSessions.length;

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
          { label: 'Sessions Done',   value: sessionsDone,  color: '#0d9488' },
          { label: 'Total Sessions',  value: totalSess,     color: '#7c3aed' },
          { label: 'Tests Taken', value: totalTests > 0 ? totalTests : '—', color: '#f59e0b' },
          { label: 'Enrolled', value: student.enrollmentDate
              ? new Date(student.enrollmentDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
              : '—', color: '#10b981' },
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
        {activeTab === 'Progress' && (
          <div className="p-6 flex flex-col gap-5">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
                <span className="text-sm font-bold" style={{ color: progressColor }}>{prog}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${prog}%`, background: progressColor }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Personal Sessions</span>
                <span className="text-sm text-gray-500">{sessionsDone} / {totalSess}</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-mentor-primary to-cyan-500 rounded-full transition-all"
                     style={{ width: totalSess ? `${Math.round((sessionsDone / totalSess) * 100)}%` : '0%' }} />
              </div>
            </div>
            {batch && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Batch Progress ({batch.name})</span>
                  <span className="text-sm text-gray-500">{batch.completedSessions || 0} / {batch.totalSessions} sessions · {batchPct}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all" style={{ width: `${batchPct}%` }} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 mt-1">
              {[
                { label: 'Beginner',     threshold: 30, icon: '🌱' },
                { label: 'Intermediate', threshold: 60, icon: '🚀' },
                { label: 'Advanced',     threshold: 90, icon: '🏆' },
              ].map(m => (
                <div key={m.label} className={`rounded-xl p-3 text-center border ${prog >= m.threshold ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-xl mb-1">{m.icon}</p>
                  <p className={`text-xs font-semibold ${prog >= m.threshold ? 'text-green-700' : 'text-gray-400'}`}>{m.label}</p>
                  <p className="text-[10px] text-gray-400">{m.threshold}%+</p>
                </div>
              ))}
            </div>

            {/* SAT Test History — three expandable categories */}
            <div className="border-t border-gray-100 pt-5 flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-700">SAT Test History</p>
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
              <SatTestSection
                label="Practice Tests"
                icon="📚"
                accentColor="#0d9488"
                sessions={practiceSessions}
                loading={satSessionsLoading}
                onView={handleViewPracticeResult}
                viewLoadingId={practiceResultLoading}
              />
            </div>
          </div>
        )}

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

      {practiceResult && (
        <PracticeResultModal
          result={practiceResult}
          onClose={() => setPracticeResult(null)}
        />
      )}
    </div>
  );
}
