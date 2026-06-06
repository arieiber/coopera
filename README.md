# Coopera 🐄

**School group fundraising — without the WhatsApp chaos, manual receipts, or cash handling.**

> Built for the **Circles/Garage · 6-week Builder Program** — June 2026  
> 🌐 [coopera-crc.vercel.app](https://coopera-crc.vercel.app) · [Open in Circles Playground](https://circles.gnosis.io/playground?url=https%3A%2F%2Fcoopera-crc.vercel.app%2F)

---

## What is Circles?

[Circles](https://aboutcircles.com) is a mutual credit protocol built on Gnosis Chain. Every registered person issues their own personal token (CRC) and establishes trust relationships with others. Tokens flow through that trust graph — creating a decentralized credit system where value emerges from relationships, not from a central authority.

CRC accumulates automatically over time (~1 CRC/hour per registered person) and can be transferred between wallets using pathfinding through the trust network. These tokens are not speculative — they are designed to circulate within real communities.

🔗 [Learn more about Circles](https://aboutcircles.com) · [Protocol documentation](https://docs.aboutcircles.com)

---

## The Problem

In Argentina (and across Latin America), school parent groups organize frequent fundraisers to buy classroom supplies, fund field trips, or cover shared expenses. The current process is painful:

- The coordinator ("madrina") creates a WhatsApp group and asks for bank transfers
- She receives payment screenshots one by one and manually checks each one
- She chases non-payers with awkward messages
- She handles other people's money with no traceability or transparency
- If questions arise about how funds were spent, there's no clear record

The result: burnout for whoever coordinates, confusion for the group, and one person carrying all the load.

---

## The Solution: Coopera

Coopera is a mini-app for school parent groups that replaces the WhatsApp chaos with a cooperative digital fund. It works as a shared digital wallet where:

- **The madrina** (coordinator) creates the room, invites families, and publishes fundraisers ("vacas") with a goal and deadline
- **Families** see how much is left, who contributed what, and chip in with one tap — no manual transfers, no screenshots
- **Credits (CRC)** accumulate on their own over time: no need to buy or load them — members simply earn them by participating in the Circles network
- **Transparency is automatic**: everyone sees real-time progress

### Circles Primitives Used

| Feature | Circles Primitive |
|---|---|
| Live credit balance in app header | `circles_getTokenBalances` via Circles RPC |
| Contributing to a fundraiser | `avatar.transfer.advanced()` — pathfinding through trust graph |
| Approving a member → on-chain trust | `avatar.trust.add()` |
| Identity without email | Wallet address + `avatar.profile.get()` |

---

## How to Try It

The app runs as a **Circles mini-app**. To test the full flow with real on-chain transactions:

1. Open [Circles Playground](https://circles.gnosis.io/playground?url=https%3A%2F%2Fcoopera-crc.vercel.app%2F) — wallet is injected automatically
2. Or open `coopera-crc.vercel.app` from within the Circles mobile app

**Demo mode:** the app also works in any regular browser without a wallet. Contributions are saved with `is_demo = true` — useful for exploring the flow without a Circles account.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS v4 |
| Backend | Supabase (PostgreSQL + RLS) |
| Protocol | Circles v2 on Gnosis Chain (chainId 100) |
| Mini-app SDK | `@aboutcircles/miniapp-sdk` + `@aboutcircles/sdk` |
| Fallback wallet | Privy (Google/email login for users without Circles) |
| ENS | JustAName + ensdata.net |
| Deploy | Vercel |

---

## Project Structure

```
src/
  circles.ts          — Circles SDK integration (balance, trust, transfer)
  db.ts               — Supabase queries
  screens/
    HomeScreen         — school search, join by invite link
    JoinScreen         — entry with Circles wallet or email
    SalaScreen         — fundraiser list, contribute, CRC balance
    MembersScreen      — approve members, configure payout address
    OnboardingScreen   — 3-step first-time welcome
    SettingsScreen     — dark mode, tech mode (CRC vs créditos)
```

---

## Environment Variables

Create a `.env` file at the root (never commit):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PRIVY_APP_ID=
VITE_JUSTANAME_API_KEY=
VITE_ENS_DOMAIN=
```

---

## Known Limitations & Roadmap

### Coordinator self-contribution
The madrina is often also a parent and wants to contribute to fundraisers she created. When her own wallet is the sala's payout address, Circles cannot transfer tokens from an address to itself.

**Current behavior:** if `from === payout_address`, the contribution is recorded without an on-chain tx. The CRC is already in her wallet — no movement needed.

**Long-term vision — Sala Treasury:** each sala should have its own independent address (a Circles Group or Gnosis Safe) where collective funds accumulate. The madrina would be the admin with withdrawal rights. This cleanly separates "group funds" from "the coordinator's personal wallet" — the correct architecture for any collective treasury.

### Other planned improvements
- [ ] Circles Group as sala treasury (collective funds separate from individual wallets)
- [ ] WhatsApp notifications when a member is approved or a fundraiser completes
- [ ] Personal contribution history per user
- [ ] CRC → USDC.e → bank account off-ramp integration

---

## Built by

**Ariel Eiberman** — Circles/Garage Builder Program, June 2026  
[github.com/arieiber/coopera-crc](https://github.com/arieiber/coopera-crc)
