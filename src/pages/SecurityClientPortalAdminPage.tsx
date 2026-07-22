import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { closeFileWindow, navigateFileWindow, prepareFileWindow } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

type PortalPermissions = { planning: boolean; logbook: boolean; patrols: boolean; documents: boolean; messages: boolean };
type PortalAccount = { id: string; email: string; display_name: string | null; role: 'client_admin' | 'client_viewer'; permissions: PortalPermissions; status: 'active' | 'disabled'; last_seen_at: string | null; accepted_at: string };
type PortalInvitation = { id: string; email: string; display_name: string | null; role: 'client_admin' | 'client_viewer'; permissions: PortalPermissions; status: 'pending' | 'expired'; expires_at: string; created_at: string };
type PortalClient = { client_id: string; company_name: string; contact_name: string | null; email: string | null; phone: string | null; city: string | null; site_count: number; accounts: PortalAccount[]; invitations: PortalInvitation[]; unread_messages: number; document_count: number };
type PortalMessage = { id: string; author_type: 'security' | 'client'; author_name: string | null; body: string; read_by_client_at: string | null; read_by_security_at: string | null; created_at: string };
type PortalDocument = { id: string; client_id: string; site_id: string | null; shift_id: string | null; title: string; category: string; storage_path: string; mime_type: string | null; size_bytes: number | null; published_at: string; security_sites?: { name: string } | null };
type SiteOption = { id: string; name: string };

const defaultPermissions: PortalPermissions = { planning: true, logbook: true, patrols: true, documents: true, messages: true };
const permissionLabels: Array<[keyof PortalPermissions, string]> = [
  ['planning', 'Missions et planning'], ['logbook', 'Main courante'], ['patrols', 'Rondes QR'], ['documents', 'Documents'], ['messages', 'Messagerie']
];

