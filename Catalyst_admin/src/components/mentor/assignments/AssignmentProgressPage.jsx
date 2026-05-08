// ============================================================
// ASSIGNMENT PROGRESS PAGE
// Shows per-student attempt status, scores, and pass/fail for
// a specific published assignment.
//
// The StudentReportModal has 4 views:
//   1. Questions    – per-question answer breakdown + explanations
//   2. Topic Mastery – mastery-level badges with progress bars
//   3. Charts        – 3 chart types in systematic layout:
//        • Column Chart – vertical bars showing score per topic
//        • Pie Chart    – mastery level distribution
//        • Line Chart   – performance trend line per section group
//   4. AI Summary    – AI-generated performance analysis text
//
// Chart colour palette matches the reference image:
//   Blue #4472C4 · Green #70AD47 · Orange #ED7D31 · Pink #FF69B4
//   Yellow #FFC000 · Light-blue #00B0F0
//
// Additional features:
//   • 0.5s loading delay animation when opening any report
//   • Download report button (generates a self-contained HTML file)
//
// FIX: Topic mastery previously showed NOVICE for all topics.
//      Root cause: answers dict may be keyed by q.qid OR q.id.
//      Fix: check both keys when looking up student answers.
//
// Exported:
//   default export → AssignmentProgressPage (mentor / ops list page)
//   named export   → StudentReportModal (reused by student portal +
//                    guest/explore tests page — OpsExploreTestsPage)
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { SECTION_META } from './components/sectionMeta';

// ─────────────────────────────────────────────────────────────
// MASTERY LEVEL TIERS
// Six tiers from NOVICE (0%) to MASTER (85%+).
// Each tier carries: display label, text colour, badge bg, and bar fill.
// ─────────────────────────────────────────────────────────────
function getMasteryLevel(pct) {
  if (pct >= 85) return { label: 'MASTER',       color: '#2563eb', bg: '#dbeafe', bar: '#10b981' };
  if (pct >= 70) return { label: 'ELITE',        color: '#0891b2', bg: '#cffafe', bar: '#06b6d4' };
  if (pct >= 55) return { label: 'EXPERT',       color: '#7c3aed', bg: '#ede9fe', bar: '#8b5cf6' };
  if (pct >= 40) return { label: 'ADVANCED',     color: '#d97706', bg: '#fef3c7', bar: '#f59e0b' };
  if (pct >= 25) return { label: 'INTERMEDIATE', color: '#ea580c', bg: '#ffedd5', bar: '#f97316' };
  return           { label: 'NOVICE',            color: '#ef4444', bg: '#fee2e2', bar: '#ef4444' };
}

