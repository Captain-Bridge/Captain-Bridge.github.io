function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const ALLOWED_MARKDOWN_HTML_TAGS = new Set([
  'span',
  'div',
  'br',
  'sup',
  'sub',
  'small',
  'mark',
  'kbd'
]);

const ALLOWED_MARKDOWN_HTML_ATTRIBUTES = new Set([
  'class',
  'title',
  'style'
]);

const ALLOWED_MARKDOWN_STYLE_PROPERTIES = new Set([
  'color',
  'background-color',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-align',
  'letter-spacing',
  'text-transform',
  'opacity'
]);

function sanitizeInlineStyle(styleText) {
  return styleText
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const separatorIndex = part.indexOf(':');
      if (separatorIndex === -1) return '';

      const property = part.slice(0, separatorIndex).trim().toLowerCase();
      const value = part.slice(separatorIndex + 1).trim();
      if (!property || !value) return '';
      if (!ALLOWED_MARKDOWN_STYLE_PROPERTIES.has(property)) return '';
      if (/[<>"'`]/.test(value)) return '';
      if (/url\s*\(/i.test(value)) return '';
      if (/expression\s*\(/i.test(value)) return '';
      return `${property}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

function sanitizeAllowedHtml(rawHtml) {
  const tagMatch = rawHtml.match(/^<\s*(\/?)\s*([a-zA-Z0-9-]+)([^>]*)>$/);
  if (!tagMatch) return null;

  const isClosingTag = Boolean(tagMatch[1]);
  const tagName = tagMatch[2].toLowerCase();
  const attributeSource = tagMatch[3] || '';
  if (!ALLOWED_MARKDOWN_HTML_TAGS.has(tagName)) return null;

  if (isClosingTag) {
    return `</${tagName}>`;
  }

  const sanitizedAttributes = [];
  const attributePattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match;

  while ((match = attributePattern.exec(attributeSource)) !== null) {
    const attributeName = match[1].toLowerCase();
    const attributeValue = match[3] ?? match[4] ?? '';
    if (!ALLOWED_MARKDOWN_HTML_ATTRIBUTES.has(attributeName)) continue;
    if (/^on/i.test(attributeName)) continue;

    if (attributeName === 'style') {
      const sanitizedStyle = sanitizeInlineStyle(attributeValue);
      if (sanitizedStyle) {
        sanitizedAttributes.push(`style="${escapeHtml(sanitizedStyle)}"`);
      }
      continue;
    }

    if (/[<>]/.test(attributeValue)) continue;
    sanitizedAttributes.push(`${attributeName}="${escapeHtml(attributeValue)}"`);
  }

  const selfClosing = /\/\s*$/.test(attributeSource) || tagName === 'br';
  const attributesMarkup = sanitizedAttributes.length ? ` ${sanitizedAttributes.join(' ')}` : '';
  return selfClosing ? `<${tagName}${attributesMarkup}>` : `<${tagName}${attributesMarkup}>`;
}

function preserveAllowedHtml(text) {
  const placeholders = [];
  const value = text.replace(/<[^>]+>/g, tag => {
    const sanitizedTag = sanitizeAllowedHtml(tag);
    if (!sanitizedTag) return tag;

    const placeholder = `__RAW_HTML_${placeholders.length}__`;
    placeholders.push({
      placeholder,
      html: sanitizedTag
    });
    return placeholder;
  });

  return {
    value,
    placeholders
  };
}

function restoreAllowedHtml(text, placeholders) {
  let restored = text;
  for (const entry of placeholders) {
    restored = restored.replaceAll(entry.placeholder, entry.html);
  }
  return restored;
}

function preserveMarkdownEscapes(text) {
  const placeholders = [];
  const value = String(text || '').replace(/\\([\\`*_{}\[\]()#+\-.!>~=])/g, (_, escapedChar) => {
    const placeholder = `__MD_ESCAPE_${placeholders.length}__`;
    placeholders.push({
      placeholder,
      html: escapeHtml(escapedChar)
    });
    return placeholder;
  });

  return {
    value,
    placeholders
  };
}

function restoreMarkdownEscapes(text, placeholders) {
  let restored = text;
  for (const entry of placeholders) {
    restored = restored.replaceAll(entry.placeholder, entry.html);
  }
  return restored;
}

function stripHtmlTags(text) {
  let value = String(text || '');

  value = value
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[*_`~]/g, ' ');

  value = value.replace(/<[^>]*>/g, ' ');
  value = value.replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, code) => {
    const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
  }).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[name]);

  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyInlineMarkdown(text) {
  const preserved = preserveAllowedHtml(text);
  const escapedMarkdown = preserveMarkdownEscapes(preserved.value);
  let html = escapeHtml(escapedMarkdown.value);
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => safeMarkdownUrl(url) ? `<img src="${url}" alt="${alt}" loading="lazy" decoding="async">` : alt);
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => safeMarkdownUrl(url) ? `<a href="${url}" target="_blank" rel="noreferrer">${label}</a>` : label);
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = restoreMarkdownEscapes(html, escapedMarkdown.placeholders);
  return restoreAllowedHtml(html, preserved.placeholders);
}

function markdownToHtml(markdown) {
  const normalized = markdown.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return '';

  const lines = normalized.split('\n');
  const html = [];
  let paragraph = [];
  let listItems = [];
  let quoteLines = [];
  let codeLines = [];
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${applyInlineMarkdown(paragraph.join('<br>'))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    html.push(`<ul>${listItems.map(item => `<li>${applyInlineMarkdown(item)}</li>`).join('')}</ul>`);
    listItems = [];
  };

  const flushQuote = () => {
    if (!quoteLines.length) return;
    html.push(`<blockquote>${quoteLines.map(line => `<p>${applyInlineMarkdown(line)}</p>`).join('')}</blockquote>`);
    quoteLines = [];
  };

  const flushCode = () => {
    if (!codeLines.length) return;
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim().startsWith('```')) {
      flushParagraph();
      flushList();
      flushQuote();
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushQuote();
      const level = heading[1].length;
      const headingText = heading[2].trim();
      const headingHtml = applyInlineMarkdown(headingText);
      if (level === 2) {
        const accent = getPreviewAccent(stripHtmlTags(headingText));
        html.push(`<h2 class="terminal-heading-accent" style="color:${accent}">${headingHtml}</h2>`);
      } else {
        html.push(`<h${level}>${headingHtml}</h${level}>`);
      }
      continue;
    }

    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      flushParagraph();
      flushList();
      flushQuote();
      html.push('<hr>');
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      quoteLines.push(quote[1]);
      continue;
    }

    const list = line.match(/^[-*]\s+(.*)$/);
    if (list) {
      flushParagraph();
      flushQuote();
      listItems.push(list[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushQuote();
  flushCode();

  return html.join('');
}

function markdownToParagraphs(markdown) {
  const normalized = markdown.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const html = [];
  let paragraph = [];

  const isStandaloneHtmlBlock = text => /^<(div|section|article|blockquote|hr)\b[^>]*>.*<\/\1>\s*$/i.test(text)
    || /^<hr\s*\/?>$/i.test(text)
    || /^<div\b[^>]*>$/i.test(text)
    || /^<\/div>\s*$/i.test(text);

  const isAsciiArtBlock = blockLines => {
    const nonEmptyLines = blockLines.map(line => line.replace(/\r/g, '')).filter(line => line.trim());
    if (nonEmptyLines.length < 3) return false;

    return nonEmptyLines.every(line => {
      if (/[\u4e00-\u9fff]/.test(line)) return false;
      if (!/\s{2,}/.test(line)) return false;
      return /^[\s\S]+$/.test(line);
    });
  };

  const renderInline = text => {
    const preserved = preserveAllowedHtml(text);
    const escapedMarkdown = preserveMarkdownEscapes(preserved.value);
    return restoreAllowedHtml(
      restoreMarkdownEscapes(
        escapeHtml(escapedMarkdown.value),
        escapedMarkdown.placeholders
      ),
      preserved.placeholders
    );
  };

  const flushParagraph = () => {
    if (!paragraph.length) return;

    if (isAsciiArtBlock(paragraph)) {
      html.push(`<pre class="terminal-plain">${escapeHtml(paragraph.join('\n'))}</pre>`);
      paragraph = [];
      return;
    }

    html.push(`<p>${renderInline(paragraph.join('\n')).replace(/\n/g, '<br>')}</p>`);
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (isStandaloneHtmlBlock(trimmed)) {
      flushParagraph();
      html.push(renderInline(line));
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();

      const level = Math.min(heading[1].length, 6);
      const headingText = heading[2].trim();
      const safeHeadingText = stripHtmlTags(headingText);
      const headingHtml = renderInline(headingText);

      if (level === 2) {
        const accent = getPreviewAccent(safeHeadingText);
        html.push(`<h2 class="terminal-heading-accent" style="color:${accent}">${headingHtml}</h2>`);
      } else {
        html.push(`<h${level}>${headingHtml}</h${level}>`);
      }
      continue;
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      flushParagraph();
      html.push('<hr>');
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return html;
}

function getPreviewAccent(headerText) {
  const prefix = String(headerText || '').trim().slice(0, 2);
  const accentMap = {
    '优先': 'rgb(172, 226, 4)',
    '标准': 'rgb(182, 185, 191)',
    '强化': 'rgb(1, 219, 123)',
    '豪华': 'rgb(67, 160, 232)',
    '卓越': 'rgb(176, 43, 231)',
    '尊享': 'rgb(230, 211, 8)',
    '秘藏': 'rgb(229, 44, 43)'
  };

  return accentMap[prefix] || 'rgb(67, 160, 232)';
}


function safeMarkdownUrl(url) {
  const decoded = url.replace(/&amp;/gi, '&').replace(/&#(?:x([0-9a-f]+)|(\d+));?/gi, (_, hex, decimal) => {
    const point = hex ? parseInt(hex, 16) : Number(decimal);
    return point <= 0x10ffff ? String.fromCodePoint(point) : '';
  }).replace(/&colon;/gi, ':').replace(/[\u0000-\u0020]/g, '');
  return !/^[a-z][a-z0-9+.-]*:/i.test(decoded) || /^https?:/i.test(decoded);
}
export { escapeHtml, stripHtmlTags, markdownToHtml, markdownToParagraphs, getPreviewAccent };
