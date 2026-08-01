import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.110.2';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'npm:pdf-lib@1.17.1';

type JsonRecord = Record<string, unknown>;
type ContractRow = {
  id: string;
  organization_id: string;
  reference: string;
  contract_version: string;
  status: string;
  business_type: string;
  plan_key: string;
  plan_label: string;
  monthly_price_cents: number;
  currency: string;
  client_snapshot: JsonRecord;
  offer_snapshot: JsonRecord;
  document_path: string;
  document_sha256: string;
  signed_document_path: string | null;
  signed_document_sha256: string | null;
  signer_name: string | null;
  signer_email: string | null;
  signer_title: string | null;
  otp_hash: string | null;
  otp_expires_at: string | null;
  otp_attempts: number;
  otp_requested_at: string | null;
  signed_at: string | null;
  payment_status: string;
  created_at: string;
};

const CONTRACT_VERSION = 'NCR-SUB-2026-1.0';
const BUCKET = 'subscription-contracts';

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

function jsonResponse(request: Request, status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function configuration() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Configuration Supabase incomplete.');
  return { supabaseUrl, serviceRoleKey };
}

function serviceClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authenticatedUser(request: Request, service: SupabaseClient): Promise<User> {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Authentification requise.');
  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) throw new Error('Session utilisateur invalide.');
  return data.user;
}

async function requireManager(service: SupabaseClient, organizationId: string, userId: string) {
  const { data, error } = await service
    .from('organization_members')
    .select('role,status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin'])
    .maybeSingle();
  if (error || !data) throw new Error('Seul le proprietaire ou un administrateur peut signer ce contrat.');
}

function sourceIp(request: Request) {
  return String(
    request.headers.get('cf-connecting-ip')
      ?? request.headers.get('x-forwarded-for')
      ?? '',
  ).split(',')[0].trim().slice(0, 120);
}

function userAgent(request: Request) {
  return String(request.headers.get('user-agent') ?? '').slice(0, 500);
}

function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLocaleLowerCase('fr-FR').slice(0, 254);
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function pdfSafe(value: unknown) {
  return String(value ?? '')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/€/g, 'EUR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, ' ');
}

async function sha256(value: string | Uint8Array) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function money(cents: number) {
  return `${(cents / 100).toFixed(2).replace('.', ',')} EUR HT / mois`;
}

function shortDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(date);
}

