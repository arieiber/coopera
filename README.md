# Coopera 🐄

**Colectas escolares sin drama, sin grupos de WhatsApp, sin plata en efectivo.**

> Proyecto presentado en el **ETHBucharest 2025 Hackathon** — track de Circles Protocol  
> 🌐 [coopera-crc.vercel.app](https://coopera-crc.vercel.app) · [Abrir en Circles Playground](https://circles.gnosis.io/playground?url=https%3A%2F%2Fcoopera-crc.vercel.app%2F)

---

## El contexto: ¿qué es Circles?

[Circles](https://aboutcircles.com) es un protocolo de dinero mutual construido sobre Gnosis Chain. Cada persona registrada emite su propio token personal (CRC) y establece relaciones de confianza con otras personas. Los tokens circulan a través de esa red de confianza — lo que crea un sistema de crédito descentralizado donde el valor emerge de las relaciones, no de una autoridad central.

Los CRC se acumulan automáticamente con el tiempo (~1 CRC/hora por persona registrada) y se pueden transferir entre wallets usando el grafo de confianza (pathfinding). No son especulativos: están diseñados para circular dentro de comunidades reales.

🔗 [Leer más sobre Circles](https://aboutcircles.com) · [Documentación del protocolo](https://docs.aboutcircles.com)

---

## El problema

En Argentina, los grupos de padres de escuelas primarias y jardines organizan colectas frecuentes para comprar materiales, financiar excursiones o cubrir gastos de la sala. El proceso actual es caótico:

- La "madrina" (quien coordina) arma un grupo de WhatsApp y pide transferencias
- Recibe comprobantes por chat, los chequea manualmente uno por uno
- Persigue a quienes no pagaron con mensajes incómodos
- Maneja plata de otros sin trazabilidad ni transparencia
- Si surgen dudas sobre cómo se usaron los fondos, no hay registro claro

El resultado: desgaste para quien coordina, confusión para el grupo, y muchas veces la misma persona cargando con todo.

---

## La solución: Coopera

Coopera es una mini-app para salas escolares que reemplaza el caos del WhatsApp con un fondo digital cooperativo. Funciona como una caja común digital donde:

- **La madrina** crea la sala, invita a las familias y publica colectas ("vacas") con una meta y fecha límite
- **Las familias** ven cuánto falta, cuánto puso cada uno, y contribuyen con un toque — sin transferencias manuales ni comprobantes
- **Los créditos (CRC)** se acumulan solos con el tiempo: no hay que comprarlos ni cargarlos, simplemente se tienen por participar en la red
- **La transparencia** es automática: todos ven el progreso en tiempo real

### Primitivas de Circles que usa Coopera

| Feature | Primitiva Circles |
|---|---|
| Balance de créditos en tiempo real | `circles_getTokenBalances` vía Circles RPC |
| Contribuir a una colecta | `avatar.transfer.advanced()` — pathfinding por grafo de confianza |
| Aprobar un miembro → trust on-chain | `avatar.trust.add()` |
| Identidad sin email | Wallet address + `avatar.profile.get()` |

---

## Cómo probar

La app corre como **mini-app dentro del ecosistema de Circles**. Para probar el flujo completo con transacciones reales:

1. Abrí [Circles Playground](https://circles.gnosis.io/playground?url=https%3A%2F%2Fcoopera-crc.vercel.app%2F) — tiene una wallet de Circles inyectada
2. O instalá la app de Circles en tu celular y abrí `coopera-crc.vercel.app` desde ahí

**Modo demostración:** la app también funciona en cualquier browser sin wallet. Las contribuciones se guardan con `is_demo = true` — útil para explorar el flujo sin cuenta de Circles.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS v4 |
| Backend | Supabase (PostgreSQL + RLS) |
| Protocolo | Circles v2 en Gnosis Chain (chainId 100) |
| Mini-app SDK | `@aboutcircles/miniapp-sdk` + `@aboutcircles/sdk` |
| Wallet alternativa | Privy (login con Google/email para usuarios sin Circles) |
| ENS | JustAName + ensdata.net |
| Deploy | Vercel |

---

## Estructura del proyecto

```
src/
  circles.ts          — integración con Circles SDK (balance, trust, transfer)
  db.ts               — queries a Supabase
  screens/
    HomeScreen         — buscar escuela, unirse por invitación
    JoinScreen         — ingreso con wallet Circles o email
    SalaScreen         — lista de vacas, contribuir, balance CRC
    MembersScreen      — aprobar miembros, configurar cuenta de cobro
    OnboardingScreen   — 3 pasos de bienvenida
    SettingsScreen     — modo oscuro, modo técnico (CRC vs créditos)
```

---

## Variables de entorno

Crear un archivo `.env` en la raíz (no commitear):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PRIVY_APP_ID=
VITE_JUSTANAME_API_KEY=
VITE_ENS_DOMAIN=
```

---

## Desarrollado por

**Ariel Eiberman** — ETHBucharest 2025  
[github.com/arieiber/coopera-crc](https://github.com/arieiber/coopera-crc)
