import Link from 'next/link'
export const metadata = { title: 'Bekräfta din e-post' }

export default function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: { email?: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-mp-bg px-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 bg-mp-red rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 16 16" className="w-5 h-5 fill-none stroke-white stroke-[2.5]" strokeLinecap="round">
              <polyline points="1,8 4,4 7,11 10,6 13,8 15,8" />
            </svg>
          </div>
          <span className="font-display text-3xl tracking-wide">MATCH<em className="text-mp-red not-italic">PULS</em></span>
        </Link>

        <div className="bg-mp-s1 border border-mp-border rounded-2xl p-8">
          <div className="w-16 h-16 bg-mp-blue/15 border border-mp-blue/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">📧</span>
          </div>
          <h1 className="font-display text-2xl tracking-wide mb-2">KOLLA DIN E-POST</h1>
          <p className="text-mp-t1 text-sm mb-2 leading-relaxed">
            Vi har skickat en bekräftelselänk till:
          </p>
          {searchParams.email && (
            <p className="font-bold text-sm mb-4 text-mp-t0">{searchParams.email}</p>
          )}
          <p className="text-mp-t2 text-xs mb-6 leading-relaxed">
            Klicka på länken i e-postmeddelandet för att aktivera ditt konto. 
            Kolla även skräpposten om du inte hittar det.
          </p>
          <Link href="/auth/login" className="btn-ghost w-full block py-2.5 text-sm">
            Tillbaka till inloggning
          </Link>
        </div>
      </div>
    </div>
  )
}
