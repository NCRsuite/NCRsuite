import { createClient } from 'npm:@supabase/supabase-js@2.110.2';

const allowedBusinesses = new Set(['coiffure', 'securite', 'nettoyage', 'restauration', 'formation']);
const allowedTeamSizes = new Set(['1', '1-5', '6-15', '16-50', '51+']);
const allowedPlans = new Set(['decouverte', 'essentielle', 'professionnelle', 'metier']);

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
  const allowed = allowedOrigins();
  return {
    'Access-Control-Allow-Origin': allowed.has(origin) ? origin : 'https://ncr-suite.fr',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function jsonResponse(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function clean(value: unknown, maxLength: number) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function normalizeEmail(value: unknown) {
  return clean(value, 254).toLocaleLowerCase('fr-FR');
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyTurnstile(request: Request, token: string, ip: string) {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) return true;
  if (!token) return false;

  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean };
  return result.success === true;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return jsonResponse(request, 405, { error: 'Méthode non autorisée.' });

  const origin = request.headers.get('origin') ?? '';
  if (origin && !allowedOrigins().has(origin)) {
    return jsonResponse(request, 403, { error: 'Origine non autorisée.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const hashSalt = Deno.env.get('ACCESS_REQUEST_HASH_SALT');
  if (!supabaseUrl || !serviceRoleKey || !hashSalt) {
    return jsonResponse(request, 503, { error: 'Le service de demande est temporairement indisponible.' });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(request, 400, { error: 'Demande invalide.' });
  }

  // Le pot de miel reçoit une réponse normale afin de ne pas aider les robots.
  if (clean(payload.website, 200)) {
    return jsonResponse(request, 200, { success: true, reference: 'NCR-REÇUE' });
  }

  const fullName = clean(payload.fullName, 120);
  const email = normalizeEmail(payload.email);
  const phone = clean(payload.phone, 40);
  const companyName = clean(payload.companyName, 160);
  const rawBusinessType = clean(payload.businessType, 30);
  const businessType = rawBusinessType === 'restaurant' ? 'restauration' : rawBusinessType;
  const requestedPlan = clean(payload.requestedPlan, 30);
  const teamSize = clean(payload.teamSize, 20);
  const message = String(payload.message ?? '').trim().slice(0, 2000);
  const privacyAccepted = payload.privacyAccepted === true;
  const turnstileToken = clean(payload.turnstileToken, 3000);

  if (fullName.length < 2 || companyName.length < 2 || !validEmail(email)
    || !allowedBusinesses.has(businessType) || !allowedPlans.has(requestedPlan)
    || !allowedTeamSizes.has(teamSize) || !privacyAccepted) {
    return jsonResponse(request, 400, { error: 'Vérifiez les informations obligatoires du formulaire.' });
  }

  const ip = clean(request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for'), 90);
  const userAgent = clean(request.headers.get('user-agent'), 500);
  const turnstileVerified = await verifyTurnstile(request, turnstileToken, ip);
  if (!turnstileVerified) {
    return jsonResponse(request, 400, { error: 'Le contrôle de sécurité doit être validé à nouveau.' });
  }

  const emailHash = await sha256(`${hashSalt}:email:${email}`);
  const sourceIpHash = await sha256(`${hashSalt}:ip:${ip || 'unknown'}`);
  const fingerprintHash = await sha256(`${hashSalt}:fingerprint:${ip || 'unknown'}:${userAgent}`);
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentFromSource } = await service
    .from('platform_access_requests')
    .select('id', { count: 'exact', head: true })
    .eq('source_ip_hash', sourceIpHash)
    .gte('submitted_at', oneHourAgo);
  if ((recentFromSource ?? 0) >= 5) {
    return jsonResponse(request, 429, { error: 'Trop de demandes ont été envoyées. Réessayez dans une heure.' });
  }

  const { data: existing } = await service
    .from('platform_access_requests')
    .select('reference,status')
    .eq('email_hash', emailHash)
    .in('status', ['pending', 'approved'])
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return jsonResponse(request, 200, { success: true, reference: existing.reference });
  }

  const { data, error } = await service
    .from('platform_access_requests')
    .insert({
      full_name: fullName,
      email,
      email_normalized: email,
      email_hash: emailHash,
      phone: phone || null,
      company_name: companyName,
      business_type: businessType,
      requested_plan: requestedPlan,
      team_size: teamSize,
      message: message || null,
      privacy_accepted: true,
      request_fingerprint_hash: fingerprintHash,
      source_ip_hash: sourceIpHash,
      user_agent: userAgent || null,
      turnstile_verified: turnstileVerified,
    })
    .select('reference')
    .single();

  if (error || !data) {
    console.error('platform_access_request_insert_failed', error);
    return jsonResponse(request, 503, { error: 'La demande n’a pas pu être enregistrée. Réessayez dans quelques minutes.' });
  }

  return jsonResponse(request, 200, { success: true, reference: data.reference });
});
