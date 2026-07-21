import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

interface SupportTicket {
  id: string;
  category: 'general' | 'billing' | 'access' | 'technical' | 'data' | 'feature';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  subject: string;
  description: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

const statusLabels: Record<SupportTicket['status'], string> = { open: 'Envoyée', in_progress: 'En cours', waiting_customer: 'Réponse attendue', resolved: 'Résolue', closed: 'Fermée' };
const categoryLabels: Record<SupportTicket['category'], string> = { general: 'Question générale', billing: 'Abonnement & facturation', access: 'Connexion & accès', technical: 'Problème technique', data: 'Données & documents', feature: 'Suggestion de fonctionnalité' };
const priorityLabels: Record<SupportTicket['priority'], string> = { low: 'Faible', normal: 'Normale', high: 'Haute', urgent: 'Urgente' };

function fullDate(value: string) { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }

export function SupportPage() {
  const { organization } = useOrganization();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<SupportTicket['category']>('technical');
  const [priority, setPriority] = useState<SupportTicket['priority']>('normal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const canCreate = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');

  async function load() {
    if (!organization || !supabase) { setLoading(false); return; }
    setLoading(true); setError('');
    const { data, error: requestError } = await supabase.rpc('list_my_platform_support_tickets', { p_organization_id: organization.id });
    if (requestError) setError(requestError.message);
    else setTickets((Array.isArray(data) ? data : []) as SupportTicket[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id]);

  const openCount = useMemo(() => tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length, [tickets]);
  const resolvedCount = useMemo(() => tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length, [tickets]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!organization || !supabase || !canCreate) return;
    if (subject.trim().length < 3 || description.trim().length < 5) {
      setError('Décris un peu plus précisément ta demande.');
      return;
    }
    setSaving(true); setError(''); setMessage('');
    const { error: requestError } = await supabase.rpc('create_platform_support_ticket', {
      p_organization_id: organization.id,
      p_category: category,
      p_priority: priority,
      p_subject: subject.trim(),
      p_description: description.trim()
    });
    if (requestError) setError(requestError.message);
    else {
      setMessage('Ta demande a bien été transmise à l’équipe NCR.');
      setSubject(''); setDescription(''); setPriority('normal'); setShowForm(false);
      await load();
    }
    setSaving(false);
  }

  return <div className="support-center-page">
    <section className="support-center-hero">
      <div><span className="support-center-icon"><Icon name="sparkles" size={24} /></span><p className="eyebrow">ASSISTANCE NCR</p><h1>Comment peut-on t’aider ?</h1><p>Signale un problème, pose une question ou suis directement l’avancement de tes demandes.</p></div>
      {canCreate && <button type="button" className="primary-button" onClick={() => setShowForm((current) => !current)}><Icon name={showForm ? 'close' : 'plus'} size={17} />{showForm ? 'Fermer' : 'Nouvelle demande'}</button>}
    </section>

    <section className="support-center-stats">
      <article><span><Icon name="alert" size={19} /></span><div><small>Demandes actives</small><strong>{openCount}</strong></div></article>
      <article><span><Icon name="check" size={19} /></span><div><small>Demandes résolues</small><strong>{resolvedCount}</strong></div></article>
      <article><span><Icon name="clock" size={19} /></span><div><small>Suivi</small><strong>Centralisé</strong></div></article>
    </section>

    {error && <div className="error-message" role="alert">{error}</div>}
    {message && <div className="success-message" role="status">{message}</div>}

    {showForm && <form className="panel support-request-form" onSubmit={submit}>
      <div className="panel-header"><div><p className="eyebrow">NOUVELLE DEMANDE</p><h2>Explique-nous la situation</h2></div></div>
      <div className="support-request-grid">
        <label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value as SupportTicket['category'])}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Priorité<select value={priority} onChange={(event) => setPriority(event.target.value as SupportTicket['priority'])}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="full-field">Sujet<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ex. Impossible d’accéder au planning" maxLength={160} /></label>
        <label className="full-field">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Indique ce que tu essayais de faire, ce qui s’est passé et le message affiché." rows={6} maxLength={5000} /></label>
      </div>
      <div className="support-form-note"><Icon name="lock" size={16} /><span>Ta demande est visible uniquement par les responsables de cet espace et l’équipe NCR.</span></div>
      <button className="primary-button" disabled={saving}>{saving ? 'Envoi en cours…' : 'Envoyer la demande'}</button>
    </form>}

    <section className="panel support-ticket-history">
      <div className="panel-header"><div><p className="eyebrow">HISTORIQUE</p><h2>Mes demandes</h2></div><button type="button" className="secondary-button compact" onClick={() => void load()}><Icon name="activity" size={15} /> Actualiser</button></div>
      <div className="support-ticket-cards">
        {loading && <div className="admin-empty-state">Chargement des demandes…</div>}
        {!loading && tickets.length === 0 && <div className="support-empty-state"><span><Icon name="check" size={25} /></span><h3>Aucune demande pour le moment</h3><p>Tout semble fonctionner correctement. Le centre d’assistance restera disponible ici.</p></div>}
        {tickets.map((ticket) => <article key={ticket.id}>
          <header><div><span className={`admin-priority-pill ${ticket.priority}`}>{priorityLabels[ticket.priority]}</span><small>{categoryLabels[ticket.category]}</small></div><span className={`admin-status-pill ${ticket.status}`}>{statusLabels[ticket.status]}</span></header>
          <h3>{ticket.subject}</h3>
          <p>{ticket.description}</p>
          {ticket.admin_note && <div className="support-admin-response"><Icon name="sparkles" size={17} /><span><strong>Réponse de l’équipe NCR</strong><p>{ticket.admin_note}</p></span></div>}
          <footer><span>Créée le {fullDate(ticket.created_at)}</span><span>Dernière mise à jour : {fullDate(ticket.updated_at)}</span></footer>
        </article>)}
      </div>
    </section>
  </div>;
}
