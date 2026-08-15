import { supabase } from '../../lib/supabase';

const MAX_SOURCE_SIZE = 25 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 8 * 1024 * 1024;
const MAX_DIMENSION = 2400;
export const MAX_SECURITY_LOGBOOK_PHOTOS = 3;

export interface SecurityLogbookPhotoRecord {
  id: string;
  organization_id: string;
  entry_id: string;
  shift_id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  signed_url?: string | null;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Ce format photo ne peut pas être lu sur cet appareil.')); };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('La photo n’a pas pu être préparée.')), 'image/jpeg', quality);
  });
}

export async function prepareSecurityLogbookPhoto(file: File, index = 1) {
  if (!file.type.startsWith('image/')) throw new Error('Sélectionne uniquement une photo.');
  if (file.size > MAX_SOURCE_SIZE) throw new Error('La photo est trop volumineuse. Prends une nouvelle photo plus légère.');

  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) throw new Error('La photo sélectionnée est vide ou illisible.');

  const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('La photo ne peut pas être préparée sur cet appareil.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let blob = await canvasToBlob(canvas, 0.84);
  if (blob.size > MAX_OUTPUT_SIZE) blob = await canvasToBlob(canvas, 0.68);
  if (blob.size > MAX_OUTPUT_SIZE) throw new Error('La photo reste trop volumineuse après optimisation.');

  return new File([blob], `main-courante-${index}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

export async function uploadSecurityLogbookPhotos(
  organizationId: string,
  shiftId: string,
  entryId: string,
  files: File[]
) {
  if (!supabase) throw new Error('Supabase indisponible.');
  const uploaded: SecurityLogbookPhotoRecord[] = [];

  for (const [index, file] of files.slice(0, MAX_SECURITY_LOGBOOK_PHOTOS).entries()) {
    const path = `${organizationId}/${shiftId}/${entryId}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('security-logbook-photos').upload(path, file, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false
    });
    if (uploadError) throw uploadError;

    const { data, error: attachError } = await supabase.rpc('attach_security_logbook_photo', {
      p_organization_id: organizationId,
      p_entry_id: entryId,
      p_storage_path: path,
      p_file_name: file.name || `main-courante-${index + 1}.jpg`,
      p_mime_type: file.type || 'image/jpeg',
      p_size_bytes: file.size
    });
    if (attachError) {
      try { await supabase.storage.from('security-logbook-photos').remove([path]); } catch { /* nettoyage opportuniste */ }
      throw attachError;
    }
    if (data) {
      const record = data as SecurityLogbookPhotoRecord;
      const { data: signed, error: signedError } = await supabase.storage
        .from('security-logbook-photos')
        .createSignedUrl(record.storage_path, 900);
      uploaded.push({ ...record, signed_url: signedError ? null : signed?.signedUrl ?? null });
    }
  }

  return uploaded;
}

export async function loadSecurityLogbookPhotoMap(organizationId: string, entryIds: string[]) {
  const map = new Map<string, SecurityLogbookPhotoRecord[]>();
  if (!supabase || entryIds.length === 0) return map;

  const { data, error } = await supabase
    .from('security_logbook_photos')
    .select('id,organization_id,entry_id,shift_id,storage_path,file_name,mime_type,size_bytes,created_at')
    .eq('organization_id', organizationId)
    .in('entry_id', entryIds)
    .order('created_at', { ascending: true });
  if (error) throw error;

  for (const row of (data ?? []) as SecurityLogbookPhotoRecord[]) {
    const { data: signed, error: signedError } = await supabase.storage.from('security-logbook-photos').createSignedUrl(row.storage_path, 900);
    const record = { ...row, signed_url: signedError ? null : signed?.signedUrl ?? null };
    const list = map.get(row.entry_id) ?? [];
    list.push(record);
    map.set(row.entry_id, list);
  }
  return map;
}
