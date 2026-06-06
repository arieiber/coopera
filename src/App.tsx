import { useState, useEffect } from 'react'
import { subscribeWallet, getCrcBalance, getCirclesProfile, trustMember } from './circles'
import { identifyWallet, track } from './analytics'
import { getSession, saveSession, clearSession } from './session'
import type { Session } from './session'
import { getSalasBySchool, createSala as dbCreateSala, getMember, updateMemberWallet, getMembers } from './db'
import { signInvite } from './lib/inviteJwt'
import { supabase } from './supabase'
import type { School, Sala } from './supabase'
import { HomeScreen } from './screens/HomeScreen'
import { JoinScreen } from './screens/JoinScreen'
import { PendingScreen } from './screens/PendingScreen'
import { SalaScreen } from './screens/SalaScreen'
import { MembersScreen } from './screens/MembersScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { AdminScreen } from './screens/AdminScreen'
import { AdminLogin } from './components/AdminLogin'

type View = 'home' | 'join' | 'pending' | 'sala' | 'members' | 'create-sala' | 'settings'

const ONBOARDING_KEY = 'coopera_onboarded'
function hasOnboarded() { return !!localStorage.getItem(ONBOARDING_KEY) }
function markOnboarded() { localStorage.setItem(ONBOARDING_KEY, '1') }

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const hasInvite = params.has('invite')
  const [adminVerified, setAdminVerified] = useState(false)

  // Master admin panel — ?admin in URL, gated by wallet signature (SIWE)
  if (params.has('admin')) {
    if (adminVerified) {
      return <AdminScreen onExit={() => { window.history.replaceState({}, '', '/'); window.location.reload() }} />
    }
    return <AdminLogin onVerified={() => setAdminVerified(true)} />
  }
  const [onboarded, setOnboarded] = useState(() => hasOnboarded() || !!getSession() || hasInvite)
  const [session, setSession] = useState<Session | null>(getSession)
  const [isCreator, setIsCreator] = useState(false)
  const [pendingSala, setPendingSala] = useState<Sala | null>(null)
  const [activeSala, setActiveSala] = useState<Sala | null>(null)
  const [activeSchool, setActiveSchool] = useState<School | null>(null)
  const [view, setView] = useState<View>('home')
  const [wallet, setWallet] = useState<string | null>(null)
  const [crcBalance, setCrcBalance] = useState<number | null>(null)
  const [circlesName, setCirclesName] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeWallet(addr => {
      setWallet(addr)
      if (addr) {
        getCrcBalance(addr).then(setCrcBalance)
        getCirclesProfile(addr).then(p => setCirclesName(p?.name ?? null))
        identifyWallet(addr)
        // Auto-link Circles wallet to existing email-based account
        const sess = getSession()
        if (sess) {
          getMember(sess.salaId, sess.email).then(async member => {
            if (member && !member.wallet_address) {
              await updateMemberWallet(member.id, addr).catch(console.error)
              // If member is already approved, trigger trust from madrina → member
              // so CRC can flow through the Circles trust graph
              if (member.status === 'approved') {
                getMembers(sess.salaId).then(allMembers => {
                  const madrina = allMembers.find(m => m.role === 'madrina' && m.wallet_address)
                  if (madrina?.wallet_address) {
                    trustMember(madrina.wallet_address, addr).catch(console.error)
                  }
                })
              }
            }
          })
        }
      } else {
        setCrcBalance(null)
        setCirclesName(null)
      }
    })
    return unsub
  }, [])

  // On load, if session exists go straight to sala (and load its school)
  useEffect(() => {
    const sess = getSession()
    if (!sess) return
    setSession(sess)
    supabase.from('salas').select('*, schools(*)').eq('id', sess.salaId).single()
      .then(({ data }) => {
        if (data) {
          setActiveSala(data)
          if (data.schools) setActiveSchool(data.schools as School)
          setView('sala')
        }
      })
  }, [])

  async function handleSelectSchoolForCreate(school: School) {
    setActiveSchool(school)
    setView('create-sala')
  }

  async function handleCreateSala(name: string, grade: string) {
    if (!activeSchool) return
    const sala = await dbCreateSala(activeSchool.id, name, grade)
    setPendingSala(sala)
    setActiveSala(sala)
    setIsCreator(true)
    setView('join')
  }

  function handleJoined(sess: Session) {
    saveSession(sess)
    setSession(sess)
    if (pendingSala) setActiveSala(pendingSala)
    setIsCreator(false)
    track('sala_joined', { sala_id: sess.salaId })
    if (sess.status === 'approved') {
      setView('sala')
    } else {
      setView('pending')
    }
  }

  function handleLogout() {
    clearSession()
    setSession(null)
    setActiveSala(null)
    setPendingSala(null)
    setIsCreator(false)
    setView('home')
  }

  // Leave current sala and go find another — keeps wallet/auth, clears sala only
  function handleChangeSala() {
    clearSession()
    setSession(null)
    setActiveSala(null)
    setPendingSala(null)
    setIsCreator(false)
    setView('home')
  }

  // Onboarding — first-time visitors only
  if (!onboarded) {
    return (
      <OnboardingScreen onDone={() => { markOnboarded(); setOnboarded(true) }} />
    )
  }

  // Create sala screen (simple)
  if (view === 'create-sala' && activeSchool) {
    return <CreateSalaScreen school={activeSchool} onSubmit={handleCreateSala} onBack={() => setView('home')} />
  }

  if (view === 'join' && pendingSala) {
    return (
      <JoinScreen
        sala={pendingSala}
        schoolName={activeSchool?.name ?? ''}
        isCreator={isCreator}
        circlesWallet={wallet}
        circlesName={circlesName}
        onJoined={handleJoined}
        onBack={() => setView('home')}
      />
    )
  }

  if (view === 'pending' && session) {
    return (
      <PendingScreen
        displayName={session.displayName}
        salaName={pendingSala?.name ?? activeSala?.name ?? ''}
        onLogout={handleLogout}
      />
    )
  }

  if (view === 'settings') {
    return (
      <SettingsScreen
        onBack={() => setView(activeSala && session ? 'sala' : 'home')}
        onLogout={handleLogout}
      />
    )
  }

  if (view === 'members' && activeSala) {
    // Build JWT invite URL async — start with a placeholder, update once signed
    const buildInviteUrl = async () => {
      const jwt = await signInvite({
        token: activeSala.invite_token,
        sala: activeSala.name,
        school: activeSchool?.name ?? '',
        from: session?.displayName ?? '',
      })
      return `${window.location.origin}/api/invite?t=${jwt}`
    }
    // Pass as a promise-returning function so MembersScreen can resolve it on copy
    return (
      <MembersScreen
        sala={activeSala}
        buildInviteUrl={buildInviteUrl}
        madrinalWallet={wallet}
        crcBalance={crcBalance}
        onBack={() => setView('sala')}
        onSalaUpdated={updated => setActiveSala(updated)}
      />
    )
  }

  if ((view === 'sala' || view === 'home') && session && activeSala) {
    return (
      <SalaScreen
        sala={activeSala}
        schoolName={activeSchool?.name ?? ''}
        session={session}
        crcBalance={crcBalance}
        wallet={wallet}
        onOpenMembers={() => setView('members')}
        onOpenSettings={() => setView('settings')}
        onChangeSala={handleChangeSala}
      />
    )
  }

  return (
    <HomeScreen
      onOpenSettings={() => setView('settings')}
      onJoinSala={async (sala) => {
        // Try to load school name
        await getSalasBySchool(sala.school_id)
        setPendingSala(sala)
        setActiveSala(sala)
        setView('join')
      }}
      onCreateSala={handleSelectSchoolForCreate}
    />
  )
}

// Inline simple create-sala form
function CreateSalaScreen({ school, onSubmit, onBack }: {
  school: School
  onSubmit: (name: string, grade: string) => void
  onBack: () => void
}) {
  const [name, setName] = useState('')
  const [grade, setGrade] = useState('')
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="text-gray-500">←</button>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Nueva sala</p>
          <p className="text-xs text-gray-400">{school.name}</p>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Nombre de la sala</label>
          <input type="text" placeholder="Ej: Sala Roja" value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Sala / Grado</label>
          <input type="text" placeholder="Ej: Sala de 3 años turno mañana" value={grade}
            onChange={e => setGrade(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400" />
        </div>
      </div>
      <div className="p-4 bg-white border-t border-gray-100">
        <button onClick={() => onSubmit(name, grade)} disabled={!name.trim() || !grade.trim()}
          className="w-full bg-violet-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
          Crear sala
        </button>
      </div>
    </div>
  )
}
