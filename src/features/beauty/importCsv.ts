export type BeautyImportSource = 'planity' | 'booksy' | 'treatwell' | 'csv';
export type BeautyImportKind = 'clients' | 'appointments';

export interface ParsedDelimitedFile {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
}

export interface MappingField {
  key: string;
  label: string;
  required?: boolean;
  aliases: string[];
  help?: string;
}

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_./\\-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function delimiterScore(text: string, delimiter: string) {
  let score = 0;
  let quoted = false;
  const sample = text.slice(0, 8000);
  for (let index = 0; index < sample.length; index += 1) {
    const char = sample[index];
    if (char === '"') {
      if (quoted && sample[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && char === delimiter) {
      score += 1;
    } else if (!quoted && (char === '\n' || char === '\r')) {
      if (score > 0) break;
    }
  }
  return score;
}

function detectDelimiter(text: string) {
  const candidates = [';', ',', '\t', '|'];
  return candidates
    .map((delimiter) => ({ delimiter, score: delimiterScore(text, delimiter) }))
    .sort((a, b) => b.score - a.score)[0]?.delimiter || ';';
}

export function parseDelimitedText(source: string): ParsedDelimitedFile {
  const text = source.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
  const matrix: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(value);
      value = '';
      continue;
    }

    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value);
      value = '';
      if (row.some((cell) => cell.trim() !== '')) matrix.push(row);
      row = [];
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== '')) matrix.push(row);

  if (matrix.length === 0) throw new Error('Le fichier est vide.');

  const rawHeaders = matrix[0].map((cell, index) => cell.trim() || `Colonne ${index + 1}`);
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((header) => {
    const count = seen.get(header) ?? 0;
    seen.set(header, count + 1);
    return count === 0 ? header : `${header} (${count + 1})`;
  });

  const rows = matrix.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? '').trim();
    });
    return record;
  }).filter((record) => Object.values(record).some((cell) => cell !== ''));

  return { headers, rows, delimiter };
}

export const clientMappingFields: MappingField[] = [
  { key: 'external_id', label: 'Identifiant source', aliases: ['id client','client id','customer id','id customer','identifiant client','id'] },
  { key: 'first_name', label: 'Prénom', aliases: ['prenom','first name','firstname','first_name','client prenom','customer first name'] },
  { key: 'last_name', label: 'Nom', aliases: ['nom','last name','lastname','last_name','surname','client nom','customer last name'] },
  { key: 'full_name', label: 'Nom complet', aliases: ['nom complet','full name','client','client name','customer','customer name','name'] },
  { key: 'email', label: 'E-mail', aliases: ['email','e mail','e-mail','mail','client email','customer email'] },
  { key: 'phone', label: 'Téléphone', aliases: ['telephone','tel','phone','mobile','portable','client telephone','customer phone'] },
  { key: 'birth_date', label: 'Date de naissance', aliases: ['date de naissance','naissance','birth date','birthday','date naissance'] },
  { key: 'notes', label: 'Notes', aliases: ['notes','note','commentaire','commentaires','comments','customer notes'] }
];

export const appointmentMappingFields: MappingField[] = [
  { key: 'external_id', label: 'Identifiant RDV', aliases: ['id rdv','appointment id','booking id','reservation id','id reservation','id'] },
  { key: 'client_first_name', label: 'Prénom client', aliases: ['prenom client','client prenom','customer first name','first name','firstname'] },
  { key: 'client_last_name', label: 'Nom client', aliases: ['nom client','client nom','customer last name','last name','lastname','surname'] },
  { key: 'client_full_name', label: 'Nom complet client', aliases: ['client','client name','customer','customer name','nom complet','full name'] },
  { key: 'client_email', label: 'E-mail client', aliases: ['email','e mail','e-mail','client email','customer email'] },
  { key: 'client_phone', label: 'Téléphone client', aliases: ['telephone','tel','phone','mobile','client telephone','customer phone'] },
  { key: 'service_name', label: 'Prestation', required: true, aliases: ['prestation','service','service name','treatment','traitement'] },
  { key: 'staff_name', label: 'Collaborateur', aliases: ['collaborateur','staff','employee','professional','professionnel','provider','praticien'] },
  { key: 'site_name', label: 'Établissement', aliases: ['etablissement','salon','location','site','venue','branch','adresse salon'] },
  { key: 'starts_at', label: 'Date + heure', aliases: ['date heure','date et heure','datetime','appointment datetime','booking datetime','start','starts at','start time'] },
  { key: 'appointment_date', label: 'Date du RDV', aliases: ['date','date rdv','appointment date','booking date','reservation date'] },
  { key: 'appointment_time', label: 'Heure du RDV', aliases: ['heure','heure rdv','time','appointment time','booking time'] },
  { key: 'duration_minutes', label: 'Durée (min)', aliases: ['duree','duration','duration minutes','minutes','duree minutes'] },
  { key: 'amount_euros', label: 'Montant / prix', aliases: ['prix','price','amount','montant','total','total price','price eur'] },
  { key: 'status', label: 'Statut', aliases: ['statut','status','booking status','appointment status'] },
  { key: 'notes', label: 'Notes', aliases: ['notes','note','commentaire','commentaires','comments'] }
];

