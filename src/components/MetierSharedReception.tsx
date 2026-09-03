import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import { Icon } from './Icon';

interface ReceptionCompany { id: string; name: string; logo_url: string | null; primary_color: string; booking_enabled: boolean; }
interface ReceptionSite { id: string; name: string; company_id: string; brand_id: string | null; address: string | null; city: string | null; location_id: string | null; }
interface ReceptionService { id: string; name: string; company_id: string; duration_minutes: number; price_cents: number; }
interface ReceptionStaff { id: string; display_name: string; company_id: string; site_id: string | null; color: string | null; }
interface StaffService { staff_id: string; service_id: string; }
interface ReceptionContext { companies: ReceptionCompany[]; sites: ReceptionSite[]; services: ReceptionService[]; staff: ReceptionStaff[]; staff_services: StaffService[]; }
interface ClientRecord { id: string; first_name: string; last_name: string | null; email: string | null; phone: string | null; }
interface AppointmentRecord {
  id: string; company_id: string; company_name: string; site_id: string | null; site_name: string | null;
  client_id: string; client_name: string; client_phone: string | null; service_id: string; service_name: string;
  staff_id: string; staff_name: string; starts_at: string; ends_at: string; status: string; notes: string | null; amount_cents: number | null;
}

function dateInput(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function timeInput() {
  const next = new Date();
  next.setMinutes(Math.ceil(next.getMinutes() / 15) * 15, 0, 0);
  if (next.getHours() >= 19) { next.setDate(next.getDate() + 1); next.setHours(9, 0, 0, 0); }
  return `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
}

function money(cents: number | null) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100);
}

const statusLabels: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmé', completed: 'Terminé', cancelled: 'Annulé', no_show: 'Absent' };

export function MetierSharedReception({ onBack }: { onBack: () => void }) {
  const { organization } = useOrganization();
  const [context, setContext] = useState<ReceptionContext | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [newClient, setNewClient] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(dateInput());
  const [time, setTime] = useState(timeInput());
  const [notes, setNotes] = useState('');

  async function loadContext() {
    if (!organization || organization.plan !== 'metier' || !supabase) return;
    setLoading(true); setError('');
    const { data, error: requestError } = await supabase.rpc('metier_reception_context', { p_organization_id: organization.id });
    if (requestError) { setError(requestError.message); setContext(null); setLoading(false); return; }
    const next = (data ?? { companies: [], sites: [], services: [], staff: [], staff_services: [] }) as ReceptionContext;
    next.companies = Array.isArray(next.companies) ? next.companies : [];
    next.sites = Array.isArray(next.sites) ? next.sites : [];
    next.services = Array.isArray(next.services) ? next.services : [];
    next.staff = Array.isArray(next.staff) ? next.staff : [];
    next.staff_services = Array.isArray(next.staff_services) ? next.staff_services : [];
    setContext(next);
    const initialCompany = next.companies[0]?.id ?? '';
    setCompanyId((current) => current && next.companies.some((company) => company.id === current) ? current : initialCompany);
    setLoading(false);
  }

  async function loadAppointments() {
    if (!organization || !supabase) return;
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(from); to.setDate(to.getDate() + 31);
    const { data, error: requestError } = await supabase.rpc('metier_reception_list_appointments', {
      p_organization_id: organization.id, p_from: from.toISOString(), p_to: to.toISOString()
    });
    if (requestError) setError(requestError.message);
    else setAppointments((Array.isArray(data) ? data : []) as AppointmentRecord[]);
  }

  async function searchClients(term = clientSearch) {
    if (!organization || !supabase || !companyId) { setClients([]); return; }
    setBusy('clients');
    const { data, error: requestError } = await supabase.rpc('metier_reception_search_company_clients', {
      p_organization_id: organization.id,
      p_company_id: companyId,
      p_search: term.trim() || null
    });
    setBusy('');
    if (requestError) setError(requestError.message);
    else setClients((Array.isArray(data) ? data : []) as ClientRecord[]);
  }

  useEffect(() => { void loadContext(); void loadAppointments(); }, [organization?.id, organization?.plan]);

  useEffect(() => {
    setClientId('');
    setClientSearch('');
    setClients([]);
    setNewClient(false);
    if (companyId) void searchClients('');
  }, [companyId]);

  const companySites = useMemo(() => (context?.sites ?? []).filter((site) => site.company_id === companyId), [context?.sites, companyId]);
  const companyServices = useMemo(() => (context?.services ?? []).filter((service) => service.company_id === companyId), [context?.services, companyId]);
  const compatibleStaff = useMemo(() => {
    const allowed = new Set((context?.staff_services ?? []).filter((item) => !serviceId || item.service_id === serviceId).map((item) => item.staff_id));
    return (context?.staff ?? []).filter((member) => member.company_id === companyId && (!siteId || !member.site_id || member.site_id === siteId) && (!serviceId || allowed.has(member.id)));
  }, [context?.staff, context?.staff_services, companyId, siteId, serviceId]);
  const selectedCompany = useMemo(() => context?.companies.find((company) => company.id === companyId) ?? null, [context?.companies, companyId]);
  const upcoming = useMemo(() => appointments.filter((appointment) => appointment.status !== 'cancelled').slice(0, 50), [appointments]);

  useEffect(() => {
    if (!companySites.some((site) => site.id === siteId)) setSiteId(companySites[0]?.id ?? '');
    if (!companyServices.some((service) => service.id === serviceId)) setServiceId(companyServices[0]?.id ?? '');
  }, [companyId, companySites, companyServices, siteId, serviceId]);

  useEffect(() => { if (!compatibleStaff.some((member) => member.id === staffId)) setStaffId(compatibleStaff[0]?.id ?? ''); }, [compatibleStaff, staffId]);

  function resetForm() {
    setCompanyId(context?.companies[0]?.id ?? ''); setSiteId(''); setServiceId(''); setStaffId(''); setClientId(''); setNewClient(false);
    setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setDate(dateInput()); setTime(timeInput()); setNotes('');
  }

  async function saveAppointment(event: FormEvent) {
    event.preventDefault();
    if (!organization || !supabase) return;
    if (!companyId || !siteId || !serviceId || !staffId) { setError('Choisissez l’enseigne, l’adresse, la prestation et le collaborateur.'); return; }
    if (!newClient && !clientId) { setError('Choisissez un client ou créez-en un nouveau.'); return; }
    if (newClient && firstName.trim().length < 2) { setError('Indiquez le prénom ou le nom du nouveau client.'); return; }
    const startsAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startsAt.getTime())) { setError('Date ou heure invalide.'); return; }

    setBusy('appointment'); setError(''); setMessage('');
    const { error: requestError } = await supabase.rpc('metier_reception_save_appointment', {
      p_organization_id: organization.id, p_company_id: companyId, p_site_id: siteId, p_service_id: serviceId, p_staff_id: staffId,
      p_client_id: newClient ? null : clientId,
      p_client_first_name: newClient ? firstName.trim() : null,
      p_client_last_name: newClient ? lastName.trim() || null : null,
      p_client_email: newClient ? email.trim() || null : null,
      p_client_phone: newClient ? phone.trim() || null : null,
      p_starts_at: startsAt.toISOString(), p_status: 'confirmed', p_notes: notes.trim() || null
    });
    setBusy('');
    if (requestError) { setError(requestError.message); return; }
    setMessage(`Rendez-vous enregistré pour ${selectedCompany?.name ?? 'l’enseigne'}.`);
    setShowForm(false); resetForm(); await loadAppointments();
  }

  async function updateStatus(appointment: AppointmentRecord, status: string) {
    if (!organization || !supabase) return;
    setBusy(`status-${appointment.id}`); setError('');
    const { error: requestError } = await supabase.rpc('metier_reception_set_appointment_status', {
      p_organization_id: organization.id, p_appointment_id: appointment.id, p_status: status
    });
    setBusy('');
    if (requestError) setError(requestError.message); else await loadAppointments();
  }

  if (!organization || organization.plan !== 'metier') return null;

  return (
    <div className="metier-simple-page metier-reception-page">
      <header className="metier-simple-hero reception-hero">
        <div>
          <button className="metier-back-link" type="button" onClick={onBack}><Icon name="chevronRight" size={16} /> Retour</button>
          <p className="eyebrow">ACCUEIL PARTAGÉ</p><h1>Secrétariat</h1>
          <p>Prenez les rendez-vous des enseignes autorisées depuis un seul écran. Chaque fichier client reste séparé par enseigne.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setShowForm(true)} disabled={!context?.companies.length}><Icon name="plus" size={17} /> Nouveau rendez-vous</button>
      </header>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {message && <div className="success-message page-message" role="status">{message}</div>}
      {loading && <section className="panel list-state">Chargement de l’accueil partagé…</section>}

      {!loading && context && <>
        <section className="reception-company-strip">
          {context.companies.map((company) => {
            const sites = context.sites.filter((site) => site.company_id === company.id).length;
            const services = context.services.filter((service) => service.company_id === company.id).length;
            const staff = context.staff.filter((member) => member.company_id === company.id).length;
            const ready = sites > 0 && services > 0 && staff > 0;
            return <button type="button" key={company.id} className={company.id === companyId ? 'active' : ''} onClick={() => setCompanyId(company.id)}>
              <span style={{ background: company.logo_url ? '#fff' : company.primary_color }}>{company.logo_url ? <img src={company.logo_url} alt="" /> : company.name.slice(0, 1).toUpperCase()}</span>
              <span><strong>{company.name}</strong><small>{ready ? 'Disponible à la réservation' : 'Configuration à terminer'}</small></span>
            </button>;
          })}
          {context.companies.length === 0 && <div className="metier-simple-empty"><Icon name="calendar" size={25} /><h3>Aucune enseigne activée</h3><p>Activez « Prise de rendez-vous » dans la configuration d’au moins une enseigne.</p></div>}
        </section>

        {showForm && <section className="metier-simple-card reception-form-card">
          <div className="metier-simple-heading"><div><p className="eyebrow">NOUVEAU RENDEZ-VOUS</p><h2>{selectedCompany?.name || 'Choisir une enseigne'}</h2><p>Le rendez-vous et le client seront enregistrés dans la bonne enseigne.</p></div><button className="icon-button" type="button" onClick={() => setShowForm(false)} aria-label="Fermer"><Icon name="close" size={20} /></button></div>
          <form className="reception-booking-form" onSubmit={saveAppointment}>
            <label>Enseigne<select value={companyId} onChange={(event) => setCompanyId(event.target.value)} required><option value="">Choisir…</option>{context.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            <label>Adresse / lieu<select value={siteId} onChange={(event) => setSiteId(event.target.value)} required><option value="">Choisir…</option>{companySites.map((site) => <option key={site.id} value={site.id}>{site.name}{site.city ? ` · ${site.city}` : ''}</option>)}</select></label>
            <label>Prestation<select value={serviceId} onChange={(event) => setServiceId(event.target.value)} required><option value="">Choisir…</option>{companyServices.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration_minutes} min · {money(service.price_cents)}</option>)}</select></label>
            <label>Collaborateur<select value={staffId} onChange={(event) => setStaffId(event.target.value)} required><option value="">Choisir…</option>{compatibleStaff.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label>

            <div className="reception-client-block full">
              <div className="reception-client-choice"><button type="button" className={!newClient ? 'active' : ''} onClick={() => setNewClient(false)}>Client existant</button><button type="button" className={newClient ? 'active' : ''} onClick={() => { setNewClient(true); setClientId(''); }}>Nouveau client</button></div>
              {!newClient ? <>
                <div className="client-search-row"><input value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder={`Client de ${selectedCompany?.name ?? 'cette enseigne'}`} /><button type="button" className="secondary-button compact-button" onClick={() => void searchClients()} disabled={busy === 'clients'}><Icon name="search" size={15} /> Rechercher</button></div>
                <div className="client-result-list">{clients.map((client) => <button type="button" key={client.id} className={client.id === clientId ? 'active' : ''} onClick={() => setClientId(client.id)}><span><strong>{[client.first_name, client.last_name].filter(Boolean).join(' ')}</strong><small>{client.phone || client.email || 'Client'}</small></span>{client.id === clientId && <Icon name="check" size={17} />}</button>)}</div>
              </> : <div className="new-client-grid"><label>Prénom / nom<input value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label><label>Nom complémentaire<input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label><label>Téléphone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label></div>}
            </div>

            <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
            <label>Heure<input type="time" value={time} onChange={(event) => setTime(event.target.value)} step={900} required /></label>
            <label className="full">Note<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Information utile pour l’équipe…" /></label>
            <div className="metier-form-actions full"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Annuler</button><button type="submit" className="primary-button" disabled={busy === 'appointment'}>{busy === 'appointment' ? 'Enregistrement…' : 'Confirmer le rendez-vous'}</button></div>
          </form>
        </section>}

        <section className="metier-simple-section reception-agenda-section">
          <div className="metier-simple-heading"><div><p className="eyebrow">AGENDA COMMUN</p><h2>Prochains rendez-vous</h2><p>Les enseignes autorisées sont réunies ici, sans fusionner leurs fichiers clients.</p></div><button className="secondary-button" type="button" onClick={() => void loadAppointments()}><Icon name="refresh" size={16} /> Actualiser</button></div>
          <div className="reception-appointment-list">
            {upcoming.map((appointment) => <article key={appointment.id}>
              <div className="appointment-time"><strong>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(appointment.starts_at))}</strong><span>{new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(appointment.starts_at))}</span></div>
              <div className="appointment-company"><strong>{appointment.company_name}</strong><small>{appointment.site_name || 'Lieu'} · {appointment.service_name}</small></div>
              <div className="appointment-client"><strong>{appointment.client_name}</strong><small>{appointment.client_phone || appointment.staff_name}</small></div>
              <span className={`appointment-status ${appointment.status}`}>{statusLabels[appointment.status] || appointment.status}</span>
              <div className="appointment-actions">{appointment.status === 'confirmed' && <><button type="button" onClick={() => void updateStatus(appointment, 'completed')} disabled={busy === `status-${appointment.id}`}>Terminé</button><button type="button" className="danger" onClick={() => void updateStatus(appointment, 'cancelled')} disabled={busy === `status-${appointment.id}`}>Annuler</button></>}</div>
            </article>)}
            {upcoming.length === 0 && <div className="metier-inline-empty">Aucun rendez-vous dans les 30 prochains jours.</div>}
          </div>
        </section>
      </>}
    </div>
  );
}
