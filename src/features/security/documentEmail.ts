import { supabase } from '../../lib/supabase';

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Lecture du PDF impossible.'));
    reader.readAsDataURL(blob);
  });
}

async function functionErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : String(error || 'Erreur d’envoi inconnue.');
  if (!error || typeof error !== 'object') return fallback;
  const context = (error as { context?: unknown }).context as { clone?: () => Response; json?: () => Promise<unknown>; text?: () => Promise<string> } | undefined;
  try {
    const response = context?.clone ? context.clone() : context;
    if (response?.json) {
      const body = await response.json() as { error?: unknown; message?: unknown };
      const detail = String(body?.error || body?.message || '').trim();
      if (detail) return detail;
    }
  } catch {
    try {
      const response = context?.clone ? context.clone() : context;
      const text = response?.text ? await response.text() : '';
      if (text.trim()) return text.trim().slice(0, 1000);
    } catch { /* le message Supabase reste disponible */ }
  }
  return fallback;
}

export async function sendSecurityDocumentEmail(input: {
  organizationId: string;
  documentKind: 'invoice' | 'quote';
  documentId: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  message: string;
  filename: string;
  blob: Blob;
  copySender?: boolean;
}) {
  if (!supabase) throw new Error('Supabase est indisponible.');
  if (!input.recipientEmail.trim()) throw new Error('L’adresse e-mail du destinataire est obligatoire.');
  const pdfBase64 = await blobToBase64(input.blob);
  const body = {
    organization_id: input.organizationId,
    document_kind: input.documentKind,
    document_id: input.documentId,
    recipient_email: input.recipientEmail.trim().toLowerCase(),
    recipient_name: input.recipientName || null,
    subject: input.subject.trim(),
    message: input.message.trim(),
    filename: input.filename,
    pdf_base64: pdfBase64,
    copy_sender: Boolean(input.copySender)
  };

  async function invoke(accessToken: string) {
    return supabase!.functions.invoke('send-security-document-v2', {
      body,
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  let { data: sessionData } = await supabase.auth.getSession();
  let accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Ta session a expiré. Reconnecte-toi avant l’envoi.');

  let response = await invoke(accessToken);
  if (response.error && /jwt|session|401|unauthor/i.test(response.error.message)) {
    const refreshed = await supabase.auth.refreshSession();
    accessToken = refreshed.data.session?.access_token;
    if (accessToken) response = await invoke(accessToken);
  }
  if (response.error) {
    const detail = await functionErrorMessage(response.error);
    if (/requested function was not found|function not found|404/i.test(detail)) {
      throw new Error('Le service d’envoi send-security-document-v2 n’est pas déployé dans Supabase. Déploie la fonction fournie avec la V2.6.5 puis réessaie.');
    }
    throw new Error(detail);
  }
  if (response.data?.error) throw new Error(String(response.data.error));
  if (!response.data?.success) throw new Error('Le serveur n’a pas confirmé l’envoi du document.');
  return response.data as { success: true; message_id?: string; sent_at?: string };
}
