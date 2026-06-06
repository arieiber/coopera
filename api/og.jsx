import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

export default function handler(req) {
  const { searchParams } = new URL(req.url)
  const sala = searchParams.get('sala') || 'Tu sala'
  const school = searchParams.get('school') || 'Coopera'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1f00 60%, #1a1a1a 100%)',
          padding: '60px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Background decorative circles */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,166,35,0.15) 0%, transparent 70%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '30%',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Logo + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: '#F5A623',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px',
          }}>🐄</div>
          <span style={{ color: '#F5A623', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Coopera
          </span>
        </div>

        {/* Main message */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          <div style={{ color: '#9ca3af', fontSize: '22px', fontWeight: 400 }}>
            Te invitaron a unirte a
          </div>
          <div style={{
            color: '#ffffff', fontSize: '64px', fontWeight: 800,
            lineHeight: 1.1, letterSpacing: '-2px',
          }}>
            {sala}
          </div>
          <div style={{ color: '#F5A623', fontSize: '26px', fontWeight: 500, marginTop: '4px' }}>
            {school}
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '40px' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {['Sin mensajitos', 'Sin comprobantes', 'Sin confusión'].map((item) => (
              <div key={item} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                color: '#6b7280', fontSize: '16px',
              }}>
                <span style={{ color: '#F5A623' }}>✓</span>
                {item}
              </div>
            ))}
          </div>
          <div style={{
            background: '#F5A623', color: '#1a1a1a',
            padding: '12px 28px', borderRadius: '100px',
            fontSize: '18px', fontWeight: 700,
          }}>
            Unirme →
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
