import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

export default function handler(req) {
  const { searchParams } = new URL(req.url)
  const sala = searchParams.get('sala') || 'Tu sala'
  const school = searchParams.get('school') || ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1a1200',
          padding: '64px',
        }}
      >
        {/* Top accent bar */}
        <div style={{ display: 'flex', width: '80px', height: '6px', backgroundColor: '#F5A623', borderRadius: '3px', marginBottom: '48px' }} />

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            backgroundColor: '#F5A623',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px',
          }}>
            🐄
          </div>
          <span style={{ color: '#F5A623', fontSize: '30px', fontWeight: 700 }}>
            Coopera
          </span>
        </div>

        {/* Invite label */}
        <div style={{ display: 'flex', color: '#9ca3af', fontSize: '24px', marginBottom: '16px' }}>
          Te invitaron a unirte a
        </div>

        {/* Sala name */}
        <div style={{ display: 'flex', color: '#ffffff', fontSize: '72px', fontWeight: 800, lineHeight: 1, marginBottom: '16px' }}>
          {sala}
        </div>

        {/* School name */}
        {school ? (
          <div style={{ display: 'flex', color: '#F5A623', fontSize: '28px', fontWeight: 500 }}>
            {school}
          </div>
        ) : null}

        {/* Bottom badges */}
        <div style={{ display: 'flex', marginTop: 'auto', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '18px' }}>
            <span style={{ color: '#F5A623', fontSize: '20px' }}>✓</span>
            Sin mensajitos
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '18px' }}>
            <span style={{ color: '#F5A623', fontSize: '20px' }}>✓</span>
            Sin comprobantes
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '18px' }}>
            <span style={{ color: '#F5A623', fontSize: '20px' }}>✓</span>
            Sin confusión
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
