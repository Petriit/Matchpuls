'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 justify-center mb-8">
      <div className="w-8 h-8 bg-mp-red rounded-lg flex items-center justify-center">
        <svg viewBox="0 0 16 16" className="w-5 h-5 fill-none stroke-white stroke-[2.5]" strokeLinecap="round">
          <polyline points="1,8 4,4 7,11 10,6 13,8 15,8" />
        </svg>
      </div>
      <span className="font-display text-3xl tracking-wide">MATCH<em className="text-mp-red not-italic">PULS</em></span>
    </Link>
  )
}

function ShowHideButton({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-mp-t2 hover:text-mp-t1 transition-colors"
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )
}

function svenskaFel(msg: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials':                  'Fel e-post eller lösenord.',
    'Email not confirmed':                         'E-posten är inte bekräftad. Kolla din inkorg.',
    'Too many requests':                           'För många försök. Vänta en stund och försök igen.',
    'User already registered':                     'Det finns redan ett konto med den e-postadressen.',
    'Password should be at least 6 characters':   'Lösenordet måste vara minst 6 tecken.',
    'Signup requires a valid password':            'Ange ett giltigt lösenord.',
    'Unable to validate email address: invalid format': 'Ogiltig e-postadress.',
  }
  return map[msg] ?? 'Något gick fel. Försök igen.'
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email('Ogiltig e-post'),
  password: z.string().min(1, 'Lösenord krävs'),
})
type LoginForm = z.infer<typeof loginSchema>

