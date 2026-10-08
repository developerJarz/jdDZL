// Minimal, safe Markdown → HTML for content written in the dashboard (pages, blog posts,
// landing-page text). All input is HTML-escaped first; only the syntax below produces tags,
// and link/image URLs are limited to site paths, uploaded media, https, mailto and tel.

const escapeHtml = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const safeUrl = (url: string, image = false) => {
  const u = url.trim();
  if (/^\/(?!\/)/.test(u) || /^https:\/\//i.test(u)) return u;
  if (!image && /^(mailto:|tel:)/i.test(u)) return u;
  return null;
};

function inline(text: string) {
  let out = escapeHtml(text);
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt: string, src: string) => {
    const url = safeUrl(src.replaceAll("&amp;", "&"), true);
    return url ? `<img src="${escapeHtml(url)}" alt="${alt}" loading="lazy" />` : m;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label: string, href: string) => {
    const url = safeUrl(href.replaceAll("&amp;", "&"));
    if (!url) return label;
    const external = /^https:\/\//i.test(url);
    return `<a href="${escapeHtml(url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  });
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return out;
}

export function markdownToHtml(source: string) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${paragraph.map(inline).join("<br />")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) html.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.type}>`);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length + 1; // # → h2; the page title is the h1
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushParagraph();
      flushList();
      html.push("<hr />");
    } else if (line.startsWith(">")) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
    } else if (bullet || ordered) {
      flushParagraph();
      const type = bullet ? "ul" : "ol";
      if (list && list.type !== type) flushList();
      list ??= { type, items: [] };
      list.items.push((bullet ?? ordered)![1]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return html.join("\n");
}
