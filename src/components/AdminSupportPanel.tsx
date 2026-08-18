import { useEffect, useMemo, useState } from 'react';
import { businessPacks } from '../config/businessPacks';
import { Icon } from './Icon';
import { supabase } from '../lib/supabase';
import { SupportConversation } from './SupportConversation';
import type { BusinessType, Plan } from '../types';

interface SupportTicket {
  id: string;
  organization_id: string;
  organization_name: string;
  business_type: BusinessType;
  plan: Plan;
  owner_email: string | null;
  created_by_email: string | null;
  assigned_to_email: string | null;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  subject: string;
  description: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
}

const statusLabels: Record<SupportTicket['status'], string> = { open: 'Nouveau', in_progress: 'En cours', waiting_customer: 'En attente client', resolved: 'Résolu', closed: 'Fermé' };
const priorityLabels: Record<SupportTicket['priority'], string> = { low: 'Faible', normal: 'Normale', high: 'Haute', urgent: 'Urgente' };
const categoryLabels: Record<string, string> = { general: 'Général', billing: 'Facturation', access: 'Accès', technical: 'Technique', data: 'Données', feature: 'Fonctionnalité' };

function fullDate(value: string) { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }

export function AdminSupportPanel({ onOpenOrganization, initialSearch = '', initialTicketId = '' }: { onOpenOrganization?: (organizationId: string) => void; initialSearch?: string; initialTicketId?: string }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState(initialSearch);
  const [editStatus, setEditStatus] = useState<SupportTicket['status']>('open');
  const [editPriority, setEditPriority] = useState<SupportTicket['priority']>('normal');
  const [adminNote, setAdminNote] = useState('');
  const [assignToSelf, setAssignToSelf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [queueTickets, setQueueTickets] = useState<SupportTicket[]>([]);
  const [pendingInitialTicketId, setPendingInitialTicketId] = useState(initialTicketId);

  function selectTicket(ticket: SupportTicket) {
    setSelected(ticket);
    setEditStatus(ticket.status);
    setEditPriority(ticket.priority);
    setAdminNote(ticket.admin_note ?? '');
    setAssignToSelf(false);
    setMessage('');
  }

  async function load(preserveSelection = true) {
    if (!supabase) return;
    setLoading(true);
    setError('');
    const [filteredResponse, queueResponse] = await Promise.all([
      supabase.rpc('admin_list_support_tickets', {
        p_status: statusFilter || null,
        p_priority: priorityFilter || null,
        p_search: search.trim() || null
      }),
      supabase.rpc('admin_list_support_tickets', {
        p_status: null,
        p_priority: null,
        p_search: null
      })
    ]);
    if (filteredResponse.error) setError(filteredResponse.error.message);
    else {
      const rows = (Array.isArray(filteredResponse.data) ? filteredResponse.data : []) as SupportTicket[];
      setTickets(rows);
      const requestedTicket = pendingInitialTicketId ? rows.find((row) => row.id === pendingInitialTicketId) : undefined;
      if (requestedTicket) { selectTicket(requestedTicket); setPendingInitialTicketId(''); }
      else if (preserveSelection && selected) {
        const next = rows.find((row) => row.id === selected.id) ?? null;
        if (next) selectTicket(next); else setSelected(null);
      }
    }
    if (!queueResponse.error) setQueueTickets((Array.isArray(queueResponse.data) ? queueResponse.data : []) as SupportTicket[]);
    setLoading(false);
  }

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(false), 220);
    return () => window.clearTimeout(timer);
  }, [statusFilter, priorityFilter, search]);

  const openCount = useMemo(() => queueTickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length, [queueTickets]);
  const urgentCount = useMemo(() => queueTickets.filter((ticket) => ticket.priority === 'urgent' && !['resolved', 'closed'].includes(ticket.status)).length, [queueTickets]);
  const newCount = useMemo(() => queueTickets.filter((ticket) => ticket.status === 'open').length, [queueTickets]);
  const progressCount = useMemo(() => queueTickets.filter((ticket) => ticket.status === 'in_progress').length, [queueTickets]);
  const waitingCount = useMemo(() => queueTickets.filter((ticket) => ticket.status === 'waiting_customer').length, [queueTickets]);
  const resolvedCount = useMemo(() => queueTickets.filter((ticket) => ticket.status === 'resolved').length, [queueTickets]);

  async function save() {
    if (!selected || !supabase) return;
    setSaving(true); setError(''); setMessage('');
    const { error: requestError } = await supabase.rpc('admin_update_support_ticket', {
      p_ticket_id: selected.id,
      p_status: editStatus,
      p_priority: editPriority,
      p_admin_note: adminNote.trim() || null,
      p_assign_to_self: assignToSelf
    });
    if (requestError) setError(requestError.message);
    else { setMessage('Le ticket a été mis à jour.'); await load(true); }
    setSaving(false);
  }

  function applyQueuePreset(preset: 'all' | 'new' | 'progress' | 'urgent' | 'waiting' | 'resolved') {
    setPriorityFilter(preset === 'urgent' ? 'urgent' : '');
    if (preset === 'new') setStatusFilter('open');
    else if (preset === 'progress') setStatusFilter('in_progress');
    else if (preset === 'waiting') setStatusFilter('waiting_customer');
    else if (preset === 'resolved') setStatusFilter('resolved');
    else setStatusFilter('');
  }

  return (
    <div className="admin-support-page">
      <section className="admin-section-heading">
        <div><p className="eyebrow">SERVICE CLIENT NCR</p><h1>Support et demandes clients</h1><p>Priorise les incidents, conserve une trace des réponses et identifie rapidement l’entreprise concernée.</p></div>
        <div className="admin-heading-stats admin-support-heading-stats"><span><small>Actifs</small><strong>{openCount}</strong></span><span><small>Nouveaux</small><strong>{newCount}</strong></span><span className={urgentCount ? 'danger' : ''}><small>Urgents</small><strong>{urgentCount}</strong></span></div>
      </section>

      {error && <div className="error-message" role="alert">{error}</div>}
      {message && <div className="success-message" role="status">{message}</div>}

      <section className={`admin-support-layout${selected ? ' has-selection' : ''}`}>
        <article className="panel admin-support-list-panel">
          <div className="admin-support-queue-presets" aria-label="Raccourcis de file d’assistance">
            <button type="button" className={!statusFilter && !priorityFilter ? 'active' : ''} onClick={() => applyQueuePreset('all')}>Tous <b>{queueTickets.length}</b></button>
            <button type="button" className={statusFilter === 'open' && !priorityFilter ? 'active' : ''} onClick={() => applyQueuePreset('new')}>Nouveaux <b>{newCount}</b></button>
            <button type="button" className={statusFilter === 'in_progress' && !priorityFilter ? 'active' : ''} onClick={() => applyQueuePreset('progress')}>En cours <b>{progressCount}</b></button>
            <button type="button" className={priorityFilter === 'urgent' ? 'active urgent' : ''} onClick={() => applyQueuePreset('urgent')}>Urgents <b>{urgentCount}</b></button>
            <button type="button" className={statusFilter === 'waiting_customer' && !priorityFilter ? 'active' : ''} onClick={() => applyQueuePreset('waiting')}>Attente client <b>{waitingCount}</b></button>
            <button type="button" className={statusFilter === 'resolved' && !priorityFilter ? 'active' : ''} onClick={() => applyQueuePreset('resolved')}>Résolus <b>{resolvedCount}</b></button>
          </div>
          <div className="admin-support-filters">
            <label><Icon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Entreprise, sujet ou e-mail…" /></label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Tous les statuts</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">Toutes les priorités</option>{Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
          </div>

          <div className="admin-support-ticket-list">
            {loading && <div className="admin-empty-state">Chargement de la file support…</div>}
            {!loading && tickets.length === 0 && <div className="admin-positive-empty"><Icon name="check" size={24} /><div><strong>Aucun ticket à afficher</strong><small>La file correspondant à ces filtres est vide.</small></div></div>}
            {tickets.map((ticket) => {
              const pack = businessPacks[ticket.business_type];
              return <button key={ticket.id} type="button" className={selected?.id === ticket.id ? 'selected' : ''} onClick={() => selectTicket(ticket)}>
                <span className={`admin-ticket-priority ${ticket.priority}`} />
                <span className="admin-ticket-company-icon"><Icon name={pack.icon} size={17} /></span>
                <span className="admin-ticket-copy"><small>{ticket.organization_name} · {categoryLabels[ticket.category]}</small><strong>{ticket.subject}</strong><em>{ticket.description}</em></span>
                <span className="admin-ticket-meta"><span className={`admin-status-pill ${ticket.status}`}>{statusLabels[ticket.status]}</span><time>{fullDate(ticket.created_at)}</time></span>
              </button>;
            })}
          </div>
        </article>

        <aside className="panel admin-support-editor">
          {!selected ? <div className="admin-editor-empty"><span><Icon name="alert" size={28} /></span><h2>Sélectionne une demande</h2><p>Le détail, l’entreprise et les actions de traitement apparaîtront ici.</p></div> : <>
            <header className="admin-support-editor-head"><div><button type="button" className="admin-support-back-to-queue" onClick={() => setSelected(null)}><Icon name="chevronRight" size={14} /> Retour à la file</button><span className={`admin-priority-pill ${selected.priority}`}>{priorityLabels[selected.priority]}</span><p className="eyebrow">TICKET SUPPORT</p><h2>{selected.subject}</h2><small>{selected.organization_name} · {selected.owner_email || selected.created_by_email}</small></div><div className="admin-support-editor-actions"><span className="admin-ticket-number">#{selected.id.slice(0, 8).toUpperCase()}</span>{onOpenOrganization && <button type="button" className="secondary-button compact" onClick={() => onOpenOrganization(selected.organization_id)}><Icon name="building" size={15} /> Ouvrir l’entreprise</button>}</div></header>
            <div className="admin-support-description"><p>{selected.description}</p><dl><div><dt>Créé le</dt><dd>{fullDate(selected.created_at)}</dd></div><div><dt>Catégorie</dt><dd>{categoryLabels[selected.category]}</dd></div><div><dt>Formule</dt><dd>{selected.plan}</dd></div><div><dt>Assigné à</dt><dd>{selected.assigned_to_email || 'Personne'}</dd></div></dl></div>
            <SupportConversation ticketId={selected.id} ticketStatus={selected.status} viewer="admin" />
            <div className="admin-support-form-grid">
              <label>Statut<select value={editStatus} onChange={(event) => setEditStatus(event.target.value as SupportTicket['status'])}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label>Priorité<select value={editPriority} onChange={(event) => setEditPriority(event.target.value as SupportTicket['priority'])}>{Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label className="full-field">Note interne<textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={5} placeholder="Diagnostic, réponse proposée, prochaine action…" /></label>
              <label className="admin-checkbox-row"><input type="checkbox" checked={assignToSelf} onChange={(event) => setAssignToSelf(event.target.checked)} /><span><strong>M’assigner ce ticket</strong><small>Ton compte devient responsable du suivi.</small></span></label>
            </div>
            <div className="admin-support-savebar"><span><Icon name="info" size={15} /> Les échanges restent enregistrés dans le ticket.</span><button type="button" className="primary-button" onClick={() => void save()} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le traitement'}</button></div>
          </>}
        </aside>
      </section>
    </div>
  );
}
