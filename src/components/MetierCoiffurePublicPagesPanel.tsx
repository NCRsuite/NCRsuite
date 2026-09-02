import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';

interface PublicCompanyConfig {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  booking_enabled: boolean;
  public_slug: string | null;
  public_page_enabled: boolean;
  public_tagline: string | null;
  public_description: string | null;
  public_banner_url: string | null;
  public_hours_text: string | null;
  public_practical_info: string | null;
  site_count: number;
  staff_count: number;
  service_count: number;
}

interface PublicPagesConfig {
  companies: PublicCompanyConfig[];
}

type Draft = {
  enabled: boolean;
  slug: string;
  tagline: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  hours: string;
  practicalInfo: string;
};

type MediaKind = 'logo' | 'banner';

const acceptedImageTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif'
];

function toDraft(company: PublicCompanyConfig): Draft {
  return {
    enabled: Boolean(company.public_page_enabled),
    slug: company.public_slug ?? '',
    tagline: company.public_tagline ?? '',
    description: company.public_description ?? '',
    logoUrl: company.logo_url ?? '',
    bannerUrl: company.public_banner_url ?? '',
    hours: company.public_hours_text ?? '',
    practicalInfo: company.public_practical_info ?? ''
  };
}

function imageExtension(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

async function convertAppleImageIfNeeded(file: File) {
  if (!['image/heic', 'image/heif'].includes(file.type)) return file;

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Cette photo HEIC ne peut pas être convertie sur cet appareil. Utilisez une image JPG, PNG ou WebP.'));
      element.src = sourceUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Conversion de l’image impossible.');
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) throw new Error('Conversion de l’image impossible.');
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function MediaPicker({
  label,
  help,
  value,
  file,
  acceptLabel,
  onFile,
  onRemove
}: {
  label: string;
  help: string;
  value: string;
  file: File | null;
  acceptLabel: string;
  onFile: (file: File | null) => void;
  onRemove: () => void;
}) {
  const preview = useMemo(() => file ? URL.createObjectURL(file) : value, [file, value]);

  useEffect(() => {
    return () => {
      if (file && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [file, preview]);

  return (
    <div className="metier-public-media-field full">
      <div className="metier-public-media-copy">
        <strong>{label}</strong>
        <small>{help}</small>
      </div>
      <div className={`metier-public-media-preview${label.toLowerCase().includes('couverture') ? ' banner' : ''}`}>
        {preview ? <img src={preview} alt="" /> : <span><Icon name="camera" size={22} /> Aucune image</span>}
      </div>
      <div className="metier-public-media-actions">
        <label className="secondary-button compact-button">
          <Icon name="camera" size={15} /> {preview ? 'Remplacer' : 'Importer'}
          <input
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif,image/*"
            onChange={(event) => {
              onFile(event.target.files?.[0] ?? null);
              event.currentTarget.value = '';
            }}
          />
        </label>
        {preview && <button type="button" className="danger-text-button" onClick={onRemove}>Retirer</button>}
        <span>{file ? file.name : acceptLabel}</span>
      </div>
    </div>
  );
}

export function MetierCoiffurePublicPagesPanel() {
  const location = useLocation();
  const { organization } = useOrganization();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [companies, setCompanies] = useState<PublicCompanyConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [logoFiles, setLogoFiles] = useState<Record<string, File | null>>({});
  const [bannerFiles, setBannerFiles] = useState<Record<string, File | null>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const active = organization?.plan === 'metier'
    && organization?.business_type === 'coiffure'
    && ['owner', 'admin'].includes(organization?.role ?? 'viewer')
    && location.pathname === '/offre-metier'
    && !new URLSearchParams(location.search).get('view');

  async function load() {
    if (!active || !organization || !supabase) return;
    const { data, error: requestError } = await supabase.rpc('metier_simple_configuration', { p_organization_id: organization.id });
    if (requestError) {
      setError(requestError.message);
      return;
    }
    const next = ((data ?? { companies: [] }) as PublicPagesConfig).companies ?? [];
    setCompanies(next);
    const nextDrafts: Record<string, Draft> = {};
    next.forEach((company) => { nextDrafts[company.id] = toDraft(company); });
    setDrafts(nextDrafts);
  }

  useEffect(() => { void load(); }, [active, organization?.id]);

  useEffect(() => {
    if (!active) {
      setHost(null);
      return;
    }
    let node: HTMLElement | null = null;
    function mount() {
      const page = document.querySelector<HTMLElement>('.metier-simple-page');
      if (!page || node) return;
      node = document.createElement('div');
      node.className = 'metier-public-pages-host';
      page.appendChild(node);
      setHost(node);
    }
    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      node?.remove();
      setHost(null);
    };
  }, [active, organization?.id]);

  const publishedCount = useMemo(() => companies.filter((company) => company.public_page_enabled).length, [companies]);

  function updateDraft(companyId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [companyId]: { ...current[companyId], ...patch }
    }));
  }

  function selectMedia(companyId: string, file: File | null, kind: MediaKind) {
    if (!file) return;
    setError('');
    const maxSize = kind === 'logo' ? 2 * 1024 * 1024 : 8 * 1024 * 1024;
    if (!acceptedImageTypes.includes(file.type) && !file.type.startsWith('image/')) {
      setError('Choisissez une image PNG, JPG, WebP ou une photo compatible.');
      return;
    }
    if (file.size > maxSize) {
      setError(kind === 'logo' ? 'Le logo ne doit pas dépasser 2 Mo.' : 'La couverture ne doit pas dépasser 8 Mo.');
      return;
    }
    if (kind === 'logo') setLogoFiles((current) => ({ ...current, [companyId]: file }));
    else setBannerFiles((current) => ({ ...current, [companyId]: file }));
  }

  function removeMedia(companyId: string, kind: MediaKind) {
    if (kind === 'logo') {
      setLogoFiles((current) => ({ ...current, [companyId]: null }));
      updateDraft(companyId, { logoUrl: '' });
    } else {
      setBannerFiles((current) => ({ ...current, [companyId]: null }));
      updateDraft(companyId, { bannerUrl: '' });
    }
  }

  async function uploadMedia(company: PublicCompanyConfig, file: File, kind: MediaKind) {
    if (!organization || !supabase) throw new Error('Le service de fichiers est indisponible.');
    const normalized = await convertAppleImageIfNeeded(file);
    const path = `${organization.id}/public-company-${company.id}-${kind}-${Date.now()}.${imageExtension(normalized)}`;
    const { error: uploadError } = await supabase.storage
      .from('organization-branding')
      .upload(path, normalized, { contentType: normalized.type, cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    return supabase.storage.from('organization-branding').getPublicUrl(path).data.publicUrl;
  }

  async function save(event: FormEvent, company: PublicCompanyConfig) {
    event.preventDefault();
    if (!organization || !supabase) return;
    const draft = drafts[company.id];
    if (!draft) return;
    setBusy(company.id);
    setError('');
    setMessage('');

    try {
      let nextLogoUrl = draft.logoUrl.trim() || null;
      let nextBannerUrl = draft.bannerUrl.trim() || null;
      const logoFile = logoFiles[company.id];
      const bannerFile = bannerFiles[company.id];

      if (logoFile) nextLogoUrl = await uploadMedia(company, logoFile, 'logo');
      if (bannerFile) nextBannerUrl = await uploadMedia(company, bannerFile, 'banner');

      const { data: savedSlug, error: requestError } = await supabase.rpc('metier_update_company_public_page', {
        p_organization_id: organization.id,
        p_company_id: company.id,
        p_public_page_enabled: draft.enabled,
        p_public_slug: draft.slug,
        p_public_tagline: draft.tagline || null,
        p_public_description: draft.description || null,
        p_public_banner_url: nextBannerUrl,
        p_public_hours_text: draft.hours || null,
        p_public_practical_info: draft.practicalInfo || null
      });
      if (requestError) throw requestError;

      const { error: logoError } = await supabase.rpc('metier_update_company_public_logo', {
        p_organization_id: organization.id,
        p_company_id: company.id,
        p_logo_url: nextLogoUrl
      });
      if (logoError) throw logoError;

      setLogoFiles((current) => ({ ...current, [company.id]: null }));
      setBannerFiles((current) => ({ ...current, [company.id]: null }));
      setMessage(`Page publique de ${company.name} enregistrée.`);
      if (typeof savedSlug === 'string') {
        setDrafts((current) => ({
          ...current,
          [company.id]: {
            ...current[company.id],
            slug: savedSlug,
            logoUrl: nextLogoUrl ?? '',
            bannerUrl: nextBannerUrl ?? ''
          }
        }));
      }
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible d’enregistrer cette page publique.');
    } finally {
      setBusy('');
    }
  }

  async function copyLink(company: PublicCompanyConfig) {
    const slug = drafts[company.id]?.slug || company.public_slug;
    if (!slug) return;
    const url = `${window.location.origin}/salon/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Lien public copié.');
    } catch {
      window.prompt('Copiez ce lien :', url);
    }
  }

  if (!active || !host) return null;

  return createPortal(
    <section className="metier-simple-section metier-public-pages-section">
      <div className="metier-simple-heading">
        <div>
          <p className="eyebrow">COIFFURE · PAGES PUBLIQUES</p>
          <h2>Une vitrine pour chaque entreprise</h2>
          <p>Chaque salon possède sa propre page publique avec identité, prestations, équipe, adresse et réservation.</p>
        </div>
        <span className="metier-public-count">{publishedCount} publiée{publishedCount > 1 ? 's' : ''}</span>
      </div>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      <div className="metier-public-company-list">
        {companies.map((company) => {
          const draft = drafts[company.id] ?? toDraft(company);
          const ready = company.site_count > 0 && company.staff_count > 0 && company.service_count > 0;
          const publicPath = `/salon/${draft.slug || company.public_slug || ''}`;
          return <article key={company.id} className="metier-public-company-card">
            <div className="metier-public-company-top">
              <span className="metier-public-company-logo" style={{ background: draft.logoUrl || logoFiles[company.id] ? '#fff' : company.primary_color }}>
                {draft.logoUrl ? <img src={draft.logoUrl} alt="" /> : company.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="metier-public-company-title">
                <strong>{company.name}</strong>
                <small>{ready ? 'Prête pour la réservation' : 'Complétez adresse, prestations et équipe'}</small>
              </div>
              <span className={draft.enabled ? 'metier-public-status published' : 'metier-public-status'}>{draft.enabled ? 'Publiée' : 'Masquée'}</span>
            </div>

            <div className="metier-public-company-link">
              <span>{window.location.origin}{publicPath}</span>
              <button type="button" onClick={() => void copyLink(company)}><Icon name="clipboard" size={15} /> Copier</button>
              {draft.enabled && draft.slug && <a href={publicPath} target="_blank" rel="noreferrer"><Icon name="eye" size={15} /> Ouvrir</a>}
            </div>

            <button type="button" className="metier-public-edit-toggle" onClick={() => setOpenId(openId === company.id ? null : company.id)}>
              <span><Icon name="settings" size={16} /> Personnaliser la page</span><Icon name={openId === company.id ? 'chevronDown' : 'chevronRight'} size={17} />
            </button>

            {openId === company.id && <form className="metier-public-editor" onSubmit={(event) => void save(event, company)}>
              <label className="metier-check-row full"><input type="checkbox" checked={draft.enabled} onChange={(event) => updateDraft(company.id, { enabled: event.target.checked })} /><span><strong>Publier la page</strong><small>Le salon reste visible même si la réservation en ligne est désactivée.</small></span></label>

              <MediaPicker
                label="Logo du salon"
                help="Affiché en haut de la page publique. PNG, JPG ou WebP · 2 Mo maximum."
                value={draft.logoUrl}
                file={logoFiles[company.id] ?? null}
                acceptLabel="PNG, JPG, WebP · 2 Mo max"
                onFile={(file) => selectMedia(company.id, file, 'logo')}
                onRemove={() => removeMedia(company.id, 'logo')}
              />

              <MediaPicker
                label="Image de couverture"
                help="Grande image affichée en haut de la vitrine. Les photos iPhone HEIC sont converties si possible."
                value={draft.bannerUrl}
                file={bannerFiles[company.id] ?? null}
                acceptLabel="Photo · 8 Mo max"
                onFile={(file) => selectMedia(company.id, file, 'banner')}
                onRemove={() => removeMedia(company.id, 'banner')}
              />

              <label>Adresse publique<div className="metier-public-slug-row"><span>/salon/</span><input value={draft.slug} onChange={(event) => updateDraft(company.id, { slug: event.target.value })} /></div></label>
              <label>Slogan<input value={draft.tagline} onChange={(event) => updateDraft(company.id, { tagline: event.target.value })} placeholder="Votre moment beauté, simplement." /></label>
              <label className="full">Présentation<textarea rows={4} value={draft.description} onChange={(event) => updateDraft(company.id, { description: event.target.value })} placeholder="Présentez le salon, son univers et ses spécialités." /></label>
              <label>Horaires<input value={draft.hours} onChange={(event) => updateDraft(company.id, { hours: event.target.value })} placeholder="Lun–Sam · 9h–19h" /></label>
              <label>Infos pratiques<input value={draft.practicalInfo} onChange={(event) => updateDraft(company.id, { practicalInfo: event.target.value })} placeholder="Parking, accès, étage…" /></label>
              <div className="metier-public-editor-actions full"><button className="primary-button" type="submit" disabled={busy === company.id}>{busy === company.id ? 'Import et enregistrement…' : 'Enregistrer la page'}</button></div>
            </form>}
          </article>;
        })}
      </div>
    </section>,
    host
  );
}
