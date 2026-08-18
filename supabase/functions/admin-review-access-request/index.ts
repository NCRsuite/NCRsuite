import { createClient } from 'npm:@supabase/supabase-js@2.110.2';

type AccessRequest = {
  id: string;
  reference: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string;
  business_type: string;
  requested_plan: string;
  trial_requested: boolean;
  team_size: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  invitation_count: number;
};

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

function jsonResponse(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function emailLayout(title: string, intro: string, content: string, action?: { label: string; url: string }) {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f2f5f7;font-family:Arial,sans-serif;color:#14222d">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dfe5e9">
<tr><td style="padding:24px 30px;background:#14222d;color:#ffffff;font-size:22px;font-weight:700">NCR Suite</td></tr>
<tr><td style="padding:34px 30px">
<p style="margin:0 0 8px;color:#0878f9;font-size:11px;font-weight:700;text-transform:uppercase">Accès sécurisé</p>
<h1 style="margin:0 0 18px;font-size:27px;line-height:1.2">${escapeHtml(title)}</h1>
<p style="margin:0 0 20px;color:#52616c;font-size:15px;line-height:1.65">${intro}</p>
${content}
${action ? `<p style="margin:28px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:14px 20px;background:#0878f9;color:#ffffff;text-decoration:none;font-weight:700">${escapeHtml(action.label)}</a></p>
<p style="margin:0;color:#77848d;font-size:11px;line-height:1.5">Si le bouton ne fonctionne pas, ouvrez ce lien dans votre navigateur :<br><a href="${escapeHtml(action.url)}" style="color:#0878f9;word-break:break-all">${escapeHtml(action.url)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:18px 30px;border-top:1px solid #e5eaed;color:#7b8790;font-size:11px">NCR Suite · <a href="https://ncr-suite.fr" style="color:#0878f9">ncr-suite.fr</a> · contact@ncr-suite.fr</td></tr>
</table></td></tr></table></body></html>`;
}

async function sendBrevoEmail(input: { to: string; toName: string; subject: string; html: string }) {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') ?? 'contact@ncr-suite.fr';
  const senderName = Deno.env.get('BREVO_SENDER_NAME') ?? 'NCR Suite';
  if (!apiKey) throw new Error('La clé Brevo n’est pas configurée.');
  if (senderEmail.toLocaleLowerCase('fr-FR') !== 'contact@ncr-suite.fr') {
    throw new Error('L’expéditeur Brevo doit être contact@ncr-suite.fr.');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: input.to, name: input.toName }],
      replyTo: { email: 'contact@ncr-suite.fr', name: 'NCR Suite' },
      subject: input.subject,
      htmlContent: input.html,
      headers: { 'X-Mailer': 'NCR Suite Transactional' },
      tags: ['ncr-suite', 'account-access'],
    }),
  });
  if (!response.ok) throw new Error(`Brevo a refusé l’envoi (${response.status}).`);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return jsonResponse(request, 405, { error: 'Méthode non autorisée.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicUrl = (Deno.env.get('NCR_SUITE_PUBLIC_URL') ?? 'https://ncr-suite.fr').replace(/\/+$/, '');
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(request, 503, { error: 'Configuration serveur incomplète.' });

  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) return jsonResponse(request, 401, { error: 'Authentification requise.' });

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await service.auth.getUser(token);
  const adminUser = userData.user;
  if (userError || !adminUser) return jsonResponse(request, 401, { error: 'Session invalide.' });

  const { data: admin } = await service
    .from('platform_admins')
    .select('role,active')
    .eq('user_id', adminUser.id)
    .eq('role', 'super_admin')
    .eq('active', true)
    .maybeSingle();
  if (!admin) return jsonResponse(request, 403, { error: 'Seul le super-administrateur peut traiter cette demande.' });

  let payload: { requestId?: string; action?: string; decisionNote?: string | null };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(request, 400, { error: 'Requête invalide.' });
  }
  const requestId = String(payload.requestId ?? '').trim();
  const action = String(payload.action ?? '').trim();
  const decisionNote = String(payload.decisionNote ?? '').trim().slice(0, 2000) || null;
  if (!requestId || !['approve', 'reject', 'resend'].includes(action)) {
    return jsonResponse(request, 400, { error: 'Action invalide.' });
  }

  const { data: accessRequest, error: accessError } = await service
    .from('platform_access_requests')
    .select('id,reference,full_name,email,phone,company_name,business_type,requested_plan,trial_requested,team_size,message,status,invitation_count')
    .eq('id', requestId)
    .maybeSingle();
  if (accessError || !accessRequest) return jsonResponse(request, 404, { error: 'Demande introuvable.' });
  const row = accessRequest as AccessRequest;

  if (action === 'reject') {
    if (row.status !== 'pending') return jsonResponse(request, 409, { error: 'Seule une demande en attente peut être refusée.' });
    if (!decisionNote || decisionNote.length < 3) return jsonResponse(request, 400, { error: 'Une note interne est requise.' });

    const { error: updateError } = await service.from('platform_access_requests').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser.id,
      decision_note: decisionNote,
      last_invitation_error: null,
    }).eq('id', row.id).eq('status', 'pending');
    if (updateError) return jsonResponse(request, 500, { error: updateError.message });

    try {
      await sendBrevoEmail({
        to: row.email,
        toName: row.full_name,
        subject: `Votre demande NCR Suite ${row.reference}`,
        html: emailLayout(
          'Votre demande a été étudiée',
          `Bonjour ${escapeHtml(row.full_name)}, votre demande d’accès pour <strong>${escapeHtml(row.company_name)}</strong> a bien été examinée.`,
          '<p style="margin:0;color:#52616c;font-size:14px;line-height:1.65">Nous ne pouvons pas ouvrir cet espace immédiatement. Vous pouvez répondre à cet e-mail pour compléter votre besoin ou obtenir plus d’informations.</p>',
        ),
      });
    } catch (emailError) {
      console.error('access_request_rejection_email_failed', emailError);
    }

    await service.from('audit_logs').insert({
      organization_id: null,
      user_id: adminUser.id,
      action: 'platform.access_request_rejected',
      entity_type: 'platform_access_request',
      entity_id: row.id,
      metadata: { reference: row.reference, company_name: row.company_name },
    });
    return jsonResponse(request, 200, { success: true, message: 'La demande a été refusée et classée.' });
  }

  if (action === 'approve' && row.status !== 'pending') {
    return jsonResponse(request, 409, { error: 'Cette demande a déjà été traitée.' });
  }
  if (action === 'resend' && row.status !== 'approved') {
    return jsonResponse(request, 409, { error: 'Seule une demande acceptée peut recevoir une nouvelle invitation.' });
  }

  const metadata = {
    full_name: row.full_name,
    phone: row.phone,
    requested_company_name: row.company_name,
    requested_business_type: row.business_type,
    requested_plan: row.trial_requested ? 'professionnelle' : row.requested_plan,
    trial_requested: row.trial_requested,
    requested_team_size: row.team_size,
    access_request_message: row.message,
    access_request_id: row.id,
    access_request_reference: row.reference,
    account_source: 'platform_access_request',
  };
  // Premier lien technique : crée/retrouve le compte sans être envoyé au client.
  // On enregistre ensuite les métadonnées canoniques, puis on génère le vrai lien.
  // Ainsi le JWT issu du lien d’activation contient toujours le métier validé par NCR.
  const { data: bootstrapLinkData, error: bootstrapLinkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: row.email,
    options: {
      data: metadata,
      redirectTo: `${publicUrl}/activation`,
    },
  });
  const invitedUserId = bootstrapLinkData?.user?.id;
  if (bootstrapLinkError || !invitedUserId) {
    const detail = bootstrapLinkError?.message ?? 'Le compte sécurisé n’a pas pu être préparé.';
    await service.from('platform_access_requests').update({ last_invitation_error: detail }).eq('id', row.id);
    return jsonResponse(request, 502, { error: 'L’invitation n’a pas pu être préparée. Vérifiez la configuration Auth Supabase.' });
  }

  const { error: metadataError } = await service.auth.admin.updateUserById(invitedUserId, {
    user_metadata: {
      ...(bootstrapLinkData.user?.user_metadata ?? {}),
      ...metadata,
    },
  });
  if (metadataError) {
    await service.from('platform_access_requests').update({ last_invitation_error: metadataError.message }).eq('id', row.id);
    return jsonResponse(request, 502, { error: 'Le compte a été préparé mais son autorisation n’a pas pu être enregistrée.' });
  }

  // Le lien réellement envoyé est minté APRÈS la mise à jour des métadonnées.
  const { data: finalLinkData, error: finalLinkError } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: row.email,
    options: {
      data: metadata,
      redirectTo: `${publicUrl}/activation`,
    },
  });
  const hashedToken = finalLinkData?.properties?.hashed_token;
  if (finalLinkError || !hashedToken || finalLinkData?.user?.id !== invitedUserId) {
    const detail = finalLinkError?.message ?? 'Le lien d’activation final n’a pas pu être généré.';
    await service.from('platform_access_requests').update({ last_invitation_error: detail }).eq('id', row.id);
    return jsonResponse(request, 502, { error: 'Le compte est prêt mais le lien d’activation n’a pas pu être finalisé.' });
  }

  const activationUrl = `${publicUrl}/activation?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`;
  try {
    await sendBrevoEmail({
      to: row.email,
      toName: row.full_name,
      subject: row.trial_requested
        ? `Votre essai NCR Suite 7 jours est autorisé · ${row.reference}`
        : `Votre accès NCR Suite est autorisé · ${row.reference}`,
      html: emailLayout(
        row.trial_requested ? 'Votre essai Professionnel peut démarrer' : 'Votre espace NCR Suite peut être activé',
        `Bonjour ${escapeHtml(row.full_name)}, votre demande pour <strong>${escapeHtml(row.company_name)}</strong> a été acceptée par l’équipe NCR Suite.`,
        row.trial_requested
          ? '<p style="margin:0;color:#52616c;font-size:14px;line-height:1.65"><strong>Votre essai inclut la formule Professionnelle pendant 7 jours.</strong><br>Aucune carte bancaire, aucun paiement et aucun contrat d’abonnement ne sont demandés pour commencer. Définissez votre mot de passe, complétez votre entreprise puis accédez directement à votre espace.</p>'
          : '<p style="margin:0;color:#52616c;font-size:14px;line-height:1.65">Définissez votre mot de passe puis complétez les informations de votre entreprise. Ce lien personnel expire automatiquement.</p>',
        { label: row.trial_requested ? 'Démarrer mon essai' : 'Activer mon accès', url: activationUrl },
      ),
    });
  } catch (emailError) {
    const detail = emailError instanceof Error ? emailError.message : 'Envoi Brevo impossible.';
    await service.from('platform_access_requests').update({ last_invitation_error: detail }).eq('id', row.id);
    return jsonResponse(request, 502, { error: `${detail} La demande reste disponible pour un nouvel envoi.` });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await service.from('platform_access_requests').update({
    status: 'approved',
    reviewed_at: action === 'approve' ? now : undefined,
    reviewed_by: action === 'approve' ? adminUser.id : undefined,
    decision_note: decisionNote ?? undefined,
    invited_user_id: invitedUserId,
    invitation_sent_at: now,
    invitation_count: Number(row.invitation_count || 0) + 1,
    last_invitation_error: null,
  }).eq('id', row.id);
  if (updateError) return jsonResponse(request, 500, { error: updateError.message });

  await service.from('audit_logs').insert({
    organization_id: null,
    user_id: adminUser.id,
    action: action === 'approve' ? 'platform.access_request_approved' : 'platform.access_invitation_resent',
    entity_type: 'platform_access_request',
    entity_id: row.id,
    metadata: { reference: row.reference, company_name: row.company_name, invited_user_id: invitedUserId },
  });

  return jsonResponse(request, 200, {
    success: true,
    message: action === 'approve'
      ? 'La demande est acceptée et l’invitation NCR Suite a été envoyée.'
      : 'Une nouvelle invitation NCR Suite a été envoyée.',
  });
});
