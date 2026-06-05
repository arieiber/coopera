# Coopera — Contexto del proyecto para Claude

## ¿Qué es Coopera?

Mini-app para grupos de padres de jardines/escuelas argentinas ("salas") que organiza colectas colectivas ("vacas") usando créditos CRC del protocolo Circles. La "madrina" de la sala crea colectas, aprueba miembros, y cobra los fondos cuando se alcanza la meta.

**Concepto clave:** todo el lenguaje de la UI es 100% plain Spanish sin jerga crypto. Los usuarios no saben que están usando blockchain. "CRC" → "créditos", "wallet" → "cuenta digital", etc.

## Stack técnico

- **Frontend:** Vite + React + TypeScript + Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + RLS + Storage)
- **Protocolo:** Circles (Gnosis Chain, chainId 100)
- **Wallet:** Privy (`@privy-io/react-auth`) para crear cuentas con Google/email
- **SDK:** `@aboutcircles/miniapp-sdk` + `@aboutcircles/sdk`
- **ENS:** JustAName REST API + ensdata.net (race con 5s timeout)

## Archivos clave

```
src/
  main.tsx          — PrivyProvider + PrefsProvider wrapping
  App.tsx           — routing principal, session restore, wallet subscribe, crcBalance
  circles.ts        — subscribeWallet(), sendCrc(), getCrcBalance()
  db.ts             — todas las queries Supabase
  supabase.ts       — tipos: School, Sala, Member, Vaca, Contribution
  session.ts        — Session interface + localStorage helpers
  ens.ts            — resolveEns(), isEns(), generateSubname()
  prefs.tsx         — PrefsContext: darkMode + techMode, useTerm() hook

  screens/
    HomeScreen.tsx      — búsqueda de escuela, invite token, crear sala
    JoinScreen.tsx      — join por token, re-entry flow por email
    PendingScreen.tsx   — espera aprobación de madrina
    SalaScreen.tsx      — lista de vacas, detalle, nuevo vaca, contribuir
    MembersScreen.tsx   — aprobación miembros, cuenta de cobro, ENS
    OnboardingScreen.tsx — 3 pasos para primera visita
    SettingsScreen.tsx  — dark mode toggle + modo web3 toggle

  components/
    WalletCreator.tsx   — crea wallet Privy con Google/email

public/
  logo.png            — 150x150, naranja #F5A623
  logo-privy.png      — 180x90, también en Supabase Storage
  favicon.ico

.env                  — NO commitear (está en .gitignore)
```

## Variables de entorno (.env)

```
VITE_SUPABASE_URL=https://koedxiyqqwcfobfuasav.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_PRIVY_APP_ID=cmq097vfq003l0cjtmpninjj6
VITE_JUSTANAME_API_KEY=WJPxPI1hALBfRKRg374SDiywBEuvIkSE
VITE_ENS_DOMAIN=justan.id
```

## Supabase

**Proyecto:** koedxiyqqwcfobfuasav

**Tablas:**
- `schools` — id, name, code
- `salas` — id, school_id, name, grade, invite_token, payout_address, payout_ens
- `members` — id, sala_id, email, display_name, role ('madrina'|'parent'), status ('pending'|'approved'|'rejected'), wallet_address
- `vacas` — id, sala_id, title, description, target_crc, collected_crc, deadline, status ('active'|'completed'|'closed'), overflow_policy ('cap'|'refund'|'rollover'), per_family_crc (deprecated — se calcula dinámico)
- `contributions` — id, vaca_id, member_id, member_email, display_name, amount_crc

**Storage:** bucket `assets` (público) con `logo-privy.png`

**RLS:** SELECT/INSERT/UPDATE/DELETE habilitado en todas las tablas con `USING (true)`.

## Flujo de usuario

```
Primera visita → Onboarding (3 pasos) → HomeScreen
HomeScreen → buscar escuela → ver salas → unirse con token
JoinScreen → madrina crea sala (isCreator=true, auto-madrina)
           → padre se une (status: pending → aprobación madrina)
SalaScreen → ver vacas → contribuir → ver progreso
MembersScreen → madrina aprueba/rechaza → configura cuenta de cobro
```

**Re-entry:** si se pierde la sesión localStorage, el usuario vuelve a poner su email en JoinScreen → `getMember()` detecta que ya existe → botón "Volver a entrar →" sin pasar por pending.

## Roles y seguridad

