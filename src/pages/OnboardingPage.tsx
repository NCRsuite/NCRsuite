import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { availableBusinessTypeOptions, businessPacks } from '../config/businessPacks';
import { businessUiAccent, businessUiTheme } from '../config/businessTheme';
import { getDomainPlans } from '../config/domainPlans';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import type { BusinessType, Plan } from '../types';

const subscriptionSteps = [
  { id: 1, label: 'Activité', icon: 'briefcase' as const },
  { id: 2, label: 'Entreprise', icon: 'building' as const },
  { id: 3, label: 'Formule', icon: 'creditCard' as const },
  { id: 4, label: 'Identité', icon: 'sparkles' as const },
  { id: 5, label: 'Contrat', icon: 'signature' as const }
];

const trialSteps = [
  { id: 1, label: 'Activité', icon: 'briefcase' as const },
  { id: 2, label: 'Entreprise', icon: 'building' as const },
  { id: 3, label: 'Essai Pro', icon: 'sparkles' as const },
  { id: 4, label: 'Démarrage', icon: 'check' as const }
];

const planOrder: Plan[] = ['decouverte', 'essentielle', 'professionnelle', 'metier'];

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(cents / 100);
}

interface SubscriptionContract {
  id: string;
  reference: string;
  status: 'awaiting_signature' | 'signed' | 'payment_pending' | 'active';
  planLabel: string;
  monthlyPriceCents: number;
  signerEmail?: string | null;
  signedAt?: string | null;
}