export function LoginForm() {
  const supabase = createClient()
  const router   = useRouter()
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError('')
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) { setError(svenskaFel(error.message)); return }
    router.push('/'); router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mp-bg px-4">
      <div className="w-full max-w-sm">
        <Logo />
        <div className="bg-mp-s1 border border-mp-border rounded-2xl p-6">
          <h1 className="font-display text-2xl tracking-wide mb-1">LOGGA IN</h1>
          <p className="text-mp-t2 text-sm mb-5">Välkommen tillbaka!</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">E-post</label>
              <input {...register('email')} type="email" className="mp-input" placeholder="din@email.com" autoComplete="email" />
              {errors.email && <p className="text-mp-red text-[10px] mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2">Lösenord</label>
                <Link href="/auth/forgot-password" className="text-[10px] text-mp-red hover:underline font-semibold">
                  Glömt lösenordet?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  className="mp-input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <ShowHideButton show={showPw} onToggle={() => setShowPw(v => !v)} />
              </div>
              {errors.password && <p className="text-mp-red text-[10px] mt-1">{errors.password.message}</p>}
            </div>

            {error && <p className="text-mp-red text-xs bg-mp-red/10 border border-mp-red/20 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
              {isSubmitting ? 'Loggar in...' : 'Logga in'}
            </button>
          </form>

          <p className="text-center text-mp-t2 text-xs mt-5">
            Inget konto?{' '}
            <Link href="/auth/register" className="text-mp-red font-bold hover:underline">Skapa konto gratis</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  username:        z.string().min(3, 'Minst 3 tecken').max(20, 'Max 20 tecken')
                    .regex(/^[a-zA-Z0-9_åäöÅÄÖ]+$/, 'Endast bokstäver, siffror och _'),
  default_alias:   z.string().max(30, 'Max 30 tecken')
                    .refine(v => !v || v.trim().length >= 2, 'Minst 2 tecken')
                    .refine(v => !v || !/\s{2,}/.test(v), 'Max ett mellanslag i rad')
                    .refine(v => !v || /^[a-zA-Z0-9åäöÅÄÖ_\-. ]*$/.test(v.trim()), 'Ogiltigt tecken')
                    .optional(),
  email:           z.string().email('Ogiltig e-post'),
  password:        z.string().min(6, 'Minst 6 tecken'),
  confirmPassword: z.string().min(1, 'Bekräfta lösenordet'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Lösenorden matchar inte',
  path: ['confirmPassword'],
})
type RegisterForm = z.infer<typeof registerSchema>

export function RegisterForm() {
  const supabase = createClient()
  const router   = useRouter()
  const [error, setError]     = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [showPw2, setShowPw2] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const username = watch('username') ?? ''
  const alias    = watch('default_alias') ?? ''

  const onSubmit = async (data: RegisterForm) => {
    setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:         data.email,
        password:      data.password,
        username:      data.username,
        default_alias: data.default_alias?.trim() || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Något gick fel. Försök igen.'); return }

    // Sign in immediately (user is already confirmed)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (signInError) {
      router.push('/auth/login')
      return
    }

    router.push('/welcome')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mp-bg px-4 py-8">
      <div className="w-full max-w-sm">
        <Logo />
        <div className="bg-mp-s1 border border-mp-border rounded-2xl p-6">
          <h1 className="font-display text-2xl tracking-wide mb-1">SKAPA KONTO</h1>
          <p className="text-mp-t2 text-sm mb-5">Gratis. Alltid.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Användarnamn */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">Användarnamn</label>
              <input {...register('username')} className="mp-input" placeholder="t.ex. BlåvittFansen92" autoComplete="username" />
              {errors.username && <p className="text-mp-red text-[10px] mt-1">{errors.username.message}</p>}
            </div>

            {/* Alias */}
            <div className="bg-mp-s2 border border-mp-border rounded-xl p-3">
              <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">
                🎭 Alias{' '}
                <span className="font-normal text-mp-t2 normal-case tracking-normal">(valfritt – smeknamn i forum)</span>
              </label>
              <input {...register('default_alias')} className="mp-input mb-2" placeholder="t.ex. GöteborgsLejonet" />
              {(username || alias) && (
                <div className="flex items-center gap-2 p-2 bg-mp-s1 rounded-lg border border-mp-border">
                  <div className="w-5 h-5 rounded bg-mp-red flex items-center justify-center text-[7px] font-black text-white flex-shrink-0">
                    {(alias || username).slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold">{alias || username}</span>
                  {alias && username && (
                    <span className="text-[9px] text-mp-t2 bg-mp-s3 px-1 rounded">{username}</span>
                  )}
                  <span className="ml-auto w-2 h-2 rounded-full bg-mp-green flex-shrink-0" />
                </div>
              )}
            </div>

            {/* E-post */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">E-post</label>
              <input {...register('email')} type="email" className="mp-input" placeholder="din@email.com" autoComplete="email" />
              {errors.email && <p className="text-mp-red text-[10px] mt-1">{errors.email.message}</p>}
            </div>

            {/* Lösenord */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">Lösenord</label>
              <div className="relative">
                <input {...register('password')} type={showPw ? 'text' : 'password'} className="mp-input pr-10"
                  placeholder="Minst 6 tecken" autoComplete="new-password" />
                <ShowHideButton show={showPw} onToggle={() => setShowPw(v => !v)} />
              </div>
              {errors.password && <p className="text-mp-red text-[10px] mt-1">{errors.password.message}</p>}
            </div>

            {/* Bekräfta lösenord */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">Bekräfta lösenord</label>
              <div className="relative">
                <input {...register('confirmPassword')} type={showPw2 ? 'text' : 'password'} className="mp-input pr-10"
                  placeholder="Upprepa lösenordet" autoComplete="new-password" />
                <ShowHideButton show={showPw2} onToggle={() => setShowPw2(v => !v)} />
              </div>
              {errors.confirmPassword && <p className="text-mp-red text-[10px] mt-1">{errors.confirmPassword.message}</p>}
            </div>

            {error && <p className="text-mp-red text-xs bg-mp-red/10 border border-mp-red/20 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
              {isSubmitting ? 'Skapar konto...' : 'Skapa konto'}
            </button>
          </form>

          <p className="text-center text-mp-t2 text-xs mt-5">
            Har du konto?{' '}
            <Link href="/auth/login" className="text-mp-red font-bold hover:underline">Logga in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
const forgotSchema = z.object({ email: z.string().email('Ogiltig e-post') })
type ForgotForm = z.infer<typeof forgotSchema>

export function ForgotPasswordForm() {
  const supabase = createClient()
  const [sent, setSent]   = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotForm) => {
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) { setError(svenskaFel(error.message)); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mp-bg px-4">
      <div className="w-full max-w-sm">
        <Logo />
        <div className="bg-mp-s1 border border-mp-border rounded-2xl p-6">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-mp-green/15 border border-mp-green/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📧</span>
              </div>
              <h1 className="font-display text-2xl tracking-wide mb-2">E-POST SKICKAD!</h1>
              <p className="text-mp-t1 text-sm mb-5 leading-relaxed">
                Kolla din inkorg för en länk för att återställa lösenordet. Kolla även skräpposten.
              </p>
              <Link href="/auth/login" className="btn-ghost w-full block py-2.5 text-sm">Tillbaka till inloggning</Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl tracking-wide mb-1">GLÖMT LÖSENORD?</h1>
              <p className="text-mp-t2 text-sm mb-5">Ange din e-post så skickar vi en återställningslänk.</p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">E-post</label>
                  <input {...register('email')} type="email" className="mp-input" placeholder="din@email.com" autoComplete="email" />
                  {errors.email && <p className="text-mp-red text-[10px] mt-1">{errors.email.message}</p>}
                </div>
                {error && <p className="text-mp-red text-xs bg-mp-red/10 border border-mp-red/20 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
                  {isSubmitting ? 'Skickar...' : 'Skicka återställningslänk'}
                </button>
              </form>
              <p className="text-center text-mp-t2 text-xs mt-5">
                <Link href="/auth/login" className="text-mp-red font-bold hover:underline">Tillbaka till inloggning</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
const resetSchema = z.object({
  password:        z.string().min(6, 'Minst 6 tecken'),
  confirmPassword: z.string().min(1, 'Bekräfta lösenordet'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Lösenorden matchar inte',
  path: ['confirmPassword'],
})
type ResetForm = z.infer<typeof resetSchema>

export function ResetPasswordForm() {
  const supabase  = createClient()
  const router    = useRouter()
  const [done, setDone]   = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [showPw2, setShowPw2] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  const onSubmit = async (data: ResetForm) => {
    setError('')
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) { setError(svenskaFel(error.message)); return }
    setDone(true)
    setTimeout(() => router.push('/auth/login'), 2500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mp-bg px-4">
      <div className="w-full max-w-sm">
        <Logo />
        <div className="bg-mp-s1 border border-mp-border rounded-2xl p-6">
          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-mp-green/15 border border-mp-green/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-mp-green stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </div>
              <h1 className="font-display text-2xl tracking-wide mb-2">LÖSENORD UPPDATERAT!</h1>
              <p className="text-mp-t1 text-sm">Du skickas vidare till inloggning...</p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl tracking-wide mb-1">NYTT LÖSENORD</h1>
              <p className="text-mp-t2 text-sm mb-5">Välj ett nytt lösenord för ditt konto.</p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">Nytt lösenord</label>
                  <div className="relative">
                    <input {...register('password')} type={showPw ? 'text' : 'password'} className="mp-input pr-10"
                      placeholder="Minst 6 tecken" autoComplete="new-password" />
                    <ShowHideButton show={showPw} onToggle={() => setShowPw(v => !v)} />
                  </div>
                  {errors.password && <p className="text-mp-red text-[10px] mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">Bekräfta lösenord</label>
                  <div className="relative">
                    <input {...register('confirmPassword')} type={showPw2 ? 'text' : 'password'} className="mp-input pr-10"
                      placeholder="Upprepa lösenordet" autoComplete="new-password" />
                    <ShowHideButton show={showPw2} onToggle={() => setShowPw2(v => !v)} />
                  </div>
                  {errors.confirmPassword && <p className="text-mp-red text-[10px] mt-1">{errors.confirmPassword.message}</p>}
                </div>
                {error && <p className="text-mp-red text-xs bg-mp-red/10 border border-mp-red/20 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
                  {isSubmitting ? 'Sparar...' : 'Spara nytt lösenord'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
