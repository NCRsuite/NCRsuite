import { FormEvent, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { availableBusinessTypeOptions, businessPacks } from '../config/businessPacks';
import { getDomainPlans } from '../config/domainPlans';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import type { BusinessType, Plan } from '../types';

const steps = [
  { id: 1, label: 'Activité', icon: 'briefcase' as const },
  { id: 2, label: 'Entreprise', icon: 'building' as const },
  { id: 3, label: 'Formule', icon: 'creditCard' as const },
  { id: 4, label: 'Identité', icon: 'sparkles' as const }
];

const planOrder: Plan[] = ['decouverte', 'essentielle', 'professionnelle', 'metier'];

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(cents / 100);
}

export function OnboardingPage() {
  const { user } = useAuth();
  const { organization, createOrganization } = useOrganization();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('coiffure');
  const [requestedPlan, setRequestedPlan] = useState<Plan>('essentielle');
  const [primaryColor, setPrimaryColor] = useState('#2997ff');
  const [contactName, setContactName] = useState(String(user?.user_metadata?.full_name ?? ''));
  const [companyEmail, setCompanyEmail] = useState(user?.email ?? '');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPostalCode, setCompanyPostalCode] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companySiret, setCompanySiret] = useState('');
  const [objective, setObjective] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const selectedPack = businessPacks[businessType];
  const plans = useMemo(() => getDomainPlans(businessType), [businessType]);
  const selectedPlan = plans[requestedPlan];

  if (organization && !pending) return <Navigate to="/" replace />;

  function canContinue() {
    if (step === 1) return Boolean(businessType);
    if (step === 2) return name.trim().length >= 2 && companyEmail.includes('@');
    if (step === 3) return Boolean(requestedPlan);
    return contactName.trim().length >= 2 && companyEmail.includes('@');
  }

  function nextStep() {
    setError('');
    if (!canContinue()) {
      setError(step === 2 ? 'Renseigne au minimum le nom de l’entreprise et une adresse e-mail valide.' : 'Complète les informations demandées pour continuer.');
      return;
    }
    setStep((current) => Math.min(4, current + 1));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canContinue()) {
      setError('Complète les informations obligatoires avant de créer ton espace.');
      return;
    }
    setPending(true);
    setError('');
    try {
      await createOrganization({
        name: name.trim(),
        businessType,
        primaryColor,
        requestedPlan,
        contactName: contactName.trim(),
        companyEmail: companyEmail.trim(),
        companyPhone: companyPhone.trim(),
        companyAddress: companyAddress.trim(),
        companyPostalCode: companyPostalCode.trim(),
        companyCity: companyCity.trim(),
        companySiret: companySiret.trim(),
        objective: objective.trim()
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de créer l’espace.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="saas-onboarding-page">
      <header className="saas-onboarding-topbar">
        <div className="brand brand-horizontal"><img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" /></div>
        <div className="saas-onboarding-security"><Icon name="lock" size={16} /><span>Configuration sécurisée</span></div>
      </header>

      <main className="saas-onboarding-shell">
        <aside className="saas-onboarding-aside">
          <p className="eyebrow">NOUVEL ESPACE</p>
          <h1>Configure ton entreprise en quelques minutes.</h1>
          <p>NCR Suite prépare automatiquement les menus, les fonctions et l’interface correspondant à ton activité.</p>

          <div className="saas-onboarding-progress" aria-label="Progression de la configuration">
            {steps.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${step === item.id ? 'active' : ''}${step > item.id ? ' done' : ''}`}
                onClick={() => item.id < step && setStep(item.id)}
                disabled={item.id > step}
              >
                <span>{step > item.id ? <Icon name="check" size={17} /> : <Icon name={item.icon} size={17} />}</span>
                <div><strong>{item.label}</strong><small>Étape {item.id} sur 4</small></div>
              </button>
            ))}
          </div>

          <div className="saas-onboarding-preview" style={{ '--preview-accent': primaryColor } as React.CSSProperties}>
            <span className="saas-onboarding-preview-icon"><Icon name={selectedPack.icon} size={24} /></span>
            <div><small>Aperçu de ton espace</small><strong>{name.trim() || selectedPack.label}</strong><span>{selectedPack.label} · {selectedPlan.label}</span></div>
          </div>
        </aside>

        <form className="saas-onboarding-card" onSubmit={submit}>
          <div className="saas-onboarding-card-head">
            <div>
              <span className="saas-step-chip">Étape {step}/4</span>
              <h2>{step === 1 ? 'Quel est ton métier ?' : step === 2 ? 'Présente ton entreprise.' : step === 3 ? 'Quelle formule t’intéresse ?' : 'Finalise ton identité.'}</h2>
              <p>{step === 1 ? 'Le métier détermine l’architecture et les outils disponibles.' : step === 2 ? 'Ces informations seront reprises dans l’administration NCR et tes documents.' : step === 3 ? 'Ce choix prépare ton espace. L’abonnement pourra ensuite être confirmé dans Mon abonnement.' : 'Choisis ton identité visuelle et vérifie le récapitulatif.'}</p>
            </div>
          </div>

          {step === 1 && (
            <section className="saas-business-picker">
              {availableBusinessTypeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={businessType === option.id ? 'selected' : ''}
                  onClick={() => { setBusinessType(option.id); setRequestedPlan('essentielle'); }}
                >
                  <span className="saas-business-icon"><Icon name={option.icon} size={24} /></span>
                  <span><strong>{option.label}</strong><small>{option.description}</small></span>
                  <i>{businessType === option.id ? <Icon name="check" size={16} /> : <Icon name="chevronRight" size={16} />}</i>
                </button>
              ))}
            </section>
          )}

          {step === 2 && (
            <section className="saas-onboarding-fields">
              <label className="full-field">Nom de l’entreprise<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Azzera Protect" required /></label>
              <label>Contact principal<input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nom et prénom" required /></label>
              <label>E-mail professionnel<input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="contact@entreprise.fr" required /></label>
              <label>Téléphone<input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="06 00 00 00 00" /></label>
              <label>SIRET<input inputMode="numeric" value={companySiret} onChange={(e) => setCompanySiret(e.target.value)} placeholder="14 chiffres" /></label>
              <label className="full-field">Adresse<input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Adresse de l’entreprise" /></label>
              <label>Code postal<input value={companyPostalCode} onChange={(e) => setCompanyPostalCode(e.target.value)} placeholder="83600" /></label>
              <label>Ville<input value={companyCity} onChange={(e) => setCompanyCity(e.target.value)} placeholder="Fréjus" /></label>
              <label className="full-field">Objectif principal<textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex. Centraliser mes équipes, mes plannings et mes documents." rows={3} /></label>
            </section>
          )}

          {step === 3 && (
            <section className="saas-plan-picker">
              {planOrder.map((planKey) => {
                const definition = plans[planKey];
                return (
                  <button key={planKey} type="button" className={`${requestedPlan === planKey ? 'selected' : ''}${definition.recommended ? ' recommended' : ''}`} onClick={() => setRequestedPlan(planKey)}>
                    {definition.recommended && <span className="saas-plan-recommended">Recommandée</span>}
                    <div className="saas-plan-heading"><span><strong>{definition.label}</strong><small>{definition.detail}</small></span><i>{requestedPlan === planKey ? <Icon name="check" size={16} /> : ''}</i></div>
                    <div className="saas-plan-price"><strong>{definition.startingAt ? 'Dès ' : ''}{money(definition.monthlyPriceCents)}</strong><span>HT / mois</span></div>
                    <ul>{definition.additions.slice(0, 4).map((item) => <li key={item}><Icon name="check" size={14} />{item}</li>)}</ul>
                  </button>
                );
              })}
            </section>
          )}

          {step === 4 && (
            <section className="saas-final-step">
              <div className="saas-branding-panel">
                <div><p className="eyebrow">IDENTITÉ VISUELLE</p><h3>Choisis ta couleur principale.</h3><p>Tu pourras ajouter ton logo et affiner la personnalisation depuis les paramètres.</p></div>
                <label className="saas-color-picker"><input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} /><span style={{ background: primaryColor }} /><strong>{primaryColor.toUpperCase()}</strong></label>
              </div>

              <div className="saas-onboarding-summary">
                <header><span><Icon name={selectedPack.icon} size={22} /></span><div><small>Ton futur espace</small><h3>{name || 'Entreprise sans nom'}</h3></div></header>
                <dl>
                  <div><dt>Métier</dt><dd>{selectedPack.label}</dd></div>
                  <div><dt>Formule souhaitée</dt><dd>{selectedPlan.label}</dd></div>
                  <div><dt>Contact</dt><dd>{contactName || 'À compléter'}</dd></div>
                  <div><dt>E-mail</dt><dd>{companyEmail || 'À compléter'}</dd></div>
                  <div><dt>Localisation</dt><dd>{[companyPostalCode, companyCity].filter(Boolean).join(' ') || 'Non renseignée'}</dd></div>
                </dl>
                <div className="saas-onboarding-assurance"><Icon name="shield" size={18} /><span><strong>Aucune fonction métier ne sera mélangée.</strong><small>Chaque espace conserve ses données, ses droits et son abonnement séparés.</small></span></div>
              </div>
            </section>
          )}

          {error && <div className="error-message" role="alert">{error}</div>}

          <footer className="saas-onboarding-actions">
            <button type="button" className="secondary-button" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1 || pending}>Retour</button>
            {step < 4 ? (
              <button type="button" className="primary-button" onClick={nextStep}>Continuer <Icon name="chevronRight" size={17} /></button>
            ) : (
              <button className="primary-button" disabled={pending}>{pending ? 'Création de l’espace…' : 'Créer mon espace'} <Icon name="check" size={17} /></button>
            )}
          </footer>
        </form>
      </main>
    </div>
  );
}
