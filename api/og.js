import { ImageResponse } from '@vercel/og'
import React from 'react'

export const config = { runtime: 'edge' }

export default function handler(req) {
  const { searchParams } = new URL(req.url)
  const sala = searchParams.get('sala') || 'Tu sala'
  const school = searchParams.get('school') || ''

  return new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1a1200',
          padding: '64px',
        },
      },
      // Top accent bar
      React.createElement('div', {
        style: { display: 'flex', width: '80px', height: '6px', backgroundColor: '#F5A623', borderRadius: '3px', marginBottom: '48px' },
      }),
      // Logo row
      React.createElement(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' } },
        React.createElement(
          'div',
          {
            style: {
              width: '52px', height: '52px', borderRadius: '50%',
              backgroundColor: '#F5A623',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px',
            },
          },
          '🐄'
        ),
        React.createElement('span', { style: { color: '#F5A623', fontSize: '30px', fontWeight: 700 } }, 'Coopera')
      ),
      // Invite label
      React.createElement(
        'div',
        { style: { display: 'flex', color: '#9ca3af', fontSize: '24px', marginBottom: '16px' } },
        'Te invitaron a unirte a'
      ),
      // Sala name
      React.createElement(
        'div',
        { style: { display: 'flex', color: '#ffffff', fontSize: '68px', fontWeight: 800, lineHeight: 1.1, marginBottom: '16px' } },
        sala
      ),
      // School name (only if provided)
      school
        ? React.createElement(
            'div',
            { style: { display: 'flex', color: '#F5A623', fontSize: '28px', fontWeight: 500 } },
            school
          )
        : null,
      // Bottom badges
      React.createElement(
        'div',
        { style: { display: 'flex', marginTop: 'auto', gap: '32px' } },
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '18px' } },
          React.createElement('span', { style: { color: '#F5A623', fontSize: '20px' } }, '✓'),
          ' Sin mensajitos'
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '18px' } },
          React.createElement('span', { style: { color: '#F5A623', fontSize: '20px' } }, '✓'),
          ' Sin comprobantes'
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '18px' } },
          React.createElement('span', { style: { color: '#F5A623', fontSize: '20px' } }, '✓'),
          ' Sin confusion'
        )
      )
    ),
    { width: 1200, height: 630 }
  )
}
