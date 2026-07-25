import { createClient } from 'npm:@supabase/supabase-js@2.110.2';

function allowedOrigins() {
  return new Set(
    (Deno.env.get('NCR_SUITE_ALLOWED_ORIGINS')
      ?? 'https://ncr-suite.fr,https://www.ncr-suite.fr,http://localhost:5173')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins().has(origin) ? origin : 'https://ncr-suite.fr',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function response(request: Request) {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLocaleLowerCase('fr-FR').slice(0, 254);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sendRecoveryEmail(email: string, activationUrl: string) {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') ?? 'contact@ncr-suite.fr';
  const senderName = Deno.env.get('BREVO_SENDER_NAME') ?? 'NCR Suite';
  if (!apiKey || senderEmail.toLocaleLowerCase('fr-FR') !== 'contact@ncr-suite.fr') {
    throw new Error('Configuration Brevo NCR Suite incomplète.');
  }

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f2f5f7;font-family:Arial,sans-serif;color:#14222d">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #dfe5e9">
<tr><td style="padding:24px 30px;background:#14222d;color:#fff;font-size:22px;font-weight:700">NCR Suite</td></tr>
<tr><td style="padding:34px 30px"><p style="margin:0 0 8px;color:#0878f9;font-size:11px;font-weight:700;text-transform:uppercase">Sécurité du compte</p>
<h1 style="margin:0 0 18px;font-size:27px">Réinitialisez votre mot de passe</h1>
<p style="margin:0;color:#52616c;font-size:15px;line-height:1.65">Une demande de nouveau mot de passe a été reçue. Utilisez ce lien personnel uniquement si vous êtes à l’origine de la demande.</p>
<p style="margin:28px 0"><a href="${escapeHtml(activationUrl)}" style="display:inline-block;padding:14px 20px;background:#0878f9;color:#fff;text-decoration:none;font-weight:700">Choisir un nouveau mot de passe</a></p>
<p style="margin:0;color:#77848d;font-size:11px;line-height:1.5">Ce lien expire automatiquement. Si vous n’avez rien demandé, ignorez cet e-mail.<br><a href="${escapeHtml(activationUrl)}" style="color:#0878f9;word-break:break-all">${escapeHtml(activationUrl)}</a></p></td></tr>
<tr><td style="padding:18px 30px;border-top:1px solid #e5eaed;color:#7b8790;font-size:11px">NCR Suite · ncr-suite.fr · contact@ncr-suite.fr</td></tr>
</table></td></tr></table></body></html>`;

  const result = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email }],
      replyTo: { name: 'NCR Suite', email: 'contact@ncr-suite.fr' },
      subject: 'Réinitialisation de votre mot de passe NCR Suite',
      htmlContent: html,
      tags: ['ncr-suite', 'account-recovery'],
    }),
  });
  if (!result.ok) throw new Error(`Brevo recovery ${result.status}`);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return response(request);

  const origin = request.headers.get('origin') ?? '';
  if (origin && !allowedOrigins().has(origin)) return response(request);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const hashSalt = Deno.env.get('ACCESS_REQUEST_HASH_SALT');
  const publicUrl = (Deno.env.get('NCR_SUITE_PUBLIC_URL') ?? 'https://ncr-suite.fr').replace(/\/+$/, '');
  if (!supabaseUrl || !serviceRoleKey || !hashSalt) return response(request);

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return response(request);
  }
  const email = normalizeEmail(payload.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response(request);

  const ip = String(request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? '').slice(0, 90);
  const emailHash = await sha256(`${hashSalt}:recovery-email:${email}`);
  const sourceIpHash = await sha256(`${hashSalt}:recovery-ip:${ip || 'unknown'}`);
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: emailAttempts } = await service
    .from('platform_auth_email_events')
    .select('id', { count: 'exact', head: true })
    .eq('email_hash', emailHash)
    .eq('event_type', 'recovery')
    .gte('created_at', oneHourAgo);
  const { count: sourceAttempts } = await service
    .from('platform_auth_email_events')
    .select('id', { count: 'exact', head: true })
    .eq('source_ip_hash', sourceIpHash)
    .eq('event_type', 'recovery')
    .gte('created_at', oneHourAgo);
  if ((emailAttempts ?? 0) >= 3 || (sourceAttempts ?? 0) >= 10) return response(request);

  let deliveryStatus = 'not_found';
  let providerMessage: string | null = null;
  try {
    const { data, error } = await service.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${publicUrl}/activation` },
    });
    const hashedToken = data?.properties?.hashed_token;
    if (error || !hashedToken) {
      providerMessage = error?.message ?? 'Compte non trouvé';
    } else {
      const activationUrl = `${publicUrl}/activation?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;
      await sendRecoveryEmail(email, activationUrl);
      deliveryStatus = 'sent';
    }
  } catch (error) {
    deliveryStatus = 'failed';
    providerMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('account_recovery_failed', providerMessage);
  }

  await service.from('platform_auth_email_events').insert({
    event_type: 'recovery',
    email_hash: emailHash,
    source_ip_hash: sourceIpHash,
    delivery_status: deliveryStatus,
    provider_message: providerMessage?.slice(0, 500) ?? null,
  });
  return response(request);
});
