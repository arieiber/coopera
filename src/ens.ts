export function isEns(val: string) {
  const v = val.trim().toLowerCase()
  return v.endsWith('.eth') || v.endsWith('.id')
}

// Resolution via JustAName public API — fast, no API key needed
export async function resolveEns(name: string): Promise<string | null> {
  const normalized = name.trim().toLowerCase()

  const fetchPromise = fetch(
    `https://api.justaname.id/ens/v2/resolve?name=${encodeURIComponent(normalized)}`,
    { headers: { 'Content-Type': 'application/json' } }
  )
    .then(async r => {
      if (!r.ok) return null
      const data = await r.json()
      // Response: { address: '0x...', ... }
      return (data?.address as string) ?? null
    })
    .catch(() => null)

  // Fallback: ensdata.net
  const fallbackPromise = fetch(`https://api.ensdata.net/${encodeURIComponent(normalized)}`)
    .then(async r => {
      if (!r.ok) return null
      const data = await r.json()
      return (data?.address as string) ?? null
    })
    .catch(() => null)

  // Race both, 5s timeout
  const timeout = new Promise<null>(r => setTimeout(() => r(null), 5000))

  // First non-null result wins
  return new Promise(resolve => {
    let done = false
    const finish = (val: string | null) => {
      if (!done && val) { done = true; resolve(val) }
    }
    fetchPromise.then(finish)
    fallbackPromise.then(finish)
    timeout.then(() => { if (!done) { done = true; resolve(null) } })
  })
}

// Create a subname under coopera's domain via JustAName API
// Requires VITE_JUSTANAME_API_KEY in .env
export async function claimSubname(
  username: string,   // e.g. "sala-roja-jardin-rayito"
  address: string,    // madrina's wallet address
  ensDomain: string,  // e.g. "coopera.eth" or "justan.id"
): Promise<boolean> {
  const apiKey = import.meta.env.VITE_JUSTANAME_API_KEY
  if (!apiKey) return false

  const res = await fetch('https://api.justaname.id/ens/v1/subname/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      username,
      ensDomain,
      chainId: 1,
      addresses: [{ coinType: 60, address }],
      overrideSignatureCheck: true,
    }),
  })

  return res.ok
}

// Generate a URL-friendly subname from sala name + school
export function generateSubname(salaName: string, schoolName: string): string {
  const clean = (s: string) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  return `${clean(salaName)}-${clean(schoolName)}`.slice(0, 62) // ENS label max 63 chars
}