function wrapText(font: PDFFont, value: string, size: number, maxWidth: number) {
  const words = pdfSafe(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

async function buildContractPdf(contract: {
  reference: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  address: string;
  siret: string;
  businessLabel: string;
  planLabel: string;
  monthlyPriceCents: number;
  memberLimit: number;
  planDetail: string;
}) {
  const document = await PDFDocument.create();
  document.setTitle(`Contrat d'abonnement NCR Suite ${contract.reference}`);
  document.setAuthor('N.C.R Solutions - NCR Suite');
  document.setSubject('Contrat d abonnement SaaS et annexes');
  document.setCreator('NCR Suite V2.29.0');
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 52;
  const maxWidth = pageSize[0] - margin * 2;
  let page: PDFPage;
  let y = 0;

  const addPage = () => {
    page = document.addPage(pageSize);
    y = pageSize[1] - 62;
    page.drawText('NCR', { x: margin, y, font: bold, size: 18, color: rgb(0.03, 0.05, 0.08) });
    page.drawText('Suite', { x: margin + 42, y, font: regular, size: 18, color: rgb(0.02, 0.42, 0.95) });
    page.drawText(contract.reference, { x: pageSize[0] - margin - 145, y: y + 2, font: regular, size: 8, color: rgb(0.4, 0.45, 0.5) });
    y -= 31;
    page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 0.8, color: rgb(0.85, 0.88, 0.91) });
    y -= 28;
  };

  const ensureSpace = (height: number) => {
    if (y - height < 58) addPage();
  };

  const heading = (value: string, size = 15) => {
    ensureSpace(size + 22);
    page.drawText(pdfSafe(value), { x: margin, y, font: bold, size, color: rgb(0.04, 0.08, 0.12) });
    y -= size + 10;
  };

  const paragraph = (value: string, options?: { bold?: boolean; color?: [number, number, number]; gap?: number }) => {
    const font = options?.bold ? bold : regular;
    const size = 9.4;
    const lineHeight = 13.4;
    const lines = wrapText(font, value, size, maxWidth);
    ensureSpace(lines.length * lineHeight + 7);
    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y,
        font,
        size,
        color: options?.color ? rgb(...options.color) : rgb(0.22, 0.27, 0.32),
      });
      y -= lineHeight;
    }
    y -= options?.gap ?? 7;
  };

  const labeledValue = (label: string, value: string) => {
    ensureSpace(31);
    page.drawText(pdfSafe(label).toUpperCase(), { x: margin, y, font: bold, size: 7.4, color: rgb(0.38, 0.45, 0.52) });
    y -= 12;
    paragraph(value || 'Non renseigne', { bold: true, gap: 5 });
  };

  addPage();
  page.drawText("CONTRAT D'ABONNEMENT", { x: margin, y, font: bold, size: 27, color: rgb(0.03, 0.06, 0.09) });
  y -= 34;
  page.drawText('NCR SUITE', { x: margin, y, font: bold, size: 27, color: rgb(0.02, 0.42, 0.95) });
  y -= 30;
  paragraph(`Version contractuelle ${CONTRACT_VERSION} - document prepare le ${shortDate(new Date())}`, {
    color: [0.35, 0.41, 0.47],
    gap: 18,
  });

  heading('Les parties', 17);
  labeledValue('Prestataire', 'Nacer Hamadi, entrepreneur individuel, nom commercial N.C.R Solutions');
  labeledValue('Identification', 'SIREN 988 625 406 - SIRET 988 625 406 00018');
  labeledValue('Adresse', '191 impasse Missiri, Batiment B, Residence Terra Gaia, 83600 Frejus');
  labeledValue('Contact', 'contact@ncr-suite.fr - 06 21 97 21 39');
  y -= 5;
  labeledValue('Client', contract.organizationName);
  labeledValue('Representant', `${contract.contactName} - ${contract.contactEmail}`);
  labeledValue('Adresse du client', contract.address);
  labeledValue('SIRET du client', contract.siret);

  addPage();
  heading('Bon de commande', 19);
  labeledValue('Univers metier', contract.businessLabel);
  labeledValue('Formule', contract.planLabel);
  labeledValue('Prix mensuel', money(contract.monthlyPriceCents));
  labeledValue('Utilisateurs inclus', contract.memberLimit > 0 ? String(contract.memberLimit) : 'Selon configuration contractuelle');
  labeledValue('Description', contract.planDetail);
  paragraph('Facturation mensuelle par Stripe. Les taxes eventuellement applicables sont ajoutees selon la situation fiscale. Les options payantes commandees ulterieurement font l objet d une validation distincte.', { gap: 16 });
  paragraph('Le service est active apres signature du present contrat et confirmation du premier paiement. Le renouvellement est ensuite automatique chaque mois jusqu a resiliation.', { bold: true, gap: 18 });

  const sections = [
    ['1. Objet', 'Le present contrat encadre l acces du Client a NCR Suite, plateforme SaaS de gestion metier. Il comprend le bon de commande, les conditions commerciales, les conditions d utilisation, les regles de confidentialite et l annexe relative au traitement des donnees.'],
    ['2. Perimetre du service', 'Les fonctions accessibles dependent de l univers metier, de la formule et des modules actifs. Les fonctions verrouillees restent visibles a titre informatif mais ne sont pas utilisables sans droit correspondant.'],
    ['3. Duree et renouvellement', 'Le contrat prend effet apres signature et paiement. Il est conclu pour une duree mensuelle avec renouvellement automatique. Le Client peut gerer sa resiliation depuis le portail de paiement. La resiliation produit ses effets selon la date indiquee par Stripe.'],
    ['4. Prix et paiement', `Le prix de base est de ${money(contract.monthlyPriceCents)}. Le paiement est realise par Stripe. Un echec de paiement peut entrainer un delai de grace puis la suspension des fonctions payantes. Les frais exceptionnels, prestations sur devis et developpements sur mesure sont factures separement.`],
    ['5. Changement de formule', 'Une montee en gamme peut prendre effet immediatement selon les regles affichees lors de la commande. Une retrogradation est normalement appliquee a la fin de la periode en cours. Les droits premium sont alors retires sans suppression automatique des donnees existantes.'],
    ['6. Conservation des donnees', 'En cas de retrogradation, suspension ou resiliation, NCR Suite conserve les donnees selon la politique de conservation en vigueur afin de permettre une reprise ulterieure. Certaines donnees peuvent devenir inaccessibles tant que la formule ne les autorise plus. Une suppression definitive explicite reste soumise aux obligations legales et aux sauvegardes techniques.'],
    ['7. Compte et securite', 'Le Client est responsable de ses comptes, habilitations, mots de passe et appareils. Il doit signaler rapidement tout acces suspect. Les droits doivent etre attribues selon le besoin reel de chaque utilisateur.'],
    ['8. Obligations du Client', 'Le Client s engage a fournir des informations exactes, utiliser le service licitement, respecter les droits des personnes et verifier les documents avant envoi. NCR Suite assiste la gestion mais ne remplace pas le controle professionnel, juridique, comptable ou reglementaire du Client.'],
    ['9. Disponibilite et maintenance', 'NCR Suite met en oeuvre des moyens raisonnables de disponibilite, sauvegarde et securite. Des interruptions peuvent survenir pour maintenance, evolution, incident fournisseur ou force majeure. Les incidents sont traites selon leur criticite.'],
    ['10. Propriete intellectuelle', 'N.C.R Solutions conserve les droits sur NCR Suite, son code, ses interfaces, ses modeles et sa documentation. Le Client conserve les droits et responsabilites portant sur ses donnees, contenus, logos et documents.'],
    ['11. Confidentialite', 'Chaque partie protege les informations confidentielles de l autre et limite leur acces aux personnes qui en ont besoin. Cette obligation survit a la fin du contrat dans la mesure necessaire.'],
    ['12. Responsabilite', 'Chaque partie repond de ses obligations dans les limites du droit applicable. NCR Suite ne garantit pas qu un document produit automatiquement soit adapte a toutes les situations sans verification du Client. Les pertes indirectes, pertes d opportunite ou consequences d une mauvaise saisie restent exclues dans la mesure permise.'],
    ['13. Support', 'Le support est accessible par les canaux proposes dans l application. Les demandes doivent decrire le contexte, le compte concerne et les etapes permettant de reproduire le probleme, sans transmettre inutilement de donnees sensibles.'],
    ['14. Fin du contrat', 'A la fin du contrat, les acces payants peuvent etre suspendus. Le Client peut demander l export des donnees disponibles et, lorsque cela est applicable, leur suppression. Les sommes deja dues restent exigibles.'],
    ['15. Preuve et signature', 'Les journaux techniques, horodatages, empreintes SHA-256, validation par code e-mail et traces Stripe constituent des elements de preuve. Le procede mis en oeuvre est une signature electronique simple documentee, et non une signature qualifiee.'],
    ['16. Droit applicable et litiges', 'Le contrat est soumis au droit francais. Les parties recherchent d abord une solution amiable. Les regles imperatives de competence et de mediation applicables demeurent reservees.'],
  ];

  for (const [title, body] of sections) {
    heading(title, 13);
    paragraph(body);
  }

  addPage();
  heading('Annexe A - Conditions generales de vente', 17);
  paragraph('La commande est constituee par le bon de commande, la signature et la confirmation de paiement. Les prix sont indiques hors taxes. Les factures et justificatifs Stripe sont accessibles par les moyens proposes. Toute contestation doit etre adressee sans delai avec les references utiles.');
  paragraph('Les modules, prestations d installation, parametrages, reprises de donnees et developpements sur mesure peuvent faire l objet d une commande et d un prix distincts. Leur activation depend de leur paiement ou de leur validation contractuelle.');
  paragraph('La resiliation, le paiement echoue, la retrogradation et la suppression de moyens de paiement sont traites selon le cycle Stripe et les regles affichees dans NCR Suite.');

  heading('Annexe B - Conditions generales d utilisation', 17);
  paragraph('Le Client autorise uniquement les personnes habilitees a utiliser son espace. Il ne doit pas contourner les protections, extraire massivement des donnees, perturber le service, introduire un contenu illicite ou utiliser NCR Suite pour porter atteinte a autrui.');
  paragraph('Les documents, notifications, automatisations et indicateurs doivent etre verifies par l utilisateur avant toute decision engageante. Le Client reste responsable de la qualite des informations saisies et des destinataires choisis.');

  heading('Annexe C - Donnees personnelles et sous-traitance', 17);
  paragraph('Pour les donnees metier placees dans la plateforme, le Client agit en principe comme responsable du traitement et N.C.R Solutions comme sous-traitant technique. N.C.R Solutions traite les donnees uniquement pour fournir, securiser, maintenir et assister NCR Suite.');
  paragraph('Les categories peuvent comprendre les coordonnees, comptes, dossiers, documents, plannings, signatures, traces de connexion et donnees necessaires au metier. Les personnes concernees peuvent inclure utilisateurs, clients, stagiaires, formateurs, agents, salaries, prospects et partenaires du Client.');
  paragraph('Le service s appuie notamment sur des prestataires techniques d hebergement, base de donnees, paiement, envoi d e-mails, notifications et protection reseau. La liste et les conditions peuvent evoluer pour assurer le service. NCR Suite met en oeuvre des controles d acces, journaux, sauvegardes et mesures de securite proportionnees.');
  paragraph('Le Client organise l information des personnes, les bases legales, les durees de conservation et le traitement des demandes de droits. NCR Suite fournit une assistance raisonnable et signale les incidents pertinents selon les informations disponibles.');

  addPage();
  heading('Validation attendue', 19);
  paragraph('La signature est finalisee dans NCR Suite apres les actions suivantes :', { bold: true });
  for (const item of [
    'lecture ou telechargement du document contractuel exact ;',
    'validation explicite du contrat, des CGV, des CGU et de l annexe donnees ;',
    'saisie du nom et de la qualite du representant ;',
    'verification d un code a usage unique envoye par e-mail ;',
    'horodatage et scellement du document signe par empreinte SHA-256.',
  ]) paragraph(`- ${item}`, { gap: 3 });
  y -= 12;
  paragraph(`Reference : ${contract.reference}`, { bold: true, gap: 4 });
  paragraph(`Empreinte du document : calculee et conservee par NCR Suite lors de sa preparation.`, { gap: 4 });
  paragraph('Un exemplaire signe et sa page de preuve seront transmis a l adresse du signataire.', { gap: 16 });
  paragraph('Le Client peut telecharger et conserver ce document avant de confirmer sa signature.', { bold: true, color: [0.12, 0.35, 0.55] });

  const pages = document.getPages();
  pages.forEach((current, index) => {
    current.drawText(`NCR Suite - ${contract.reference} - page ${index + 1}/${pages.length}`, {
      x: margin,
      y: 28,
      font: regular,
      size: 7.5,
      color: rgb(0.45, 0.5, 0.55),
    });
  });
  return new Uint8Array(await document.save());
}

