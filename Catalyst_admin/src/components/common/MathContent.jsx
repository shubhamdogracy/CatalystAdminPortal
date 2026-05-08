import { useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/contrib/auto-render';

const KATEX_OPTS = {
  delimiters: [
    { left: '$$', right: '$$', display: true  },
    { left: '$',  right: '$',  display: false },
    { left: '\\(', right: '\\)', display: false },
    { left: '\\[', right: '\\]', display: true  },
  ],
  // Never touch SVG or image nodes — they may contain $ symbols in text/title/desc
  ignoredTags: [
    'script', 'noscript', 'style', 'textarea', 'pre', 'code',
    'annotation', 'annotation-xml', 'svg', 'img', 'figure', 'figcaption',
  ],
  throwOnError: false,
};

export default function MathContent({ html, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) renderMathInElement(ref.current, KATEX_OPTS);
  }, [html]);

  if (!html) return null;

  return (
    <div
      ref={ref}
      // sat-content applies SVG sizing, sr-only hiding, p spacing (see index.css)
      className={`sat-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
