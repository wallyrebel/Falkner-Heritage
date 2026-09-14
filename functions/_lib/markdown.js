/* A deliberately small Markdown subset, rendered safely.
 *
 * Everything a contributor types is HTML-escaped FIRST, and only then are the
 * handful of known-safe tags below introduced. Raw HTML in a post body is
 * never passed through, so a post can never inject script into the site.
 *
 * Supported: ## and ### headings, **bold**, *italic*, [links](url),
 * - bullet lists, 1. numbered lists, > quotes, --- rules, ![photo](/media/id).
 */

const SAFE_URL = /^(?:https?:\/\/|\/|mailto:|tel:|#)/i;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Runs on already-escaped text, so a quote is &quot; and cannot close the
 * attribute. Anything that is not plainly a web address is rejected. */
function safeUrl(escapedUrl) {
  const trimmed = escapedUrl.trim();
  if (!SAFE_URL.test(trimmed)) return null;
  if (CONTROL_CHARS.test(trimmed)) return null;
  return trimmed;
}

function inline(escaped) {
  let out = escaped;

  // [text](url)
  out = out.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (whole, text, url) => {
    const href = safeUrl(url);
    if (!href) return text;
    const external = /^https?:\/\//i.test(href);
    return `<a href="${href}"${external ? ' rel="noopener"' : ''}>${text}</a>`;
  });

  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

  return out;
}

function listItems(lines, pattern) {
  return lines
    .map((line) => `<li>${inline(escapeHtml(line.replace(pattern, '')))}</li>`)
    .join('\n');
}

export function renderMarkdown(source) {
  const text = String(source || '').replace(/\r\n?/g, '\n').trim();
  if (!text) return '';

  const blocks = text.split(/\n{2,}/);
  const html = [];

  for (const rawBlock of blocks) {
    const block = rawBlock.trim();
    if (!block) continue;

    const lines = block.split('\n');

    // A photo on its own line: ![alt text](/media/abc123)
    const photo = block.match(/^!\[([^\]\n]*)\]\(([^)\s]+)\)$/);
    if (photo) {
      const src = safeUrl(escapeHtml(photo[2]));
      if (src) {
        const alt = escapeHtml(photo[1]);
        html.push(
          `<figure class="figure"><img src="${src}" alt="${alt}" loading="lazy" decoding="async">`
          + (alt ? `<figcaption>${alt}</figcaption>` : '')
          + '</figure>',
        );
        continue;
      }
    }

    if (/^---+$/.test(block)) { html.push('<hr>'); continue; }

    const heading = block.match(/^(#{2,3})\s+(.+)$/);
    if (heading && lines.length === 1) {
      const level = heading[1].length;
      html.push(`<h${level}>${inline(escapeHtml(heading[2]))}</h${level}>`);
      continue;
    }

    if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
      html.push(`<ul>\n${listItems(lines, /^\s*[-*]\s+/)}\n</ul>`);
      continue;
    }

    if (lines.every((line) => /^\s*\d+[.)]\s+/.test(line))) {
      html.push(`<ol>\n${listItems(lines, /^\s*\d+[.)]\s+/)}\n</ol>`);
      continue;
    }

    if (lines.every((line) => /^\s*>\s?/.test(line))) {
      const quoted = lines.map((line) => line.replace(/^\s*>\s?/, '')).join('\n');
      html.push(`<blockquote><p>${inline(escapeHtml(quoted)).replace(/\n/g, '<br>')}</p></blockquote>`);
      continue;
    }

    html.push(`<p>${inline(escapeHtml(block)).replace(/\n/g, '<br>')}</p>`);
  }

  return html.join('\n');
}

/* Plain text, for meta descriptions and the summaries on the blog index. */
export function toPlainText(source, limit = 0) {
  let text = String(source || '')
    .replace(/\r\n?/g, '\n')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[#>-]+\s*/gm, '')
    .replace(/^\s*\d+[.)]\s*/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (limit && text.length > limit) {
    text = `${text.slice(0, limit).replace(/\s+\S*$/, '')}\u2026`;
  }
  return text;
}