async function appendSignaturePage(original: Uint8Array, proof: {
  reference: string;
  signerName: string;
  signerEmail: string;
  signerTitle: string;
  signedAt: string;
  ip: string;
  userAgent: string;
  originalHash: string;
  payloadHash: string;
}) {
  const document = await PDFDocument.load(original);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const page = document.addPage([595.28, 841.89]);
  const margin = 52;
  let y = 778;
  page.drawText('NCR', { x: margin, y, font: bold, size: 18, color: rgb(0.03, 0.05, 0.08) });
  page.drawText('Suite', { x: margin + 42, y, font: regular, size: 18, color: rgb(0.02, 0.42, 0.95) });
  y -= 55;
  page.drawText('PREUVE DE SIGNATURE', { x: margin, y, font: bold, size: 24, color: rgb(0.03, 0.06, 0.09) });
  y -= 27;
  page.drawText('Signature electronique simple documentee', { x: margin, y, font: regular, size: 11, color: rgb(0.3, 0.36, 0.42) });
  y -= 42;
  const rows = [
    ['Reference', proof.reference],
    ['Signataire', proof.signerName],
    ['Qualite', proof.signerTitle],
    ['E-mail verifie', proof.signerEmail],
    ['Date et heure Europe/Paris', shortDate(proof.signedAt)],
    ['Adresse IP declaree par le reseau', proof.ip || 'Non transmise'],
    ['Navigateur', proof.userAgent || 'Non transmis'],
    ['Empreinte SHA-256 du contrat original', proof.originalHash],
    ['Empreinte SHA-256 de la preuve', proof.payloadHash],
  ];
  for (const [label, value] of rows) {
    page.drawText(pdfSafe(label).toUpperCase(), { x: margin, y, font: bold, size: 7.5, color: rgb(0.4, 0.46, 0.52) });
    y -= 13;
    const lines = wrapText(regular, value, 9.2, 491);
    for (const line of lines) {
      page.drawText(line, { x: margin, y, font: regular, size: 9.2, color: rgb(0.12, 0.16, 0.2) });
      y -= 13;
    }
    y -= 12;
  }
  page.drawRectangle({ x: margin, y: 76, width: 491, height: 92, borderWidth: 1, borderColor: rgb(0.75, 0.82, 0.88), color: rgb(0.96, 0.98, 1) });
  page.drawText('CONSENTEMENTS VALIDES', { x: margin + 18, y: 143, font: bold, size: 9, color: rgb(0.02, 0.42, 0.85) });
  page.drawText('Contrat, CGV, CGU, confidentialite et annexe de traitement des donnees.', { x: margin + 18, y: 122, font: regular, size: 8.7, color: rgb(0.2, 0.27, 0.33) });
  page.drawText('Code e-mail a usage unique verifie avant scellement du document.', { x: margin + 18, y: 105, font: regular, size: 8.7, color: rgb(0.2, 0.27, 0.33) });
  page.drawText(`NCR Suite - ${proof.reference} - preuve finale`, { x: margin, y: 28, font: regular, size: 7.5, color: rgb(0.45, 0.5, 0.55) });
  return new Uint8Array(await document.save());
}

