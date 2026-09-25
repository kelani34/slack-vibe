import { describe, expect, it } from 'vitest';

import { messageHtmlToText, sanitizeMessageHtml } from './message-html';

describe('message HTML boundary', () => {
  it('removes executable markup, event handlers, embedded content, and unsafe URLs', () => {
    const result = sanitizeMessageHtml(
      '<p onclick="run()">Hello<script>alert(1)</script><a href="javascript:run()">bad link</a><img src=x onerror="run()"><svg onload="run()"><text>icon</text></svg></p>',
    );

    expect(result).toContain('<p>Hello');
    expect(result).toContain('bad link</a>');
    expect(result).not.toMatch(/<script|<img|<svg|onerror|onclick|onload|javascript:/i);
  });

  it('preserves editor formatting, valid mention metadata, and safe external links', () => {
    const result = sanitizeMessageHtml(
      '<p><strong>Hi</strong> <span class="mention" data-type="mention" data-id="user_123" data-label="Kai">@Kai</span> <a href="https://example.test/path" target="_blank">link</a></p>',
    );

    expect(result).toContain('<strong>Hi</strong>');
    expect(result).toContain('data-type="mention"');
    expect(result).toContain('data-id="user_123"');
    expect(result).toContain('href="https://example.test/path"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('rejects protocol-relative, encoded script, and data URLs', () => {
    const result = sanitizeMessageHtml(
      '<a href="//evil.example/path">protocol</a> <a href="jav&#x61;script:run()">encoded</a> <a href="data:text/html,run()">data</a>',
    );

    expect(result).toContain('protocol');
    expect(result).toContain('encoded');
    expect(result).toContain('data</a>');
    expect(result).not.toMatch(/href=/i);
  });

  it('removes fake mention identity metadata while keeping its visible text', () => {
    const result = sanitizeMessageHtml(
      '<span class="mention" data-type="mention" data-id="<img src=x onerror=run()>" data-label="fake">@someone</span>',
    );

    expect(result).toContain('@someone');
    expect(result).not.toContain('data-type');
    expect(result).not.toContain('data-id');
    expect(result).not.toContain('onerror');
  });

  it('preserves mention identity only for authorized participants when supplied', () => {
    const result = sanitizeMessageHtml(
      '<span class="mention" data-type="mention" data-id="member-1">@Member</span><span class="mention" data-type="mention" data-id="outsider-1">@Outsider</span>',
      new Set(['member-1']),
    );

    expect(result).toContain('data-id="member-1"');
    expect(result).toContain('@Outsider');
    expect(result).not.toContain('data-id="outsider-1"');
  });

  it('extracts a plain text preview without markup and skips script contents', () => {
    expect(messageHtmlToText('<p>Keep &amp; read</p><p>Second line</p><script>secret()</script>')).toBe(
      'Keep & read\nSecond line',
    );
  });

  it('returns empty content for non-string input', () => {
    expect(sanitizeMessageHtml(null)).toBe('');
    expect(messageHtmlToText(undefined)).toBe('');
  });
});