export function OnboardingPage() {
  const { user } = useAuth();
  const { organization, createOrganization } = useOrganization();
  const requestedBusinessType = String(user?.user_metadata?.requested_business_type ?? '');
  const accessRequestMessage = String(user?.user_metadata?.access_request_message ?? '');
  const trialRequested = user?.user_metadata?.trial_requested === true
    || accessRequestMessage.toLocaleLowerCase('fr-FR').startsWith('demande d’essai gratuit de 7 jours.');
  const initialBusinessType = availableBusinessTypeOptions.some((option) => option.id === requestedBusinessType)
    ? requestedBusinessType as BusinessType
    : 'coiffure';
  const [step, setStep] = useState(1);
  const [name, setName] = useState(String(user?.user_metadata?.requested_company_name ?? ''));
  const [businessType, setBusinessType] = useState<BusinessType>(initialBusinessType);
  const metadataPlan = String(user?.user_metadata?.requested_plan ?? '');
  const [requestedPlan, setRequestedPlan] = useState<Plan>(
    trialRequested
      ? 'professionnelle'
      : planOrder.includes(metadataPlan as Plan) ? metadataPlan as Plan : 'essentielle'
  );
  const [contactName, setContactName] = useState(String(user?.user_metadata?.full_name ?? ''));
  const [companyEmail, setCompanyEmail] = useState(user?.email ?? '');
  const [companyPhone, setCompanyPhone] = useState(String(user?.user_metadata?.phone ?? ''));
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPostalCode, setCompanyPostalCode] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companySiret, setCompanySiret] = useState('');
  const [objective, setObjective] = useState(String(user?.user_metadata?.access_request_message ?? ''));
  const [pending, setPending] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [contractOrganizationId, setContractOrganizationId] = useState('');
  const [contract, setContract] = useState<SubscriptionContract | null>(null);
  const [contractPreviewUrl, setContractPreviewUrl] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [signerName, setSignerName] = useState(String(user?.user_metadata?.full_name ?? ''));
  const [signerTitle, setSignerTitle] = useState('Représentant habilité');
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [acceptedCgv, setAcceptedCgv] = useState(false);
  const [acceptedCgu, setAcceptedCgu] = useState(false);
  const [acceptedPrivacyDpa, setAcceptedPrivacyDpa] = useState(false);
  const [error, setError] = useState('');

  const selectedPack = businessPacks[businessType];
  const plans = useMemo(() => getDomainPlans(businessType), [businessType]);
  const selectedPlan = plans[requestedPlan];
  const steps = trialRequested ? trialSteps : subscriptionSteps;

  useEffect(() => {
    if (trialRequested && requestedPlan !== 'professionnelle') setRequestedPlan('professionnelle');
  }, [trialRequested, requestedPlan]);

  if (organization && !pending && !contractOrganizationId) return <Navigate to="/" replace />;

  function canContinue() {
    if (step === 1) return Boolean(businessType);
    if (step === 2) return name.trim().length >= 2 && companyEmail.includes('@');
    if (step === 3) return trialRequested || Boolean(requestedPlan);
    if (step === 4) return contactName.trim().length >= 2 && companyEmail.includes('@') && termsAccepted;
    return Boolean(contract);
  }

  function nextStep() {
    setError('');
    if (!canContinue()) {
      setError(step === 2 ? 'Renseigne au minimum le nom de l’entreprise et une adresse e-mail valide.' : 'Complète les informations demandées pour continuer.');
      return;
    }
    setStep((current) => Math.min(trialRequested ? 4 : 5, current + 1));
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
      const effectivePlan: Plan = trialRequested ? 'professionnelle' : requestedPlan;
      let organizationId = contractOrganizationId;
      if (!organizationId) {
        organizationId = await createOrganization({
          name: name.trim(),
          businessType,
          requestedPlan: effectivePlan,
          contactName: contactName.trim(),
          companyEmail: companyEmail.trim(),
          companyPhone: companyPhone.trim(),
          companyAddress: companyAddress.trim(),
          companyPostalCode: companyPostalCode.trim(),
          companyCity: companyCity.trim(),
          companySiret: companySiret.trim(),
          objective: objective.trim()
        });
        if (trialRequested) return;
        setContractOrganizationId(organizationId);
      }
      if (trialRequested) return;
      if (!supabase) throw new Error('Le service sécurisé NCR Suite est indisponible.');
      const { data, error: contractError } = await supabase.functions.invoke('subscription-contract', {
        body: {
          action: 'prepare',
          organizationId,
          planKey: effectivePlan
        }
      });
      if (contractError || data?.error || !data?.contract) throw new Error(data?.error ?? contractError?.message ?? 'Le contrat n’a pas pu être préparé.');
      setContract(data.contract as SubscriptionContract);
      setContractPreviewUrl(String(data.previewUrl ?? ''));
      setStep(5);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de créer l’espace.');
    } finally {
      setPending(false);
    }
  }

  async function requestSignatureCode() {
    if (!supabase || !contract || !contractOrganizationId) return;
    setPending(true);
    setError('');
    try {
      const { data, error: codeError } = await supabase.functions.invoke('subscription-contract', {
        body: { action: 'request_code', organizationId: contractOrganizationId, contractId: contract.id }
      });
      if (codeError || data?.error) throw new Error(data?.error ?? codeError?.message ?? 'Le code n’a pas pu être envoyé.');
      setOtpSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le code n’a pas pu être envoyé.');
    } finally {
      setPending(false);
    }
  }

  async function openStripeCheckout(contractId: string) {
    if (!supabase || !contractOrganizationId) return;
    const { data, error: checkoutError } = await supabase.functions.invoke('create-stripe-checkout', {
      body: {
        organizationId: contractOrganizationId,
        planKey: requestedPlan,
        contractId,
        acceptTerms: true
      }
    });
    if (checkoutError || data?.error || !data?.url) {
      throw new Error(data?.error ?? checkoutError?.message ?? 'La page de paiement n’a pas pu être ouverte.');
    }
    window.location.assign(String(data.url));
  }

  async function signAndPay() {
    if (!supabase || !contract || !contractOrganizationId) return;
    setPending(true);
    setError('');
    try {
      if (contract.status === 'signed' || contract.status === 'payment_pending') {
        await openStripeCheckout(contract.id);
        return;
      }
      const { data, error: signatureError } = await supabase.functions.invoke('subscription-contract', {
        body: {
          action: 'sign',
          organizationId: contractOrganizationId,
          contractId: contract.id,
          code: otpCode,
          signerName: signerName.trim(),
          signerTitle: signerTitle.trim(),
          acceptedContract,
          acceptedCgv,
          acceptedCgu,
          acceptedPrivacyDpa
        }
      });
      if (signatureError || data?.error || !data?.contract) {
        throw new Error(data?.error ?? signatureError?.message ?? 'La signature n’a pas pu être finalisée.');
      }
      setContract(data.contract as SubscriptionContract);
      setContractPreviewUrl(String(data.downloadUrl ?? contractPreviewUrl));
      await openStripeCheckout(contract.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La signature n’a pas pu être finalisée.');
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
          <p className="eyebrow">{trialRequested ? 'ESSAI GRATUIT · 7 JOURS' : 'NOUVEL ESPACE'}</p>
          <h1>{trialRequested ? 'Active ton essai Professionnel en quelques minutes' : 'Configure ton entreprise en quelques minutes'}</h1>
          <p>{trialRequested ? 'Ton espace démarre directement avec la formule Professionnelle, sans carte bancaire, sans contrat et sans paiement au démarrage.' : 'NCR Suite prépare automatiquement les menus, les fonctions et l’interface correspondant à ton activité.'}</p>

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
                <div><strong>{item.label}</strong><small>Étape {item.id} sur 5</small></div>
              </button>
            ))}
          </div>

          <div className="saas-onboarding-preview" style={{ '--preview-accent': businessUiAccent(businessType) } as React.CSSProperties}>
            <span className="saas-onboarding-preview-icon"><Icon name={selectedPack.icon} size={24} /></span>
            <div><small>Aperçu de ton espace</small><strong>{name.trim() || selectedPack.label}</strong><span>{selectedPack.label} · {selectedPlan.label}</span></div>
          </div>
        </aside>

        <form className="saas-onboarding-card" onSubmit={submit}>
          <div className="saas-onboarding-card-head">
            <div>
              <span className="saas-step-chip">Étape {step}/5</span>
              <h2>{step === 1 ? 'Quel est ton métier ?' : step === 2 ? 'Présente ton entreprise' : step === 3 ? 'Quelle formule t’intéresse ?' : step === 4 ? 'Finalise ton identité' : 'Signe ton contrat d’abonnement'}</h2>
              <p>{step === 1 ? 'Le métier détermine l’architecture et les outils disponibles.' : step === 2 ? 'Ces informations seront reprises dans l’administration NCR et tes documents.' : step === 3 ? 'Cette formule sera réglée sur une page de paiement sécurisée avant l’ouverture de l’espace.' : step === 4 ? 'Choisis ton identité visuelle et vérifie le récapitulatif avant la préparation du contrat.' : 'Consulte le document exact, valide chaque annexe et confirme ta signature avec le code reçu par e-mail.'}</p>
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
            trialRequested ? (
              <section className="saas-trial-professional-card">
                <div className="saas-trial-professional-head">
                  <span><Icon name="sparkles" size={24} /></span>
                  <div>
                    <p className="eyebrow">FORMULE D’ESSAI</p>
                    <h3>Professionnelle · 7 jours offerts</h3>
                    <p>Tu disposes directement de la formule Professionnelle correspondant à ton métier pour tester NCR Suite dans de vraies conditions.</p>
                  </div>
                </div>
                <div className="saas-trial-professional-facts">
                  <div><strong>0 € aujourd’hui</strong><small>Aucune carte bancaire demandée</small></div>
                  <div><strong>7 jours complets</strong><small>Le compteur démarre à la création de l’espace</small></div>
                  <div><strong>Sans engagement</strong><small>Tu choisiras ton abonnement seulement si tu continues</small></div>
                </div>
                <ul>{plans.professionnelle.additions.slice(0, 6).map((item) => <li key={item}><Icon name="check" size={14} />{item}</li>)}</ul>
                <div className="saas-trial-professional-note"><Icon name="info" size={17} /><span>À la fin de l’essai, tes données sont conservées. Les fonctions payantes sont verrouillées jusqu’à la souscription d’une formule.</span></div>
              </section>
            ) : (
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
            )
          )}

          {step === 4 && (
            <section className="saas-final-step">
              <div className="saas-branding-panel">
                <div><p className="eyebrow">IDENTITÉ MÉTIER</p><h3>Ton thème NCR Suite est déjà défini</h3><p>La couleur de l’interface suit automatiquement le métier. Le logo et l’identité publique restent personnalisables séparément.</p></div>
                <div className="saas-business-theme-lock">
                  <span style={{ background: businessUiAccent(businessType) }} />
                  <div><small>THÈME AUTOMATIQUE</small><strong>{businessUiTheme(businessType).label}</strong></div>
                  <Icon name="lock" size={18} />
                </div>
              </div>

              <div className="saas-onboarding-summary">
                <header><span><Icon name={selectedPack.icon} size={22} /></span><div><small>Ton futur espace</small><h3>{name || 'Entreprise sans nom'}</h3></div></header>
                <dl>
                  <div><dt>Métier</dt><dd>{selectedPack.label}</dd></div>
                  <div><dt>{trialRequested ? 'Formule d’essai' : 'Formule souhaitée'}</dt><dd>{trialRequested ? 'Professionnelle · 7 jours' : selectedPlan.label}</dd></div>
                  <div><dt>Contact</dt><dd>{contactName || 'À compléter'}</dd></div>
                  <div><dt>E-mail</dt><dd>{companyEmail || 'À compléter'}</dd></div>
                  <div><dt>Localisation</dt><dd>{[companyPostalCode, companyCity].filter(Boolean).join(' ') || 'Non renseignée'}</dd></div>
                </dl>
                <div className="saas-onboarding-assurance"><Icon name="shield" size={18} /><span><strong>{trialRequested ? 'Essai Professionnel, sans paiement.' : 'Aucune fonction métier ne sera mélangée.'}</strong><small>{trialRequested ? 'Aucune carte bancaire ni signature de contrat d’abonnement n’est demandée pour commencer les 7 jours.' : 'Chaque espace conserve ses données, ses droits et son abonnement séparés.'}</small></span></div>
                <label className="public-privacy-check">
                  <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} required />
                  <span>{trialRequested ? <>Je confirme le démarrage de mon <strong>essai gratuit de 7 jours sur la formule Professionnelle</strong>. Je pourrai choisir un abonnement uniquement si je souhaite continuer.</> : <>J’accepte la souscription de la formule <strong>{selectedPlan.label}</strong>. L’espace restera verrouillé jusqu’à la confirmation du paiement.</>}</span>
                </label>
              </div>
            </section>
          )}

          {!trialRequested && step === 5 && contract && (
            <section className="saas-contract-step">
              <article className="saas-contract-document">
                <span className="saas-contract-icon"><Icon name="file" size={25} /></span>
                <div>
                  <p className="eyebrow">DOCUMENT CONTRACTUEL</p>
                  <h3>{contract.reference}</h3>
                  <p>Formule <strong>{contract.planLabel}</strong> · {money(contract.monthlyPriceCents)} HT / mois</p>
                  <small>Le PDF est archivé dans un espace privé. Son empreinte numérique sera jointe à la preuve de signature.</small>
                </div>
                <button type="button" className="secondary-button" onClick={() => contractPreviewUrl && window.open(contractPreviewUrl, '_blank', 'noopener,noreferrer')} disabled={!contractPreviewUrl}>
                  <Icon name="eye" size={17} /> Ouvrir le contrat
                </button>
              </article>

              {contract.status === 'signed' || contract.status === 'payment_pending' ? (
                <div className="saas-contract-signed">
                  <Icon name="check" size={22} />
                  <div><strong>Contrat signé et scellé</strong><span>Tu peux maintenant reprendre le paiement sécurisé.</span></div>
                </div>
              ) : (
                <div className="saas-contract-signature-form">
                  <div className="saas-contract-identity">
                    <label>Nom complet du signataire<input value={signerName} onChange={(event) => setSignerName(event.target.value)} placeholder="Nom et prénom" /></label>
                    <label>Qualité du signataire<input value={signerTitle} onChange={(event) => setSignerTitle(event.target.value)} placeholder="Gérant, président, représentant habilité…" /></label>
                  </div>

                  <div className="saas-contract-consents">
                    <label><input type="checkbox" checked={acceptedContract} onChange={(event) => setAcceptedContract(event.target.checked)} /><span>J’ai lu et j’accepte le contrat d’abonnement et le bon de commande.</span></label>
                    <label><input type="checkbox" checked={acceptedCgv} onChange={(event) => setAcceptedCgv(event.target.checked)} /><span>J’accepte les conditions générales de vente.</span></label>
                    <label><input type="checkbox" checked={acceptedCgu} onChange={(event) => setAcceptedCgu(event.target.checked)} /><span>J’accepte les conditions générales d’utilisation.</span></label>
                    <label><input type="checkbox" checked={acceptedPrivacyDpa} onChange={(event) => setAcceptedPrivacyDpa(event.target.checked)} /><span>J’accepte les règles de confidentialité et l’annexe de traitement des données.</span></label>
                  </div>

                  <div className="saas-contract-otp">
                    <div><strong>Vérification par e-mail</strong><span>Le code est envoyé à {contract.signerEmail || companyEmail} et reste valable 10 minutes.</span></div>
                    <button type="button" className="secondary-button" onClick={() => void requestSignatureCode()} disabled={pending}>{otpSent ? 'Renvoyer le code' : 'Recevoir mon code'}</button>
                    <label>Code à 6 chiffres<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" /></label>
                  </div>
                </div>
              )}

              <div className="saas-contract-proof"><Icon name="shield" size={18} /><span><strong>Preuve horodatée</strong><small>Le document signé conservera le signataire, l’e-mail vérifié, l’heure, les consentements et les empreintes SHA-256.</small></span></div>
            </section>
          )}

          {error && <div className="error-message" role="alert">{error}</div>}

          <footer className="saas-onboarding-actions">
            <button type="button" className="secondary-button" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1 || pending}>Retour</button>
            {step < 4 ? (
              <button type="button" className="primary-button" onClick={nextStep}>Continuer <Icon name="chevronRight" size={17} /></button>
            ) : step === 4 ? (
              <button className="primary-button" disabled={pending}>
                {trialRequested
                  ? pending ? 'Création de l’essai…' : 'Démarrer mon essai Professionnel'
                  : pending ? 'Préparation du contrat…' : 'Créer et préparer le contrat'}
                <Icon name={trialRequested ? 'sparkles' : 'file'} size={17} />
              </button>
            ) : (
              <button type="button" className="primary-button" onClick={() => void signAndPay()} disabled={pending || (contract?.status === 'awaiting_signature' && (!otpSent || otpCode.length !== 6 || !signerName.trim() || !signerTitle.trim() || !acceptedContract || !acceptedCgv || !acceptedCgu || !acceptedPrivacyDpa))}>
                {pending ? 'Vérification en cours…' : contract?.status === 'signed' || contract?.status === 'payment_pending' ? 'Reprendre le paiement' : 'Signer et passer au paiement'} <Icon name="creditCard" size={17} />
              </button>
            )}
          </footer>
        </form>
      </main>
    </div>
  );
}