function bytesToBase64(bytes: Uint8Array) {
  const chunks: string[] = [];
  const chunkSize = 24576;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    let binary = '';
    for (const byte of bytes.subarray(offset, offset + chunkSize)) binary += String.fromCharCode(byte);
    chunks.push(btoa(binary));
  }
  return chunks.join('');
}

async function sendBrevoEmail(input: {
  to: string;
  subject: string;
  html: string;
  tag: string;
  attachment?: { name: string; bytes: Uint8Array };
}) {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') ?? 'contact@ncr-suite.fr';
  const senderName = Deno.env.get('BREVO_SENDER_NAME') ?? 'NCR Suite';
  if (!apiKey || senderEmail.toLocaleLowerCase('fr-FR') !== 'contact@ncr-suite.fr') {
    throw new Error('Configuration Brevo NCR Suite incomplete.');
  }
  const payload: JsonRecord = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: input.to }],
    replyTo: { name: 'NCR Suite', email: 'contact@ncr-suite.fr' },
    subject: input.subject,
    htmlContent: input.html,
    tags: ['ncr-suite', input.tag],
  };
  if (input.attachment) {
    payload.attachment = [{ name: input.attachment.name, content: bytesToBase64(input.attachment.bytes) }];
  }
  const result = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!result.ok) throw new Error(`Brevo contrat ${result.status}`);
}