export function autoMapHeaders(headers: string[], fields: MappingField[]) {
  const normalized = headers.map((header) => ({ header, normalized: normalizeHeader(header) }));
  const result: Record<string, string> = {};

  fields.forEach((field) => {
    const aliases = field.aliases.map(normalizeHeader);
    const exact = normalized.find((candidate) => aliases.includes(candidate.normalized));
    if (exact) {
      result[field.key] = exact.header;
      return;
    }

    const fuzzy = normalized.find((candidate) =>
      aliases.some((alias) => alias.length >= 5 && (
        candidate.normalized.startsWith(alias + ' ')
        || candidate.normalized.endsWith(' ' + alias)
      ))
    );
    if (fuzzy) result[field.key] = fuzzy.header;
  });

  return result;
}

function normalizeDatePart(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const iso = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  const fr = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (fr) {
    const year = fr[3].length === 2 ? `20${fr[3]}` : fr[3];
    return `${year}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}`;
  }

  return '';
}

function normalizeTimePart(value: string) {
  const match = value.trim().match(/(\d{1,2})[:hH](\d{2})(?::(\d{2}))?/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}:${match[3] || '00'}`;
}

export function normalizeBirthDate(value: string) {
  return normalizeDatePart(value);
}

export function normalizeAppointmentDateTime(combined: string, date: string, time: string) {
  const direct = combined.trim();
  if (direct) {
    const isoLike = direct.match(/^(\d{4}-\d{1,2}-\d{1,2})[ T](\d{1,2}:\d{2})(?::(\d{2}))?/);
    if (isoLike) {
      const datePart = normalizeDatePart(isoLike[1]);
      const timePart = normalizeTimePart(`${isoLike[2]}:${isoLike[3] || '00'}`);
      if (datePart && timePart) return `${datePart}T${timePart}`;
    }

    const frLike = direct.match(/^(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})[^0-9]+(\d{1,2}[:hH]\d{2}(?::\d{2})?)/);
    if (frLike) {
      const datePart = normalizeDatePart(frLike[1]);
      const timePart = normalizeTimePart(frLike[2]);
      if (datePart && timePart) return `${datePart}T${timePart}`;
    }
  }

  const datePart = normalizeDatePart(date);
  const timePart = normalizeTimePart(time);
  return datePart && timePart ? `${datePart}T${timePart}` : '';
}

export function splitFullName(value: string, order: 'first_last' | 'last_first') {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return { firstName: '', lastName: '' };

  if (cleaned.includes(',')) {
    const [left, ...rest] = cleaned.split(',');
    const right = rest.join(',').trim();
    if (right) return { firstName: right, lastName: left.trim() };
  }

  const parts = cleaned.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };

  if (order === 'last_first') {
    return { firstName: parts.slice(1).join(' '), lastName: parts[0] };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function eurosToCents(value: string) {
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/[€$£]/g, '')
    .replace(/[^0-9,.-]/g, '')
    .replace(',', '.');
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
}

export function durationToMinutes(value: string) {
  const cleaned = value.trim().toLowerCase();
  if (!cleaned) return '';
  const hours = cleaned.match(/(\d+(?:[.,]\d+)?)\s*h/);
  const minutes = cleaned.match(/(\d+)\s*(?:min|mn)/);
  if (hours || minutes) {
    const total = Math.round((hours ? Number(hours[1].replace(',', '.')) * 60 : 0) + (minutes ? Number(minutes[1]) : 0));
    return String(Math.max(5, total));
  }
  const numeric = Number(cleaned.replace(',', '.').replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? String(Math.max(5, Math.round(numeric))) : '';
}

export function sourceLabel(source: BeautyImportSource) {
  if (source === 'planity') return 'Planity';
  if (source === 'booksy') return 'Booksy';
  if (source === 'treatwell') return 'Treatwell';
  return 'CSV';
}
