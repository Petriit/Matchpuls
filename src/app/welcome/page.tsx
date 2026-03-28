import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Välkommen till Matchpuls!' }

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-mp-bg px-4">
      <div className="w-full max-w-md text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-mp-red rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 16 16" className="w-6 h-6 fill-none stroke-white stroke-[2.5]" strokeLinecap="round">
              <polyline points="1,8 4,4 7,11 10,6 13,8 15,8" />
            </svg>
          </div>
          <span className="font-display text-4xl tracking-wide">
            MATCH<em className="text-mp-red not-italic">PULS</em>
          </span>
        </div>

        {/* Card */}
        <div className="bg-mp-s1 border border-mp-border rounded-2xl p-8">
          {/* Checkmark */}
          <div className="w-16 h-16 bg-mp-green/15 border border-mp-green/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-mp-green stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </div>

          <h1 className="font-display text-3xl tracking-wide mb-2">VÄLKOMMEN!</h1>
          <p className="text-mp-t1 text-sm mb-6 leading-relaxed">
            Ditt konto är skapat. Du är nu en del av Matchpuls-community — Sveriges levande sportforum.
          </p>

          {/* Steps */}
          <div className="bg-mp-s2 border border-mp-border rounded-xl p-4 mb-6 text-left space-y-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 mb-3">Kom igång</p>
            {[
              { n: '1', icon: '⭐', text: 'Hitta ditt lags forum och prenumerera' },
              { n: '2', icon: '💬', text: 'Skriv ditt första inlägg och diskutera' },
              { n: '3', icon: '🎭', text: 'Välj ett alias per forum om du vill vara anonym' },
              { n: '4', icon: '🎙️', text: 'Hoppa in i röstchatten under match' },
            ].map(s => (
              <div key={s.n} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-mp-red/20 border border-mp-red/30 flex items-center justify-center text-[10px] font-black text-mp-red flex-shrink-0">
                  {s.n}
                </div>
                <span className="text-xs text-mp-t1">
                  <span className="mr-1.5">{s.icon}</span>
                  {s.text}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Link href="/forum/popular" className="btn-primary py-3 text-sm">
              🔥 Utforska populära forum
            </Link>
            <Link href="/" className="btn-ghost py-3 text-sm">
              🏠 Gå till startsidan
            </Link>
          </div>
        </div>

        <p className="text-mp-t2 text-xs mt-6">
          Kolla din e-post om du behöver bekräfta ditt konto.
        </p>
      </div>
    </div>
  )
}
