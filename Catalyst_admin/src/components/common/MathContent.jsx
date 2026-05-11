import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';

const renderLatex = (source) => {
  if (!source) return source;
  let out = source;

  // Display math: $$...$$  (process before inline to avoid partial matches)
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
    try { return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false }); }
    catch { return match; }
  });

  // Display math: \[...\]
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (match, tex) => {
    try { return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false }); }
    catch { return match; }
  });

  // Inline math: \(...\)
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (match, tex) => {
    try { return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false }); }
    catch { return match; }
  });

  // Inline math: $...$  (no newlines inside, avoids double-dollar already consumed)
  out = out.replace(/\$([^$\n]+?)\$/g, (match, tex) => {
    try { return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false }); }
    catch { return match; }
  });

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
