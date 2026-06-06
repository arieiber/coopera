/**
 * Client-side JWT signing for invite links.
 *
 * The VITE_INVITE_SECRET is in the JS bundle — that's intentional.
 * The JWT here isn't about authentication (the invite_token UUID handles that).
 * It's about making the URL opaque so WhatsApp notifications don't leak
 * sala/school/name in plain text.
 *
 * Payload: { tok, s, sc, f } (short keys = shorter JWT)
 *   tok = invite_token
 *   s   = sala name
 *   sc  = school name
 *   f   = from (madrina display name)
 */

import { SignJWT } from 'jose'

function getSecret(): Uint8Array {
  const raw = import.meta.env.VITE_INVITE_SECRET ?? 'dev-secret-change-me'
  return new TextEncoder().encode(raw)
}

export async function signInvite(params: {
  token: string
  sala: string
  school: string
  from: string
}): Promise<string> {
  return new SignJWT({ tok: params.token, s: params.sala, sc: params.school, f: params.from })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(getSecret())
}
