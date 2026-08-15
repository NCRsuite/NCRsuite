import { supabase } from '../../lib/supabase';

const MAX_SOURCE_SIZE = 25 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 8 * 1024 * 1024;
const MAX_DIMENSION = 2200;

export type SecurityShiftProofType = 'clock_in_photo' | 'clock_out_photo' | 'clock_out_signature';

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Cette image ne peut pas être lue sur cet appareil.')); };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Le fichier n’a pas pu être préparé.')), type, quality);
  });
}

export async function prepareSecurityShiftPhoto(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Sélectionne uniquement une photo.');
  if (file.size > MAX_SOURCE_SIZE) throw new Error('La photo est trop volumineuse.');
  const image = await loadImage(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error('La photo est vide ou illisible.');
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('La photo ne peut pas être préparée sur cet appareil.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let blob = await canvasToBlob(canvas, 'image/jpeg', 0.84);
  if (blob.size > MAX_OUTPUT_SIZE) blob = await canvasToBlob(canvas, 'image/jpeg', 0.66);
  if (blob.size > MAX_OUTPUT_SIZE) throw new Error('La photo reste trop volumineuse après optimisation.');
  return new File([blob], 'preuve-poste.jpg', { type: 'image/jpeg', lastModified: Date.now() });
}

export async function signatureCanvasToFile(canvas: HTMLCanvasElement) {
  const blob = await canvasToBlob(canvas, 'image/png');
  return new File([blob], 'signature-fin-poste.png', { type: 'image/png', lastModified: Date.now() });
}

export async function uploadSecurityShiftProof(
  organizationId: string,
  shiftId: string,
  proofType: SecurityShiftProofType,
  file: File
) {
  if (!supabase) throw new Error('Supabase indisponible.');
  const extension = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${organizationId}/${shiftId}/${proofType}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('security-shift-proofs').upload(path, file, {
    contentType: file.type || (extension === 'png' ? 'image/png' : 'image/jpeg'),
    cacheControl: '3600',
    upsert: false
  });
  if (uploadError) throw uploadError;

  const { data, error: attachError } = await supabase.rpc('attach_security_shift_proof', {
    p_organization_id: organizationId,
    p_shift_id: shiftId,
    p_proof_type: proofType,
    p_storage_path: path,
    p_file_name: file.name,
    p_mime_type: file.type,
    p_size_bytes: file.size
  });
  if (attachError) {
    try { await supabase.storage.from('security-shift-proofs').remove([path]); } catch { /* best effort */ }
    throw attachError;
  }
  return data;
}
