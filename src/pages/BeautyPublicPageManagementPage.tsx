import { FormEvent, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';

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
  public_banner_position_x: number;
  public_banner_position_y: number;
  public_banner_landscape_zoom: number;
  public_banner_portrait_position_x: number;
  public_banner_portrait_position_y: number;
  public_banner_portrait_zoom: number;
  public_hours_text: string | null;
  public_practical_info: string | null;
  site_count: number;
  staff_count: number;
  service_count: number;
}

type Draft = {
  enabled: boolean;
  slug: string;
  tagline: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  bannerLandscapePositionX: number;
  bannerLandscapePositionY: number;
  bannerLandscapeZoom: number;
  bannerPortraitPositionX: number;
  bannerPortraitPositionY: number;
  bannerPortraitZoom: number;
  hours: string;
  practicalInfo: string;
};

type MediaKind = 'logo' | 'banner';

const PUBLIC_ORIGIN = 'https://ncr-suite.fr';

function publicUrl(slug: string) {
  return `${PUBLIC_ORIGIN}/salon/${encodeURIComponent(slug.trim())}`;
}

function bookingUrl(slug: string) {
  return `${publicUrl(slug)}#reserver`;
}

function widgetUrl(slug: string) {
  return `${publicUrl(slug)}?embed=1`;
}

function widgetCode(slug: string) {
  return `<iframe src="${widgetUrl(slug)}" title="Réserver en ligne" loading="lazy" style="width:100%;height:920px;border:0;border-radius:18px;overflow:hidden" allow="clipboard-write"></iframe>`;
}

function toDraft(company: PublicCompanyConfig): Draft {
  return {
    enabled: Boolean(company.public_page_enabled),
    slug: company.public_slug ?? '',
    tagline: company.public_tagline ?? '',
    description: company.public_description ?? '',
    logoUrl: company.logo_url ?? '',
    bannerUrl: company.public_banner_url ?? '',
    bannerLandscapePositionX: company.public_banner_position_x ?? 50,
    bannerLandscapePositionY: company.public_banner_position_y ?? 50,
    bannerLandscapeZoom: company.public_banner_landscape_zoom ?? 100,
    bannerPortraitPositionX: company.public_banner_portrait_position_x ?? company.public_banner_position_x ?? 50,
    bannerPortraitPositionY: company.public_banner_portrait_position_y ?? company.public_banner_position_y ?? 50,
    bannerPortraitZoom: company.public_banner_portrait_zoom ?? 100,
    hours: company.public_hours_text ?? '',
    practicalInfo: company.public_practical_info ?? ''
  };
}

function imageExtension(file: File) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

