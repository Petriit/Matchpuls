import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, password, username, default_alias } = await req.json()

  if (!email || !password || !username) {
    return NextResponse.json({ error: 'Saknade fält' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check for duplicate email using admin API
  const { data: { users } } = await admin.auth.admin.listUsers()
  const emailTaken = users.some(u => u.email?.toLowerCase() === email.toLowerCase())
  if (emailTaken) {
    return NextResponse.json({ error: 'Det finns redan ett konto med den e-postadressen.' }, { status: 409 })
  }

  // Check for duplicate username
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  if (existingProfile) {
    return NextResponse.json({ error: 'Användarnamnet är redan taget.' }, { status: 409 })
  }

  // Create user
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // mark as confirmed since we skip email verification
    user_metadata: { username, default_alias: default_alias?.trim() || null },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ userId: data.user.id })
}
