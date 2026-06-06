/**
 * /api/invite?t=JWT
 *
 * JWT payload (signed HS256): { tok, s, sc, f }
 *   tok = invite_token (UUID)
 *   s   = sala name
 *   sc  = school name
 *   f   = from (madrina display name)
 *
 * Also supports legacy plaintext params for backwards compatibility:
 *   ?token=UUID&sala=NAME&school=NAME&from=NAME
 *
 * For WhatsApp/social crawlers: serves HTML with dynamic OG tags
 * For humans: redirects to /?invite=TOKEN
 */
import { jwtVerify } from 'jose'

export const config = { runtime: 'edge' }

function getSecret() {
  const raw = process.env.INVITE_JWT_SECRET ?? 'dev-secret-change-me'
  return new TextEncoder().encode(raw)
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url)

  let token = '', sala = 'una sala', school = '', from = ''

  const jwtParam = searchParams.get('t')
  if (jwtParam) {
    try {
      const { payload } = await jwtVerify(jwtParam, getSecret())
      token  = payload.tok ?? ''
      sala   = payload.s   ?? 'una sala'
      school = payload.sc  ?? ''
      from   = payload.f   ?? ''
    } catch {
      // Invalid/expired JWT — still redirect, just without metadata
      token = jwtParam // fallback: treat as raw token
    }
  } else {
    // Legacy plaintext params (backwards compat)
    token  = searchParams.get('token') ?? ''
    sala   = searchParams.get('sala')  ?? 'una sala'
    school = searchParams.get('school') ?? ''
    from   = searchParams.get('from')  ?? ''
  }

  const ua = req.headers.get('user-agent') ?? ''
  const isBot = /whatsapp|telegram|slack|twitter|facebook|linkedIn|bot|crawler|spider|preview/i.test(ua)

  const appUrl = `https://coopera-crc.vercel.app/?invite=${token}`
  const ogImage = `https://coopera-crc.vercel.app/api/og?sala=${encodeURIComponent(sala)}&school=${encodeURIComponent(school)}&from=${encodeURIComponent(from)}`
  const title = from ? `${from} te invita a ${sala}` : `Te invitaron a ${sala}`
  const description = school
    ? `Unite a la sala de ${school} en Coopera — colectas escolares sin drama, sin mensajitos, sin comprobantes.`
    : 'Coopera — colectas escolares sin drama, sin WhatsApp, sin comprobantes.'

  if (!isBot) {
    return Response.redirect(appUrl, 302)
  }

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
