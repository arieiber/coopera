export interface Vaca {
  id: string
  title: string
  description: string
  targetCrc: number
  collectedCrc: number
  deadline: string // ISO date string
  createdBy: string // wallet address
  contributions: Contribution[]
}

export interface Contribution {
  from: string
  amount: number
  timestamp: string
}

export interface Sala {
  id: string
  name: string
  school: string
  grade: string
  vacas: Vaca[]
}
