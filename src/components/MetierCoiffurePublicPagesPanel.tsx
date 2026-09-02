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
  bannerUrl: string;
  hours: string;
  practicalInfo: string;
};

function toDraft(company: PublicCompanyConfig): Draft {
  return {
    enabled: Boolean(company.public_page_enabled),
    slug: company.public_slug ?? '',
    tagline: company.public_tagline ?? '',
    description: company.public_description ?? '',
    bannerUrl: company.public_banner_url ?? '',
    hours: company.public_hours_text ?? '',
    practicalInfo: company.public_practical_info ?? ''
  };
}

export function MetierCoiffurePublicPagesPanel() {
  const location = useLocation();
  const { organization } = useOrganization();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [companies, setCompanies] = useState<PublicCompanyConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
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

  async function save(event: FormEvent, company: PublicCompanyConfig) {
    event.preventDefault();
    if (!organization || !supabase) return;
    const draft = drafts[company.id];
    if (!draft) return;
    setBusy(company.id);
    setError('');
    setMessage('');
    const { data: savedSlug, error: requestError } = await supabase.rpc('metier_update_company_public_page', {
      p_organization_id: organization.id,
      p_company_id: company.id,
      p_public_page_enabled: draft.enabled,
      p_public_slug: draft.slug,
      p_public_tagline: draft.tagline || null,
      p_public_description: draft.description || null,
      p_public_banner_url: draft.bannerUrl || null,
      p_public_hours_text: draft.hours || null,
      p_public_practical_info: draft.practicalInfo || null
    });
    setBusy('');
    if (requestError) {
      setError(requestError.message);
      return;
    }
    setMessage(`Page publique de ${company.name} enregistrée.`);
    if (typeof savedSlug === 'string') {
      setDrafts((current) => ({ ...current, [company.id]: { ...current[company.id], slug: savedSlug } }));
    }
    await load();
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
              <span className="metier-public-company-logo" style={{ background: company.logo_url ? '#fff' : company.primary_color }}>
                {company.logo_url ? <img src={company.logo_url} alt="" /> : company.name.slice(0, 1).toUpperCase()}
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
              <label className="metier-check-row full"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDrafts((current) => ({ ...current, [company.id]: { ...draft, enabled: event.target.checked } }))} /><span><strong>Publier la page</strong><small>Le salon reste visible même si la réservation en ligne est désactivée.</small></span></label>
              <label>Adresse publique<div className="metier-public-slug-row"><span>/salon/</span><input value={draft.slug} onChange={(event) => setDrafts((current) => ({ ...current, [company.id]: { ...draft, slug: event.target.value } }))} /></div></label>
              <label>Slogan<input value={draft.tagline} onChange={(event) => setDrafts((current) => ({ ...current, [company.id]: { ...draft, tagline: event.target.value } }))} placeholder="Votre moment beauté, simplement." /></label>
              <label className="full">Présentation<textarea rows={4} value={draft.description} onChange={(event) => setDrafts((current) => ({ ...current, [company.id]: { ...draft, description: event.target.value } }))} placeholder="Présentez le salon, son univers et ses spécialités." /></label>
              <label>Horaires<input value={draft.hours} onChange={(event) => setDrafts((current) => ({ ...current, [company.id]: { ...draft, hours: event.target.value } }))} placeholder="Lun–Sam · 9h–19h" /></label>
              <label>Infos pratiques<input value={draft.practicalInfo} onChange={(event) => setDrafts((current) => ({ ...current, [company.id]: { ...draft, practicalInfo: event.target.value } }))} placeholder="Parking, accès, étage…" /></label>
              <label className="full">Image de couverture · URL<input type="url" value={draft.bannerUrl} onChange={(event) => setDrafts((current) => ({ ...current, [company.id]: { ...draft, bannerUrl: event.target.value } }))} placeholder="https://…" /></label>
              <div className="metier-public-editor-actions full"><button className="primary-button" type="submit" disabled={busy === company.id}>{busy === company.id ? 'Enregistrement…' : 'Enregistrer la page'}</button></div>
            </form>}
          </article>;
        })}
      </div>
    </section>,
    host
  );
}
