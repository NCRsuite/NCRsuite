import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';

interface Company {
  id: string;
  name: string;
  code: string | null;
  legal_name: string | null;
  siret: string | null;
  logo_url: string | null;
  primary_color: string;
  email: string | null;
  phone: string | null;
  booking_enabled: boolean;
  is_primary: boolean;
  status: string;
  brand_count: number;
  site_count: number;
  staff_count: number;
  service_count: number;
}

interface Brand {
  id: string;
  name: string;
  code: string | null;
  company_id: string | null;
  logo_url: string | null;
  compact_logo_url: string | null;
  primary_color: string;
  platform_domain: string | null;
  is_primary: boolean;
  status: string;
}

interface Site {
  id: string;
  name: string;
  code: string | null;
  company_id: string | null;
  brand_id: string | null;
  location_id: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  status: string;
}

interface LocationRecord {
  id: string;
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  status: string;
}

interface ServiceRecord {
  id: string;
  name: string;
  company_id: string | null;
  duration_minutes: number;
  price_cents: number;
  active: boolean;
}

interface StaffRecord {
  id: string;
  display_name: string;
  company_id: string | null;
  site_id: string | null;
  active: boolean;
}

interface MemberRecord {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  company_scope_mode: 'all' | 'selected';
  shared_reception_enabled: boolean;
  company_ids: string[];
}

interface SimpleConfig {
  companies: Company[];
  brands: Brand[];
  sites: Site[];
  locations: LocationRecord[];
  services: ServiceRecord[];
  staff: StaffRecord[];
  members: MemberRecord[];
}

type CompanyForm = {
  name: string;
  code: string;
  legalName: string;
  siret: string;
  email: string;
  phone: string;
  color: string;
  bookingEnabled: boolean;
};

type AddressForm = {
  mode: 'existing' | 'new';
  siteName: string;
  brandId: string;
  existingLocationId: string;
  locationName: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
};

type MemberDraft = {
  mode: 'all' | 'selected';
  ids: string[];
  reception: boolean;
};

const emptyCompany = (): CompanyForm => ({
  name: '',
  code: '',
  legalName: '',
  siret: '',
  email: '',
  phone: '',
  color: '#2997ff',
  bookingEnabled: false
});

const emptyAddress = (): AddressForm => ({
  mode: 'existing',
  siteName: '',
  brandId: '',
  existingLocationId: '',
  locationName: '',
  address: '',
  postalCode: '',
  city: '',
  phone: '',
  email: ''
});

function companyToForm(company: Company): CompanyForm {
  return {
    name: company.name,
    code: company.code ?? '',
    legalName: company.legal_name ?? '',
    siret: company.siret ?? '',
    email: company.email ?? '',
    phone: company.phone ?? '',
    color: company.primary_color || '#2997ff',
    bookingEnabled: company.booking_enabled
  };
}

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

function roleLabel(role: string) {
  if (role === 'owner') return 'Propriétaire';
  if (role === 'admin') return 'Administrateur';
  if (role === 'manager') return 'Manager';
  if (role === 'employee') return 'Collaborateur';
  return 'Lecture';
}

function announceStructureChange() {
  window.dispatchEvent(new CustomEvent('ncr:metier-structure-changed'));
}

