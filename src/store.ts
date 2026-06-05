import type { Sala, Vaca, Contribution } from './types'

const STORAGE_KEY = 'coopera_salas'

function load(): Sala[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(salas: Sala[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(salas))
}

export function getSalas(): Sala[] {
  return load()
}

export function getSala(id: string): Sala | undefined {
  return load().find(s => s.id === id)
}

export function createSala(name: string, school: string, grade: string): Sala {
  const sala: Sala = {
    id: crypto.randomUUID(),
    name,
    school,
    grade,
    vacas: [],
  }
  const salas = load()
  salas.push(sala)
  save(salas)
  return sala
}

export function createVaca(salaId: string, title: string, description: string, targetCrc: number, deadline: string, createdBy: string): Vaca {
  const vaca: Vaca = {
    id: crypto.randomUUID(),
    title,
    description,
    targetCrc,
    collectedCrc: 0,
    deadline,
    createdBy,
    contributions: [],
  }
  const salas = load()
  const sala = salas.find(s => s.id === salaId)
  if (!sala) throw new Error('Sala not found')
  sala.vacas.push(vaca)
  save(salas)
  return vaca
}

export function addContribution(salaId: string, vacaId: string, contribution: Contribution) {
  const salas = load()
  const sala = salas.find(s => s.id === salaId)
  if (!sala) return
  const vaca = sala.vacas.find(v => v.id === vacaId)
  if (!vaca) return
  vaca.contributions.push(contribution)
  vaca.collectedCrc += contribution.amount
  save(salas)
}
