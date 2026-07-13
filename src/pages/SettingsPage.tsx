import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';

const slotOptions = [5, 10, 15, 20, 30, 45, 60];

export function SettingsPage() {
  const { organization, updateBranding, updateBookingSettings } = useOrganization();
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2997ff');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [confirmationMode, setConfirmationMode] = useState<'automatic' | 'manual'>('automatic');
  const [slotInterval, setSlotInterval] = useState(15);
  const [minNoticeHours, setMinNoticeHours] = useState(2);
  const [maxDaysAhead, setMaxDaysAhead] = useState(60);
  const [cancelNoticeHours, setCancelNoticeHours] = useState(12);
  const [welcomeText, setWelcomeText] = useState('');
  const [copied, setCopied] = useState(false);

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
  }, [organization]);

  const bookingUrl = useMemo(() => {
    if (!organization || typeof window === 'undefined') return '';
    return `${window.location.origin}/reserver/${organization.slug}`;
  }, [organization]);

  if (!organization) return null;

  const canManage = ['owner', 'admin', 'manager'].includes(organization.role ?? 'viewer');
  const isBookingBusiness = organization.business_type === 'coiffure';

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
            <span>Formule</span><strong>{organization.plan}</strong>
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
                <select value={cancelNoticeHours} onChange={(event) => setCancelNoticeHours(Number(event.target.value))} disabled={!canManage}>
                  <option value={0}>Jusqu’au rendez-vous</option>
                  <option value={2}>2 heures avant</option>
                  <option value={6}>6 heures avant</option>
                  <option value={12}>12 heures avant</option>
                  <option value={24}>24 heures avant</option>
                  <option value={48}>48 heures avant</option>
                </select>
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

            <div className="info-message booking-email-note">
              La réservation et l’affichage dans le planning sont fonctionnels. L’envoi automatique d’un e-mail personnalisé sera activé lors de la configuration du service d’e-mail transactionnel.
            </div>

            {canManage && <button className="primary-button" disabled={savingBooking}>{savingBooking ? 'Enregistrement…' : 'Enregistrer la réservation publique'}</button>}
          </form>
        )}
      </div>
    </div>
  );
}
