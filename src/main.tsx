import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import { PrefsProvider } from './prefs'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrefsProvider>
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID ?? 'cmq097vfq003l0cjtmpninjj6'}
      config={{
        loginMethods: ['email', 'google'],
        appearance: {
          theme: 'light',
          accentColor: '#F5A623',
          logo: 'https://koedxiyqqwcfobfuasav.supabase.co/storage/v1/object/public/assets/logo-privy.png',
          landingHeader: 'Coopera',
          loginMessage: 'Creá tu wallet para usar como cuenta de cobro',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <App />
    </PrivyProvider>
    </PrefsProvider>
  </StrictMode>,
)
