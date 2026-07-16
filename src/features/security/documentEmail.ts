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
  const pdfBase64 = await blobToBase64(input.blob);
  const { data, error } = await supabase.functions.invoke('send-security-document', {
    body: {
      organization_id: input.organizationId,
      document_kind: input.documentKind,
      document_id: input.documentId,
      recipient_email: input.recipientEmail,
      recipient_name: input.recipientName || null,
      subject: input.subject,
      message: input.message,
      filename: input.filename,
      pdf_base64: pdfBase64,
      copy_sender: Boolean(input.copySender)
    }
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data as { success: true; message_id?: string; sent_at?: string };
}