- **Madrina:** solo el creador de la sala obtiene este rol (prop `isCreator` en JoinScreen). Nunca se puede auto-asignar via formulario.
- **Wallet address:** guardada en Supabase, solo visible para la madrina en MembersScreen. No se muestra en UI pública.

## Paleta de colores

- **Brand:** `#F5A623` (naranja) — mapeado sobre `violet-*` en Tailwind v4 via `@theme` en `index.css`
- **Fondo:** `#f9fafb` (light) / `#0f1117` (dark)
- **Botones naranja:** usan `text-gray-900` (no blanco — el naranja es muy claro)
- Privy `accentColor: '#F5A623'`

## Dark mode / Tech mode

**PrefsContext** (`src/prefs.tsx`):
- `darkMode`: toggle clase `.dark` en `document.documentElement`. CSS variables en `index.css` hacen el resto — no hay `dark:` clases en componentes.
- `techMode`: cuando ON, `useTerm()` convierte "créditos"→"CRC", "cuenta digital"→"wallet". Usado en SalaScreen y MembersScreen.
- Ambos persisten en `localStorage`.
- Dark mode respeta `prefers-color-scheme` en la primera visita.

## Circles / CRC

- **`isMiniappMode()`:** detecta si corre dentro de Circles Garage. Si no, modo demo (las contribuciones se guardan en DB pero no hay tx real).
- **`subscribeWallet(cb)`:** callback cuando cambia la wallet inyectada por Garage.
- **`getCrcBalance(address)`:** usa `@aboutcircles/sdk` read-only → `sdk.getAvatar()` → `avatar.balances.getTotal()` → divide por 1e18.
- **`sendCrc(to, amount)`:** `sendTransactions()` vía miniapp-sdk → Hub `transferThrough`.
- Balance se muestra en header de SalaScreen: "1.234 créd." (o "CRC" en tech mode).

## Privy

- AppID: `cmq097vfq003l0cjtmpninjj6`
- Login methods: email + Google
- Crea embedded wallet automáticamente para usuarios nuevos
- Logo: URL en Supabase Storage (no puede ser emoji ni path local)
- `WalletCreator.tsx` detecta `walletClientType === 'privy'` y llama `onAddressReady(address)`

## ENS

- **Resolución:** race entre JustAName API y ensdata.net, timeout 5s, devuelve el primero que responde.
- **JustAName subdominios:** requiere ENS domain propio para el workspace — mostrado como "Próximamente" en MembersScreen. El subdominio preview usa `generateSubname()`.
- `isEns(val)`: detecta `.eth` o `.id` endings.

## Onboarding

3 pasos — solo se muestra en primera visita (no si hay sesión o `?invite=` en URL):
1. 🏫 Qué es Coopera
2. 🪙 Los créditos son plata real (con explicación honesta en cuadro violeta)
3. ✅ Cómo funciona (4 bullets)

`localStorage` key: `coopera_onboarded`

## Decisiones de diseño importantes

- **Per-family CRC:** calculado dinámicamente en UI (`Math.ceil(target / memberCount)`) — el campo `per_family_crc` en DB está deprecado porque si se une una nueva familia el número cambia.
- **Delete vaca:** solo disponible si `collected_crc === 0`. Si ya hay aportes, solo se puede cerrar (status: 'closed').
- **isComplete logic:** `status === 'completed' || (status !== 'closed' && collected_crc >= target_crc)` — maneja vacas viejas con `status: null`.
- **`npm install` flags:** Privy requiere `--legacy-peer-deps`.

## Pendiente / Roadmap

- [ ] Deploy en Vercel (necesario para hackathon — URL pública)
- [ ] `sendCrc()` real: verificar que funciona en Garage con wallet real
- [ ] Vouch/trust entre familias de la sala via Circles SDK
- [ ] WhatsApp notifications via Volt para aprobación de miembros
- [ ] coopera.eth o coopera.school ENS domain
- [ ] Historial de contribuciones personales ("¿qué contribuí yo?")
- [ ] Balance display para cada miembro en la lista

## Testing en Garage (sin deploy)

```bash
npm run dev          # Terminal 1
npx ngrok http 5173  # Terminal 2 → pegar URL en Garage
```

La URL de ngrok cambia cada vez que se reinicia. Para URL fija: deployar en Vercel.

## Datos de prueba

- Escuela: buscá "test" o cualquier escuela creada
- Madrina de prueba: ariel.eiberman+madrina@gmail.com → Sala Naranja
- Wallet madrina (Privy): `0x750Ec5D9CC4EAD28165233Af36F6b1425777FDF5`
