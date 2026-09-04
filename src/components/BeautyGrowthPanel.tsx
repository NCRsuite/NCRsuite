import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface GrowthClient {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

interface GrowthService {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
}

interface GrowthStaff {
  id: string;
  name: string;
}

interface GrowthOpportunity {
  client_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  reason: 'birthday' | 'inactive' | 'rebook_due';
  score: number;
  last_visit: string | null;
  next_birthday: string | null;
  last_staff_id: string | null;
  last_service_ids: string[];
  last_service_name: string | null;
}

interface WaitlistEntry {
  id: string;
  client_id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  service_ids: string[];
  service_names: string;
  staff_id: string | null;
  staff_name: string | null;
  preferred_from: string | null;
  preferred_to: string | null;
  time_preference: 'any' | 'morning' | 'afternoon' | 'evening';
  notes: string | null;
  status: 'waiting' | 'contacted';
  created_at: string;
}

interface GrowthDashboard {
  company: { id: string; name: string; public_slug: string | null };
  summary: {
    waiting: number;
    inactive: number;
    birthday: number;
    rebook_due: number;
    verified_reviews: number;
    average_rating: number | null;
    review_opportunities: number;
  };
  opportunities: GrowthOpportunity[];
  waitlist: WaitlistEntry[];
  clients: GrowthClient[];
  services: GrowthService[];
  staff: GrowthStaff[];
}

interface Props {
  organizationId: string;
  companyId: string;
  companyName: string;
  publicSlug?: string | null;
  canManage: boolean;
}

const dateOnly = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
const reasonLabels = {
  birthday: 'Anniversaire proche',
  inactive: 'Client inactif',
  rebook_due: 'À reprogrammer'
} as const;
const timeLabels = {
  any: 'Toute la journée',
  morning: 'Matin',
  afternoon: 'Après-midi',
  evening: 'Soir'
} as const;

function fullName(client: { first_name: string; last_name: string | null }) {
  return [client.first_name, client.last_name].filter(Boolean).join(' ');
}

export function BeautyGrowthPanel({ organizationId, companyId, companyName, publicSlug, canManage }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<GrowthDashboard | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [preferredFrom, setPreferredFrom] = useState('');
  const [preferredTo, setPreferredTo] = useState('');
  const [timePreference, setTimePreference] = useState<WaitlistEntry['time_preference']>('any');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    const { data: payload, error: requestError } = await supabase.rpc('get_beauty_growth_dashboard', {
      p_organization_id: organizationId,
      p_company_id: companyId
    });
    if (requestError) setError(requestError.message);
    else {
      const next = payload as GrowthDashboard;
      setData(next);
      setClientId((current) => current && next.clients.some((client) => client.id === current) ? current : next.clients[0]?.id ?? '');
      setServiceId((current) => current && next.services.some((service) => service.id === current) ? current : '');
      setStaffId((current) => current && next.staff.some((member) => member.id === current) ? current : '');
    }
    setLoading(false);
  }, [organizationId, companyId]);

  useEffect(() => { void load(); }, [load]);

  const opportunityCount = useMemo(() => data ? data.summary.inactive + data.summary.birthday + data.summary.rebook_due : 0, [data]);

  function bookingPath(serviceIds: string[] = [], selectedStaffId?: string | null) {
    if (!publicSlug) return null;
    const params = new URLSearchParams();
    if (serviceIds.length) params.set('services', serviceIds.join(','));
    if (selectedStaffId) params.set('staff', selectedStaffId);
    const query = params.toString();
    return `/salon/${publicSlug}${query ? `?${query}` : ''}#reserver`;
  }

  async function copyText(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(success);
    } catch {
      window.prompt('Copiez ce message :', value);
    }
  }

  async function copyOpportunityMessage(item: GrowthOpportunity) {
    const path = bookingPath(item.last_service_ids, item.last_staff_id);
    const url = path ? `${window.location.origin}${path}` : '';
    const intro = item.reason === 'birthday'
      ? `Bonjour ${item.first_name} 🎉 votre anniversaire approche !`
      : `Bonjour ${item.first_name}, nous pensions à vous chez ${companyName}.`;
    const service = item.last_service_name ? ` Pour reprendre votre prestation ${item.last_service_name},` : '';
    const text = `${intro}${service} vous pouvez choisir tranquillement votre prochain créneau ici : ${url}`.trim();
    await copyText(text, 'Message de relance copié.');
  }

  async function addWaitlist(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user || !clientId) return;
    setBusy('waitlist-add');
    setError('');
    setMessage('');
    const { error: insertError } = await supabase.from('beauty_waitlist_entries').insert({
      organization_id: organizationId,
      company_id: companyId,
      client_id: clientId,
      service_ids: serviceId ? [serviceId] : [],
      staff_id: staffId || null,
      preferred_from: preferredFrom || null,
      preferred_to: preferredTo || null,
      time_preference: timePreference,
      notes: notes.trim() || null,
      status: 'waiting',
      created_by: user.id
    });
    if (insertError) setError(insertError.message);
    else {
      setMessage('Client ajouté à la liste d’attente.');
      setPreferredFrom('');
      setPreferredTo('');
      setNotes('');
      setWaitlistOpen(false);
      await load();
    }
    setBusy('');
  }

  async function setWaitlistStatus(item: WaitlistEntry, status: 'waiting' | 'contacted' | 'booked' | 'cancelled') {
    if (!supabase || !canManage) return;
    setBusy(item.id);
    setError('');
    setMessage('');
    const { error: updateError } = await supabase.from('beauty_waitlist_entries')
      .update({ status })
      .eq('organization_id', organizationId)
      .eq('company_id', companyId)
      .eq('id', item.id);
    if (updateError) setError(updateError.message);
    else {
      setMessage(status === 'contacted' ? 'Client marqué comme contacté.' : status === 'booked' ? 'Entrée marquée comme réservée.' : status === 'cancelled' ? 'Entrée retirée de la liste.' : 'Entrée réactivée.');
      await load();
    }
    setBusy('');
  }

  if (loading && !data) return <section className="panel beauty-growth-loading"><span className="spinner"/><p>Analyse des opportunités de l’enseigne…</p></section>;
  if (!data) return <section className="panel beauty-growth-empty">{error || 'Le remplissage intelligent est indisponible.'}</section>;

  return <section className="panel beauty-growth-panel">
    <header className="beauty-growth-header">
      <div className="beauty-growth-title"><span>⚡</span><div><p className="eyebrow">REMPLIR MON AGENDA · {companyName}</p><h2>Opportunités & liste d’attente</h2><small>NCR suggère les bons clients à contacter. Aucune relance n’est envoyée sans action de votre part.</small></div></div>
      <div className="beauty-growth-header-actions">
        <button className="secondary-button compact-button" type="button" onClick={() => void load()}><Icon name="activity" size={15}/> Actualiser</button>
        {canManage && <button className="primary-button compact-button" type="button" onClick={() => setWaitlistOpen((current) => !current)}><Icon name="users" size={15}/> Liste d’attente</button>}
      </div>
    </header>

    {error && <div className="error-message beauty-growth-message">{error}</div>}
    {message && <div className="success-message beauty-growth-message">{message}</div>}

    <div className="beauty-growth-summary">
      <article><span><Icon name="clock" size={17}/></span><div><strong>{data.summary.waiting}</strong><small>en attente</small></div></article>
      <article><span><Icon name="users" size={17}/></span><div><strong>{data.summary.inactive + data.summary.rebook_due}</strong><small>à relancer</small></div></article>
      <article><span><Icon name="sparkles" size={17}/></span><div><strong>{data.summary.birthday}</strong><small>anniversaires</small></div></article>
      <article><span><Icon name="sparkles" size={17}/></span><div><strong>{data.summary.average_rating ?? '—'}</strong><small>{data.summary.verified_reviews} avis vérifiés</small></div></article>
      <article><span><Icon name="message" size={17}/></span><div><strong>{data.summary.review_opportunities}</strong><small>avis à solliciter</small></div></article>
    </div>

    {waitlistOpen && <form className="beauty-growth-waitlist-form" onSubmit={addWaitlist}>
      <div className="beauty-growth-form-head"><div><p className="eyebrow">NOUVELLE ATTENTE</p><h3>Ajouter un client</h3></div><button type="button" onClick={() => setWaitlistOpen(false)}>×</button></div>
      <label>Client<select required value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">Choisir…</option>{data.clients.map((client) => <option key={client.id} value={client.id}>{fullName(client)}</option>)}</select></label>
      <label>Prestation<select value={serviceId} onChange={(event) => setServiceId(event.target.value)}><option value="">Toutes prestations</option>{data.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
      <label>Professionnel<select value={staffId} onChange={(event) => setStaffId(event.target.value)}><option value="">Peu importe</option>{data.staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <label>À partir du<input type="date" value={preferredFrom} onChange={(event) => setPreferredFrom(event.target.value)}/></label>
      <label>Jusqu’au<input type="date" value={preferredTo} onChange={(event) => setPreferredTo(event.target.value)}/></label>
      <label>Moment préféré<select value={timePreference} onChange={(event) => setTimePreference(event.target.value as WaitlistEntry['time_preference'])}>{Object.entries(timeLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="full">Note<textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex. disponible rapidement si désistement…"/></label>
      <div className="full beauty-growth-form-actions"><button className="secondary-button" type="button" onClick={() => setWaitlistOpen(false)}>Annuler</button><button className="primary-button" type="submit" disabled={busy==='waitlist-add'}>{busy==='waitlist-add' ? 'Ajout…' : 'Ajouter à la liste'}</button></div>
    </form>}

    {data.waitlist.length > 0 && <div className="beauty-growth-block">
      <div className="beauty-growth-block-head"><div><p className="eyebrow">LISTE D’ATTENTE</p><h3>{data.waitlist.length} demande{data.waitlist.length > 1 ? 's' : ''} active{data.waitlist.length > 1 ? 's' : ''}</h3></div></div>
      <div className="beauty-growth-waitlist">
        {data.waitlist.map((item) => {
          const path = bookingPath(item.service_ids,item.staff_id);
          return <article key={item.id}><span className={item.status}>{item.status==='contacted' ? 'Contacté' : 'En attente'}</span><div className="beauty-growth-client"><strong>{item.client_name}</strong><small>{item.service_names}{item.staff_name ? ` · ${item.staff_name}` : ''}</small><p>{item.preferred_from ? `Du ${dateOnly.format(new Date(item.preferred_from))}${item.preferred_to ? ` au ${dateOnly.format(new Date(item.preferred_to))}` : ''}` : 'Dates flexibles'} · {timeLabels[item.time_preference]}</p>{item.notes && <em>{item.notes}</em>}</div><div className="beauty-growth-row-actions">{path && <Link to={path} target="_blank">Préparer RDV</Link>}{canManage && item.status==='waiting' && <button type="button" disabled={busy===item.id} onClick={() => void setWaitlistStatus(item,'contacted')}>Contacté</button>}{canManage && <button type="button" disabled={busy===item.id} onClick={() => void setWaitlistStatus(item,'booked')}>Réservé</button>}{canManage && <button type="button" className="danger" disabled={busy===item.id} onClick={() => void setWaitlistStatus(item,'cancelled')}>Retirer</button>}</div></article>;
        })}
      </div>
    </div>}

    <div className="beauty-growth-block">
      <div className="beauty-growth-block-head"><div><p className="eyebrow">OPPORTUNITÉS SUGGÉRÉES</p><h3>{opportunityCount} client{opportunityCount > 1 ? 's' : ''} à regarder</h3></div><button type="button" onClick={() => setExpanded((current) => !current)}>{expanded ? 'Masquer' : 'Afficher'}</button></div>
      {expanded && (data.opportunities.length === 0 ? <div className="beauty-growth-no-opportunity">Aucune relance prioritaire aujourd’hui. L’agenda est tranquille 👌</div> : <div className="beauty-growth-opportunities">
        {data.opportunities.map((item) => {
          const path = bookingPath(item.last_service_ids,item.last_staff_id);
          return <article key={item.client_id}><span className={item.reason}>{reasonLabels[item.reason]}</span><div className="beauty-growth-client"><strong>{fullName(item)}</strong><small>{item.last_service_name || 'Prestation à définir'}</small><p>{item.reason==='birthday' && item.next_birthday ? `Anniversaire le ${dateOnly.format(new Date(item.next_birthday))}` : item.last_visit ? `Dernière visite : ${dateOnly.format(new Date(item.last_visit))}` : 'Aucune visite terminée'}</p></div><div className="beauty-growth-row-actions">{path && <Link to={path} target="_blank">Préparer RDV</Link>}<button type="button" onClick={() => void copyOpportunityMessage(item)}>Copier message</button></div></article>;
        })}
      </div>)}
    </div>

    {data.summary.review_opportunities > 0 && <footer className="beauty-growth-review-tip"><span><Icon name="sparkles" size={17}/></span><div><strong>{data.summary.review_opportunities} rendez-vous terminé{data.summary.review_opportunities > 1 ? 's' : ''} encore éligible{data.summary.review_opportunities > 1 ? 's' : ''} à un avis vérifié</strong><small>Les avis ne peuvent être déposés qu’après un rendez-vous terminé depuis l’espace client.</small></div></footer>}
  </section>;
}