// ─────────────────────────────────────────────────────────────
// TEXT SANITIZER
// Fixes Windows-1252 curly-quote bytes that arrive as Latin-1
// control characters (U+0091–U+0097) and show as diamonds/boxes.
// ─────────────────────────────────────────────────────────────
function sanitizeText(text) {
  if (!text) return text;
  return text
    .replace(//g, '‘') // left single quote
    .replace(//g, '’') // right single quote / apostrophe
    .replace(//g, '“') // left double quote
    .replace(//g, '”') // right double quote
    .replace(//g, '–') // en dash
    .replace(//g, '—') // em dash
    .replace(/�/g, "'")     // Unicode replacement character
    .replace(/◆/g, "'");    // Black diamond used in some SAT content
}

// ─────────────────────────────────────────────────────────────
// CHART COLOUR PALETTE
// Matches the reference image (Office-style chart colours):
//   Blue · Green · Orange · Pink · Yellow · Light-blue
// Used cyclically for multi-series / multi-bar charts.
// ─────────────────────────────────────────────────────────────
const CHART_PALETTE = [
  '#4472C4', // Blue
  '#70AD47', // Green
  '#ED7D31', // Orange
  '#FF69B4', // Pink / Magenta
  '#FFC000', // Yellow
  '#00B0F0', // Light Blue
];

// Map mastery label → reference-palette colour for pie + line charts
const MASTERY_CHART_COLORS = {
  MASTER:       '#4472C4', // Blue
  ELITE:        '#70AD47', // Green
  EXPERT:       '#ED7D31', // Orange
  ADVANCED:     '#FFC000', // Yellow
  INTERMEDIATE: '#FF69B4', // Pink
  NOVICE:       '#A5A5A5', // Gray (non-performing)
};

// ─────────────────────────────────────────────────────────────
// TOPIC GROUP NAME
// Maps (section + module number) → display group heading.
// e.g. RW module 1 → "Writing Mastery", Math → "Mathematics Mastery"
// ─────────────────────────────────────────────────────────────
function getTopicGroupName(section, moduleNum) {
  const name = (section.name || '').toLowerCase();
  const isRW = name.includes('reading') || name.includes('writing') || section.id === 'rw';
  if (isRW) return moduleNum === 1 ? 'Writing Mastery' : 'Reading Mastery';
  return 'Mathematics Mastery';
}

// ─────────────────────────────────────────────────────────────
// COMPUTE TOPIC MASTERY
// Iterates every question in every module, looks up the student's
// answer, and tallies correct/total/score per topic per group.
//
// FIX (was showing NOVICE for everything):
//   The backend stores questions with a "qid" key but the
//   answers dict is also keyed by "qid". In some code paths the
//   question is accessed as q.id (normalised) while the answers
//   dict still uses the original qid. We now check both keys.
// ─────────────────────────────────────────────────────────────
function computeTopicMastery(assignment, attempt) {
  const result = {};

  (assignment.sections || []).forEach((section) => {
    // Match by either id or sid — backend may send either
    const sectionId     = section.id || section.sid;
    const sectionResult = attempt.sectionResults?.find(
      (sr) => sr.sectionId === sectionId
           || sr.sectionId === section.sid
           || sr.sectionId === section.id,
    );

    (section.modules || []).forEach((mod) => {
      const groupName    = getTopicGroupName(section, mod.number);
      const moduleResult = sectionResult?.modules?.find((m) => m.moduleNumber === mod.number);

      if (!result[groupName]) result[groupName] = {};

      (mod.questions || []).forEach((q) => {
        const topic = (q.topic || '').trim() || null;
        if (!topic) return;

        if (!result[groupName][topic]) {
          result[groupName][topic] = { correct: 0, total: 0, score: 0, maxScore: 0 };
        }

        // FIX: check both q.id and q.qid for the answer lookup
        const primaryKey   = q.id   || q.qid;
        const fallbackKey  = q.qid  || q.id;
        const studentAnswer =
          moduleResult?.answers?.[primaryKey] ??
          moduleResult?.answers?.[fallbackKey];

        const isCorrect = studentAnswer && studentAnswer === q.correctAnswer;

        result[groupName][topic].total++;
        result[groupName][topic].maxScore += (q.score || 1);
        if (isCorrect) {
          result[groupName][topic].correct++;
          result[groupName][topic].score += (q.score || 1);
        }
      });

      // Remove group if it ended up with no topics
      if (Object.keys(result[groupName]).length === 0) delete result[groupName];
    });
  });

  return result;
}

// ─────────────────────────────────────────────────────────────
// GENERATE AI PERFORMANCE SUMMARY
// Produces a structured analysis object from the topic mastery
// data. No external API call — derived entirely from scores.
// Returns: { overallMsg, strengthMsg, improveMsg, devMsg,
//            nextMsg, strong[], needsPractice[], developing[],
//            allTopics[], overall, passed }
// ─────────────────────────────────────────────────────────────
function generateAISummary(topicMastery, attempt) {
  const overall = attempt.percentage ?? 0;
  const passed  = attempt.passed;

  // Flatten all topics into a list with pct + mastery label
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

  // Overall assessment sentence based on score tier
  let overallMsg;
  if (overall >= 85)      overallMsg = `Outstanding performance! A score of ${overall}% places you at mastery level — exceptional command of this material.`;
  else if (overall >= 70) overallMsg = `Great work! Scoring ${overall}% reflects strong understanding. You're well on your way to mastering this content.`;
  else if (overall >= 55) overallMsg = `Good effort! A score of ${overall}% shows solid progress. Targeted practice can push you into the advanced tier.`;
  else if (overall >= 40) overallMsg = `You scored ${overall}%, showing foundational understanding. Focused practice on weaker areas will yield quick improvements.`;
  else                    overallMsg = `You scored ${overall}%. This is your starting point — every expert begins here. Targeted study makes a significant difference.`;

  // Strengths message
  const strengthMsg = strong.length > 0
    ? `You excelled in: ${strong.slice(0, 4).map(t => `${t.topic} (${t.pct}%)`).join(', ')}. These are your power areas — keep leveraging them in the test.`
    : `No topic reached the 70%+ threshold yet, but growth is happening. Every practice session moves the needle.`;

  // Improvement message
  let improveMsg;
  if (needsPractice.length > 0) {
    improveMsg = `Prioritise: ${needsPractice.slice(0, 4).map(t => `${t.topic} (${t.pct}%)`).join(', ')}. These topics need the most focused attention and regular practice to build confidence.`;
  } else if (developing.length > 0) {
    improveMsg = `Keep working on: ${developing.slice(0, 3).map(t => `${t.topic} (${t.pct}%)`).join(', ')}. A little more practice will unlock the next mastery tier.`;
  } else {
    improveMsg = `All topics are performing well. Challenge yourself with harder problems to push toward mastery in every area.`;
  }

  // Developing areas message (only shown when both strong and weak zones exist)
  const devMsg = (developing.length > 0 && needsPractice.length > 0)
    ? `Good momentum in: ${developing.slice(0, 3).map(t => `${t.topic} (${t.pct}%)`).join(', ')}. A few more sessions here can move these into your strength zone.`
    : '';

  // Next-steps advice
  const nextMsg = passed
    ? `Great achievement — you passed! To keep improving: drill your developing topics to push them into your strong zone, and attempt progressively harder questions to extend your mastery.`
    : `Review every wrong answer carefully, paying close attention to the explanations. Schedule focused practice on your lowest-scoring topics. Even 20 minutes daily on weak areas compounds quickly.`;

  return { overallMsg, strengthMsg, improveMsg, devMsg, nextMsg, strong, needsPractice, developing, allTopics, overall, passed };
}

// ─────────────────────────────────────────────────────────────
// DOWNLOAD REPORT
// Builds a self-contained HTML file with the student's score,
// topic mastery table, and AI summary. Triggers a browser
// download. The student can open the file and print-to-PDF.
// ─────────────────────────────────────────────────────────────
function downloadReport(attempt, assignment, topicMastery, aiData) {
  const date = attempt.completedAt
    ? new Date(attempt.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // Build topic mastery rows HTML
  let topicRowsHtml = '';
  for (const [group, topics] of Object.entries(topicMastery)) {
    topicRowsHtml += `<tr><td colspan="4" style="background:#1e293b;color:#fff;font-weight:700;padding:8px 12px;font-size:13px;">${group}</td></tr>`;
    for (const [topic, data] of Object.entries(topics)) {
      const pct     = data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0;
      const mastery = getMasteryLevel(pct);
      topicRowsHtml += `
        <tr>
          <td style="padding:8px 12px;font-size:13px;">${topic}</td>
          <td style="padding:8px 12px;text-align:center;">
            <span style="background:${mastery.bg};color:${mastery.color};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;">${mastery.label}</span>
          </td>
          <td style="padding:8px 12px;text-align:center;font-size:13px;">${data.correct}/${data.total}</td>
          <td style="padding:8px 12px;text-align:center;font-size:13px;font-weight:700;color:${mastery.color};">${pct}%</td>
        </tr>`;
    }
  }

  // Build AI summary section HTML
  const aiHtml = aiData ? `
    <div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:12px;border-left:4px solid #4f46e5;">
      <h3 style="margin:0 0 12px;color:#4f46e5;font-size:15px;font-weight:700;">AI Performance Summary</h3>
      <p style="margin:0 0 10px;color:#374151;line-height:1.6;font-size:13px;">${aiData.overallMsg}</p>
      <p style="margin:0 0 10px;color:#065f46;line-height:1.6;font-size:13px;"><strong>Strong Areas:</strong> ${aiData.strengthMsg}</p>
      <p style="margin:0 0 10px;color:#7c2d12;line-height:1.6;font-size:13px;"><strong>Focus Areas:</strong> ${aiData.improveMsg}</p>
      ${aiData.devMsg ? `<p style="margin:0 0 10px;color:#92400e;line-height:1.6;font-size:13px;"><strong>Developing:</strong> ${aiData.devMsg}</p>` : ''}
      <p style="margin:0;color:#374151;line-height:1.6;font-size:13px;"><strong>Next Steps:</strong> ${aiData.nextMsg}</p>
    </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Score Report — ${attempt.studentName || 'Student'}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#1e293b;padding:32px;max-width:820px;margin:0 auto;}
    .header{background:linear-gradient(135deg,#1e1b4b,#312e81);color:#fff;padding:20px 24px;border-radius:12px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;}
    .score-box{background:rgba(255,255,255,0.18);border-radius:10px;padding:10px 18px;text-align:center;}
    .score-box .score{font-size:26px;font-weight:800;}
    .score-box .pts{font-size:12px;opacity:0.75;margin-top:2px;}
    .pass-badge{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${attempt.passed ? '#10b981' : '#ef4444'};color:#fff;}
    h2{font-size:15px;font-weight:700;margin:24px 0 10px;color:#374151;}
    table{width:100%;border-collapse:collapse;margin-top:6px;}
    th{background:#374151;color:#fff;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;}
    td{border-bottom:1px solid #e5e7eb;vertical-align:middle;}
    tr:last-child td{border-bottom:none;}
    footer{margin-top:36px;font-size:11px;color:#9ca3af;text-align:center;}
    @media print{body{padding:16px;}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:10px;opacity:.65;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">Score Report</div>
      <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:2px;">${attempt.studentName || 'Student'}</div>
      <div style="font-size:13px;opacity:.8;">${attempt.batchName || ''} &nbsp;·&nbsp; ${assignment.title}</div>
      <div style="font-size:11px;opacity:.6;margin-top:4px;">Completed: ${date}</div>
    </div>
    <div class="score-box">
      <div class="score">${attempt.percentage}%</div>
      <div class="pts">${attempt.score} / ${attempt.maxScore} pts</div>
      <div class="pass-badge">${attempt.passed ? 'PASSED' : 'FAILED'}</div>
    </div>
  </div>
  ${aiHtml}
  ${Object.keys(topicMastery).length > 0 ? `
  <h2>Topic Mastery</h2>
  <table>
    <thead><tr><th>Topic</th><th style="text-align:center">Mastery Level</th><th style="text-align:center">Correct</th><th style="text-align:center">Score %</th></tr></thead>
    <tbody>${topicRowsHtml}</tbody>
  </table>` : ''}
  <div class="footer">Generated by Catalyst Learning Platform &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
</body>
</html>`;

  // Create a Blob and trigger browser download
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `report-${(attempt.studentName || 'student').replace(/\s+/g, '-')}-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// TOPIC CHARTS COMPONENT
// Renders THREE charts from the topicMastery data in a
// systematic, visually consistent layout using the reference
// image colour palette (blue, green, orange, pink, yellow).
//
//  Chart 1 — Column Chart (vertical BarChart)
//    Per mastery group. X-axis = topic name, Y-axis = score %.
//    Each bar gets a distinct reference-palette colour.
//
//  Chart 2 — Pie Chart
//    Mastery level distribution: how many topics are in each
//    tier (MASTER → NOVICE). Segments coloured by tier.
//
//  Chart 3 — Line Chart
//    Performance trend across topics per section group.
//    Each group = one coloured line. Helps spot which section
//    has a rising or falling performance curve.
// ─────────────────────────────────────────────────────────────
// ── Shared custom tooltip (declared outside TopicCharts to avoid re-creation on render) ──
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

function TopicCharts({ topicMastery }) {
  // ── Shared data preparation ──────────────────────────────
  const groupEntries = Object.entries(topicMastery); // [ [group, {topic: data}], … ]

  // Column chart: one dataset per group
  // Each entry: { name (abbreviated), fullName, pct, paletteIdx }
  const columnGroups = groupEntries.map(([group, topics]) => ({
    group,
    data: Object.entries(topics).map(([topic, d], idx) => ({
      name:     topic.length > 18 ? topic.slice(0, 16) + '…' : topic,
      fullName: topic,
      pct:      d.maxScore > 0 ? Math.round((d.score / d.maxScore) * 100) : 0,
      paletteIdx: idx,
    })),
  }));

  // Pie chart: count topics per mastery level
  const masteryCount = {};
  for (const topics of Object.values(topicMastery)) {
    for (const [, d] of Object.entries(topics)) {
      const pct   = d.maxScore > 0 ? Math.round((d.score / d.maxScore) * 100) : 0;
      const label = getMasteryLevel(pct).label;
      masteryCount[label] = (masteryCount[label] || 0) + 1;
    }
  }
  const pieData = Object.entries(masteryCount).map(([name, value]) => ({
    name,
    value,
    color: MASTERY_CHART_COLORS[name] || '#A5A5A5',
  }));

  // Line chart: merged dataset — X-axis = topic index (T1, T2…),
  // each group = one dataKey column so Recharts can plot multi-lines.
  // Groups with fewer topics leave later entries undefined (no dot drawn).
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

  // ── Empty state ──────────────────────────────────────────
  if (groupEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm">
        <span className="text-4xl mb-3">📊</span>
        <p className="font-semibold">No topic data available to chart.</p>
        <p className="text-xs mt-1">Assign topics to questions to enable charts.</p>
      </div>
    );
  }

  // Abbreviated group names for the line-chart legend
  const shortGroup = (g) =>
    g.replace(' Mastery', '').replace('Mathematics', 'Math');

  return (
    <div className="p-5 space-y-6">

      {/* ════════════════════════════════════════════════════
          CHART 1 — COLUMN CHART (vertical bars per group)
          Reference: blue/green/orange/pink/yellow bars
      ════════════════════════════════════════════════════ */}
      {columnGroups.map(({ group, data }) => (
        <div key={group} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100"
               style={{ background: 'linear-gradient(90deg,#1e293b,#334155)' }}>
            <p className="text-sm font-bold text-white">{group}</p>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">
              Column Chart
            </span>
          </div>
          <div className="px-4 pt-4 pb-3">
            <ResponsiveContainer width="100%" height={Math.max(180, data.length * 52)}>
              <BarChart
                data={data}
                margin={{ top: 8, right: 20, left: 0, bottom: data.length > 4 ? 48 : 16 }}
                barCategoryGap="30%"
              >
                {/* Horizontal grid only — matches reference image style */}
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  angle={data.length > 5 ? -35 : 0}
                  textAnchor={data.length > 5 ? 'end' : 'middle'}
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Each bar gets a palette colour; rounded top corners */}
                <Bar dataKey="pct" name="Score" radius={[5, 5, 0, 0]}
                     label={{ position: 'top', fontSize: 11, fill: '#64748b', formatter: v => `${v}%` }}>
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={CHART_PALETTE[entry.paletteIdx % CHART_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Colour legend below columns */}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {data.map((d, idx) => (
                <div key={d.fullName} className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ background: CHART_PALETTE[idx % CHART_PALETTE.length] }} />
                  <span className="text-gray-600">{d.fullName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* ════════════════════════════════════════════════════
          CHART 2 — PIE CHART (mastery level distribution)
          Full pie (no donut) — matches reference image style.
          Each slice = a mastery tier, coloured by palette.
      ════════════════════════════════════════════════════ */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100"
               style={{ background: 'linear-gradient(90deg,#1e293b,#334155)' }}>
            <p className="text-sm font-bold text-white">Mastery Level Distribution</p>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">
              Pie Chart
            </span>
          </div>
          <div className="p-4 flex flex-col sm:flex-row items-center gap-8">
            {/* Full pie (outerRadius only — no innerRadius) */}
            <div style={{ width: 240, height: 240, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={105}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name.charAt(0) + name.slice(1).toLowerCase()} ${Math.round(percent * 100)}%`
                    }
                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [`${v} topic${v !== 1 ? 's' : ''}`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend panel */}
            <div className="flex flex-col gap-3">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded shrink-0" style={{ background: entry.color }} />
                  <div>
                    <p className="text-[13px] font-bold text-gray-800">{entry.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {entry.value} topic{entry.value !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          CHART 3 — LINE CHART (performance trend per group)
          X-axis = topic index (T1, T2…)
          Y-axis = score %
          One coloured line per section group (Writing/Reading/Math).
          Dots on each data point — matches reference line style.
      ════════════════════════════════════════════════════ */}
      {lineData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100"
               style={{ background: 'linear-gradient(90deg,#1e293b,#334155)' }}>
            <p className="text-sm font-bold text-white">Performance Trend by Section</p>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">
              Line Chart
            </span>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={lineData}
                margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: 12, color: '#374151' }}>{shortGroup(value)}</span>
                  )}
                />
                {/* One line per group, colours from CHART_PALETTE */}
                {groupEntries.map(([group], idx) => (
                  <Line
                    key={group}
                    type="monotone"
                    dataKey={group}
                    name={group}
                    stroke={CHART_PALETTE[idx % CHART_PALETTE.length]}
                    strokeWidth={2.5}
                    dot={{
                      r: 5,
                      fill: CHART_PALETTE[idx % CHART_PALETTE.length],
                      stroke: '#fff',
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 7 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            {/* Helper note */}
            <p className="text-center text-[11px] text-gray-400 mt-1">
              T1, T2 … = topics within each section in question order
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AI SUMMARY VIEW COMPONENT
// Renders the colour-coded performance analysis cards:
//   • Overall performance
//   • Strong areas   (green)
//   • Focus areas    (red)
//   • Developing     (amber — only shown when relevant)
//   • Next steps     (indigo)
// Also contains the Download report button.
// ─────────────────────────────────────────────────────────────
function AISummaryView({ aiData, onDownload }) {
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
      {/* Overall performance */}
      <div
        className="rounded-xl p-4 border"
        style={{
          background:   aiData.passed ? '#f0fdf4' : '#fff7ed',
          borderColor:  aiData.passed ? '#6ee7b7' : '#fed7aa',
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{aiData.passed ? '🎯' : '📈'}</span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider mb-1.5"
               style={{ color: aiData.passed ? '#065f46' : '#9a3412' }}>
              Overall Performance
            </p>
            <p className="text-[13px] leading-relaxed text-gray-700">{aiData.overallMsg}</p>
          </div>
        </div>
      </div>

      {/* Strong areas */}
      <div className="rounded-xl p-4 border border-emerald-200 bg-emerald-50">
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0">💪</span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 mb-1.5">Strong Areas</p>
            <p className="text-[13px] leading-relaxed text-gray-700">{aiData.strengthMsg}</p>
            {aiData.strong.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {aiData.strong.slice(0, 5).map(t => (
                  <span key={t.topic}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    {t.topic} · {t.pct}%
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Focus areas (improvement needed) */}
      <div className="rounded-xl p-4 border border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0">🎯</span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-red-700 mb-1.5">Focus Areas</p>
            <p className="text-[13px] leading-relaxed text-gray-700">{aiData.improveMsg}</p>
            {aiData.needsPractice.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {aiData.needsPractice.slice(0, 5).map(t => (
                  <span key={t.topic}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                    {t.topic} · {t.pct}%
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Developing areas — only rendered when meaningful */}
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
                    <span key={t.topic}
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      {t.topic} · {t.pct}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Next steps */}
      <div className="rounded-xl p-4 border border-indigo-200 bg-indigo-50">
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0">🚀</span>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 mb-1.5">Next Steps</p>
            <p className="text-[13px] leading-relaxed text-gray-700">{aiData.nextMsg}</p>
          </div>
        </div>
      </div>

      {/* Download report button */}
      <button
        onClick={onDownload}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
      >
        ⬇ &nbsp;Download Full Report (.html)
      </button>

      {/* Help text */}
      <p className="text-center text-[11px] text-gray-400">
        Opens as an HTML file — open in browser and print to save as PDF.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STUDENT REPORT MODAL
// Full-screen overlay modal with 4 tabs. Also exported so the
// student portal can reuse it directly.
//
// Props:
//   attempt        – the specific attempt object (answers, scores, etc.)
//   assignment     – full assignment with sections / modules / questions
//   onClose        – callback fired when modal is dismissed
//   isStudentView  – if true, header shows "My Score Report" instead of
//                    student name; hides batch label (default: false)
// ─────────────────────────────────────────────────────────────
export function StudentReportModal({ attempt, assignment, onClose, isStudentView = false }) {
  // Active tab: 'questions' | 'topics' | 'charts' | 'summary'
  const [view, setView]                 = useState('questions');
  const [activeSection, setActiveSection] = useState(
    attempt.sectionResults?.[0]?.sectionId || 'rw',
  );
  const [activeModule, setActiveModule] = useState(1);

  // ── 0.5 second loading animation on open ──────────────────
  // Gives a brief "analysing data" feel before content renders
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // ── Derived memoised data ──────────────────────────────────
  const topicMastery = useMemo(
    () => computeTopicMastery(assignment, attempt),
    [assignment, attempt],
  );
  const hasTopics = Object.keys(topicMastery).length > 0;
  const aiData    = useMemo(
    () => (hasTopics ? generateAISummary(topicMastery, attempt) : null),
    [topicMastery, attempt, hasTopics],
  );

  // Active section/module helpers
  const sectionResult = attempt.sectionResults?.find((s) => s.sectionId === activeSection);
  const moduleResult  = sectionResult?.modules?.find((m) => m.moduleNumber === activeModule);
  const assignSection = assignment.sections?.find((s) => (s.id || s.sid) === activeSection);
  const assignModule  = assignSection?.modules?.find((m) => m.number === activeModule);
  const meta          = SECTION_META[activeSection] || SECTION_META.rw;

  const formatTime = (val) => {
    if (val == null) return '—';
    const mins = val > 300 ? Math.round(val / 60) : val; // convert seconds → minutes if needed
    return `${mins}m`;
  };
  const handleDownload = () => downloadReport(attempt, assignment, topicMastery, aiData);

  // Tab definitions — Charts and Topics only shown when topic data exists
  const TABS = [
    { key: 'questions', label: 'Questions' },
    ...(hasTopics ? [{ key: 'topics',  label: 'Topic Mastery' }] : []),
    ...(hasTopics ? [{ key: 'charts',  label: 'Charts'        }] : []),
    { key: 'summary',   label: 'AI Summary' },
  ];

  // ── Loading overlay (shown for 0.5s on open) ──────────────
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1100]">
        <div
          className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4"
          style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}
        >
          <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
          <p className="text-sm font-bold text-gray-700">Loading report…</p>
          <p className="text-xs text-gray-400">Analysing performance data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1100] p-4">
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0"
          style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}
        >
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {attempt.avatar || (attempt.studentName || 'S').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                {isStudentView ? 'My Score Report' : attempt.studentName}
              </h3>
              <p className="text-xs text-indigo-300 mt-0.5">
                {isStudentView
                  ? assignment.title
                  : `${attempt.batchName} · Score report`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Score badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-white">
              <span className="text-sm font-extrabold">{attempt.score}/{attempt.maxScore}</span>
              <span className="text-[11px] opacity-70">({attempt.percentage}%)</span>
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  attempt.passed ? 'bg-emerald-400 text-white' : 'bg-red-400 text-white'
                }`}
              >
                {attempt.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            {/* Download button */}
            <button
              onClick={handleDownload}
              title="Download report as HTML"
              className="w-8 h-8 rounded-xl bg-white/15 text-white hover:bg-emerald-500 flex items-center justify-center text-sm transition-colors"
            >
              ⬇
            </button>
            {/* Close button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/15 text-white hover:bg-white/30 flex items-center justify-center text-sm font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Tab bar ───────────────────────────────────────── */}
        <div className="shrink-0 border-b border-gray-100 bg-white px-5 pt-3 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className="px-4 py-1.5 rounded-t-lg text-[12px] font-bold border-b-2 transition-all"
              style={
                view === t.key
                  ? { borderColor: '#4f46e5', color: '#4f46e5', background: '#fff' }
                  : { borderColor: 'transparent', color: '#9ca3af' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Section + module tabs (questions view only) ────── */}
        <div className={`shrink-0 border-b border-gray-100 bg-gray-50 ${view !== 'questions' ? 'hidden' : ''}`}>
          {/* Section tabs */}
          <div className="flex gap-1 px-5 pt-3">
            {attempt.sectionResults?.map((sr) => {
              const m       = SECTION_META[sr.sectionId] || {};
              const sScore  = sr.modules.reduce((a, mod) => a + mod.score, 0);
              const sMax    = sr.modules.reduce((a, mod) => a + mod.maxScore, 0);
              const active  = activeSection === sr.sectionId;
              return (
                <button
                  key={sr.sectionId}
                  onClick={() => { setActiveSection(sr.sectionId); setActiveModule(1); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-bold border-b-2 transition-all"
                  style={active
                    ? { borderColor: m.accent, color: m.accent, background: '#fff' }
                    : { borderColor: 'transparent', color: '#9ca3af', background: 'transparent' }}
                >
                  <span>{m.icon}</span>
                  <span>{sr.sectionName}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px]"
                        style={{ background: m.bg, color: m.accent }}>
                    {sScore}/{sMax}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Module tabs */}
          {sectionResult && (
            <div className="flex gap-1 px-5 py-2">
              {sectionResult.modules.map((mod) => {
                const active = activeModule === mod.moduleNumber;
                return (
                  <button
                    key={mod.moduleNumber}
                    onClick={() => setActiveModule(mod.moduleNumber)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all"
                    style={active
                      ? { background: meta.accent, color: '#fff' }
                      : { background: '#f3f4f6', color: '#9ca3af' }}
                  >
                    Module {mod.moduleNumber}
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold"
                      style={active
                        ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                        : { background: '#e5e7eb', color: '#6b7280' }}
                    >
                      {mod.score}/{mod.maxScore}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            VIEW: TOPIC MASTERY
            Table with mastery badge + progress bar per topic.
            Topic mastery is now correctly calculated (qid fix).
        ══════════════════════════════════════════════════════ */}
        {view === 'topics' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {Object.entries(topicMastery).map(([groupName, topics]) => (
              <div key={groupName} className="rounded-xl overflow-hidden border border-gray-200">
                <div className="bg-gray-800 px-4 py-3">
                  <p className="text-sm font-bold text-white">{groupName}</p>
                </div>
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_auto_160px] bg-gray-700 px-4 py-2">
                  <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-widest">Topics</span>
                  <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-widest text-center px-6">Mastery Level</span>
                  <span className="text-[10px] font-extrabold text-gray-300 uppercase tracking-widest text-right">Score</span>
                </div>
                {Object.entries(topics).map(([topic, data]) => {
                  const pct     = data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0;
                  const mastery = getMasteryLevel(pct);
                  return (
                    <div key={topic}
                         className="grid grid-cols-[1fr_auto_160px] items-center px-4 py-3 border-t border-gray-100 bg-white">
                      <div>
                        <p className="text-[13px] text-gray-700">{topic}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{data.correct}/{data.total} correct</p>
                      </div>
                      <span
                        className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mx-6"
                        style={{ background: mastery.bg, color: mastery.color }}
                      >
                        {mastery.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                               style={{ width: `${pct}%`, background: mastery.bar }} />
                        </div>
                        <span className="text-[10px] font-bold shrink-0 w-8 text-right"
                              style={{ color: mastery.bar }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            VIEW: CHARTS
            Horizontal bar charts (per group) + pie chart
        ══════════════════════════════════════════════════════ */}
        {view === 'charts' && (
          <div className="flex-1 overflow-y-auto">
            <TopicCharts topicMastery={topicMastery} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            VIEW: AI SUMMARY
            Generated performance analysis + download button
        ══════════════════════════════════════════════════════ */}
        {view === 'summary' && (
          <div className="flex-1 overflow-y-auto">
            <AISummaryView aiData={aiData} onDownload={handleDownload} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            VIEW: QUESTIONS
            Per-question answer comparison with explanations.
            Hidden (not unmounted) when other tabs are active to
            preserve scroll position if user switches back.
        ══════════════════════════════════════════════════════ */}
        <div className={`flex-1 overflow-y-auto p-5 space-y-3 ${view !== 'questions' ? 'hidden' : ''}`}>
          {/* Module meta bar */}
          {moduleResult && assignModule && (
            <div className="flex items-center gap-4 px-4 py-3 rounded-xl text-sm" style={{ background: meta.bg }}>
              <span style={{ color: meta.accent }} className="font-bold">Module {activeModule}</span>
              <span className="text-gray-500 text-xs">
                ⏱ {formatTime(
                  moduleResult.timeTaken ?? moduleResult.time_taken ?? moduleResult.timeUsed ?? moduleResult.time_used
                )} / {formatTime(
                  assignModule.timeLimit ?? assignModule.time_limit ?? assignModule.timeLimitMinutes ?? assignModule.time_limit_minutes
                )} used
              </span>
              <span className="text-gray-500 text-xs">⭐ {moduleResult.score} / {moduleResult.maxScore} pts</span>
              <span className="text-gray-500 text-xs">{assignModule.questions.length} questions</span>
            </div>
          )}

          {/* Question cards */}
          {assignModule?.questions.map((q, idx) => {
            // FIX: use same dual-key lookup as computeTopicMastery
            const primaryKey    = q.id   || q.qid;
            const fallbackKey   = q.qid  || q.id;
            const studentAnswer =
              moduleResult?.answers?.[primaryKey] ??
              moduleResult?.answers?.[fallbackKey];
            const isCorrect   = studentAnswer === q.correctAnswer;
            const notAnswered = !studentAnswer;

            return (
              <div
                key={primaryKey}
                className={`rounded-2xl border overflow-hidden ${
                  notAnswered ? 'border-gray-200' : isCorrect ? 'border-emerald-200' : 'border-red-200'
                }`}
              >
                {/* Question header row */}
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ background: notAnswered ? '#f9fafb' : isCorrect ? '#f0fdf4' : '#fff1f2' }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                    style={{ background: notAnswered ? '#9ca3af' : isCorrect ? '#10b981' : '#ef4444' }}
                  >
                    {q.number || idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate"
                       style={{ color: notAnswered ? '#6b7280' : isCorrect ? '#065f46' : '#991b1b' }}>
                      {sanitizeText(q.stem) || 'Untitled question'}
                    </p>
                    {q.topic && (
                      <span className="inline-flex mt-0.5 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                        {sanitizeText(q.topic)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {notAnswered ? (
                      <span className="text-[11px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                        Not attempted
                      </span>
                    ) : isCorrect ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ✓ Correct · +{q.score || 1} pt{(q.score || 1) !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                        ✗ Wrong · 0 pts
                      </span>
                    )}
                  </div>
                </div>

                {/* Question body */}
                <div className="px-4 py-4 bg-white space-y-3">
                  {q.description && (
                    <div className="text-[13px] text-gray-700 leading-relaxed border-l-2 pl-3 border-gray-200"
                         dangerouslySetInnerHTML={{ __html: sanitizeText(q.description) }} />
                  )}

                  {/* Answer choices */}
                  <div className="grid grid-cols-1 gap-1.5">
                    {['A', 'B', 'C', 'D'].map((letter) => {
                      const isStudentAnswer = studentAnswer === letter;
                      const isAnswerKey     = q.correctAnswer === letter;
                      let bg = '#f9fafb', border = '#e5e7eb', color = '#374151';
                      if (isStudentAnswer && isAnswerKey)        { bg = '#f0fdf4'; border = '#6ee7b7'; color = '#065f46'; }
                      else if (isStudentAnswer && !isAnswerKey)  { bg = '#fff1f2'; border = '#fca5a5'; color = '#991b1b'; }
                      else if (!isStudentAnswer && isAnswerKey)  { bg = '#f0fdf4'; border = '#a7f3d0'; color = '#065f46'; }
                      return (
                        <div key={letter} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border"
                             style={{ background: bg, borderColor: border }}>
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-extrabold shrink-0"
                               style={{ background: border, color }}>
                            {letter}
                          </div>
                          <span className="text-[13px] flex-1" style={{ color }}>
                            {sanitizeText(q['option_' + letter.toLowerCase()]) || '—'}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isStudentAnswer && <span className="text-[10px] font-bold" style={{ color }}>Student</span>}
                            {isAnswerKey      && <span className="text-[10px] font-extrabold text-emerald-600">✓ Key</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation — always visible in the report */}
                  {q.explanation && (
                    <div className="flex gap-2.5 p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="text-base shrink-0">💡</span>
                      <div>
                        <p className="text-[11px] font-extrabold text-amber-700 uppercase tracking-wide mb-1">Explanation</p>
                        <div className="text-[12px] text-amber-800 leading-relaxed"
                             dangerouslySetInnerHTML={{ __html: sanitizeText(q.explanation) }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(!assignModule || assignModule.questions.length === 0) && (
            <div className="text-center py-12 text-gray-400 text-sm">No questions in this module.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ATTEMPT ROW
// One row in the student list showing status, score bar, and
// a "View Report" button for completed attempts.
// ─────────────────────────────────────────────────────────────
function AttemptRow({ attempt, onViewReport }) {
  const statusMeta = {
    completed:   { label: 'Completed',   dot: '#10b981', bg: '#f0fdf4', color: '#065f46' },
    in_progress: { label: 'In Progress', dot: '#f59e0b', bg: '#fffbeb', color: '#92400e' },
    not_started: { label: 'Not Started', dot: '#9ca3af', bg: '#f9fafb', color: '#6b7280' },
  };
  const sm = statusMeta[attempt.status] || statusMeta.not_started;

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shrink-0"
           style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
        {attempt.avatar || attempt.studentName.slice(0, 2).toUpperCase()}
      </div>

      {/* Student info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-bold text-gray-900">{attempt.studentName}</p>
          <span className="text-[11px] text-gray-400">{attempt.batchName}</span>
        </div>
        {attempt.status === 'completed' && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                   style={{ width: `${attempt.percentage}%`, background: attempt.passed ? '#10b981' : '#ef4444' }} />
            </div>
            <span className="text-xs font-bold text-gray-600">{attempt.percentage}%</span>
            <span className="text-xs text-gray-400">{attempt.score}/{attempt.maxScore} pts</span>
          </div>
        )}
        {attempt.completedAt && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            Completed {new Date(attempt.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Status badges + report button */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background: sm.bg, color: sm.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sm.dot }} />
          {sm.label}
        </span>
        {attempt.status === 'completed' && (
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
            attempt.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            {attempt.passed ? '✓ Pass' : '✗ Fail'}
          </span>
        )}
        {attempt.status === 'completed' && (
          <button
            onClick={() => onViewReport(attempt)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            View Report
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ASSIGNMENT PROGRESS PAGE (default export)
// Shown by the mentor and ops portals.
// Lists all students' attempts with aggregate stats, section
// averages, and a filter bar. Clicking "View Report" on any
// completed attempt opens the StudentReportModal.
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// ATTEMPTS SKELETON
// Shown when `assignment.attempts === undefined` — meaning the
// parent navigated here immediately and is still fetching the
// progress data in the background.
// ─────────────────────────────────────────────────────────────
function AttemptsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-4 border border-gray-200">
            <div className="w-9 h-9 rounded-xl bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-8" />
              <div className="h-2.5 bg-gray-100 rounded w-14" />
            </div>
          </div>
        ))}
      </div>

      {/* Section average skeleton */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <div className="h-3 bg-gray-200 rounded w-32" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-t border-gray-100">
            <div className="w-6 h-6 rounded bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-36" />
              <div className="h-2 bg-gray-100 rounded-full w-full" />
            </div>
            <div className="h-3 bg-gray-100 rounded w-16" />
          </div>
        ))}
      </div>

      {/* Attempt row skeletons */}
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-200 rounded w-36" />
              <div className="h-2 bg-gray-100 rounded-full w-48" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-20 bg-gray-200 rounded-full" />
              <div className="h-6 w-12 bg-gray-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AssignmentProgressPage({ assignment, onBack }) {
  const [filter, setFilter]       = useState('all');
  const [reportFor, setReportFor] = useState(null);

  // undefined = still loading (OpsExploreTestsPage navigated immediately,
  // fetch is running in background); show skeleton in that case.
  const isLoadingAttempts = assignment.attempts === undefined;
  const attempts          = isLoadingAttempts ? [] : (assignment.attempts || []);

  // ── Aggregate statistics ──────────────────────────────────
  const total     = attempts.length;
  const attempted = attempts.filter((a) => a.status !== 'not_started').length;
  const completed = attempts.filter((a) => a.status === 'completed').length;
  const passed    = attempts.filter((a) => a.passed).length;
  const avgPct    = completed > 0
    ? Math.round(
        attempts
          .filter((a) => a.status === 'completed')
          .reduce((s, a) => s + a.percentage, 0) / completed,
      )
    : 0;

  // ── Filter helpers ────────────────────────────────────────
  const filtered = filter === 'all'
    ? attempts
    : attempts.filter((a) =>
        a.status === filter ||
        (filter === 'passed'  && a.passed) ||
        (filter === 'failed'  && a.status === 'completed' && !a.passed),
      );

  const counts = {
    all:         total,
    completed:   completed,
    in_progress: attempts.filter((a) => a.status === 'in_progress').length,
    not_started: attempts.filter((a) => a.status === 'not_started').length,
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/60 fade-in">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-semibold transition-colors shrink-0"
        >
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-extrabold text-gray-900 truncate">{assignment.title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Assignment progress &nbsp;·&nbsp;
            {assignment.dueDate &&
              `Due ${new Date(assignment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-700 shrink-0">
          ✓ Published
        </span>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── Skeleton — shown while background fetch is in progress ── */}
        {isLoadingAttempts && <AttemptsSkeleton />}

        {/* ── Real content — rendered once attempts data is available ── */}
        {!isLoadingAttempts && (
        <>
        {/* ── Aggregate stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { icon: '👥', value: total,         label: 'Enrolled',  color: '#4f46e5' },
            { icon: '📝', value: attempted,     label: 'Attempted', color: '#f59e0b' },
            { icon: '✅', value: completed,     label: 'Completed', color: '#10b981' },
            { icon: '🎯', value: passed,        label: 'Passed',    color: '#059669' },
            { icon: '📊', value: `${avgPct}%`,  label: 'Avg Score', color: '#7c3aed' },
          ].map(({ icon, value, label, color }) => (
            <div key={label}
                 className="flex items-center gap-3 bg-white rounded-2xl px-4 py-4 border border-gray-200">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                   style={{ background: color + '15' }}>
                {icon}
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-900 leading-none">{value}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Section average scores ── */}
        {completed > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Average by Section</p>
            </div>
            <div className="divide-y divide-gray-100">
              {assignment.sections.map((section) => {
                const meta             = SECTION_META[section.id] || {};
                const completedAttempts = attempts.filter((a) => a.status === 'completed');
                const sectionScores = completedAttempts.map((a) => {
                  const sr = a.sectionResults?.find((s) => s.sectionId === section.id);
                  if (!sr) return null;
                  const score    = sr.modules.reduce((x, m) => x + m.score, 0);
                  const maxScore = sr.modules.reduce((x, m) => x + m.maxScore, 0);
                  return maxScore > 0 ? (score / maxScore) * 100 : 0;
                }).filter(Boolean);
                const avgSection = sectionScores.length > 0
                  ? Math.round(sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length)
                  : 0;

                return (
                  <div key={section.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="text-lg shrink-0">{meta.icon}</span>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-gray-700">{section.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                               style={{ width: `${avgSection}%`, background: meta.accent }} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 shrink-0"
                              style={{ color: meta.accent }}>
                          {avgSection}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {section.modules.map((mod) => {
                        const modScores = completedAttempts.map((a) => {
                          const sr = a.sectionResults?.find((s) => s.sectionId === section.id);
                          const mr = sr?.modules.find((m) => m.moduleNumber === mod.number);
                          return mr ? { s: mr.score, m: mr.maxScore } : null;
                        }).filter(Boolean);
                        const avgMod = modScores.length > 0
                          ? Math.round(modScores.reduce((a, x) => a + x.s, 0) / modScores.length)
                          : 0;
                        const maxMod = modScores[0]?.m || 0;
                        return (
                          <p key={mod.id} className="text-[11px] text-gray-400">
                            M{mod.number}: {avgMod}/{maxMod} avg
                          </p>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Filter bar ── */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {[
            { key: 'all',         label: `All (${counts.all})` },
            { key: 'completed',   label: `Completed (${counts.completed})` },
            { key: 'in_progress', label: `In Progress (${counts.in_progress})` },
            { key: 'not_started', label: `Not Started (${counts.not_started})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap ${
                filter === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Attempt list ── */}
        {attempts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-3">👥</span>
            <h3 className="text-base font-extrabold text-gray-700 mb-1">No students enrolled yet</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              Go back and use "Enroll Batch" to add a batch of students to this assignment.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No students in this filter.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((attempt) => (
              <AttemptRow
                key={attempt.studentId}
                attempt={attempt}
                assignment={assignment}
                onViewReport={setReportFor}
              />
            ))}
          </div>
        )}
        </>
        ) /* end !isLoadingAttempts */}
      </div>

      {/* ── Report modal ── */}
      {reportFor && (
        <StudentReportModal
          attempt={reportFor}
          assignment={assignment}
          onClose={() => setReportFor(null)}
        />
      )}
    </div>
  );
}
