import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageMetadata } from '../components/PageMetadata';
import { PublicSiteFooter } from '../components/PublicSiteFooter';
import { PublicSiteHeader } from '../components/PublicSiteHeader';
import { availableBusinessTypeOptions } from '../config/businessPacks';
import { getDomainPlans } from '../config/domainPlans';
import { supabase } from '../lib/supabase';
import type { BusinessType, Plan } from '../types';

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const planOrder: Plan[] = ['decouverte', 'essentielle', 'professionnelle', 'metier'];

export function AccessRequestPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('formation');
  const [requestedPlan, setRequestedPlan] = useState<Plan>('essentielle');
  const [teamSize, setTeamSize] = useState('1-5');
  const [message, setMessage] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [website, setWebsite] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const turnstileHost = useRef<HTMLDivElement | null>(null);
  const turnstileWidget = useRef<string | null>(null);

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileHost.current) return;
    let cancelled = false;

    const renderWidget = () => {
      const api = (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
      if (!api || !turnstileHost.current || turnstileWidget.current || cancelled) return;
      turnstileWidget.current = api.render(turnstileHost.current, {
        sitekey: turnstileSiteKey,
        theme: 'light',
        size: 'flexible',
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken('')
      });
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-ncr-turnstile]');
    if (existing) {
      const timer = window.setInterval(() => {
        renderWidget();
        if (turnstileWidget.current) window.clearInterval(timer);
      }, 100);
      return () => {
        cancelled = true;
        window.clearInterval(timer);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.ncrTurnstile = 'true';
    script.addEventListener('load', renderWidget);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      const api = (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
      if (api && turnstileWidget.current) api.remove(turnstileWidget.current);
      turnstileWidget.current = null;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || pending) return;
    if (turnstileSiteKey && !turnstileToken) {
      setError('Validez le contrôle de sécurité avant d’envoyer votre demande.');
      return;
    }

    setPending(true);
    setError('');
    const { data, error: requestError } = await supabase.functions.invoke('request-platform-access', {
      body: {
        fullName,
        email,
        phone,
        companyName,
        businessType,
        requestedPlan,
        teamSize,
        message,
        privacyAccepted,
        website,
        turnstileToken
      }
    });

    if (requestError || data?.error) {
      setError(String(data?.error || requestError?.message || 'La demande n’a pas pu être envoyée.'));
      const api = (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
      if (api && turnstileWidget.current) api.reset(turnstileWidget.current);
      setTurnstileToken('');
    } else {
      setReference(String(data?.reference ?? ''));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setPending(false);
  }

  if (reference) {
    return (
      <div className="public-form-page">
        <PageMetadata title="Demande reçue | NCR Suite" path="/demande-acces" />
        <PublicSiteHeader compact />
        <main className="public-request-success">
          <span><Icon name="check" size={32} /></span>
          <p className="public-section-label">DEMANDE TRANSMISE</p>
          <h1>Merci, votre demande va être étudiée.</h1>
          <p>Le super administrateur NCR Suite vérifiera votre besoin avant d’autoriser la création du compte. Après l’invitation, votre espace sera activé par le paiement Stripe de la formule choisie. Vous recevrez l’e-mail depuis <strong>contact@ncr-suite.fr</strong>.</p>
          <div><small>Référence de suivi</small><strong>{reference}</strong></div>
          <Link className="public-primary-action" to="/">Retourner à l’accueil</Link>
        </main>
        <PublicSiteFooter />
      </div>
    );
  }

  return (
    <div className="public-form-page">
      <PageMetadata
        title="Demander un accès | NCR Suite"
        description="Présentez votre activité pour obtenir un espace NCR Suite configuré et validé par notre équipe."
        path="/demande-acces"
      />
      <PublicSiteHeader compact />
      <main className="public-request-layout">
        <section className="public-request-intro">
          <p className="public-section-label">ACCÈS SUR VALIDATION</p>
          <h1>Parlons de votre activité avant d’ouvrir votre espace.</h1>
          <p>Cette courte demande nous permet de vérifier le métier, le bon niveau d’équipement et la personne qui deviendra propriétaire du compte.</p>
          <ol>
            <li><span>1</span><div><strong>Vous présentez votre besoin</strong><small>Aucun compte n’est créé automatiquement.</small></div></li>
            <li><span>2</span><div><strong>NCR Suite examine la demande</strong><small>Le super administrateur accepte ou refuse l’ouverture.</small></div></li>
            <li><span>3</span><div><strong>Vous recevez votre invitation</strong><small>Vous définissez votre mot de passe sur ncr-suite.fr.</small></div></li>
          </ol>
          <div className="public-request-assurance"><Icon name="shield" size={21} /><span><strong>Vos informations restent privées.</strong><small>Elles servent uniquement à traiter votre demande d’accès.</small></span></div>
        </section>

        <form className="public-request-form" onSubmit={submit}>
          <header>
            <p className="public-section-label">VOTRE DEMANDE</p>
            <h2>Quelques informations suffisent.</h2>
          </header>
          <div className="public-request-fields">
            <label>Nom et prénom *<input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={120} autoComplete="name" required /></label>
            <label>Adresse e-mail professionnelle *<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" required /></label>
            <label>Téléphone<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} autoComplete="tel" /></label>
            <label>Entreprise *<input value={companyName} onChange={(event) => setCompanyName(event.target.value)} maxLength={160} autoComplete="organization" required /></label>
            <label>Activité principale *
              <select value={businessType} onChange={(event) => setBusinessType(event.target.value as BusinessType)}>
                {availableBusinessTypeOptions.map((business) => <option key={business.id} value={business.id}>{business.label}</option>)}
              </select>
            </label>
            <label>Formule souhaitée *
              <select value={requestedPlan} onChange={(event) => setRequestedPlan(event.target.value as Plan)}>
                {planOrder.map((planKey) => {
                  const plan = getDomainPlans(businessType)[planKey];
                  return <option key={planKey} value={planKey}>{plan.label} · {(plan.monthlyPriceCents / 100).toLocaleString('fr-FR')} € HT/mois</option>;
                })}
              </select>
            </label>
            <label>Taille de l’équipe
              <select value={teamSize} onChange={(event) => setTeamSize(event.target.value)}>
                <option value="1">Moi uniquement</option>
                <option value="1-5">1 à 5 personnes</option>
                <option value="6-15">6 à 15 personnes</option>
                <option value="16-50">16 à 50 personnes</option>
                <option value="51+">Plus de 50 personnes</option>
              </select>
            </label>
            <label className="full-field">Votre besoin principal<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={5} placeholder="Ex. Centraliser mes sessions, automatiser mes documents et préparer mon BPF." /></label>
            <label className="public-honeypot" aria-hidden="true">Site internet<input value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></label>
            <label className="public-privacy-check full-field">
              <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required />
              <span>J’accepte que ces informations soient utilisées pour traiter ma demande conformément à la <Link to="/confidentialite">politique de confidentialité</Link>.</span>
            </label>
            {turnstileSiteKey && <div className="public-turnstile full-field" ref={turnstileHost} />}
          </div>
          {error && <div className="error-message" role="alert">{error}</div>}
          <button className="public-primary-action full" disabled={pending}>
            {pending ? 'Envoi de la demande…' : 'Transmettre ma demande'} <Icon name="chevronRight" size={17} />
          </button>
          <small className="public-form-note">Aucun paiement n’est réalisé à cette étape. Après validation, Stripe activera l’espace uniquement lorsque la souscription sera confirmée.</small>
        </form>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
