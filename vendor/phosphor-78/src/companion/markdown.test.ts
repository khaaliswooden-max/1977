import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '@/companion/markdown';

describe('renderMarkdown', () => {
  it('renders headings', () => {
    expect(renderMarkdown('# Title')).toContain('<h1>Title</h1>');
    expect(renderMarkdown('## Sub')).toContain('<h2>Sub</h2>');
  });

  it('renders paragraphs joining adjacent lines', () => {
    const out = renderMarkdown('hello\nworld');
    expect(out).toContain('<p>hello world</p>');
  });

  it('escapes < > & in plain text', () => {
    const out = renderMarkdown('a < b & c > d');
    expect(out).toContain('a &lt; b &amp; c &gt; d');
  });

  it('renders inline backticks as <code>', () => {
    const out = renderMarkdown('use `foo` here');
    expect(out).toContain('<code>foo</code>');
  });

  it('renders fenced code blocks with language class', () => {
    const out = renderMarkdown('```javascript\nfoo();\n```');
    expect(out).toContain('<pre class="code lang-javascript">');
    expect(out).toContain('foo();');
  });

  it('passes ```svg through as raw figure', () => {
    const out = renderMarkdown('```svg\n<svg/>\n```');
    expect(out).toContain('<figure class="svg-figure"><svg/></figure>');
  });

  it('renders unordered lists', () => {
    const out = renderMarkdown('- one\n- two');
    expect(out).toContain('<ul><li>one</li><li>two</li></ul>');
  });

  it('renders ordered lists', () => {
    const out = renderMarkdown('1. one\n2. two');
    expect(out).toContain('<ol><li>one</li><li>two</li></ol>');
  });

  it('renders simple tables', () => {
    const md = `| a | b |
|---|---|
| 1 | 2 |`;
    const out = renderMarkdown(md);
    expect(out).toContain('<th>a</th>');
    expect(out).toContain('<td>1</td>');
  });

  // Story 5.16: bold + CJK-aware line joining.
  it('renders **bold** as <strong>', () => {
    const out = renderMarkdown('this is **important** text');
    expect(out).toContain('<strong>important</strong>');
  });

  it('renders bold inside Chinese prose', () => {
    const out = renderMarkdown('原机**毫无录音**所以');
    expect(out).toContain('<strong>毫无录音</strong>');
    expect(out).not.toContain('**');
  });

  // Story 5.18: md-zh-format inserts whitespace inside bold spans
  // around CJK↔Latin boundaries. The renderer trims it.
  it('trims internal whitespace from bold spans', () => {
    const out = renderMarkdown('**invader-march (行进音) ** -- foo');
    expect(out).toContain('<strong>invader-march (行进音)</strong>');
    expect(out).not.toContain('** ');
  });

  // Story 5.18: md-zh-format prefers _underscore_ for italic.
  it('renders _underscore_ as italic', () => {
    const out = renderMarkdown('the point is to _understand_ the math');
    expect(out).toContain('<em>understand</em>');
  });

  it('renders *asterisk* as italic', () => {
    const out = renderMarkdown('only the *display* refresh rate');
    expect(out).toContain('<em>display</em>');
  });

  it('does not treat snake_case identifiers as italic', () => {
    const out = renderMarkdown('use foo_bar_baz here');
    expect(out).toContain('foo_bar_baz');
    expect(out).not.toContain('<em>');
  });

  it('joins English paragraph lines with a space', () => {
    const out = renderMarkdown('hello\nworld');
    expect(out).toContain('<p>hello world</p>');
  });

  it('joins CJK paragraph lines with NO space', () => {
    // Source line break between 的 and 程 should NOT become a
    // visible space — Chinese has no word separator.
    const out = renderMarkdown('原机的\n程序 ROM');
    expect(out).toContain('<p>原机的程序 ROM</p>');
  });

  it('joins mixed CJK + ASCII boundaries with a space', () => {
    const out = renderMarkdown('Phosphor 78\n是一个项目');
    // 8 (ASCII) | 是 (CJK) — keep the space so the version number
    // stays separated from the next sentence.
    expect(out).toContain('<p>Phosphor 78 是一个项目</p>');
  });
});
