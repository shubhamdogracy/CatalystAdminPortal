import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';

// Clean up raw LaTeX so it reads naturally when KaTeX can't render it.
const latexToPlain = (tex) => {
  let t = tex.trim();

  // Simple fractions: \frac{a}{b} → a/b
  t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');

  // Superscripts with braces: ^{n} → unicode when single char
  const superMap = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','n':'ⁿ' };
  t = t.replace(/\^\{([^}]+)\}/g, (_, exp) =>
    exp.length === 1 && superMap[exp] ? superMap[exp] : `^${exp}`
  );
  t = t.replace(/\^([0-9n])/g, (_, c) => superMap[c] || `^${c}`);

  // Subscripts
  t = t.replace(/_\{([^}]+)\}/g, '_$1');

  // Common symbols
  t = t.replace(/\\cdot/g, '·');
  t = t.replace(/\\times/g, '×');
  t = t.replace(/\\div/g, '÷');
  t = t.replace(/\\leq/g, '≤');
  t = t.replace(/\\geq/g, '≥');
  t = t.replace(/\\neq/g, '≠');
  t = t.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  t = t.replace(/\\sqrt/g, '√');
  t = t.replace(/\\pi/g, 'π');
  t = t.replace(/\\infty/g, '∞');
  t = t.replace(/\\pm/g, '±');

  // Remove remaining backslash commands and stray braces
  t = t.replace(/\\[a-zA-Z]+/g, '');
  t = t.replace(/[{}]/g, '');

  return t;
};

const renderLatex = (source) => {
  if (!source) return source;
  let out = source;

  // Display math: $$...$$  (process before inline to avoid partial matches)
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
    try {
      const r = katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
      return r.includes('katex-error') ? latexToPlain(tex) : r;
    } catch { return latexToPlain(tex); }
  });

  // Display math: \[...\]
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (match, tex) => {
    try {
      const r = katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
      return r.includes('katex-error') ? latexToPlain(tex) : r;
    } catch { return latexToPlain(tex); }
  });

  // Inline math: \(...\)
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (match, tex) => {
    try {
      const r = katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
      return r.includes('katex-error') ? latexToPlain(tex) : r;
    } catch { return latexToPlain(tex); }
  });

  // Inline math: $...$  (no newlines inside)
  out = out.replace(/\$([^$\n]+?)\$/g, (match, tex) => {
    try {
      const r = katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
      return r.includes('katex-error') ? latexToPlain(tex) : r;
    } catch { return latexToPlain(tex); }
  });

  // Absolute safety net: strip any $...$ that still weren't rendered
  out = out.replace(/\$([^$\n]+)\$/g, '$1');

  return out;
};

export default function MathContent({ html, className = '', style }) {
  const rendered = useMemo(() => renderLatex(html), [html]);
  if (!rendered) return null;
  return (
    <div
      className={`sat-content ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
