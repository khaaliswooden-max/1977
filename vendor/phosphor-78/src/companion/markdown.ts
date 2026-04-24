// Tiny markdown renderer covering the subset our companion content
// uses: headings, paragraphs, code blocks (```svg passes through
// as inline SVG, ```glsl / ```javascript / ``` becomes <pre>),
// inline code, simple lists, basic tables. Built in-house to keep
// the bundle dep-free.
//
// This is NOT a complete CommonMark parser. It handles exactly
// what the three content/*.md files use, no more.

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ESCAPE_MAP[c] ?? c);
}

/**
 * Inline rules: backtick code spans, **bold**, *italic* / _italic_.
 *
 * Story 5.18: ran @jacobbubu/md-zh-format on the .md sources and
 * it produced two patterns we have to handle:
 *   - bold spans with internal trailing whitespace, e.g.
 *     `**invader-march (行进音) **` (the formatter inserts spaces
 *     around CJK↔Latin boundaries inside emphasis).
 *   - italic with underscores `_term_` (the formatter prefers `_`
 *     over `*` for italics).
 *
 * Bold runs FIRST so `**foo**` doesn't get clobbered by the
 * single-asterisk italic rule.
 */
function inlineFormat(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`)
    .replace(
      /\*\*\s*([^*\n]+?)\s*\*\*/g,
      (_m, t) => `<strong>${t}</strong>`,
    )
    .replace(/(^|[^A-Za-z0-9_])_([^_\n]+?)_(?![A-Za-z0-9_])/g,
      (_m, pre, t) => `${pre}<em>${t}</em>`)
    .replace(/(^|[^*A-Za-z0-9])\*([^*\n]+?)\*(?![*A-Za-z0-9])/g,
      (_m, pre, t) => `${pre}<em>${t}</em>`);
}

// Story 5.16: when joining paragraph lines, source line breaks
// in English become spaces (good — that's how prose wraps), but
// in Chinese a space between two CJK characters is a visible
// glitch ("原机的 程序"). Detect the boundary character class on
// each side of the join and skip the space when both are CJK.
const CJK_RE =
  /[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef\u3040-\u30ff\u31f0-\u31ff]/;

function joinParagraphLines(lines: readonly string[]): string {
  let out = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (i === 0) {
      out = line;
      continue;
    }
    const prev = out.charAt(out.length - 1);
    const next = line.charAt(0);
    if (CJK_RE.test(prev) && CJK_RE.test(next)) out += line;
    else out += ' ' + line;
  }
  return out;
}

interface Block {
  emit(): string;
}

function blockHeading(level: number, text: string): Block {
  return { emit: () => `<h${level}>${inlineFormat(text)}</h${level}>` };
}

function blockParagraph(lines: string[]): Block {
  return { emit: () => `<p>${inlineFormat(joinParagraphLines(lines))}</p>` };
}

function blockUL(items: string[]): Block {
  return {
    emit: () =>
      `<ul>${items.map((it) => `<li>${inlineFormat(it)}</li>`).join('')}</ul>`,
  };
}

function blockOL(items: string[]): Block {
  return {
    emit: () =>
      `<ol>${items.map((it) => `<li>${inlineFormat(it)}</li>`).join('')}</ol>`,
  };
}

function blockSvg(body: string): Block {
  // Pass-through: the .md author wrote raw SVG inside ```svg.
  return { emit: () => `<figure class="svg-figure">${body}</figure>` };
}

function blockCode(body: string, lang: string): Block {
  return {
    emit: () =>
      `<pre class="code lang-${esc(lang)}"><code>${esc(body)}</code></pre>`,
  };
}

function blockTable(rows: string[][]): Block {
  if (rows.length === 0) return { emit: () => '' };
  const [header = [], ...body] = rows;
  // body might include the alignment row (---|---) — drop any row
  // whose every cell is dashes.
  const isDashRow = (r: string[]) => r.every((c) => /^-+$/.test(c.trim()));
  const dataRows = body.filter((r) => !isDashRow(r));
  return {
    emit: () => {
      const head = `<thead><tr>${header
        .map((c) => `<th>${inlineFormat(c.trim())}</th>`)
        .join('')}</tr></thead>`;
      const tbody = `<tbody>${dataRows
        .map(
          (r) =>
            `<tr>${r.map((c) => `<td>${inlineFormat(c.trim())}</td>`).join('')}</tr>`,
        )
        .join('')}</tbody>`;
      return `<table>${head}${tbody}</table>`;
    },
  };
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Heading.
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push(blockHeading(heading[1]!.length, heading[2]!));
      i++;
      continue;
    }

    // Code block (``` ... ```). Pass svg through verbatim.
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      i++;
      const buf: string[] = [];
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        buf.push(lines[i] ?? '');
        i++;
      }
      i++; // skip closing ```
      const body = buf.join('\n');
      if (lang === 'svg') blocks.push(blockSvg(body));
      else blocks.push(blockCode(body, lang));
      continue;
    }

    // Unordered list.
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push(blockUL(items));
      continue;
    }

    // Ordered list.
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(blockOL(items));
      continue;
    }

    // Table — line begins with |.
    if (line.trim().startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('|')) {
        const cells = (lines[i] ?? '')
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|');
        rows.push(cells);
        i++;
      }
      blocks.push(blockTable(rows));
      continue;
    }

    // Plain paragraph: collect until a blank line or block start.
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() !== '' &&
      !/^(#{1,6})\s/.test(lines[i] ?? '') &&
      !(lines[i] ?? '').startsWith('```') &&
      !/^[-*]\s/.test(lines[i] ?? '') &&
      !/^\d+\.\s/.test(lines[i] ?? '') &&
      !(lines[i] ?? '').trim().startsWith('|')
    ) {
      paraLines.push(lines[i] ?? '');
      i++;
    }
    blocks.push(blockParagraph(paraLines));
  }

  return blocks.map((b) => b.emit()).join('\n');
}
