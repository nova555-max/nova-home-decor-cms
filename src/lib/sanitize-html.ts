/**
 * Minimal HTML sanitizer for admin rich-text preview.
 * Prefer DOMPurify in the browser when available; this is a strict server-safe fallback.
 */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "span",
  "div",
]);

export function sanitizeRichHtml(input: string): string {
  if (!input) return "";

  let html = input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?\s*(iframe|object|embed|link|meta|base|form|svg|math|video|audio)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|xlink:href)\s*=\s*("|')\s*(javascript|data|vbscript):[^"']*\2/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*(javascript|data|vbscript):[^\s>]+/gi, '$1="#"');

  // Drop disallowed tags while keeping their text content.
  html = html.replace(/<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g, (match, tagName: string) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (tag === "a") {
      const hrefMatch = match.match(/\bhref\s*=\s*("|')(.*?)\1/i);
      const href = hrefMatch?.[2]?.trim() ?? "";
      if (!href || /^(javascript|data|vbscript):/i.test(href)) {
        return match.startsWith("</") ? "</a>" : "<a>";
      }
      if (!/^https?:\/\//i.test(href) && !href.startsWith("/") && !href.startsWith("#")) {
        return match.startsWith("</") ? "</a>" : "<a>";
      }
      const safeHref = href.replace(/"/g, "&quot;");
      return match.startsWith("</") ? "</a>" : `<a href="${safeHref}" rel="noopener noreferrer">`;
    }
    return match.startsWith("</") ? `</${tag}>` : `<${tag}>`;
  });

  return html;
}
