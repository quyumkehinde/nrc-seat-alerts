/** Escape untrusted text for interpolation into HTML. */
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  )
}

const STYLES = `
:root{color-scheme:light dark}
body{font:16px/1.6 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
 display:grid;place-items:center;min-height:100svh;margin:0;padding:24px;
 background:#f6fbf7;color:#14261a}
.card{background:#fff;border:1px solid #d7e5db;border-radius:14px;padding:32px;
 max-width:420px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.04)}
h1{font-size:21px;margin:0 0 8px;letter-spacing:-.02em}
p{color:#3d5347;margin:0}
a.btn{display:inline-block;margin-top:22px;background:#0b6b34;color:#fff;
 text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600;font-size:15px}
a.quiet{display:block;margin-top:16px;color:#7c8b81;font-size:13px}
@media(prefers-color-scheme:dark){
 body{background:#0d1510;color:#e8f2ea}
 .card{background:#141f18;border-color:#24352a}
 p{color:#a9bdb0}}`

/** Opened straight from an email client, so it carries its own styles. */
export function resultPage(
  { title, message, unsubscribeToken, status = 200 }: {
    title: string
    message: string
    unsubscribeToken?: string
    status?: number
  }
): Response {
  const unsubscribe = unsubscribeToken
    ? `<a class="quiet" href="/api/unsubscribe?token=${encodeURIComponent(
        unsubscribeToken
      )}">Cancel this alert</a>`
    : ''

  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title><style>${STYLES}</style></head>
<body><div class="card">
<div style="font-size:28px">&#128649;</div>
<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>
<a class="btn" href="/">Set up another alert</a>
${unsubscribe}
</div></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } }
  )
}
