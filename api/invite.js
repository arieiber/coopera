/**
 * /api/invite?token=XXX&sala=NAME&school=SCHOOL
 *
 * For WhatsApp/social crawlers: serves HTML with dynamic OG tags
 * For humans: redirects to the SPA with ?invite=TOKEN
 *
 * WhatsApp, Telegram, iMessage, Slack all send a bot UA to scrape OG tags
 * before showing the link preview. This edge function serves them the right meta.
 */
export const config = { runtime: 'edge' }

export default function handler(req) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token') ?? ''
  const sala = searchParams.get('sala') ?? 'una sala'
  const school = searchParams.get('school') ?? ''
  const from = searchParams.get('from') ?? ''

  const ua = req.headers.get('user-agent') ?? ''
  const isBot = /whatsapp|telegram|slack|twitter|facebook|linkedIn|bot|crawler|spider|preview/i.test(ua)

  const appUrl = `https://coopera-crc.vercel.app/?invite=${token}`
  const ogImage = `https://coopera-crc.vercel.app/api/og?sala=${encodeURIComponent(sala)}&school=${encodeURIComponent(school)}&from=${encodeURIComponent(from)}`
  const title = from ? `${from} te invita a ${sala}` : `Te invitaron a ${sala}`
  const description = school
    ? `Unite a la sala de ${school} en Coopera — colectas escolares sin drama, sin mensajitos, sin comprobantes.`
    : 'Coopera — colectas escolares sin drama, sin WhatsApp, sin comprobantes.'

  if (!isBot) {
    // Human: redirect straight to the SPA
    return Response.redirect(appUrl, 302)
  }

  // Bot/crawler: serve a minimal HTML page with the right OG tags
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="author" content="Coopera" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Coopera" />
  <meta property="og:locale" content="es_AR" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${title}" />
  <meta property="og:url" content="${appUrl}" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@coopera_app" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImage}" />
  <meta name="twitter:image:alt" content="${title}" />

  <meta http-equiv="refresh" content="0;url=${appUrl}" />
</head>
<body>
  <p>Redirigiendo a <a href="${appUrl}">Coopera</a>...</p>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