async function addEvent(
  service: SupabaseClient,
  contract: Pick<ContractRow, 'id' | 'organization_id'>,
  eventType: string,
  userId: string | null,
  request: Request,
  metadata: JsonRecord = {},
) {
  const { error } = await service.from('subscription_contract_events').insert({
    contract_id: contract.id,
    organization_id: contract.organization_id,
    event_type: eventType,
    actor_user_id: userId,
    source_ip: sourceIp(request) || null,
    user_agent: userAgent(request) || null,
    metadata,
  });
  if (error) throw error;
}

async function signedUrl(service: SupabaseClient, path: string | null) {
  if (!path) return null;
  const { data, error } = await service.storage.from(BUCKET).createSignedUrl(path, 15 * 60);
  if (error) throw error;
  return data.signedUrl;
}

function publicContract(row: ContractRow) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    reference: row.reference,
    contractVersion: row.contract_version,
    status: row.status,
    businessType: row.business_type,
    planKey: row.plan_key,
    planLabel: row.plan_label,
    monthlyPriceCents: row.monthly_price_cents,
    currency: row.currency,
    signerName: row.signer_name,
    signerEmail: row.signer_email,
    signerTitle: row.signer_title,
    signedAt: row.signed_at,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
  };
}

function otpCode() {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return String(100000 + (random[0] % 900000));
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return jsonResponse(request, 405, { error: 'Methode non autorisee.' });

  try {
    const config = configuration();
    const service = serviceClient(config.supabaseUrl, config.serviceRoleKey);
    const user = await authenticatedUser(request, service);
    let payload: JsonRecord;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(request, 400, { error: 'Demande de contrat invalide.' });
    }
    const action = text(payload.action);
    const organizationId = text(payload.organizationId);
    if (!organizationId) return jsonResponse(request, 400, { error: 'Entreprise requise.' });
    await requireManager(service, organizationId, user.id);

    if (action === 'prepare') {
      const planKey = text(payload.planKey);
      if (!['decouverte', 'essentielle', 'professionnelle', 'metier'].includes(planKey)) {
        return jsonResponse(request, 400, { error: 'Formule invalide.' });
      }
      const { data: existing } = await service
        .from('subscription_contracts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('contract_kind', 'initial_subscription')
        .eq('plan_key', planKey)
        .in('status', ['awaiting_signature', 'signed', 'payment_pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        const row = existing as ContractRow;
        return jsonResponse(request, 200, {
          contract: publicContract(row),
          previewUrl: await signedUrl(service, row.signed_document_path || row.document_path),
          reused: true,
        });
      }

      const { data: organization, error: organizationError } = await service
        .from('organizations')
        .select('id,name,business_type,company_contact_name,company_email,company_phone,company_address,company_postal_code,company_city,company_siret')
        .eq('id', organizationId)
        .maybeSingle();
      if (organizationError || !organization) throw new Error('Entreprise introuvable.');
      const { data: plan, error: planError } = await service
        .from('domain_plan_catalog')
        .select('display_name,monthly_price_cents,member_limit,features,short_description')
        .eq('business_type', organization.business_type)
        .eq('plan_key', planKey)
        .eq('active', true)
        .maybeSingle();
      if (planError || !plan) throw new Error('Offre contractuelle introuvable.');
      const email = normalizeEmail(organization.company_email || user.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('L e-mail professionnel du signataire est invalide.');

      const id = crypto.randomUUID();
      const compactDate = new Date().toISOString().slice(0, 10).replaceAll('-', '');
      const randomRef = crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase();
      const reference = `NCR-ABO-${compactDate}-${randomRef}`;
      const address = [organization.company_address, organization.company_postal_code, organization.company_city]
        .map(text)
        .filter(Boolean)
        .join(', ');
      const businessLabel: Record<string, string> = {
        formation: 'Formation professionnelle',
        securite: 'Securite privee',
        nettoyage: 'Nettoyage',
        restauration: 'Restauration',
        coiffure: 'Coiffure et beaute',
      };
      const original = await buildContractPdf({
        reference,
        organizationName: text(organization.name),
        contactName: text(organization.company_contact_name) || text(user.user_metadata?.full_name) || email,
        contactEmail: email,
        address,
        siret: text(organization.company_siret),
        businessLabel: businessLabel[String(organization.business_type)] ?? String(organization.business_type),
        planLabel: text(plan.display_name),
        monthlyPriceCents: Number(plan.monthly_price_cents),
        memberLimit: Number(plan.member_limit),
        planDetail: text(plan.short_description),
      });
      const documentHash = await sha256(original);
      const documentPath = `${organizationId}/contracts/${id}/contrat-${reference}.pdf`;
      const { error: uploadError } = await service.storage.from(BUCKET).upload(documentPath, original, {
        contentType: 'application/pdf',
        upsert: false,
      });
      if (uploadError) throw new Error(`Le contrat PDF n a pas pu etre archive : ${uploadError.message}`);

      const clientSnapshot = {
        organization_name: organization.name,
        contact_name: organization.company_contact_name,
        contact_email: email,
        contact_phone: organization.company_phone,
        address,
        siret: organization.company_siret,
      };
      const offerSnapshot = {
        business_type: organization.business_type,
        plan_key: planKey,
        plan_label: plan.display_name,
        monthly_price_cents: plan.monthly_price_cents,
        member_limit: plan.member_limit,
        description: plan.short_description,
        features: plan.features,
        billing_cycle: 'monthly',
        renewal: 'automatic',
        payment_provider: 'stripe',
        data_retention_on_downgrade: 'preserve',
      };
      const { data: created, error: insertError } = await service
        .from('subscription_contracts')
        .insert({
          id,
          organization_id: organizationId,
          contract_kind: 'initial_subscription',
          reference,
          contract_version: CONTRACT_VERSION,
          status: 'awaiting_signature',
          business_type: organization.business_type,
          plan_key: planKey,
          plan_label: plan.display_name,
          monthly_price_cents: plan.monthly_price_cents,
          client_snapshot: clientSnapshot,
          offer_snapshot: offerSnapshot,
          document_path: documentPath,
          document_sha256: documentHash,
          signer_user_id: user.id,
          signer_email: email,
          created_by: user.id,
        })
        .select('*')
        .single();
      if (insertError || !created) {
        await service.storage.from(BUCKET).remove([documentPath]);
        throw new Error(insertError?.message ?? 'Le contrat n a pas pu etre enregistre.');
      }
      const row = created as ContractRow;
      await addEvent(service, row, 'contract_prepared', user.id, request, {
        contract_version: CONTRACT_VERSION,
        document_sha256: documentHash,
        plan_key: planKey,
      });
      return jsonResponse(request, 200, {
        contract: publicContract(row),
        previewUrl: await signedUrl(service, row.document_path),
      });
    }

    if (action === 'list') {
      const { data, error } = await service
        .from('subscription_contracts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const contracts = await Promise.all((data ?? []).map(async (item) => {
        const row = item as ContractRow;
        return {
          ...publicContract(row),
          downloadUrl: await signedUrl(service, row.signed_document_path || row.document_path),
        };
      }));
      return jsonResponse(request, 200, { contracts });
    }

    const contractId = text(payload.contractId);
    if (!contractId) return jsonResponse(request, 400, { error: 'Contrat requis.' });
    const { data: found, error: findError } = await service
      .from('subscription_contracts')
      .select('*')
      .eq('id', contractId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (findError || !found) throw new Error('Contrat introuvable.');
    const contract = found as ContractRow;

    if (action === 'request_code') {
      if (contract.status !== 'awaiting_signature') throw new Error('Ce contrat ne peut plus recevoir de code.');
      const lastRequested = contract.otp_requested_at ? new Date(contract.otp_requested_at).getTime() : 0;
      if (Date.now() - lastRequested < 60_000) throw new Error('Patientez une minute avant de demander un nouveau code.');
      const code = otpCode();
      const otpHash = await sha256(`${config.serviceRoleKey}:${contract.id}:${code}`);
      const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
      const email = normalizeEmail(contract.signer_email || contract.client_snapshot.contact_email || user.email);
      await sendBrevoEmail({
        to: email,
        subject: `Code de signature NCR Suite - ${contract.reference}`,
        tag: 'subscription-contract-otp',
        html: `<!doctype html><html lang="fr"><body style="margin:0;background:#f2f5f7;font-family:Arial,sans-serif;color:#14222d"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #dfe5e9"><tr><td style="padding:24px 30px;background:#14222d;color:#fff;font-size:22px;font-weight:700">NCR Suite</td></tr><tr><td style="padding:34px 30px"><p style="margin:0 0 8px;color:#0878f9;font-size:11px;font-weight:700;text-transform:uppercase">Signature du contrat</p><h1 style="margin:0 0 18px;font-size:27px">Votre code de verification</h1><p style="margin:0;color:#52616c;font-size:15px;line-height:1.65">Saisissez ce code dans NCR Suite pour signer le contrat <strong>${escapeHtml(contract.reference)}</strong>.</p><p style="margin:26px 0;padding:18px;background:#f2f7fc;text-align:center;font-size:34px;font-weight:800;letter-spacing:8px">${code}</p><p style="margin:0;color:#77848d;font-size:12px">Ce code expire dans 10 minutes. Ne le transmettez a personne.</p></td></tr><tr><td style="padding:18px 30px;border-top:1px solid #e5eaed;color:#7b8790;font-size:11px">NCR Suite · ncr-suite.fr · contact@ncr-suite.fr</td></tr></table></td></tr></table></body></html>`,
      });
      const { error: updateError } = await service
        .from('subscription_contracts')
        .update({ otp_hash: otpHash, otp_expires_at: expiresAt, otp_attempts: 0, otp_requested_at: new Date().toISOString() })
        .eq('id', contract.id)
        .eq('status', 'awaiting_signature');
      if (updateError) throw updateError;
      await addEvent(service, contract, 'otp_sent', user.id, request, { expires_at: expiresAt });
      return jsonResponse(request, 200, { success: true, expiresAt, destination: email.replace(/^(.{2}).*(@.*)$/, '$1***$2') });
    }

    if (action === 'sign') {
      if (contract.status !== 'awaiting_signature') {
        return jsonResponse(request, 200, {
          contract: publicContract(contract),
          downloadUrl: await signedUrl(service, contract.signed_document_path || contract.document_path),
          alreadySigned: true,
        });
      }
      const code = text(payload.code).replace(/\D/g, '');
      const signerName = text(payload.signerName).slice(0, 160);
      const signerTitle = text(payload.signerTitle).slice(0, 160);
      const acceptedContract = payload.acceptedContract === true;
      const acceptedCgv = payload.acceptedCgv === true;
      const acceptedCgu = payload.acceptedCgu === true;
      const acceptedPrivacyDpa = payload.acceptedPrivacyDpa === true;
      if (signerName.length < 2 || signerTitle.length < 2) throw new Error('Le nom et la qualite du signataire sont requis.');
      if (!acceptedContract || !acceptedCgv || !acceptedCgu || !acceptedPrivacyDpa) {
        throw new Error('Chaque document contractuel doit etre accepte explicitement.');
      }
      if (!/^\d{6}$/.test(code) || !contract.otp_hash || !contract.otp_expires_at) throw new Error('Code de signature invalide.');
      if (new Date(contract.otp_expires_at).getTime() < Date.now()) throw new Error('Le code a expire. Demandez un nouveau code.');
      if (contract.otp_attempts >= 5) throw new Error('Trop de tentatives. Demandez un nouveau code.');
      const receivedHash = await sha256(`${config.serviceRoleKey}:${contract.id}:${code}`);
      if (receivedHash !== contract.otp_hash) {
        await service.from('subscription_contracts').update({ otp_attempts: contract.otp_attempts + 1 }).eq('id', contract.id);
        await addEvent(service, contract, 'otp_rejected', user.id, request, { attempt: contract.otp_attempts + 1 });
        throw new Error('Le code saisi est incorrect.');
      }

      const { data: originalBlob, error: downloadError } = await service.storage.from(BUCKET).download(contract.document_path);
      if (downloadError || !originalBlob) throw new Error('Le document contractuel original est indisponible.');
      const originalBytes = new Uint8Array(await originalBlob.arrayBuffer());
      const currentHash = await sha256(originalBytes);
      if (currentHash !== contract.document_sha256) throw new Error('L integrite du contrat original ne peut pas etre confirmee.');
      const signedAt = new Date().toISOString();
      const ip = sourceIp(request);
      const agent = userAgent(request);
      const signerEmail = normalizeEmail(contract.signer_email || contract.client_snapshot.contact_email || user.email);
      const payloadHash = await sha256(JSON.stringify({
        contractId: contract.id,
        reference: contract.reference,
        originalHash: contract.document_sha256,
        signerUserId: user.id,
        signerName,
        signerEmail,
        signerTitle,
        signedAt,
        ip,
        userAgent: agent,
        acceptedContract,
        acceptedCgv,
        acceptedCgu,
        acceptedPrivacyDpa,
        otpVerified: true,
      }));
      const signedBytes = await appendSignaturePage(originalBytes, {
        reference: contract.reference,
        signerName,
        signerEmail,
        signerTitle,
        signedAt,
        ip,
        userAgent: agent,
        originalHash: contract.document_sha256,
        payloadHash,
      });
      const signedHash = await sha256(signedBytes);
      const signedPath = `${organizationId}/contracts/${contract.id}/contrat-signe-${contract.reference}.pdf`;
      const { error: signedUploadError } = await service.storage.from(BUCKET).upload(signedPath, signedBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });
      if (signedUploadError) throw new Error(`Le contrat signe n a pas pu etre archive : ${signedUploadError.message}`);
      const { data: signed, error: signedError } = await service
        .from('subscription_contracts')
        .update({
          status: 'signed',
          signed_document_path: signedPath,
          signed_document_sha256: signedHash,
          signer_user_id: user.id,
          signer_name: signerName,
          signer_email: signerEmail,
          signer_title: signerTitle,
          accepted_contract: true,
          accepted_cgv: true,
          accepted_cgu: true,
          accepted_privacy_dpa: true,
          otp_hash: null,
          otp_expires_at: null,
          otp_verified_at: signedAt,
          signed_at: signedAt,
          signer_ip: ip || null,
          signer_user_agent: agent || null,
          signature_payload_sha256: payloadHash,
        })
        .eq('id', contract.id)
        .eq('status', 'awaiting_signature')
        .select('*')
        .single();
      if (signedError || !signed) {
        await service.storage.from(BUCKET).remove([signedPath]);
        throw new Error(signedError?.message ?? 'La signature n a pas pu etre finalisee.');
      }
      const signedRow = signed as ContractRow;
      await addEvent(service, signedRow, 'contract_signed', user.id, request, {
        original_sha256: contract.document_sha256,
        signed_sha256: signedHash,
        signature_payload_sha256: payloadHash,
        otp_verified: true,
      });
      let emailDelivered = true;
      try {
        await sendBrevoEmail({
          to: signerEmail,
          subject: `Votre contrat NCR Suite signe - ${contract.reference}`,
          tag: 'subscription-contract-signed',
          attachment: { name: `Contrat-NCR-Suite-${contract.reference}-signe.pdf`, bytes: signedBytes },
          html: `<!doctype html><html lang="fr"><body style="margin:0;background:#f2f5f7;font-family:Arial,sans-serif;color:#14222d"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #dfe5e9"><tr><td style="padding:24px 30px;background:#14222d;color:#fff;font-size:22px;font-weight:700">NCR Suite</td></tr><tr><td style="padding:34px 30px"><p style="margin:0 0 8px;color:#0878f9;font-size:11px;font-weight:700;text-transform:uppercase">Contrat finalise</p><h1 style="margin:0 0 18px;font-size:27px">Votre exemplaire signe</h1><p style="margin:0;color:#52616c;font-size:15px;line-height:1.65">Le contrat <strong>${escapeHtml(contract.reference)}</strong> a ete signe le ${escapeHtml(shortDate(signedAt))}. Votre exemplaire et sa preuve de signature sont joints a cet e-mail.</p><p style="margin:22px 0 0;color:#77848d;font-size:12px">Conservez ce document avec vos pieces contractuelles.</p></td></tr><tr><td style="padding:18px 30px;border-top:1px solid #e5eaed;color:#7b8790;font-size:11px">NCR Suite · ncr-suite.fr · contact@ncr-suite.fr</td></tr></table></td></tr></table></body></html>`,
        });
        await addEvent(service, signedRow, 'signed_copy_emailed', user.id, request, {});
      } catch (emailError) {
        emailDelivered = false;
        await addEvent(service, signedRow, 'signed_copy_email_failed', user.id, request, {
          error: emailError instanceof Error ? emailError.message.slice(0, 300) : 'Erreur inconnue',
        });
      }
      return jsonResponse(request, 200, {
        contract: publicContract(signedRow),
        downloadUrl: await signedUrl(service, signedPath),
        emailDelivered,
      });
    }

    return jsonResponse(request, 400, { error: 'Action contractuelle inconnue.' });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Le service de signature est indisponible.';
    console.error('subscription_contract_failed', message);
    return jsonResponse(request, 400, { error: message });
  }
});
