/**
 * @author Sanjay Balai
 * @description Plain-text ↔ HTML helpers for the Lexa rich text editor.
 *
 * The Lexa panel keeps plain text as the source of truth (`reportText`,
 * shipped to Gemini) but the rich editor needs HTML. PDF extraction returns
 * plain text and we reverse-encode to <p>/<br>; user formatting in the
 * editor returns HTML and we strip back to plain text on submit.
 *
 * No external sanitizer — we control both ends, the editor only emits
 * Quill's safe subset (b/i/u/s/h1-3/p/br/blockquote/ul/ol/li), and the
 * server treats the value as opaque Gemini input.
 */

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Converts plain text to minimal HTML suitable for Quill:
 * blank-line-separated chunks become <p>, single newlines within a chunk
 * become <br>. Empty input yields ''.
 */
export const plainTextToHtml = (text: string): string => {
  if (!text) {
    return '';
  }
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) {
    return '';
  }
  return paragraphs.map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
};

/**
 * Strips Quill HTML back to plain text. Block elements become newline,
 * <br> becomes newline, residual tags are stripped, HTML entities are
 * decoded via a detached <textarea>.
 */
export const htmlToPlainText = (html: string): string => {
  if (!html) {
    return '';
  }
  let s = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, '\n')
    // Quill's empty paragraph (<p><br></p>) → blank line
    .replace(/<p>\s*<\/p>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '');

  // Decode entities by routing through a textarea (no DOMParser needed).
  if (typeof document !== 'undefined') {
    const ta = document.createElement('textarea');
    ta.innerHTML = s;
    s = ta.value;
  }

  return s.replace(/\n{3,}/g, '\n\n').trim();
};

/**
 * True if a Quill HTML value is effectively empty (covers `<p><br></p>`).
 */
export const isHtmlEmpty = (html: string): boolean => {
  if (!html) {
    return true;
  }
  return htmlToPlainText(html).length === 0;
};