function dateTime(value: string | null) {
  if (!value) return 'Jamais';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
function safeFileName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'document';
}
function documentMimeType(file: File) {
  const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']);
  if (allowed.has(file.type)) return file.type;
  const extension = file.name.toLowerCase().split('.').pop();
  return ({ pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', txt: 'text/plain' } as Record<string, string>)[extension ?? ''] ?? '';
}

export function SecurityClientPortalAdminPage() {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'client_admin' | 'client_viewer'>('client_admin');
  const [invitePermissions, setInvitePermissions] = useState<PortalPermissions>(defaultPermissions);
  const [messageBody, setMessageBody] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('rapport');
  const [docSiteId, setDocSiteId] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const canAdminister = ['owner', 'admin'].includes(organization?.role ?? 'viewer');
  const selected = useMemo(() => clients.find((item) => item.client_id === selectedId) ?? clients[0] ?? null, [clients, selectedId]);

  const loadOverview = useCallback(async () => {
    if (!organization || !supabase) return;
    setLoading(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('security_client_portal_admin_overview', { p_organization_id: organization.id });
    if (rpcError) setError(rpcError.message);
    else {
      const rows = ((data as { clients?: PortalClient[] } | null)?.clients ?? []);
      setClients(rows);
      setSelectedId((current) => current && rows.some((row) => row.client_id === current) ? current : rows[0]?.client_id ?? '');
    }
    setLoading(false);
  }, [organization?.id]);

  const loadClientData = useCallback(async (clientId: string) => {
    if (!organization || !supabase || !clientId) { setMessages([]); setDocuments([]); setSites([]); return; }
    const [messageResult, documentResult, siteResult] = await Promise.all([
      supabase.rpc('security_client_portal_admin_messages', { p_organization_id: organization.id, p_client_id: clientId }),
      supabase.from('security_client_portal_documents').select('id,client_id,site_id,shift_id,title,category,storage_path,mime_type,size_bytes,published_at,security_sites(name)').eq('organization_id', organization.id).eq('client_id', clientId).eq('status', 'active').order('published_at', { ascending: false }),
      supabase.from('security_sites').select('id,name').eq('organization_id', organization.id).eq('client_id', clientId).eq('status', 'active').order('name')
    ]);
    const firstError = messageResult.error || documentResult.error || siteResult.error;
    if (firstError) setError(firstError.message);
    setMessages((messageResult.data ?? []) as PortalMessage[]);
    setDocuments((documentResult.data ?? []) as unknown as PortalDocument[]);
    setSites((siteResult.data ?? []) as SiteOption[]);
  }, [organization?.id]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);
  useEffect(() => { if (selected?.client_id) void loadClientData(selected.client_id); }, [selected?.client_id, loadClientData]);

  function openInvite() {
    if (!selected) return;
    setInviteEmail(selected.email ?? ''); setInviteName(selected.contact_name ?? '');
    setInviteRole('client_admin'); setInvitePermissions(defaultPermissions); setInviteOpen(true); setError(''); setSuccess('');
  }

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!organization || !selected || !supabase || !canAdminister) return;
    setBusy('invite'); setError(''); setSuccess('');
    const { error: inviteError } = await supabase.rpc('create_security_client_portal_invitation', {
      p_organization_id: organization.id, p_client_id: selected.client_id, p_email: inviteEmail,
      p_display_name: inviteName || null, p_role: inviteRole, p_permissions: invitePermissions
    });
    if (inviteError) setError(inviteError.message);
    else { setSuccess(`Invitation envoyée à ${inviteEmail}.`); setInviteOpen(false); await loadOverview(); }
    setBusy('');
  }

  async function invitationAction(invitation: PortalInvitation, action: 'resend' | 'revoke') {
    if (!organization || !supabase || !canAdminister) return;
    setBusy(invitation.id); setError(''); setSuccess('');
    const result = action === 'resend'
      ? await supabase.rpc('resend_security_client_portal_invitation', { p_organization_id: organization.id, p_invitation_id: invitation.id })
      : await supabase.rpc('revoke_security_client_portal_invitation', { p_organization_id: organization.id, p_invitation_id: invitation.id });
    if (result.error) setError(result.error.message);
    else { setSuccess(action === 'resend' ? 'Invitation renvoyée.' : 'Invitation annulée.'); await loadOverview(); }
    setBusy('');
  }

  async function toggleAccount(account: PortalAccount) {
    if (!organization || !supabase || !canAdminister) return;
    setBusy(account.id); setError('');
    const nextStatus = account.status === 'active' ? 'disabled' : 'active';
    const { error: updateError } = await supabase.rpc('set_security_client_portal_account', {
      p_organization_id: organization.id, p_account_id: account.id, p_status: nextStatus, p_permissions: account.permissions
    });
    if (updateError) setError(updateError.message); else { setSuccess(nextStatus === 'active' ? 'Accès réactivé.' : 'Accès suspendu.'); await loadOverview(); }
    setBusy('');
  }

  async function changePermission(account: PortalAccount, key: keyof PortalPermissions) {
    if (!organization || !supabase || !canAdminister) return;
    const next = { ...account.permissions, [key]: !account.permissions[key] };
    setBusy(`${account.id}-${key}`); setError('');
    const { error: updateError } = await supabase.rpc('set_security_client_portal_account', {
      p_organization_id: organization.id, p_account_id: account.id, p_status: account.status, p_permissions: next
    });
    if (updateError) setError(updateError.message); else await loadOverview();
    setBusy('');
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!organization || !selected || !supabase || !messageBody.trim()) return;
    setBusy('message'); setError('');
    const { error: sendError } = await supabase.rpc('security_client_portal_admin_send_message', { p_organization_id: organization.id, p_client_id: selected.client_id, p_body: messageBody.trim() });
    if (sendError) setError(sendError.message); else { setMessageBody(''); await loadClientData(selected.client_id); await loadOverview(); }
    setBusy('');
  }

  async function uploadDocument(event: FormEvent) {
    event.preventDefault();
    if (!organization || !selected || !supabase || !user || !docFile || !docTitle.trim()) return;
    if (docFile.size > 15 * 1024 * 1024) { setError('Le document ne doit pas dépasser 15 Mo.'); return; }
    const mimeType = documentMimeType(docFile);
    if (!mimeType) { setError('Format non autorisé. Utilise un PDF, une image JPG/PNG/WebP ou un fichier texte.'); return; }
    setBusy('document'); setError(''); setSuccess('');
    const path = `${organization.id}/${selected.client_id}/${crypto.randomUUID()}-${safeFileName(docFile.name)}`;
    try {
      const { error: uploadError } = await supabase.storage.from('security-client-documents').upload(path, docFile, { contentType: mimeType, upsert: false });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from('security_client_portal_documents').insert({
        organization_id: organization.id, client_id: selected.client_id, site_id: docSiteId || null,
        title: docTitle.trim(), category: docCategory, storage_path: path,
        mime_type: mimeType, size_bytes: docFile.size, created_by: user.id
      });
      if (insertError) { await supabase.storage.from('security-client-documents').remove([path]); throw insertError; }
      setDocTitle(''); setDocFile(null); setDocSiteId(''); setSuccess('Document publié dans le portail client.');
      await loadClientData(selected.client_id); await loadOverview();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Publication impossible.'); }
    setBusy('');
  }

  async function openDocument(document: PortalDocument) {
    if (!supabase) return;
    const target = prepareFileWindow('Ouverture du document', document.title);
    const { data, error: signedError } = await supabase.storage.from('security-client-documents').createSignedUrl(document.storage_path, 300);
    if (signedError || !data?.signedUrl) { closeFileWindow(target); setError(signedError?.message ?? 'Document inaccessible.'); return; }
    navigateFileWindow(target, data.signedUrl);
  }

  async function deleteDocument(document: PortalDocument) {
    if (!organization || !supabase || !canAdminister || !window.confirm(`Retirer « ${document.title} » du portail client ?`)) return;
    setBusy(document.id); setError('');
    const { error: storageError } = await supabase.storage.from('security-client-documents').remove([document.storage_path]);
    if (storageError) { setError(storageError.message); setBusy(''); return; }
    const { error: deleteError } = await supabase.from('security_client_portal_documents').delete().eq('organization_id', organization.id).eq('id', document.id);
    if (deleteError) setError(deleteError.message); else { setSuccess('Document retiré.'); if (selected) await loadClientData(selected.client_id); await loadOverview(); }
    setBusy('');
  }

  if (!organization) return null;
  return <div className="page security-page client-portal-admin-page">
    <header className="page-header"><div><p className="eyebrow">PHASE 3 · SÉCURITÉ PRIVÉE</p><h1>Portail clients</h1><p>Partage les missions, rapports, rondes et documents avec chaque donneur d’ordre dans un espace sécurisé.</p></div><button className="secondary-button" onClick={() => void loadOverview()}><Icon name="activity" size={18}/>Actualiser</button></header>
    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}
    <section className="client-portal-admin-layout">
      <aside className="panel client-portal-client-list">
        <div className="panel-header"><div><p className="eyebrow">DONNEURS D’ORDRE</p><h2>{clients.length} client{clients.length > 1 ? 's' : ''}</h2></div></div>
        {loading ? <div className="security-empty">Chargement…</div> : clients.length === 0 ? <div className="security-empty"><Icon name="building" size={30}/><strong>Aucun client actif</strong><span>Crée d’abord une fiche client Sécurité.</span></div> : clients.map((client) => <button key={client.client_id} className={`client-portal-client-button ${selected?.client_id === client.client_id ? 'active' : ''}`} onClick={() => setSelectedId(client.client_id)}>
          <span><Icon name="building" size={19}/></span><div><strong>{client.company_name}</strong><small>{client.site_count} site{client.site_count > 1 ? 's' : ''} · {client.accounts.filter((a) => a.status === 'active').length} accès</small></div>{client.unread_messages > 0 && <b>{client.unread_messages}</b>}
        </button>)}
      </aside>
      <main className="client-portal-admin-main">
        {!selected ? <section className="panel security-empty"><Icon name="building" size={34}/><strong>Sélectionne un client</strong></section> : <>
          <section className="panel client-portal-client-hero"><div><p className="eyebrow">ESPACE CLIENT</p><h2>{selected.company_name}</h2><p>{[selected.contact_name, selected.email, selected.phone, selected.city].filter(Boolean).join(' · ') || 'Coordonnées à compléter'}</p></div><div className="client-portal-hero-stats"><span><strong>{selected.accounts.length}</strong> accès</span><span><strong>{selected.document_count}</strong> document{selected.document_count > 1 ? 's' : ''}</span><span><strong>{selected.unread_messages}</strong> non lu{selected.unread_messages > 1 ? 's' : ''}</span></div>{canAdminister && <button className="primary-button" onClick={openInvite}><Icon name="plus" size={17}/>Inviter un contact</button>}</section>

          {inviteOpen && <section className="panel client-portal-invite-panel"><div className="panel-header"><div><p className="eyebrow">NOUVEL ACCÈS</p><h2>Inviter un contact client</h2></div><button className="secondary-button compact-button" onClick={() => setInviteOpen(false)}>Fermer</button></div><form onSubmit={invite} className="client-portal-invite-form"><label>Nom du contact<input value={inviteName} onChange={(e) => setInviteName(e.target.value)}/></label><label>Adresse e-mail *<input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}/></label><label>Rôle<select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}><option value="client_admin">Responsable client</option><option value="client_viewer">Consultation</option></select></label><fieldset><legend>Informations accessibles</legend>{permissionLabels.map(([key,label]) => <label className="client-portal-check" key={key}><input type="checkbox" checked={invitePermissions[key]} onChange={() => setInvitePermissions((current) => ({ ...current, [key]: !current[key] }))}/><span><Icon name="check" size={14}/></span>{label}</label>)}</fieldset><button className="primary-button" disabled={busy === 'invite'}>{busy === 'invite' ? 'Envoi…' : 'Envoyer l’invitation'}</button></form></section>}

          <section className="panel"><div className="panel-header"><div><p className="eyebrow">ACCÈS AU PORTAIL</p><h2>Contacts autorisés</h2></div></div>
            {selected.accounts.length === 0 && selected.invitations.length === 0 ? <div className="security-empty"><Icon name="users" size={28}/><strong>Aucun accès</strong><span>Invite le contact principal pour ouvrir le portail.</span></div> : <div className="client-portal-access-list">
              {selected.accounts.map((account) => <article key={account.id} className="client-portal-access-card"><div className="client-portal-access-head"><span><Icon name="users" size={18}/></span><div><strong>{account.display_name || account.email}</strong><small>{account.email} · {account.role === 'client_admin' ? 'Responsable client' : 'Consultation'} · dernière activité {dateTime(account.last_seen_at)}</small></div><em className={account.status}>{account.status === 'active' ? 'Actif' : 'Suspendu'}</em>{canAdminister && <button className="secondary-button compact-button" disabled={busy === account.id} onClick={() => void toggleAccount(account)}>{account.status === 'active' ? 'Suspendre' : 'Réactiver'}</button>}</div><div className="client-portal-permissions">{permissionLabels.map(([key,label]) => <button type="button" key={key} disabled={!canAdminister || busy === `${account.id}-${key}`} className={account.permissions[key] ? 'enabled' : ''} onClick={() => void changePermission(account,key)}><Icon name={account.permissions[key] ? 'check' : 'lock'} size={13}/>{label}</button>)}</div></article>)}
              {selected.invitations.map((invite) => <article key={invite.id} className="client-portal-access-card pending"><div className="client-portal-access-head"><span><Icon name="message" size={18}/></span><div><strong>{invite.display_name || invite.email}</strong><small>{invite.email} · expiration {dateTime(invite.expires_at)}</small></div><em className="pending">{invite.status === 'expired' ? 'Expirée' : 'En attente'}</em>{canAdminister && <><button className="secondary-button compact-button" disabled={busy === invite.id} onClick={() => void invitationAction(invite,'resend')}>Renvoyer</button><button className="secondary-button compact-button danger" disabled={busy === invite.id} onClick={() => void invitationAction(invite,'revoke')}>Annuler</button></>}</div></article>)}
            </div>}
          </section>

          <section className="client-portal-work-grid">
            <article className="panel client-portal-message-panel"><div className="panel-header"><div><p className="eyebrow">ÉCHANGES</p><h2>Messagerie client</h2></div></div><div className="client-portal-message-thread">{messages.length === 0 ? <div className="security-empty"><Icon name="message" size={26}/><span>Aucun échange pour le moment.</span></div> : messages.map((message) => <div key={message.id} className={`client-portal-message ${message.author_type}`}><div><strong>{message.author_name || (message.author_type === 'client' ? selected.company_name : organization.name)}</strong><small>{dateTime(message.created_at)}</small></div><p>{message.body}</p></div>)}</div><form className="client-portal-message-form" onSubmit={sendMessage}><textarea rows={3} maxLength={3000} placeholder="Écrire un message au client…" value={messageBody} onChange={(e) => setMessageBody(e.target.value)}/><button className="primary-button" disabled={busy === 'message' || !messageBody.trim()}><Icon name="message" size={16}/>Envoyer</button></form></article>
            <article className="panel client-portal-document-panel"><div className="panel-header"><div><p className="eyebrow">DOCUMENTS PARTAGÉS</p><h2>{documents.length} fichier{documents.length > 1 ? 's' : ''}</h2></div></div><form className="client-portal-document-form" onSubmit={uploadDocument}><label>Titre<input required value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Rapport mensuel, consigne, contrat…"/></label><label>Catégorie<select value={docCategory} onChange={(e) => setDocCategory(e.target.value)}><option value="rapport">Rapport</option><option value="consigne">Consigne</option><option value="contrat">Contrat</option><option value="facture">Facture</option><option value="general">Général</option><option value="autre">Autre</option></select></label><label>Site<select value={docSiteId} onChange={(e) => setDocSiteId(e.target.value)}><option value="">Tous les sites</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label><label className="file-field">Fichier<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}/><span>{docFile?.name || 'PDF, image ou texte · 15 Mo max.'}</span></label><button className="primary-button" disabled={busy === 'document' || !docFile || !docTitle.trim()}><Icon name="plus" size={16}/>{busy === 'document' ? 'Publication…' : 'Publier'}</button></form><div className="client-portal-document-list">{documents.map((document) => <div key={document.id}><span><Icon name="file" size={17}/></span><div><strong>{document.title}</strong><small>{document.category} · {document.security_sites?.name || 'Tous les sites'} · {dateTime(document.published_at)}</small></div><button className="secondary-button compact-button" onClick={() => void openDocument(document)}>Ouvrir</button>{canAdminister && <button className="secondary-button compact-button danger" disabled={busy === document.id} onClick={() => void deleteDocument(document)}>Retirer</button>}</div>)}</div></article>
          </section>
        </>}
      </main>
    </section>
  </div>;
}
