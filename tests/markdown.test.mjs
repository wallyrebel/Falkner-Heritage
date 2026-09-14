/* Escaping and rendering of contributor-written post bodies. */
import { renderMarkdown, toPlainText } from '../functions/_lib/markdown.js';

const OK_TAGS = new Set(['p','br','hr','h2','h3','strong','em','a','ul','ol','li','blockquote','figure','figcaption','img']);
const OK_ATTRS = new Set(['href','rel','src','alt','loading','decoding','class']);

// Real test: every tag the renderer emits must be in the allowlist, every
// attribute too, and no href/src may carry a scheme that can execute.
function audit(html) {
  const problems = [];
  const tagRe = /<\/?([a-zA-Z0-9]+)((?:\s+[^<>]*)?)\/?>/g;
  let m;
  while ((m = tagRe.exec(html))) {
    const [, name, attrBlob] = m;
    if (!OK_TAGS.has(name.toLowerCase())) problems.push(`tag <${name}>`);
    const attrRe = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
    let a;
    while ((a = attrRe.exec(attrBlob || ''))) {
      const [, attr, value] = a;
      if (!OK_ATTRS.has(attr.toLowerCase())) problems.push(`attr ${attr}=`);
      if ((attr === 'href' || attr === 'src') && !/^(https?:\/\/|\/|mailto:|tel:|#)/i.test(value)) {
        problems.push(`scheme ${attr}="${value.slice(0, 30)}"`);
      }
    }
  }
  return problems;
}

const cases = [
  ['script tag', '<script>alert(1)</script>'],
  ['img onerror', '<img src=x onerror=alert(1)>'],
  ['svg onload', '<svg/onload=alert(1)>'],
  ['js link', '[click me](javascript:alert(1))'],
  ['JS mixed case', '[click me](JaVaScRiPt:alert(1))'],
  ['data link', '[x](data:text/html,<script>alert(1)</script>)'],
  ['attr break', '[x](https://a.com" onmouseover="alert(1))'],
  ['attr break 2', '[x](https://a.com"onmouseover="alert(1))'],
  ['photo js', '![oops](javascript:alert(1))'],
  ['photo break', '![a" onerror="alert(1)](/media/x)'],
  ['iframe', '<iframe src="https://evil.com"></iframe>'],
  ['entity dodge', '[x](java&#115;cript:alert(1))'],
  ['quote attr', 'He said "hello" & left <b>now</b>'],
  ['normal', '## Founder’s Day\n\n**Great turnout**, see [photos](/blog) or [MDAH](https://mdah.ms.gov).\n\n- One\n- Two\n\n1. First\n2. Second\n\n> A quote\n\n---\n\n![The car show](/media/abc123)'],
];

let bad = 0;
for (const [name, input] of cases) {
  const out = renderMarkdown(input);
  const problems = audit(out);
  if (problems.length) { bad++; console.log(`FAIL ${name}: ${problems.join(', ')}\n  ${out}\n`); }
  else console.log(`ok   ${name.padEnd(14)} ${out.replace(/\n/g, ' ').slice(0, 96)}`);
}
console.log(bad ? `\n${bad} FAILURES` : '\nAll tag/attribute/scheme checks passed');
process.exit(bad ? 1 : 0);