async function normalizeImage(file: File) {
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

export function BeautyPublicPageManagementPage() {
  const { organization } = useOrganization();
  const [companies, setCompanies] = useState<PublicCompanyConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [logoFiles, setLogoFiles] = useState<Record<string, File | null>>({});
  const [bannerFiles, setBannerFiles] = useState<Record<string, File | null>>({});
  const [bannerPreviewUrls, setBannerPreviewUrls] = useState<Record<string, string>>({});
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [widgetPreviewId, setWidgetPreviewId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const publishedCount = useMemo(() => companies.filter((company) => company.public_page_enabled).length, [companies]);

  async function load() {
    if (!organization || !supabase) return;
    setLoading(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('metier_public_page_configuration', {
      p_organization_id: organization.id
    });
    if (requestError) {
      setError(requestError.message);
      setLoading(false);
      return;
    }
    const next = ((data ?? { companies: [] }) as { companies?: PublicCompanyConfig[] }).companies ?? [];
    setCompanies(next);
    const nextDrafts: Record<string, Draft> = {};
    next.forEach((company) => { nextDrafts[company.id] = toDraft(company); });
    setDrafts(nextDrafts);
    setOpenId((current) => current && next.some((company) => company.id === current) ? current : (next.length === 1 ? next[0].id : null));
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id]);

  const qrSignature = useMemo(
    () => companies.map((company) => `${company.id}:${company.public_slug ?? ''}:${company.public_page_enabled ? '1' : '0'}`).join('|'),
    [companies]
  );

  useEffect(() => {
    let active = true;
    async function generateQrs() {
      const entries = await Promise.all(companies
        .filter((company) => company.public_page_enabled && company.public_slug)
        .map(async (company) => {
          const dataUrl = await QRCode.toDataURL(bookingUrl(company.public_slug!), {
            width: 720,
            margin: 2,
            errorCorrectionLevel: 'H'
          });
          return [company.id, dataUrl] as const;
        }));
      if (active) setQrCodes(Object.fromEntries(entries));
    }
    void generateQrs();
    return () => { active = false; };
  }, [qrSignature]);

  function updateDraft(companyId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [companyId]: { ...current[companyId], ...patch } }));
  }

  function selectMedia(companyId: string, file: File | null, kind: MediaKind) {
    if (!file) return;
    setError('');
    const maxSize = kind === 'logo' ? 2 * 1024 * 1024 : 8 * 1024 * 1024;
    if (!file.type.startsWith('image/')) {
      setError('Choisissez une image PNG, JPG, WebP ou une photo compatible.');
      return;
    }
    if (file.size > maxSize) {
      setError(kind === 'logo' ? 'Le logo ne doit pas dépasser 2 Mo.' : 'La couverture ne doit pas dépasser 8 Mo.');
      return;
    }
    if (kind === 'logo') {
      setLogoFiles((current) => ({ ...current, [companyId]: file }));
    } else {
      setBannerFiles((current) => ({ ...current, [companyId]: file }));
      setBannerPreviewUrls((current) => {
        const existing = current[companyId];
        if (existing) URL.revokeObjectURL(existing);
        return { ...current, [companyId]: URL.createObjectURL(file) };
      });
    }
  }

  async function uploadMedia(company: PublicCompanyConfig, file: File, kind: MediaKind) {
    if (!organization || !supabase) throw new Error('Le service de fichiers est indisponible.');
    const normalized = await normalizeImage(file);
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
      let logoUrl = draft.logoUrl.trim() || null;
      let bannerUrl = draft.bannerUrl.trim() || null;
      if (logoFiles[company.id]) logoUrl = await uploadMedia(company, logoFiles[company.id]!, 'logo');
      if (bannerFiles[company.id]) bannerUrl = await uploadMedia(company, bannerFiles[company.id]!, 'banner');

      const { data: savedSlug, error: pageError } = await supabase.rpc('metier_update_company_public_page', {
        p_organization_id: organization.id,
        p_company_id: company.id,
        p_public_page_enabled: draft.enabled,
        p_public_slug: draft.slug,
        p_public_tagline: draft.tagline || null,
        p_public_description: draft.description || null,
        p_public_banner_url: bannerUrl,
        p_public_hours_text: draft.hours || null,
        p_public_practical_info: draft.practicalInfo || null
      });
      if (pageError) throw pageError;

      const { error: logoError } = await supabase.rpc('metier_update_company_public_logo', {
        p_organization_id: organization.id,
        p_company_id: company.id,
        p_logo_url: logoUrl
      });
      if (logoError) throw logoError;

      const { error: cropError } = await supabase.rpc('metier_update_company_public_banner_crop', {
        p_organization_id: organization.id,
        p_company_id: company.id,
        p_landscape_x: draft.bannerLandscapePositionX,
        p_landscape_y: draft.bannerLandscapePositionY,
        p_landscape_zoom: draft.bannerLandscapeZoom,
        p_portrait_x: draft.bannerPortraitPositionX,
        p_portrait_y: draft.bannerPortraitPositionY,
        p_portrait_zoom: draft.bannerPortraitZoom
      });
      if (cropError) throw cropError;

      const previewUrl = bannerPreviewUrls[company.id];
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setBannerPreviewUrls((current) => {
        const next = { ...current };
        delete next[company.id];
        return next;
      });
      setLogoFiles((current) => ({ ...current, [company.id]: null }));
      setBannerFiles((current) => ({ ...current, [company.id]: null }));
      setMessage(`La page de réservation de ${company.name} est enregistrée.`);
      if (typeof savedSlug === 'string') updateDraft(company.id, { slug: savedSlug, logoUrl: logoUrl ?? '', bannerUrl: bannerUrl ?? '' });
      await load();
      window.dispatchEvent(new CustomEvent('ncr:metier-structure-changed'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible d’enregistrer cette page.');
    } finally {
      setBusy('');
    }
  }

  function qrBlob(dataUrl: string) {
    const [header, payload] = dataUrl.split(',');
    if (!header || !payload) throw new Error('QR invalide.');
    const mime = header.match(/data:([^;]+)/)?.[1] || 'image/png';
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }

  async function exportQr(company: PublicCompanyConfig) {
    const dataUrl = qrCodes[company.id];
    if (!dataUrl) return;
    setError('');
    setMessage('');
    const filename = `qr-reservation-${company.public_slug || company.id}.png`;
    try {
      const blob = qrBlob(dataUrl);
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `QR de réservation — ${company.name}`,
            text: `QR pour réserver chez ${company.name}`
          });
          setMessage('QR prêt à être enregistré ou partagé.');
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      setMessage('Téléchargement du QR lancé.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible d’exporter le QR.');
    }
  }

  function openQr(company: PublicCompanyConfig) {
    const dataUrl = qrCodes[company.id];
    if (!dataUrl) return;
    const opened = window.open(dataUrl, '_blank', 'noopener,noreferrer');
    if (!opened) setError('Votre navigateur a bloqué l’ouverture du QR. Autorisez les fenêtres contextuelles puis réessayez.');
  }

  async function copyText(value: string, confirmation: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(confirmation);
    } catch {
      window.prompt('Copiez ce contenu :', value);
    }
  }

  async function copyLink(company: PublicCompanyConfig) {
    const slug = drafts[company.id]?.slug || company.public_slug;
    if (!slug) return;
    await copyText(publicUrl(slug), 'Lien public copié.');
  }

  if (!organization || organization.business_type !== 'coiffure' || organization.plan !== 'metier') return null;

  return <div className="metier-simple-page beauty-public-page-management">
    <section className="metier-simple-section metier-public-pages-section">
      <div className="metier-simple-heading">
        <div>
          <p className="eyebrow">COIFFURE & BEAUTÉ · PAGE DE RÉSERVATION</p>
          <h1>Votre vitrine en ligne</h1>
          <p>Modifiez l’identité, les photos et les informations publiques des enseignes dont vous êtes responsable.</p>
        </div>
        <span className="metier-public-count">{publishedCount} publiée{publishedCount > 1 ? 's' : ''}</span>
      </div>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}
      {loading && <div className="loading-state">Chargement des pages autorisées…</div>}

      {!loading && companies.length === 0 && <div className="empty-state">
        <Icon name="eye" size={26} />
        <h3>Aucune enseigne accessible</h3>
        <p>Votre compte Responsable doit être rattaché à au moins une enseigne du centre.</p>
      </div>}

      <div className="metier-public-company-list">
        {companies.map((company) => {
          const draft = drafts[company.id] ?? toDraft(company);
          const ready = company.site_count > 0 && company.staff_count > 0 && company.service_count > 0;
          const slug = draft.slug || company.public_slug || '';
          const url = slug ? publicUrl(slug) : '';
          const open = openId === company.id;
          return <article key={company.id} className="metier-public-company-card">
            <div className="metier-public-company-top">
              <span className="metier-public-company-logo" style={{ background: draft.logoUrl ? '#fff' : company.primary_color }}>
                {draft.logoUrl ? <img src={draft.logoUrl} alt="" /> : company.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="metier-public-company-title"><strong>{company.name}</strong><small>{ready ? 'Prête pour la réservation en ligne' : 'Complétez adresse, prestations et équipe'}</small></div>
              <span className={draft.enabled ? 'metier-public-status published' : 'metier-public-status'}>{draft.enabled ? 'Publiée' : 'Masquée'}</span>
            </div>

            <div className="metier-public-company-link">
              <span>{url || `${PUBLIC_ORIGIN}/salon/…`}</span>
              <button type="button" onClick={() => void copyLink(company)} disabled={!slug}><Icon name="clipboard" size={15} /> Copier</button>
              {draft.enabled && slug && <a href={url} target="_blank" rel="noreferrer"><Icon name="eye" size={15} /> Ouvrir</a>}
            </div>

            <button type="button" className="metier-public-edit-toggle" onClick={() => setOpenId(open ? null : company.id)}>
              <span><Icon name="settings" size={16} /> Modifier la page de réservation</span><Icon name={open ? 'chevronDown' : 'chevronRight'} size={17} />
            </button>

            {open && <form className="metier-public-editor" onSubmit={(event) => void save(event, company)}>
              <label className="metier-check-row full"><input type="checkbox" checked={draft.enabled} onChange={(event) => updateDraft(company.id, { enabled: event.target.checked })}/><span><strong>Publier la page</strong><small>Vous pouvez préparer la page avant de la rendre visible.</small></span></label>

              <div className="metier-public-media-field full"><div className="metier-public-media-copy"><strong>Logo de l’enseigne</strong><small>PNG, JPG ou WebP · 2 Mo maximum.</small></div>{draft.logoUrl && <div className="metier-public-media-preview"><img src={draft.logoUrl} alt=""/></div>}<div className="metier-public-media-actions"><label className="secondary-button compact-button"><Icon name="camera" size={15}/> {draft.logoUrl ? 'Remplacer' : 'Importer'}<input hidden type="file" accept="image/*" onChange={(event) => selectMedia(company.id, event.target.files?.[0] ?? null, 'logo')}/></label>{draft.logoUrl && <button type="button" className="danger-text-button" onClick={() => updateDraft(company.id, { logoUrl: '' })}>Retirer</button>}</div></div>

              <div className="metier-public-media-field metier-public-cover-field full">
                <div className="metier-public-media-copy"><strong>Image de couverture</strong><small>Une seule photo source, avec un cadrage et un zoom indépendants pour le paysage et le portrait.</small></div>
                {(bannerPreviewUrls[company.id] || draft.bannerUrl) && <div className="metier-public-cover-editor">
                  <div className="metier-public-cover-mode-grid">
                    <section className="metier-public-cover-mode landscape">
                      <div className="metier-public-cover-mode-head"><div><strong>Paysage</strong><small>Ordinateur & tablette horizontale</small></div><button type="button" onClick={() => updateDraft(company.id, { bannerLandscapePositionX: 50, bannerLandscapePositionY: 50, bannerLandscapeZoom: 100 })}>Réinitialiser</button></div>
                      <figure className="desktop"><img src={bannerPreviewUrls[company.id] || draft.bannerUrl} alt="" style={{ objectPosition: `${draft.bannerLandscapePositionX}% ${draft.bannerLandscapePositionY}%`, transform: `scale(${draft.bannerLandscapeZoom / 100})`, transformOrigin: `${draft.bannerLandscapePositionX}% ${draft.bannerLandscapePositionY}%` }}/></figure>
                      <div className="metier-public-cover-controls">
                        <label>Horizontal <b>{draft.bannerLandscapePositionX}%</b><input type="range" min="0" max="100" step="1" value={draft.bannerLandscapePositionX} onChange={(event) => updateDraft(company.id, { bannerLandscapePositionX: Number(event.target.value) })}/></label>
                        <label>Vertical <b>{draft.bannerLandscapePositionY}%</b><input type="range" min="0" max="100" step="1" value={draft.bannerLandscapePositionY} onChange={(event) => updateDraft(company.id, { bannerLandscapePositionY: Number(event.target.value) })}/></label>
                        <label>Zoom <b>{draft.bannerLandscapeZoom}%</b><input type="range" min="100" max="250" step="5" value={draft.bannerLandscapeZoom} onChange={(event) => updateDraft(company.id, { bannerLandscapeZoom: Number(event.target.value) })}/></label>
                      </div>
                    </section>
                    <section className="metier-public-cover-mode portrait">
                      <div className="metier-public-cover-mode-head"><div><strong>Portrait</strong><small>Téléphone & écran vertical</small></div><button type="button" onClick={() => updateDraft(company.id, { bannerPortraitPositionX: 50, bannerPortraitPositionY: 50, bannerPortraitZoom: 100 })}>Réinitialiser</button></div>
                      <figure className="mobile"><img src={bannerPreviewUrls[company.id] || draft.bannerUrl} alt="" style={{ objectPosition: `${draft.bannerPortraitPositionX}% ${draft.bannerPortraitPositionY}%`, transform: `scale(${draft.bannerPortraitZoom / 100})`, transformOrigin: `${draft.bannerPortraitPositionX}% ${draft.bannerPortraitPositionY}%` }}/></figure>
                      <div className="metier-public-cover-controls">
                        <label>Horizontal <b>{draft.bannerPortraitPositionX}%</b><input type="range" min="0" max="100" step="1" value={draft.bannerPortraitPositionX} onChange={(event) => updateDraft(company.id, { bannerPortraitPositionX: Number(event.target.value) })}/></label>
                        <label>Vertical <b>{draft.bannerPortraitPositionY}%</b><input type="range" min="0" max="100" step="1" value={draft.bannerPortraitPositionY} onChange={(event) => updateDraft(company.id, { bannerPortraitPositionY: Number(event.target.value) })}/></label>
                        <label>Zoom <b>{draft.bannerPortraitZoom}%</b><input type="range" min="100" max="250" step="5" value={draft.bannerPortraitZoom} onChange={(event) => updateDraft(company.id, { bannerPortraitZoom: Number(event.target.value) })}/></label>
                      </div>
                    </section>
                  </div>
                </div>}
                <div className="metier-public-media-actions"><label className="secondary-button compact-button"><Icon name="camera" size={15}/> {(bannerPreviewUrls[company.id] || draft.bannerUrl) ? 'Remplacer' : 'Importer'}<input hidden type="file" accept="image/*" onChange={(event) => selectMedia(company.id, event.target.files?.[0] ?? null, 'banner')}/></label>{(bannerPreviewUrls[company.id] || draft.bannerUrl) && <button type="button" className="danger-text-button" onClick={() => { const previewUrl = bannerPreviewUrls[company.id]; if (previewUrl) URL.revokeObjectURL(previewUrl); setBannerPreviewUrls((current) => { const next = { ...current }; delete next[company.id]; return next; }); setBannerFiles((current) => ({ ...current, [company.id]: null })); updateDraft(company.id, { bannerUrl: '', bannerLandscapePositionX: 50, bannerLandscapePositionY: 50, bannerLandscapeZoom: 100, bannerPortraitPositionX: 50, bannerPortraitPositionY: 50, bannerPortraitZoom: 100 }); }}>Retirer</button>}</div>
              </div>

              {company.public_page_enabled && company.public_slug && <section className="metier-public-share-kit full">
                <div className="metier-public-share-head"><div><p className="eyebrow">DIFFUSER LA RÉSERVATION</p><h3>QR, lien direct & widget</h3><small>Trois façons de transformer votre page en point de réservation.</small></div><Icon name="globe" size={23}/></div>
                <div className="metier-public-share-grid">
                  <div className="metier-public-qr-card">
                    <div className="metier-public-qr-preview">{qrCodes[company.id] ? <img src={qrCodes[company.id]} alt={`QR de réservation ${company.name}`}/> : <span className="spinner"/>}</div>
                    <div><strong>QR de réservation</strong><small>À imprimer, afficher en vitrine ou partager sur vos supports.</small></div>
                    {qrCodes[company.id] && <div className="metier-public-qr-actions"><button className="secondary-button compact-button" type="button" onClick={() => void exportQr(company)}><Icon name="file" size={14}/> Enregistrer / partager</button><button className="secondary-button compact-button" type="button" onClick={() => openQr(company)}><Icon name="eye" size={14}/> Ouvrir le QR</button></div>}
                  </div>
                  <div className="metier-public-share-tools">
                    <label>Lien direct de réservation<div className="metier-public-copy-field"><input readOnly value={bookingUrl(company.public_slug)}/><button type="button" onClick={() => void copyText(bookingUrl(company.public_slug!), 'Lien de réservation copié.')}><Icon name="clipboard" size={14}/> Copier</button></div></label>
                    <label>Widget à intégrer sur un site<textarea readOnly rows={4} value={widgetCode(company.public_slug)}/><button className="secondary-button compact-button" type="button" onClick={() => void copyText(widgetCode(company.public_slug!), 'Code du widget copié.')}><Icon name="clipboard" size={14}/> Copier le widget</button></label>
                    <div className="metier-public-widget-preview">
                      <div className="metier-public-widget-preview-head">
                        <button type="button" onClick={() => setWidgetPreviewId((current) => current === company.id ? null : company.id)}>{widgetPreviewId === company.id ? 'Masquer l’aperçu' : 'Afficher l’aperçu'}</button>
                        <a href={`${widgetUrl(company.public_slug)}#reserver`} target="_blank" rel="noreferrer">Ouvrir en grand</a>
                      </div>
                      {widgetPreviewId === company.id && <div className="metier-public-widget-frame"><iframe key={company.public_slug} title={`Aperçu réservation ${company.name}`} src={`${widgetUrl(company.public_slug)}#reserver`}/></div>}
                    </div>
                  </div>
                </div>
              </section>}

              <label>Adresse publique<div className="metier-public-slug-row"><span>/salon/</span><input value={draft.slug} onChange={(event) => updateDraft(company.id, { slug: event.target.value })}/></div></label>
              <label>Slogan<input value={draft.tagline} onChange={(event) => updateDraft(company.id, { tagline: event.target.value })} placeholder="Votre moment beauté, simplement."/></label>
              <label className="full">Présentation<textarea rows={4} value={draft.description} onChange={(event) => updateDraft(company.id, { description: event.target.value })} placeholder="Présentez votre univers, vos spécialités et votre savoir-faire."/></label>
              <label>Horaires<input value={draft.hours} onChange={(event) => updateDraft(company.id, { hours: event.target.value })} placeholder="Lun–Sam · 9h–19h"/></label>
              <label>Infos pratiques<input value={draft.practicalInfo} onChange={(event) => updateDraft(company.id, { practicalInfo: event.target.value })} placeholder="Parking, accès, étage…"/></label>
              <div className="metier-public-editor-actions full"><button className="primary-button" type="submit" disabled={busy === company.id}>{busy === company.id ? 'Enregistrement…' : 'Enregistrer la page'}</button></div>
            </form>}
          </article>;
        })}
      </div>
    </section>
  </div>;
}
