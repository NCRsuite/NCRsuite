import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { PLAN_DEFINITIONS, planHasFeature, planLabel } from '../config/planEntitlements';

const slotOptions = [5, 10, 15, 20, 30, 45, 60];

export function SettingsPage() {
  const { organization, updateBranding, updateBookingSettings, updateEmailNotificationSettings, updateClientExperienceSettings } = useOrganization();
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2997ff');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingClientExperience, setSavingClientExperience] = useState(false);
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [confirmationMode, setConfirmationMode] = useState<'automatic' | 'manual'>('automatic');
  const [slotInterval, setSlotInterval] = useState(15);
  const [minNoticeHours, setMinNoticeHours] = useState(2);
  const [maxDaysAhead, setMaxDaysAhead] = useState(60);
  const [cancelNoticeHours, setCancelNoticeHours] = useState(12);
  const [welcomeText, setWelcomeText] = useState('');
  const [copied, setCopied] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [reminderHours, setReminderHours] = useState(24);
  const [cancellationPolicy, setCancellationPolicy] = useState('Toute modification ou annulation doit être effectuée avant le délai indiqué. Au-delà, contactez directement l’établissement.');
  const [privacyNotice, setPrivacyNotice] = useState('Vos coordonnées sont utilisées uniquement pour organiser, confirmer et suivre votre rendez-vous.');

  useEffect(() => {
    if (!organization) return;
    setName(organization.name);
    setPrimaryColor(organization.primary_color);
    setBookingEnabled(Boolean(organization.booking_enabled));
    setConfirmationMode(organization.booking_confirmation_mode ?? 'automatic');
    setSlotInterval(organization.booking_slot_interval ?? 15);
    setMinNoticeHours(organization.booking_min_notice_hours ?? 2);
    setMaxDaysAhead(organization.booking_max_days_ahead ?? 60);
    setCancelNoticeHours(organization.booking_cancel_notice_hours ?? 12);
    setWelcomeText(organization.booking_welcome_text ?? '');
    setEmailNotificationsEnabled(organization.email_notifications_enabled ?? true);
    setContactEmail(organization.booking_contact_email ?? '');
    setContactPhone(organization.booking_contact_phone ?? '');
    setReminderHours(organization.booking_reminder_hours ?? 24);
    setCancellationPolicy(organization.booking_cancellation_policy ?? 'Toute modification ou annulation doit être effectuée avant le délai indiqué. Au-delà, contactez directement l’établissement.');
    setPrivacyNotice(organization.booking_privacy_notice ?? 'Vos coordonnées sont utilisées uniquement pour organiser, confirmer et suivre votre rendez-vous.');
  }, [organization]);

  const bookingUrl = useMemo(() => {
    if (!organization || typeof window === 'undefined') return '';
    return `${window.location.origin}/reserver/${organization.slug}`;
  }, [organization]);

  if (!organization) return null;

  const canManage = ['owner', 'admin', 'manager'].includes(organization.role ?? 'viewer');
  const isBookingBusiness = organization.business_type === 'coiffure';
  const hasAutomaticReminders = planHasFeature(organization.plan, 'automatic_reminders');
  const hasOnlineBookingManagement = planHasFeature(organization.plan, 'online_booking_management');
  const hasCalendarLinks = planHasFeature(organization.plan, 'calendar_links');
  const currentPlan = PLAN_DEFINITIONS[organization.plan];

  async function submitBranding(event: FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setSavingBranding(true);
    setMessage('');
    setError('');
    try {
      await updateBranding({ name, primaryColor });
      setMessage('L’identité de l’espace a été enregistrée.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
    } finally {
      setSavingBranding(false);
    }
  }

  async function submitBooking(event: FormEvent) {
    event.preventDefault();
    if (!canManage || !isBookingBusiness) return;
    setSavingBooking(true);
    setMessage('');
    setError('');
    try {
      await updateBookingSettings({
        enabled: bookingEnabled,
        confirmationMode,
        slotInterval,
        minNoticeHours,
        maxDaysAhead,
        cancelNoticeHours,
        welcomeText
      });
      setMessage('Les paramètres de réservation ont été enregistrés.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
    } finally {
      setSavingBooking(false);
    }
  }


  async function submitEmailNotifications(event: FormEvent) {
    event.preventDefault();
    if (!canManage || !isBookingBusiness) return;
    setSavingEmail(true);
    setMessage('');
    setError('');
    try {
      await updateEmailNotificationSettings({
        enabled: emailNotificationsEnabled,
        contactEmail,
        contactPhone,
        reminderHours: hasAutomaticReminders ? reminderHours : 0
      });
      setMessage('Les e-mails automatiques ont été configurés.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
    } finally {
      setSavingEmail(false);
    }
  }

  async function submitClientExperience(event: FormEvent) {
    event.preventDefault();
    if (!canManage || !isBookingBusiness) return;
    setSavingClientExperience(true);
    setMessage('');
    setError('');
    try {
      await updateClientExperienceSettings({ cancellationPolicy, privacyNotice });
      setMessage('Les informations destinées aux clients ont été enregistrées.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
    } finally {
      setSavingClientExperience(false);
    }
  }

  async function copyBookingUrl() {
    if (!bookingUrl) return;
    await navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="page settings-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>Paramètres</h1>
          <p>Personnalisez l’espace de votre entreprise et contrôlez la réservation publique.</p>
        </div>
      </header>

      {!canManage && (
        <div className="info-message page-message" role="status">
          Votre rôle permet de consulter ces paramètres, mais pas de les modifier.
        </div>
      )}
      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}

      <div className="settings-layout">
        <section className="panel settings-form plan-overview-card">
          <div className="plan-overview-heading">
            <div>
              <p className="eyebrow">ABONNEMENT</p>
              <h2>Formule {planLabel(organization.plan)}</h2>
              <p className="muted">Les fonctionnalités sont activées automatiquement selon la formule attribuée par NCR Suite.</p>
            </div>
            <span className="plan-price-badge">{(currentPlan.monthlyPriceCents / 100).toFixed(2).replace('.', ',')} € HT / mois · tarif catalogue</span>
          </div>
          <div className="plan-entitlement-grid">
            <article className="enabled"><Icon name="check" size={18} /><span><strong>Réservation publique</strong><small>Disponible sur votre formule</small></span></article>
            <article className={hasAutomaticReminders ? 'enabled' : 'locked'}><Icon name={hasAutomaticReminders ? 'check' : 'lock'} size={18} /><span><strong>Rappels automatiques</strong><small>{hasAutomaticReminders ? 'Activables dans les réglages' : 'À partir de l’offre Essentielle'}</small></span></article>
            <article className={hasOnlineBookingManagement ? 'enabled' : 'locked'}><Icon name={hasOnlineBookingManagement ? 'check' : 'lock'} size={18} /><span><strong>Modification en ligne</strong><small>{hasOnlineBookingManagement ? 'Déplacement et annulation client' : 'À partir de l’offre Essentielle'}</small></span></article>
            <article className={planHasFeature(organization.plan, 'commercial_branding') ? 'enabled' : 'locked'}><Icon name={planHasFeature(organization.plan, 'commercial_branding') ? 'check' : 'lock'} size={18} /><span><strong>Personnalisation complète</strong><small>{planHasFeature(organization.plan, 'commercial_branding') ? 'Logo, bannière et couleurs' : 'À partir de l’offre Professionnelle'}</small></span></article>
          </div>
          <div className="plan-usage-line"><span>Accès utilisateurs inclus</span><strong>{currentPlan.memberLimit}</strong></div>
        </section>

        <form className="panel settings-form" onSubmit={submitBranding}>
          <div>
            <p className="eyebrow">IDENTITÉ</p>
            <h2>Identité de l’espace</h2>
            <p className="muted">Le nom et la couleur sont propres à votre entreprise.</p>
          </div>
          <label>
            Nom affiché
            <input value={name} onChange={(event) => setName(event.target.value)} disabled={!canManage} minLength={2} maxLength={120} />
          </label>
          <label className="color-field">
            Couleur principale
            <div>
              <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} disabled={!canManage} />
              <span>{primaryColor}</span>
            </div>
          </label>
          <div className="settings-summary">
            <span>Type d’activité</span><strong>{organization.business_type}</strong>
            <span>Formule</span><strong>{planLabel(organization.plan)}</strong>
            <span>Identifiant</span><code>{organization.slug}</code>
          </div>
          {canManage && <button className="primary-button" disabled={savingBranding}>{savingBranding ? 'Enregistrement…' : 'Enregistrer l’identité'}</button>}
        </form>

        {isBookingBusiness && (
          <form className="panel settings-form booking-settings-form" onSubmit={submitBooking}>
            <div className="settings-section-heading">
              <div>
                <p className="eyebrow">RÉSERVATION PUBLIQUE</p>
                <h2>Prise de rendez-vous en ligne</h2>
                <p className="muted">Le client ne voit que les créneaux réellement disponibles.</p>
              </div>
              <label className="switch-field">
                <input
                  type="checkbox"
                  checked={bookingEnabled}
                  onChange={(event) => setBookingEnabled(event.target.checked)}
                  disabled={!canManage}
                />
                <span aria-hidden="true" />
                <b>{bookingEnabled ? 'Activée' : 'Désactivée'}</b>
              </label>
            </div>

            <div className="booking-link-box">
              <div className="booking-link-icon"><Icon name="calendar" size={22} /></div>
              <div>
                <span>Lien public de réservation</span>
                <strong>{bookingUrl}</strong>
              </div>
              <button type="button" className="secondary-button compact-button" onClick={copyBookingUrl}>
                {copied ? 'Copié' : 'Copier'}
              </button>
              <a className="secondary-button compact-button" href={bookingUrl} target="_blank" rel="noreferrer">Ouvrir</a>
            </div>

            <div className="booking-settings-grid">
              <label>
                Validation des demandes
                <select value={confirmationMode} onChange={(event) => setConfirmationMode(event.target.value as 'automatic' | 'manual')} disabled={!canManage}>
                  <option value="automatic">Confirmation automatique</option>
                  <option value="manual">Validation manuelle</option>
                </select>
              </label>
              <label>
                Intervalle entre les créneaux
                <select value={slotInterval} onChange={(event) => setSlotInterval(Number(event.target.value))} disabled={!canManage}>
                  {slotOptions.map((value) => <option key={value} value={value}>{value} minutes</option>)}
                </select>
              </label>
              <label>
                Réservation au minimum
                <select value={minNoticeHours} onChange={(event) => setMinNoticeHours(Number(event.target.value))} disabled={!canManage}>
                  <option value={0}>Sans délai minimum</option>
                  <option value={1}>1 heure avant</option>
                  <option value={2}>2 heures avant</option>
                  <option value={4}>4 heures avant</option>
                  <option value={12}>12 heures avant</option>
                  <option value={24}>24 heures avant</option>
                  <option value={48}>48 heures avant</option>
                </select>
              </label>
              <label>
                Réservable jusqu’à
                <select value={maxDaysAhead} onChange={(event) => setMaxDaysAhead(Number(event.target.value))} disabled={!canManage}>
                  <option value={14}>14 jours</option>
                  <option value={30}>30 jours</option>
                  <option value={60}>60 jours</option>
                  <option value={90}>90 jours</option>
                  <option value={180}>180 jours</option>
                  <option value={365}>1 an</option>
                </select>
              </label>
              <label>
                Annulation en ligne jusqu’à
                <select value={cancelNoticeHours} onChange={(event) => setCancelNoticeHours(Number(event.target.value))} disabled={!canManage || !hasOnlineBookingManagement}>
                  <option value={0}>Jusqu’au rendez-vous</option>
                  <option value={2}>2 heures avant</option>
                  <option value={6}>6 heures avant</option>
                  <option value={12}>12 heures avant</option>
                  <option value={24}>24 heures avant</option>
                  <option value={48}>48 heures avant</option>
                </select>
                {!hasOnlineBookingManagement && <small className="feature-lock-copy">Disponible à partir de l’offre Essentielle.</small>}
              </label>
              <label className="full-field">
                Message d’accueil facultatif
                <textarea
                  rows={3}
                  maxLength={500}
                  value={welcomeText}
                  onChange={(event) => setWelcomeText(event.target.value)}
                  placeholder="Ex. Choisissez votre prestation et le créneau qui vous convient."
                  disabled={!canManage}
                />
              </label>
            </div>

            {canManage && <button className="primary-button" disabled={savingBooking}>{savingBooking ? 'Enregistrement…' : 'Enregistrer la réservation publique'}</button>}
          </form>
        )}

        {isBookingBusiness && (
          <form className="panel settings-form booking-settings-form email-settings-form" onSubmit={submitEmailNotifications}>
            <div className="settings-section-heading">
              <div>
                <p className="eyebrow">E-MAILS AUTOMATIQUES</p>
                <h2>Confirmations et rappels</h2>
                <p className="muted">NCR Suite informe le client lors d’une confirmation, modification, annulation et avant le rendez-vous.</p>
              </div>
              <label className="switch-field">
                <input
                  type="checkbox"
                  checked={emailNotificationsEnabled}
                  onChange={(event) => setEmailNotificationsEnabled(event.target.checked)}
                  disabled={!canManage}
                />
                <span aria-hidden="true" />
                <b>{emailNotificationsEnabled ? 'Activés' : 'Désactivés'}</b>
              </label>
            </div>

            <div className="booking-settings-grid">
              <label>
                E-mail de contact de l’établissement
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="contact@entreprise.fr"
                  disabled={!canManage}
                />
                <small>Utilisé pour les alertes professionnelles et comme adresse de réponse.</small>
              </label>
              <label>
                Téléphone de contact facultatif
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder="06 00 00 00 00"
                  disabled={!canManage}
                />
                <small>Affiché dans les e-mails envoyés aux clients.</small>
              </label>
              <label>
                Rappel automatique
                <select value={hasAutomaticReminders ? reminderHours : 0} onChange={(event) => setReminderHours(Number(event.target.value))} disabled={!canManage || !hasAutomaticReminders}>
                  <option value={0}>Aucun rappel</option>
                  <option value={2}>2 heures avant</option>
                  <option value={6}>6 heures avant</option>
                  <option value={12}>12 heures avant</option>
                  <option value={24}>24 heures avant</option>
                  <option value={48}>48 heures avant</option>
                  <option value={72}>72 heures avant</option>
                </select>
                {!hasAutomaticReminders && <small className="feature-lock-copy">Disponible à partir de l’offre Essentielle.</small>}
              </label>
            </div>

            <div className="info-message booking-email-note">
              Les confirmations sont incluses. {hasAutomaticReminders ? 'Les rappels automatiques sont actifs sur votre formule.' : 'Les rappels automatiques sont réservés à l’offre Essentielle et aux offres supérieures.'}
              {hasCalendarLinks ? ' Les liens Apple, Google et Outlook sont également disponibles.' : ''}
            </div>

            {canManage && <button className="primary-button" disabled={savingEmail}>{savingEmail ? 'Enregistrement…' : 'Enregistrer les e-mails automatiques'}</button>}
          </form>
        )}

        {isBookingBusiness && (
          <form className="panel settings-form booking-settings-form client-experience-settings" onSubmit={submitClientExperience}>
            <div>
              <p className="eyebrow">EXPÉRIENCE CLIENT</p>
              <h2>Règles et confidentialité</h2>
              <p className="muted">Ces textes sont affichés avant la réservation et dans l’espace de gestion du rendez-vous.</p>
            </div>

            <div className="booking-settings-grid">
              <label className="full-field">
                Politique de modification et d’annulation
                <textarea
                  rows={4}
                  maxLength={1500}
                  value={cancellationPolicy}
                  onChange={(event) => setCancellationPolicy(event.target.value)}
                  placeholder="Ex. Toute annulation doit être effectuée au moins 24 h avant le rendez-vous."
                  disabled={!canManage}
                />
                <small>{cancellationPolicy.length}/1500 caractères</small>
              </label>
              <label className="full-field">
                Information sur l’utilisation des données
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={privacyNotice}
                  onChange={(event) => setPrivacyNotice(event.target.value)}
                  placeholder="Expliquez simplement comment les coordonnées du client seront utilisées."
                  disabled={!canManage}
                />
                <small>{privacyNotice.length}/2000 caractères</small>
              </label>
            </div>

            <div className="info-message booking-email-note">
              NCR Suite enregistre la date du consentement donné lors de la réservation. Ces textes ne remplacent pas, à eux seuls, les mentions légales ou la politique de confidentialité complète de l’entreprise.
            </div>

            {canManage && <button className="primary-button" disabled={savingClientExperience}>{savingClientExperience ? 'Enregistrement…' : 'Enregistrer l’expérience client'}</button>}
          </form>
        )}
      </div>
    </div>
  );
}
