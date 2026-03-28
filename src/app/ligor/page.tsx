import { LigorClient } from '@/components/stats/LigorClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ligatabeller' }

export default function LigorPage() {
  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="font-display text-3xl tracking-wide mb-0.5">LIGATABELLER</h1>
        <p className="text-sm text-mp-t2">Välj en liga för att se tabellen</p>
      </div>
      <LigorClient />
    </div>
  )
}
