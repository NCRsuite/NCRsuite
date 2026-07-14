import { useMemo, useState } from 'react';
import { businessPacks } from '../config/businessPacks';
import { getDomainPlans } from '../config/domainPlans';
import { supabase } from '../lib/supabase';
import type { BusinessType, Plan } from '../types';
import { Icon } from './Icon';

interface AdminCreateSpaceModalProps {
  onClose: () => void;
  onCreated: (organizationId: string, organizationName: string) => void | Promise<void>;
}

interface CreatedSpaceResult {
  organization_id: string;
  name: string;
  slug: string;
  owner_email: string;
  business_type: BusinessType;
  plan: Plan;
  monthly_price_cents: number;
  status: 'trial' | 'active';
}

const businessTypes = (Object.keys(businessPacks) as BusinessType[]).map((value) => ({
  value,
  label: businessPacks[value].label,
  description: businessPacks[value].description
}));

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
}

function moneyInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function toCents(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : Number.NaN;
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim();
    if (message) return message;
  }
  return 'Impossible de créer le nouvel espace.';
}

export function AdminCreateSpaceModal({ onClose, onCreated }: AdminCreateSpaceModalProps) {
  const [ownerEmail, setOwnerEmail] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>('formation');
  const [plan, setPlan] = useState<Plan>('professionnelle');
  const [monthlyPrice, setMonthlyPrice] = useState(moneyInput(getDomainPlans('formation').professionnelle.monthlyPriceCents));
  const [trialDays, setTrialDays] = useState(0);
  const [primaryColor, setPrimaryColor] = useState('#2997ff');
  const [internalNotes, setInternalNotes] = useState('');
  const [setupFee, setSetupFee] = useState('0.00');
  const [memberLimit, setMemberLimit] = useState(10);
  const [siteLimit, setSiteLimit] = useState(1);
  const [storageLimitMb, setStorageLimitMb] = useState(5000);
  const [contractReference, setContractReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedBusiness = useMemo(
    () => businessTypes.find((item) => item.value === businessType),
    [businessType]
  );
  const plans = useMemo(() => {
    const definitions = getDomainPlans(businessType);
    return (Object.keys(definitions) as Plan[]).map((value) => ({
      value,
      label: definitions[value].label,
      priceCents: definitions[value].monthlyPriceCents,
      detail: definitions[value].detail
    }));
  }, [businessType]);

  function changeName(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  function changePlan(value: Plan) {
    setPlan(value);
    const defaultPrice = plans.find((item) => item.value === value)?.priceCents ?? 0;
    setMonthlyPrice(moneyInput(defaultPrice));
  }

  function changeBusinessType(value: BusinessType) {
    setBusinessType(value);
    const definitions = getDomainPlans(value);
    setMonthlyPrice(moneyInput(definitions[plan].monthlyPriceCents));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || saving) return;

    const monthlyPriceCents = toCents(monthlyPrice);
    const setupFeeCents = toCents(setupFee);

    if (!ownerEmail.trim()) {
      setError('Indique l’adresse e-mail du compte propriétaire existant.');
      return;
    }
    if (name.trim().length < 2) {
      setError('Le nom de l’espace est trop court.');
      return;
    }
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError('L’identifiant public doit contenir uniquement des lettres minuscules, chiffres et tirets.');
      return;
    }
    if (!Number.isFinite(monthlyPriceCents) || monthlyPriceCents < 0) {
      setError('Le tarif mensuel est invalide.');
      return;
    }
    if (plan === 'metier' && (!Number.isFinite(setupFeeCents) || setupFeeCents < 0)) {
      setError('Les frais de configuration sont invalides.');
      return;
    }
    if (plan === 'metier' && businessType === 'securite' && monthlyPriceCents < 5000) {
      setError('Le tarif minimum du domaine Sécurité privée est de 50,00 € HT/mois.');
      return;
    }

    setSaving(true);
    setError('');

    const { data, error: requestError } = await supabase.rpc('admin_create_organization_space', {
      p_owner_email: ownerEmail.trim().toLowerCase(),
      p_name: name.trim(),
      p_slug: slug,
      p_business_type: businessType,
      p_plan: plan,
      p_monthly_price_cents: monthlyPriceCents,
      p_trial_days: trialDays,
      p_primary_color: primaryColor,
      p_internal_notes: internalNotes.trim() || null,
      p_metier_setup_fee_cents: plan === 'metier' ? setupFeeCents : 0,
      p_metier_member_limit: plan === 'metier' ? memberLimit : null,
      p_metier_site_limit: plan === 'metier' ? siteLimit : null,
      p_metier_storage_limit_mb: plan === 'metier' ? storageLimitMb : null,
      p_metier_contract_reference: plan === 'metier' ? contractReference.trim() || null : null
    });

    setSaving(false);

    if (requestError) {
      setError(errorMessage(requestError));
      return;
    }

    const result = data as CreatedSpaceResult | null;
    if (!result?.organization_id) {
      setError('L’espace a été créé, mais son identifiant n’a pas été retourné. Actualise l’administration.');
      return;
    }

    await onCreated(result.organization_id, result.name);
  }

  return (
    <div className="admin-space-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="admin-space-modal" role="dialog" aria-modal="true" aria-labelledby="admin-create-space-title">
        <header className="admin-space-modal-header">
          <div>
            <p className="eyebrow">NOUVEL ESPACE INDÉPENDANT</p>
            <h2 id="admin-create-space-title">Créer un espace entreprise</h2>
            <p>Le même compte peut accéder à plusieurs activités. Chaque espace conserve son domaine, ses données et son abonnement séparés.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label="Fermer">
            <Icon name="close" size={20} />
          </button>
        </header>

        {error && <div className="error-message page-message" role="alert">{error}</div>}

        <form className="admin-space-form" onSubmit={submit}>
          <section className="admin-space-form-section">
            <div className="admin-space-section-heading">
              <span><Icon name="users" size={19} /></span>
              <div><h3>Propriétaire et identité</h3><p>Le compte doit déjà exister dans NCR Suite et avoir confirmé son e-mail.</p></div>
            </div>
            <div className="admin-space-form-grid">
              <label className="full-field">Adresse e-mail du propriétaire
                <input type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} autoComplete="off" placeholder="contact@entreprise.fr" required />
                <small>Utilise le compte entreprise existant, jamais le compte super-administrateur NCR.</small>
              </label>
              <label>Nom du nouvel espace
                <input value={name} onChange={(event) => changeName(event.target.value)} maxLength={120} placeholder="Ex. Bella Formation" required />
              </label>
              <label>Identifiant public
                <input value={slug} onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} maxLength={80} placeholder="bella-formation" required />
                <small>Un suffixe sera ajouté automatiquement s’il existe déjà.</small>
              </label>
              <label>Couleur principale
                <div className="admin-space-color-field"><input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /><code>{primaryColor}</code></div>
              </label>
            </div>
          </section>

          <section className="admin-space-form-section">
            <div className="admin-space-section-heading">
              <span><Icon name={businessPacks[businessType].icon} size={19} /></span>
              <div><h3>Domaine et abonnement</h3><p>Un espace ne peut utiliser qu’un seul domaine métier. Une seconde activité nécessite un autre espace.</p></div>
            </div>
            <div className="admin-space-form-grid">
              <label>Domaine métier
                <select value={businessType} onChange={(event) => changeBusinessType(event.target.value as BusinessType)}>
                  {businessTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <small>{selectedBusiness?.description}</small>
              </label>
              <label>Formule
                <select value={plan} onChange={(event) => changePlan(event.target.value as Plan)}>
                  {plans.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <small>{plans.find((item) => item.value === plan)?.detail}</small>
              </label>
              <label>Tarif mensuel HT
                <div className="admin-price-input"><input inputMode="decimal" value={monthlyPrice} onChange={(event) => setMonthlyPrice(event.target.value)} /><span>€</span></div>
                <small>Ce tarif appartient uniquement à ce nouvel espace.</small>
              </label>
              <label>Durée d’essai
                <div className="admin-space-unit-field"><input type="number" min={0} max={365} value={trialDays} onChange={(event) => setTrialDays(Number(event.target.value))} /><span>jours</span></div>
                <small>0 active immédiatement l’espace.</small>
              </label>
              <label className="full-field">Note interne NCR
                <textarea rows={3} maxLength={2000} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} placeholder="Accord commercial, paiement groupé, particularité du client…" />
              </label>
            </div>
          </section>

          {plan === 'metier' && (
            <section className="admin-space-form-section metier">
              <div className="admin-space-section-heading">
                <span><Icon name="tool" size={19} /></span>
                <div><h3>Configuration Métier initiale</h3><p>Ces limites pourront ensuite être ajustées dans l’onglet Offres Métier.</p></div>
              </div>
              <div className="admin-space-form-grid three-columns">
                <label>Frais de configuration HT
                  <div className="admin-price-input"><input inputMode="decimal" value={setupFee} onChange={(event) => setSetupFee(event.target.value)} /><span>€</span></div>
                </label>
                <label>Utilisateurs maximum
                  <input type="number" min={1} max={100} value={memberLimit} onChange={(event) => setMemberLimit(Number(event.target.value))} />
                </label>
                <label>Établissements maximum
                  <input type="number" min={1} max={50} value={siteLimit} onChange={(event) => setSiteLimit(Number(event.target.value))} />
                </label>
                <label>Stockage inclus
                  <div className="admin-space-unit-field"><input type="number" min={100} max={100000} step={100} value={storageLimitMb} onChange={(event) => setStorageLimitMb(Number(event.target.value))} /><span>Mo</span></div>
                </label>
                <label className="two-columns">Référence du contrat
                  <input maxLength={120} value={contractReference} onChange={(event) => setContractReference(event.target.value)} placeholder="Ex. NCR-FORM-2026-001" />
                </label>
              </div>
              <div className="info-message">Un établissement principal sera créé automatiquement. Les modules activés seront uniquement ceux compatibles avec {selectedBusiness?.label}.</div>
            </section>
          )}

          <div className="admin-space-summary">
            <span><Icon name="check" size={18} /></span>
            <div><strong>{name.trim() || 'Nouvel espace'} — {selectedBusiness?.label}</strong><small>{plans.find((item) => item.value === plan)?.label} · {monthlyPrice.replace('.', ',')} € HT/mois · abonnement indépendant</small></div>
          </div>

          <footer className="admin-space-modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Création de l’espace…' : 'Créer le nouvel espace'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
