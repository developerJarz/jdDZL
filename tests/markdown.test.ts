import test from "node:test";
import assert from "node:assert/strict";
import { markdownToHtml } from "../src/lib/markdown.ts";

test("markdown escapes raw HTML and script URLs", () => {
  const html = markdownToHtml('<script>alert(1)</script>\n[click](javascript:alert(1)) ![x](javascript:1) <img src=x onerror=alert(1)>');
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(!html.includes('href="javascript'));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("markdown renders headings, lists, emphasis and safe links", () => {
  const html = markdownToHtml("# Title\n\n- **one**\n- *two*\n\n1. a\n2. b\n\n[Shop](/offer) [Ext](https://example.com)");
  assert.ok(html.includes("<h2>Title</h2>"));
  assert.ok(html.includes("<ul><li><strong>one</strong></li><li><em>two</em></li></ul>"));
  assert.ok(html.includes("<ol><li>a</li><li>b</li></ol>"));
  assert.ok(html.includes('<a href="/offer">Shop</a>'));
  assert.ok(html.includes('href="https://example.com" target="_blank" rel="noopener noreferrer"'));
});
