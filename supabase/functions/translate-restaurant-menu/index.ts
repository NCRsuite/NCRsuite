// NCR Suite V2.8.1 — traduction automatique du menu Restauration
import { createClient } from 'npm:@supabase/supabase-js@2.110.2';

type TranslationRequest = {
  organization_id: string;
  segments: Record<string, string>;
};

type TargetLanguage = 'en' | 'es' | 'it';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function cleanText(value: unknown, maxLength = 3000) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function decodeHtml(value: string) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function translateWithDeepL(values: string[], target: TargetLanguage, apiKey: string) {
  const endpoint = Deno.env.get('DEEPL_API_URL') || (apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate');
  const targetLang = target === 'en' ? 'EN-US' : target.toUpperCase();
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'NCR-Suite/2.8.1',
    },
    body: JSON.stringify({
      text: values,
      source_lang: 'FR',
      target_lang: targetLang,
      preserve_formatting: true,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`DeepL ${response.status}: ${String(payload?.message || 'traduction indisponible')}`);
  }
  const translations = Array.isArray(payload?.translations) ? payload.translations : [];
  if (translations.length !== values.length) throw new Error('Réponse DeepL incomplète.');
  return translations.map((row: { text?: string }) => cleanText(row?.text));
}

function splitForMyMemory(value: string, maxBytes = 450) {
  const encoder = new TextEncoder();
  const words = cleanText(value).split(' ');
  const chunks: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (encoder.encode(candidate).length <= maxBytes) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    if (encoder.encode(word).length <= maxBytes) {
      current = word;
      continue;
    }
    let fragment = '';
    for (const character of [...word]) {
      const next = fragment + character;
      if (encoder.encode(next).length > maxBytes) {
        if (fragment) chunks.push(fragment);
        fragment = character;
      } else fragment = next;
    }
    current = fragment;
  }
  if (current) chunks.push(current);
  return chunks;
}

async function translateMyMemoryChunk(value: string, target: TargetLanguage) {
  const params = new URLSearchParams({ q: value, langpair: `fr|${target}`, mt: '1' });
  const contact = cleanText(Deno.env.get('TRANSLATION_CONTACT_EMAIL'), 180);
  if (contact) params.set('de', contact);
  const response = await fetchWithTimeout(`https://api.mymemory.translated.net/get?${params.toString()}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'NCR-Suite/2.8.1' },
  });
  const payload = await response.json().catch(() => ({}));
  const translated = cleanText(payload?.responseData?.translatedText);
  if (!response.ok || !translated || Number(payload?.responseStatus ?? 200) >= 400) {
    throw new Error(String(payload?.responseDetails || `MyMemory ${response.status}`));
  }
  return decodeHtml(translated);
}

async function translateWithMyMemory(value: string, target: TargetLanguage) {
  const translatedChunks: string[] = [];
  for (const chunk of splitForMyMemory(value)) translatedChunks.push(await translateMyMemoryChunk(chunk, target));
  return translatedChunks.join(' ').trim();
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Configuration Supabase incomplète.' }, 500);

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Session utilisateur absente.' }, 401);

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await service.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return json({ error: 'Session utilisateur invalide.' }, 401);

  let input: TranslationRequest;
  try {
    input = await request.json() as TranslationRequest;
  } catch {
    return json({ error: 'Corps de requête invalide.' }, 400);
  }

  const organizationId = cleanText(input.organization_id, 80);
  const sourceEntries = Object.entries(input.segments ?? {})
    .map(([key, value]) => [cleanText(key, 40), cleanText(value, 3000)] as const)
    .filter(([key, value]) => Boolean(key && value));
  if (!organizationId || sourceEntries.length === 0 || sourceEntries.length > 6) {
    return json({ error: 'Organisation ou textes à traduire invalides.' }, 400);
  }

  const { data: membership, error: membershipError } = await service
    .from('organization_members')
    .select('role,status')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (membershipError || !membership || !['owner', 'admin', 'manager'].includes(String(membership.role))) {
    return json({ error: 'Accès insuffisant pour traduire le menu.' }, 403);
  }

  const { data: organization, error: organizationError } = await service
    .from('organizations')
    .select('id,business_type,plan,status')
    .eq('id', organizationId)
    .eq('business_type', 'restauration')
    .in('status', ['trial', 'active'])
    .maybeSingle();
  if (organizationError || !organization) return json({ error: 'Espace Restauration introuvable.' }, 404);

  const { data: enabled, error: featureError } = await service.rpc('organization_has_plan_feature', {
    p_organization_id: organizationId,
    p_feature: 'restaurant_multilingual_qr_menu',
  });
  if (featureError || !enabled) return json({ error: 'La traduction automatique nécessite l’offre Essentielle.' }, 403);

  const keys = sourceEntries.map(([key]) => key);
  const values = sourceEntries.map(([, value]) => value);
  const deeplKey = cleanText(Deno.env.get('DEEPL_API_KEY'), 300);
  const provider = deeplKey ? 'deepl' : 'mymemory';
  const result: Record<TargetLanguage, Record<string, string>> = { en: {}, es: {}, it: {} };

  try {
    for (const target of ['en', 'es', 'it'] as TargetLanguage[]) {
      const translatedValues = deeplKey
        ? await translateWithDeepL(values, target, deeplKey)
        : await Promise.all(values.map((value) => translateWithMyMemory(value, target)));
      translatedValues.forEach((value, index) => { result[target][keys[index]] = value; });
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    return json({ error: `Traduction impossible : ${message}` }, 502);
  }

  return json({ success: true, provider, translations: result });
});