export function MetierSimpleSetup({ onOpenReception, onOpenAdvanced }: {
  onOpenReception: () => void;
  onOpenAdvanced: () => void;
}) {
  const navigate = useNavigate();
  const { organization, refreshSites } = useOrganization();
  const [config, setConfig] = useState<SimpleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompany);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress);
  const [memberDrafts, setMemberDrafts] = useState<Record<string, MemberDraft>>({});

  const canManage = ['owner', 'admin'].includes(organization?.role ?? 'viewer');

  async function load() {
    if (!organization || organization.plan !== 'metier' || !supabase || !canManage) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('metier_simple_configuration', {
      p_organization_id: organization.id
    });

    if (requestError) {
      setError(requestError.message);
      setConfig(null);
      setLoading(false);
      return;
    }

    const next = (data ?? {
      companies: [], brands: [], sites: [], locations: [], services: [], staff: [], members: []
    }) as SimpleConfig;
    next.companies = Array.isArray(next.companies) ? next.companies : [];
    next.brands = Array.isArray(next.brands) ? next.brands : [];
    next.sites = Array.isArray(next.sites) ? next.sites : [];
    next.locations = Array.isArray(next.locations) ? next.locations : [];
    next.services = Array.isArray(next.services) ? next.services : [];
    next.staff = Array.isArray(next.staff) ? next.staff : [];
    next.members = Array.isArray(next.members) ? next.members : [];
    setConfig(next);
    setSelectedCompanyId((current) => current && next.companies.some((company) => company.id === current)
      ? current
      : next.companies.find((company) => company.is_primary)?.id ?? next.companies[0]?.id ?? null);

    const drafts: Record<string, MemberDraft> = {};
    next.members.forEach((member) => {
      drafts[member.user_id] = {
        mode: member.company_scope_mode || 'all',
        ids: Array.isArray(member.company_ids) ? member.company_ids : [],
        reception: Boolean(member.shared_reception_enabled)
      };
    });
    setMemberDrafts(drafts);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id, organization?.plan, canManage]);

  const selectedCompany = useMemo(
    () => config?.companies.find((company) => company.id === selectedCompanyId) ?? null,
    [config?.companies, selectedCompanyId]
  );
  const companyBrands = useMemo(
    () => (config?.brands ?? []).filter((brand) => brand.company_id === selectedCompanyId && brand.status === 'active'),
    [config?.brands, selectedCompanyId]
  );
  const companySites = useMemo(
    () => (config?.sites ?? []).filter((site) => site.company_id === selectedCompanyId && site.status === 'active'),
    [config?.sites, selectedCompanyId]
  );
  const companyServices = useMemo(
    () => (config?.services ?? []).filter((service) => service.company_id === selectedCompanyId && service.active),
    [config?.services, selectedCompanyId]
  );
  const companyStaff = useMemo(
    () => (config?.staff ?? []).filter((staff) => staff.company_id === selectedCompanyId && staff.active),
    [config?.staff, selectedCompanyId]
  );
  const receptionReadyCompanies = useMemo(
    () => (config?.companies ?? []).filter((company) => company.booking_enabled && company.site_count > 0 && company.service_count > 0 && company.staff_count > 0),
    [config?.companies]
  );

  useEffect(() => {
    if (!selectedCompany || showNewCompany) return;
    setCompanyForm(companyToForm(selectedCompany));
    setShowAddressForm(false);
    setAddressForm(emptyAddress());
  }, [selectedCompany?.id, showNewCompany]);

  function chooseCompany(company: Company) {
    setSelectedCompanyId(company.id);
    setShowNewCompany(false);
    setMessage('');
    setError('');
  }

  function newCompany() {
    setCompanyForm(emptyCompany());
    setShowNewCompany(true);
    setShowAddressForm(false);
    setError('');
    setMessage('');
  }

  async function saveCompany(event: FormEvent) {
    event.preventDefault();
    if (!organization || !supabase || !canManage || busy) return;
    if (companyForm.name.trim().length < 2) {
      setError('Indiquez le nom de l’entreprise.');
      return;
    }

    const editingId = showNewCompany ? null : selectedCompany?.id ?? null;
    setBusy('company');
    setError('');
    setMessage('');
    const { data, error: requestError } = await supabase.rpc('metier_upsert_company', {
      p_organization_id: organization.id,
      p_company_id: editingId,
      p_name: companyForm.name.trim(),
      p_code: companyForm.code.trim() || null,
      p_legal_name: companyForm.legalName.trim() || null,
      p_siret: companyForm.siret.trim() || null,
      p_email: companyForm.email.trim() || null,
      p_phone: companyForm.phone.trim() || null,
      p_primary_color: companyForm.color,
      p_booking_enabled: companyForm.bookingEnabled,
      p_is_primary: editingId ? Boolean(selectedCompany?.is_primary) : false,
      p_create_default_brand: editingId === null
    });
    setBusy('');

    if (requestError) {
      setError(requestError.message);
      return;
    }

    const savedId = typeof data === 'string' ? data : editingId;
    setShowNewCompany(false);
    setMessage(editingId
      ? 'Entreprise mise à jour.'
      : 'Entreprise créée. Sa première enseigne a été préparée automatiquement.');
    announceStructureChange();
    await load();
    if (savedId) setSelectedCompanyId(savedId);
  }

  async function assignBrand(brand: Brand, companyId: string) {
    if (!organization || !supabase || !canManage || !companyId) return;
    setBusy(`brand-${brand.id}`);
    setError('');
    const { error: requestError } = await supabase.rpc('metier_assign_brand_company', {
      p_organization_id: organization.id,
      p_brand_id: brand.id,
      p_company_id: companyId
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(`« ${brand.name} » est maintenant rattachée à la bonne entreprise.`);
      announceStructureChange();
      await load();
      refreshSites();
    }
  }

  async function assignSite(site: Site, companyId: string, brandId?: string | null) {
    if (!organization || !supabase || !canManage || !companyId) return;
    const brands = (config?.brands ?? []).filter((brand) => brand.company_id === companyId && brand.status === 'active');
    const resolvedBrand = brandId && brands.some((brand) => brand.id === brandId) ? brandId : brands[0]?.id ?? null;
    setBusy(`site-${site.id}`);
    setError('');
    const { error: requestError } = await supabase.rpc('metier_assign_site_company', {
      p_organization_id: organization.id,
      p_site_id: site.id,
      p_company_id: companyId,
      p_brand_id: resolvedBrand
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(`${site.name} a été rattaché correctement.`);
      announceStructureChange();
      await load();
      refreshSites();
    }
  }

  async function saveAddress(event: FormEvent) {
    event.preventDefault();
    if (!organization || !supabase || !selectedCompany || !canManage) return;
    setBusy('address');
    setError('');
    setMessage('');

    try {
      let locationId = addressForm.existingLocationId || null;
      let location: LocationRecord | null = locationId
        ? (config?.locations ?? []).find((item) => item.id === locationId) ?? null
        : null;

      if (addressForm.mode === 'new') {
        const locationName = addressForm.locationName.trim() || addressForm.siteName.trim() || selectedCompany.name;
        const { data: createdLocationId, error: locationError } = await supabase.rpc('metier_upsert_location', {
          p_organization_id: organization.id,
          p_location_id: null,
          p_name: locationName,
          p_code: null,
          p_address: addressForm.address.trim() || null,
          p_postal_code: addressForm.postalCode.trim() || null,
          p_city: addressForm.city.trim() || null,
          p_phone: addressForm.phone.trim() || null,
          p_email: addressForm.email.trim() || null,
          p_timezone: 'Europe/Paris',
          p_is_primary: (config?.locations ?? []).length === 0
        });
        if (locationError) throw locationError;
        locationId = typeof createdLocationId === 'string' ? createdLocationId : null;
        location = {
          id: locationId ?? '',
          name: locationName,
          address: addressForm.address || null,
          postal_code: addressForm.postalCode || null,
          city: addressForm.city || null,
          phone: addressForm.phone || null,
          email: addressForm.email || null,
          is_primary: false,
          status: 'active'
        };
      }

      if (!locationId || !location) throw new Error('Choisissez ou ajoutez une adresse.');
      const brandId = addressForm.brandId || companyBrands[0]?.id || null;
      const siteName = addressForm.siteName.trim() || `${selectedCompany.name} · ${location.name}`;
      const { data: createdSiteId, error: siteError } = await supabase.rpc('metier_upsert_site', {
        p_organization_id: organization.id,
        p_site_id: null,
        p_name: siteName,
        p_code: null,
        p_address: location.address,
        p_postal_code: location.postal_code,
        p_city: location.city,
        p_phone: location.phone,
        p_email: location.email,
        p_timezone: 'Europe/Paris',
        p_is_primary: (config?.sites ?? []).length === 0
      });
      if (siteError) throw siteError;
      const siteId = typeof createdSiteId === 'string' ? createdSiteId : null;
      if (!siteId) throw new Error('Établissement créé mais identifiant indisponible.');

      const { error: companyError } = await supabase.rpc('metier_assign_site_company', {
        p_organization_id: organization.id,
        p_site_id: siteId,
        p_company_id: selectedCompany.id,
        p_brand_id: brandId
      });
      if (companyError) throw companyError;

      const { error: locationAssignError } = await supabase.rpc('metier_assign_site_location', {
        p_organization_id: organization.id,
        p_site_id: siteId,
        p_location_id: locationId
      });
      if (locationAssignError) throw locationAssignError;

      setShowAddressForm(false);
      setAddressForm(emptyAddress());
      setMessage('Adresse ajoutée. Pour un bâtiment partagé, réutilisez cette même adresse dans les autres entreprises.');
      announceStructureChange();
      await load();
      refreshSites();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible d’ajouter cette adresse.');
    } finally {
      setBusy('');
    }
  }

  async function assignService(service: ServiceRecord, companyId: string) {
    if (!organization || !supabase || !canManage || !companyId) return;
    setBusy(`service-${service.id}`);
    setError('');
    const { error: requestError } = await supabase.rpc('metier_assign_service_company', {
      p_organization_id: organization.id,
      p_service_id: service.id,
      p_company_id: companyId
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(`${service.name} est rattachée à la bonne entreprise.`);
      announceStructureChange();
      await load();
    }
  }

  async function assignStaff(member: StaffRecord, companyId: string, siteId?: string | null) {
    if (!organization || !supabase || !canManage || !companyId) return;
    const validSites = (config?.sites ?? []).filter((site) => site.company_id === companyId && site.status === 'active');
    const resolvedSite = siteId && validSites.some((site) => site.id === siteId) ? siteId : null;
    setBusy(`staff-${member.id}`);
    setError('');
    const { error: requestError } = await supabase.rpc('metier_assign_staff_company', {
      p_organization_id: organization.id,
      p_staff_id: member.id,
      p_company_id: companyId,
      p_site_id: resolvedSite
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(`${member.display_name} est rattaché à la bonne entreprise.`);
      announceStructureChange();
      await load();
    }
  }

  function toggleMemberCompany(userId: string, companyId: string) {
    setMemberDrafts((current) => {
      const draft = current[userId] ?? { mode: 'selected' as const, ids: [], reception: false };
      const ids = draft.ids.includes(companyId)
        ? draft.ids.filter((id) => id !== companyId)
        : [...draft.ids, companyId];
      return { ...current, [userId]: { ...draft, mode: 'selected', ids } };
    });
  }

  async function saveMember(member: MemberRecord) {
    if (!organization || !supabase || !canManage) return;
    const draft = memberDrafts[member.user_id] ?? {
      mode: 'all' as const,
      ids: [],
      reception: false
    };
    if (draft.mode === 'selected' && draft.ids.length === 0) {
      setError('Choisissez au moins une entreprise pour cet utilisateur.');
      return;
    }

    setBusy(`member-${member.user_id}`);
    setError('');
    const { error: requestError } = await supabase.rpc('metier_set_member_company_access', {
      p_organization_id: organization.id,
      p_user_id: member.user_id,
      p_scope_mode: draft.mode,
      p_company_ids: draft.mode === 'selected' ? draft.ids : [],
      p_shared_reception_enabled: draft.reception
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else {
      setMessage(`Accès de ${member.full_name} mis à jour.`);
      await load();
    }
  }

  if (!organization || organization.plan !== 'metier') return null;

  if (!canManage) {
    return (
      <div className="metier-simple-page">
        <header className="metier-simple-hero">
          <div>
            <p className="eyebrow">ESPACE MÉTIER</p>
            <h1>Votre espace de travail</h1>
            <p>La configuration générale est gérée par un administrateur.</p>
          </div>
          <button className="primary-button" type="button" onClick={onOpenReception}>
            <Icon name="calendar" size={18} /> Accueil partagé
          </button>
        </header>
        <section className="metier-simple-empty">
          <Icon name="shield" size={26} />
          <h2>Configuration protégée</h2>
          <p>Utilisez uniquement les entreprises et fonctions autorisées pour votre compte.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="metier-simple-page">
      <header className="metier-simple-hero">
        <div>
          <p className="eyebrow">OFFRE MÉTIER</p>
          <h1>Mon espace</h1>
          <p>Gérez vos entreprises simplement. NCR Suite s’occupe des liens techniques entre enseignes, adresses et accès.</p>
        </div>
        <div className="metier-simple-hero-actions">
          {receptionReadyCompanies.length > 0 && (
            <button className="primary-button" type="button" onClick={onOpenReception}>
              <Icon name="calendar" size={18} /> Accueil partagé
            </button>
          )}
          <button className="secondary-button" type="button" onClick={onOpenAdvanced}>
            <Icon name="tool" size={17} /> Réglages avancés
          </button>
        </div>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}
      {loading && <section className="panel list-state">Chargement de votre espace…</section>}

      {!loading && config && (
        <>
          <section className="metier-simple-section">
            <div className="metier-simple-heading">
              <div>
                <p className="eyebrow">MES ENTREPRISES</p>
                <h2>Qui travaille dans cet espace ?</h2>
                <p>Une entreprise peut avoir plusieurs enseignes et partager la même adresse avec d’autres entreprises.</p>
              </div>
              <button className="secondary-button" type="button" onClick={newCompany}>
                <Icon name="plus" size={16} /> Ajouter une entreprise
              </button>
            </div>

            <div className="metier-company-grid">
              {config.companies.map((company) => {
                const active = company.id === selectedCompanyId;
                const ready = company.booking_enabled && company.site_count > 0 && company.service_count > 0 && company.staff_count > 0;
                return (
                  <article className={`metier-company-card${active ? ' active' : ''}`} key={company.id} onClick={() => chooseCompany(company)}>
                    <span className="metier-company-logo" style={{ background: company.logo_url ? '#fff' : company.primary_color }}>
                      {company.logo_url ? <img src={company.logo_url} alt="" /> : company.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{company.name}{company.is_primary ? ' · principale' : ''}</strong>
                      <small>{company.brand_count} enseigne(s) · {company.site_count} adresse(s)</small>
                      <span className={company.booking_enabled ? (ready ? 'ready' : 'todo') : 'muted'}>
                        {company.booking_enabled ? (ready ? 'Rendez-vous prêt' : 'Rendez-vous à terminer') : 'Rendez-vous désactivé'}
                      </span>
                    </div>
                    <button type="button" className="secondary-button compact-button" onClick={(event) => { event.stopPropagation(); chooseCompany(company); }}>
                      Gérer
                    </button>
                  </article>
                );
              })}
              {config.companies.length === 0 && (
                <div className="metier-simple-empty">
                  <Icon name="building" size={25} />
                  <h3>Aucune entreprise</h3>
                  <p>Ajoutez la première entreprise de cet espace.</p>
                </div>
              )}
            </div>
          </section>

          {showNewCompany && (
            <section className="metier-simple-card editor-card">
              <div className="metier-simple-heading">
                <div>
                  <p className="eyebrow">NOUVELLE ENTREPRISE</p>
                  <h2>Ajout rapide</h2>
                  <p>Une première enseigne sera créée automatiquement. Vous pourrez ensuite utiliser une adresse existante ou en ajouter une.</p>
                </div>
              </div>
              <form className="metier-simple-form" onSubmit={saveCompany}>
                <label>Nom de l’entreprise<input value={companyForm.name} onChange={(event) => setCompanyForm({ ...companyForm, name: event.target.value })} required /></label>
                <label>Code interne<input value={companyForm.code} onChange={(event) => setCompanyForm({ ...companyForm, code: event.target.value.toUpperCase() })} placeholder="Optionnel" /></label>
                <label>Couleur<input type="color" value={companyForm.color} onChange={(event) => setCompanyForm({ ...companyForm, color: event.target.value })} /></label>
                <label className="metier-check-row">
                  <input type="checkbox" checked={companyForm.bookingEnabled} onChange={(event) => setCompanyForm({ ...companyForm, bookingEnabled: event.target.checked })} />
                  <span><strong>Prise de rendez-vous</strong><small>Active cette entreprise dans l’accueil partagé.</small></span>
                </label>
                <div className="metier-form-actions full">
                  <button type="button" className="secondary-button" onClick={() => setShowNewCompany(false)}>Annuler</button>
                  <button type="submit" className="primary-button" disabled={busy === 'company'}>{busy === 'company' ? 'Création…' : 'Créer l’entreprise'}</button>
                </div>
              </form>
            </section>
          )}

          {selectedCompany && !showNewCompany && (
            <section className="metier-simple-section company-management">
              <div className="metier-simple-heading">
                <div><p className="eyebrow">ENTREPRISE ACTIVE</p><h2>{selectedCompany.name}</h2><p>Tout ce qui concerne cette entreprise est regroupé ici.</p></div>
              </div>

              <details className="metier-simple-details" open>
                <summary><span><Icon name="building" size={18} /><strong>Informations de l’entreprise</strong></span><small>Nom, coordonnées et rendez-vous</small></summary>
                <form className="metier-simple-form" onSubmit={saveCompany}>
                  <label>Nom<input value={companyForm.name} onChange={(event) => setCompanyForm({ ...companyForm, name: event.target.value })} /></label>
                  <label>Raison sociale<input value={companyForm.legalName} onChange={(event) => setCompanyForm({ ...companyForm, legalName: event.target.value })} placeholder="Optionnel" /></label>
                  <label>SIRET<input value={companyForm.siret} onChange={(event) => setCompanyForm({ ...companyForm, siret: event.target.value })} placeholder="Optionnel" /></label>
                  <label>E-mail<input type="email" value={companyForm.email} onChange={(event) => setCompanyForm({ ...companyForm, email: event.target.value })} /></label>
                  <label>Téléphone<input value={companyForm.phone} onChange={(event) => setCompanyForm({ ...companyForm, phone: event.target.value })} /></label>
                  <label>Couleur<input type="color" value={companyForm.color} onChange={(event) => setCompanyForm({ ...companyForm, color: event.target.value })} /></label>
                  <label className="metier-check-row full">
                    <input type="checkbox" checked={companyForm.bookingEnabled} onChange={(event) => setCompanyForm({ ...companyForm, bookingEnabled: event.target.checked })} />
                    <span><strong>Cette entreprise reçoit des rendez-vous</strong><small>Elle reste disponible au secrétariat même si personne n’est physiquement présent aujourd’hui.</small></span>
                  </label>
                  <div className="metier-form-actions full"><button className="primary-button" type="submit" disabled={busy === 'company'}>Enregistrer</button></div>
                </form>
              </details>

              <details className="metier-simple-details" open>
                <summary><span><Icon name="sparkles" size={18} /><strong>Enseignes</strong></span><small>{companyBrands.length} rattachée(s)</small></summary>
                <p className="metier-simple-help">Une enseigne est le nom visible par vos clients. Choisissez simplement l’entreprise à laquelle elle appartient.</p>
                <div className="metier-assignment-list">
                  {config.brands.map((brand) => (
                    <label key={brand.id} className={brand.company_id === selectedCompany.id ? 'highlight' : ''}>
                      <span className="metier-assignment-name">
                        {brand.compact_logo_url || brand.logo_url
                          ? <img src={brand.compact_logo_url || brand.logo_url || ''} alt="" />
                          : <i style={{ background: brand.primary_color }} />}
                        <span><strong>{brand.name}</strong><small>{brand.platform_domain || 'Adresse NCR Suite'}</small></span>
                      </span>
                      <select value={brand.company_id ?? ''} onChange={(event) => void assignBrand(brand, event.target.value)} disabled={busy === `brand-${brand.id}`}>
                        <option value="">Choisir une entreprise</option>
                        {config.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </details>

              <details className="metier-simple-details" open>
                <summary><span><Icon name="building" size={18} /><strong>Adresses / établissements</strong></span><small>{companySites.length} configuré(s)</small></summary>
                <p className="metier-simple-help">Si plusieurs entreprises sont dans le même bâtiment, réutilisez la même adresse. NCR Suite gère le partage automatiquement.</p>
                <div className="metier-site-simple-list">
                  {companySites.map((site) => (
                    <article key={site.id}>
                      <span><strong>{site.name}</strong><small>{[site.address, site.postal_code, site.city].filter(Boolean).join(' · ') || 'Adresse à compléter'}</small></span>
                      <label>Enseigne
                        <select value={site.brand_id ?? ''} onChange={(event) => void assignSite(site, selectedCompany.id, event.target.value || null)}>
                          <option value="">Sans enseigne</option>
                          {companyBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                        </select>
                      </label>
                    </article>
                  ))}
                  {companySites.length === 0 && <div className="metier-inline-empty">Aucune adresse pour cette entreprise.</div>}
                </div>
                <button type="button" className="secondary-button" onClick={() => {
                  setAddressForm({
                    ...emptyAddress(),
                    brandId: companyBrands[0]?.id ?? '',
                    existingLocationId: config.locations[0]?.id ?? ''
                  });
                  setShowAddressForm(true);
                }}><Icon name="plus" size={16} /> Ajouter une adresse</button>

                {showAddressForm && (
                  <form className="metier-simple-form address-form" onSubmit={saveAddress}>
                    <label className="full">Nom de l’établissement<input value={addressForm.siteName} onChange={(event) => setAddressForm({ ...addressForm, siteName: event.target.value })} placeholder={`${selectedCompany.name} · accueil`} /></label>
                    <label>Enseigne
                      <select value={addressForm.brandId} onChange={(event) => setAddressForm({ ...addressForm, brandId: event.target.value })}>
                        <option value="">Sans enseigne</option>
                        {companyBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                      </select>
                    </label>
                    <label>Adresse
                      <select value={addressForm.mode} onChange={(event) => setAddressForm({ ...addressForm, mode: event.target.value as 'existing' | 'new' })}>
                        <option value="existing">Utiliser une adresse existante</option>
                        <option value="new">Ajouter une nouvelle adresse</option>
                      </select>
                    </label>
                    {addressForm.mode === 'existing' ? (
                      <label className="full">Adresse existante
                        <select value={addressForm.existingLocationId} onChange={(event) => setAddressForm({ ...addressForm, existingLocationId: event.target.value })}>
                          <option value="">Choisir…</option>
                          {config.locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {[location.address, location.city].filter(Boolean).join(', ')}</option>)}
                        </select>
                      </label>
                    ) : (
                      <>
                        <label>Nom du bâtiment / adresse<input value={addressForm.locationName} onChange={(event) => setAddressForm({ ...addressForm, locationName: event.target.value })} placeholder="Centre Beauty House" /></label>
                        <label>Adresse<input value={addressForm.address} onChange={(event) => setAddressForm({ ...addressForm, address: event.target.value })} /></label>
                        <label>Code postal<input value={addressForm.postalCode} onChange={(event) => setAddressForm({ ...addressForm, postalCode: event.target.value })} /></label>
                        <label>Ville<input value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} /></label>
                      </>
                    )}
                    <div className="metier-form-actions full">
                      <button type="button" className="secondary-button" onClick={() => setShowAddressForm(false)}>Annuler</button>
                      <button className="primary-button" type="submit" disabled={busy === 'address'}>{busy === 'address' ? 'Ajout…' : 'Ajouter'}</button>
                    </div>
                  </form>
                )}
              </details>

              <details className="metier-simple-details">
                <summary><span><Icon name="calendar" size={18} /><strong>Prestations et équipe</strong></span><small>{companyServices.length} prestation(s) · {companyStaff.length} collaborateur(s)</small></summary>
                <p className="metier-simple-help">Pour l’accueil partagé, chaque prestation et chaque collaborateur est simplement rattaché à son entreprise.</p>
                <div className="metier-resource-columns">
                  <div>
                    <div className="mini-heading"><strong>Prestations</strong><button type="button" onClick={() => navigate('/prestations')}>Gérer les prestations</button></div>
                    {config.services.map((service) => (
                      <label className="resource-row" key={service.id}>
                        <span><strong>{service.name}</strong><small>{service.duration_minutes} min · {money(service.price_cents)}</small></span>
                        <select value={service.company_id ?? ''} onChange={(event) => void assignService(service, event.target.value)} disabled={busy === `service-${service.id}`}>
                          <option value="">Entreprise…</option>
                          {config.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  <div>
                    <div className="mini-heading"><strong>Collaborateurs</strong><button type="button" onClick={() => navigate('/equipe')}>Gérer l’équipe</button></div>
                    {config.staff.map((member) => (
                      <div className="resource-row" key={member.id}>
                        <span><strong>{member.display_name}</strong><small>{config.sites.find((site) => site.id === member.site_id)?.name || 'Aucune adresse fixe'}</small></span>
                        <div className="resource-selects">
                          <select value={member.company_id ?? ''} onChange={(event) => void assignStaff(member, event.target.value, null)} disabled={busy === `staff-${member.id}`}>
                            <option value="">Entreprise…</option>
                            {config.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                          </select>
                          {member.company_id && (
                            <select value={member.site_id ?? ''} onChange={(event) => void assignStaff(member, member.company_id || '', event.target.value || null)}>
                              <option value="">Toutes / mobile</option>
                              {config.sites.filter((site) => site.company_id === member.company_id && site.status === 'active').map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </section>
          )}

          <section className="metier-simple-section reception-access-section">
            <div className="metier-simple-heading">
              <div>
                <p className="eyebrow">ACCÈS & SECRÉTARIAT</p>
                <h2>Qui voit quoi ?</h2>
                <p>Choisissez les entreprises accessibles à chaque personne. Activez « Accueil partagé » uniquement pour les personnes qui prennent des rendez-vous pour plusieurs entreprises.</p>
              </div>
              {receptionReadyCompanies.length > 0 && (
                <button className="primary-button" type="button" onClick={onOpenReception}>
                  <Icon name="calendar" size={17} /> Ouvrir l’accueil
                </button>
              )}
            </div>

            <div className="metier-member-simple-list">
              {config.members.map((member) => {
                const locked = ['owner', 'admin'].includes(member.role);
                const draft = memberDrafts[member.user_id] ?? {
                  mode: member.company_scope_mode,
                  ids: member.company_ids,
                  reception: member.shared_reception_enabled
                };

                return (
                  <article key={member.user_id}>
                    <div className="member-simple-id">
                      <span>{member.full_name.slice(0, 1).toUpperCase()}</span>
                      <div><strong>{member.full_name}</strong><small>{member.email} · {roleLabel(member.role)}</small></div>
                    </div>
                    {locked ? (
                      <div className="member-admin-note"><Icon name="shield" size={16} /> Toutes les entreprises</div>
                    ) : (
                      <div className="member-simple-controls">
                        <label>Accès
                          <select value={draft.mode} onChange={(event) => setMemberDrafts((current) => ({
                            ...current,
                            [member.user_id]: { ...draft, mode: event.target.value as 'all' | 'selected' }
                          }))}>
                            <option value="all">Toutes les entreprises</option>
                            <option value="selected">Certaines entreprises</option>
                          </select>
                        </label>
                        {draft.mode === 'selected' && (
                          <div className="company-checks">
                            {config.companies.map((company) => (
                              <label key={company.id}>
                                <input type="checkbox" checked={draft.ids.includes(company.id)} onChange={() => toggleMemberCompany(member.user_id, company.id)} /> {company.name}
                              </label>
                            ))}
                          </div>
                        )}
                        <label className="metier-check-row reception-toggle">
                          <input type="checkbox" checked={draft.reception} onChange={(event) => setMemberDrafts((current) => ({
                            ...current,
                            [member.user_id]: { ...draft, reception: event.target.checked }
                          }))} />
                          <span><strong>Accueil partagé</strong><small>Peut prendre et gérer les rendez-vous des entreprises autorisées.</small></span>
                        </label>
                        <button type="button" className="secondary-button compact-button" onClick={() => void saveMember(member)} disabled={busy === `member-${member.user_id}`}>
                          Enregistrer
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
