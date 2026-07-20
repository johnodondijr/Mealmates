// MealMates — Edge Function: email the household admin when someone requests
// to join. Triggered by a Database Webhook on INSERT into public.join_requests.
//
// Deploy:  supabase functions deploy notify-join-request --no-verify-jwt
// Secrets: supabase secrets set RESEND_API_KEY=... FROM_EMAIL="MealMates <onboarding@resend.dev>"
// Then add a Database Webhook (Database → Webhooks): table public.join_requests,
// event INSERT, type "Supabase Edge Functions" → this function.
//
// Uses Resend (https://resend.com — free tier) for delivery. The function runs
// with the service-role key that Edge Functions get automatically, so it can
// read the household's admin email.

// deno-lint-ignore-file no-explicit-any
Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()
    const record = payload?.record ?? payload
    if (!record?.household_id || record?.status !== 'pending') {
      return json({ ok: true, skipped: 'not a pending join request' })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'MealMates <onboarding@resend.dev>'

    // Look up the household's admin email + name.
    const hhRes = await fetch(
      `${SUPABASE_URL}/rest/v1/households?id=eq.${encodeURIComponent(record.household_id)}&select=name,admin_email`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    )
    const [household] = (await hhRes.json()) as any[]
    const to = household?.admin_email
    if (!to) return json({ ok: true, skipped: 'no admin email set' })
    if (!RESEND_API_KEY) return json({ ok: false, error: 'RESEND_API_KEY not set' }, 500)

    const name = record.name || 'Someone'
    const householdName = household?.name || 'your household'

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject: `${name} wants to join ${householdName} 🍲`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:440px">
            <h2 style="margin:0 0 8px">${escapeHtml(name)} wants to join ${escapeHtml(householdName)}</h2>
            <p style="color:#555">Open MealMates and tap the join-request badge to approve or deny.</p>
            <p style="font-size:13px;color:#999">You're getting this because you're the household admin.</p>
          </div>`,
      }),
    })
    if (!emailRes.ok) {
      return json({ ok: false, error: await emailRes.text() }, 502)
    }
    return json({ ok: true })
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  )
}
