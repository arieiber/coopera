import { ImageResponse } from '@vercel/og'
import React from 'react'

export const config = { runtime: 'edge' }

// h() shorthand for React.createElement
const h = (type, props, ...children) => React.createElement(type, props, ...children)

export default function handler(req) {
  const { searchParams } = new URL(req.url)
  const sala = searchParams.get('sala') || 'Tu sala'
  const school = searchParams.get('school') || ''
  const from = searchParams.get('from') || ''

  // Layout inspired by Peanut: big name badge at top, large sala name, school below
  return new ImageResponse(
    h('div', {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5A623',
        padding: '60px 80px',
      },
    },

      // Top: inviter name badge (like Peanut's "ariel" oval)
      from ? h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '32px',
        },
      },
        h('div', {
          style: {
            display: 'flex',
            border: '4px solid #1a1200',
            borderRadius: '60px',
            paddingTop: '10px',
            paddingBottom: '10px',
            paddingLeft: '40px',
            paddingRight: '40px',
            marginBottom: '14px',
          },
        },
          h('span', {
            style: { color: '#1a1200', fontSize: '52px', fontWeight: 800, letterSpacing: '-1px' },
          }, from)
        ),
        h('span', {
          style: { color: '#1a0e00', fontSize: '26px', fontWeight: 500, opacity: 0.75 },
        }, 'te invita a unirte a')
      ) : h('div', {
        style: {
          display: 'flex',
          marginBottom: '32px',
        },
      },
        h('span', {
          style: { color: '#1a0e00', fontSize: '28px', fontWeight: 500, opacity: 0.75 },
        }, 'Te invitan a unirte a')
      ),

      // Center: sala name (big)
      h('div', {
        style: {
          display: 'flex',
          color: '#1a1200',
          fontSize: sala.length > 14 ? '72px' : '96px',
          fontWeight: 900,
          lineHeight: 1,
          textAlign: 'center',
          letterSpacing: '-2px',
          marginBottom: '20px',
        },
      }, sala),

      // School name
      school ? h('div', {
        style: {
          display: 'flex',
          backgroundColor: '#1a1200',
          borderRadius: '40px',
          paddingTop: '8px',
          paddingBottom: '8px',
          paddingLeft: '28px',
          paddingRight: '28px',
          marginBottom: '0px',
        },
      },
        h('span', {
          style: { color: '#F5A623', fontSize: '26px', fontWeight: 600 },
        }, school)
      ) : null,

      // Bottom: Coopera logo
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: 'auto',
          opacity: 0.6,
        },
      },
        h('span', { style: { fontSize: '28px' } }, '🐄'),
        h('span', { style: { color: '#1a1200', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' } }, 'coopera-crc.vercel.app')
      )
    ),
    { width: 1200, height: 630 }
  )
}
