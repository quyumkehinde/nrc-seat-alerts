/** Escape untrusted text for interpolation into HTML. */
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

const STYLES = `
:root{color-scheme:light dark;
 --bg:#fafafa;--surface:#fff;--text:#0a0a0a;--muted:#6f6f6f;--faint:#a1a1a1;
 --line:#e6e6e6;--btn-bg:#0a0a0a;--btn-fg:#fff}
@media(prefers-color-scheme:dark){:root{
 --bg:#0a0a0a;--surface:#111;--text:#f5f5f5;--muted:#9a9a9a;--faint:#6f6f6f;
 --line:#242424;--btn-bg:#fafafa;--btn-fg:#0a0a0a}}
*{box-sizing:border-box}
body{margin:0;padding:32px 20px;min-height:100svh;display:grid;place-items:center;
 background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;
 font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.card{width:100%;max-width:400px;background:var(--surface);border:1px solid var(--line);
 border-radius:14px;padding:28px}
.eyebrow{font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;
 color:var(--faint)}
h1{margin:14px 0 6px;font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.25}
p{margin:0;color:var(--muted);font-size:14px}
a.btn{display:block;margin-top:22px;padding:10px;text-align:center;text-decoration:none;
 background:var(--btn-bg);color:var(--btn-fg);border-radius:10px;font-size:14px;font-weight:550}
a.quiet{display:block;margin-top:14px;color:var(--faint);font-size:12px;text-decoration:none}
a.quiet:hover{color:var(--muted)}`;

/** Opened straight from an email client, so it carries its own styles. */
export function resultPage({
  title,
  message,
  unsubscribeToken,
  status = 200,
}: {
  title: string;
  message: string;
  unsubscribeToken?: string;
  status?: number;
}): Response {
  const unsubscribe = unsubscribeToken
    ? `<a class="quiet" href="/api/unsubscribe?token=${encodeURIComponent(
        unsubscribeToken,
      )}">Cancel this alert</a>`
    : "";

  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title><style>${STYLES}</style></head>
<body><div class="card">
<div class="eyebrow">Lagos &#8646; Ibadan</div>
<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>
<a class="btn" href="/">Set up another alert</a>
${unsubscribe}
</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
