import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { SupportConversation } from '../components/SupportConversation';
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const canApproveAccess = ['owner', 'admin'].includes(organization?.role ?? 'viewer');
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  async function load() {
    if (!organization || !supabase) { setLoading(false); return; }
    setLoading(true); setError('');
    const { data, error: requestError } = await supabase.rpc('list_my_platform_support_tickets', { p_organization_id: organization.id });
    if (requestError) setError(requestError.message);
    else {
      const rows = (Array.isArray(data) ? data : []) as SupportTicket[];
      setTickets(rows);
      setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null);
    }
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
    const { data, error: requestError } = await supabase.rpc('create_platform_support_ticket', {
      p_organization_id: organization.id,
      p_category: category,
      p_priority: priority,
      p_subject: subject.trim(),
      p_description: description.trim()
    });
    if (requestError) setError(requestError.message);
    else {
      setMessage('Ta demande a bien été transmise à l’équipe NCR. Tu peux maintenant échanger directement dans la conversation.');
      setSubject(''); setDescription(''); setPriority('normal'); setShowForm(false);
      await load();
      if (typeof data === 'string') setSelectedId(data);
    }
    setSaving(false);
  }

  return <div className="support-center-page">
    <section className="support-center-hero">
      <div><span className="support-center-icon"><Icon name="headset" size={24} /></span><p className="eyebrow">ASSISTANCE NCR</p><h1>Une vraie conversation avec l’équipe NCR.</h1><p>Ouvre un ticket, échange directement avec nous et autorise une prise en main temporaire seulement lorsque c’est nécessaire.</p></div>
      {canCreate && <button type="button" className="primary-button" onClick={() => setShowForm((current) => !current)}><Icon name={showForm ? 'close' : 'plus'} size={17} />{showForm ? 'Fermer' : 'Nouvelle demande'}</button>}
    </section>

    <section className="support-center-stats">
      <article><span><Icon name="alert" size={19} /></span><div><small>Demandes actives</small><strong>{openCount}</strong></div></article>
      <article><span><Icon name="message" size={19} /></span><div><small>Échanges</small><strong>Directs</strong></div></article>
      <article><span><Icon name="lock" size={19} /></span><div><small>Prise en main</small><strong>Sur autorisation</strong></div></article>
      <article><span><Icon name="check" size={19} /></span><div><small>Demandes résolues</small><strong>{resolvedCount}</strong></div></article>
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
      <div className="support-form-note"><Icon name="lock" size={16} /><span>Les messages et les autorisations sont visibles uniquement par les responsables de cet espace et l’équipe NCR.</span></div>
      <button className="primary-button" disabled={saving}>{saving ? 'Envoi en cours…' : 'Ouvrir le ticket'}</button>
    </form>}

    <section className="support-workspace">
      <aside className="panel support-ticket-inbox">
        <div className="panel-header"><div><p className="eyebrow">BOÎTE DE RÉCEPTION</p><h2>Mes demandes</h2></div><button type="button" className="secondary-button compact" onClick={() => void load()}><Icon name="activity" size={15} /> Actualiser</button></div>
        <div className="support-ticket-inbox-list">
          {loading && <div className="admin-empty-state">Chargement des demandes…</div>}
          {!loading && tickets.length === 0 && <div className="support-empty-state"><span><Icon name="check" size={25} /></span><h3>Aucune demande</h3><p>Tout semble fonctionner correctement.</p></div>}
          {tickets.map((ticket) => <button key={ticket.id} type="button" className={selectedId === ticket.id ? 'selected' : ''} onClick={() => setSelectedId(ticket.id)}>
            <span className={`admin-ticket-priority ${ticket.priority}`} />
            <span className="support-ticket-inbox-copy"><small>{categoryLabels[ticket.category]}</small><strong>{ticket.subject}</strong><em>{ticket.description}</em><time>{fullDate(ticket.updated_at)}</time></span>
            <span className={`admin-status-pill ${ticket.status}`}>{statusLabels[ticket.status]}</span>
          </button>)}
        </div>
      </aside>

      <main className="panel support-ticket-detail">
        {!selected ? <div className="admin-editor-empty"><span><Icon name="message" size={28} /></span><h2>Sélectionne une demande</h2><p>La conversation et les autorisations apparaîtront ici.</p></div> : <>
          <header className="support-ticket-detail-head">
            <div><span className={`admin-priority-pill ${selected.priority}`}>{priorityLabels[selected.priority]}</span><p className="eyebrow">{categoryLabels[selected.category]}</p><h2>{selected.subject}</h2><small>Ticket #{selected.id.slice(0, 8).toUpperCase()} · créé le {fullDate(selected.created_at)}</small></div>
            <span className={`admin-status-pill ${selected.status}`}>{statusLabels[selected.status]}</span>
          </header>
          <SupportConversation ticketId={selected.id} ticketStatus={selected.status} viewer="customer" canApproveAccess={canApproveAccess} />
        </>}
      </main>
    </section>
  </div>;
}
