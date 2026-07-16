import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { generateSecurityMissionLogbookPdf } from '../features/security/logbookPdf';
import {
  formatSecurityDate,
  formatSecurityDuration,
  securityPersonName,
  securityShiftMinutes,
  toLocalDateTimeInput,
  type SecurityLogbookEntryRecord,
  type SecurityShiftRecord
} from '../features/security/types';
import { closeFileWindow, prepareFileWindow, showBlobDownload } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';

const categories = [
  ['prise_poste', 'Prise de poste'],
  ['fin_poste', 'Fin de poste'],
  ['ronde', 'Ronde effectuée'],
  ['anomalie', 'Anomalie constatée'],
  ['incident', 'Incident'],
  ['visiteur', 'Visiteur / accès'],
  ['livraison', 'Livraison'],
  ['appel', 'Appel reçu'],
  ['consigne', 'Consigne transmise'],
  ['autre', 'Autre événement']
] as const;

type Category = SecurityLogbookEntryRecord['category'];
type FormState = {
  category: Category;
  severity: SecurityLogbookEntryRecord['severity'];
  title: string;
  details: string;
  occurredAt: string;
};

function dateInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function defaultPeriod() {
  const now = new Date();
  return {
    from: dateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: dateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  };
}

function defaultEventTime(shift?: SecurityShiftRecord | null) {
  if (!shift) return toLocalDateTimeInput(new Date());
  const now = new Date();
  const start = new Date(shift.starts_at);
  const end = new Date(shift.ends_at);
  if (now < start) return toLocalDateTimeInput(start);
  if (now > end) return toLocalDateTimeInput(end);
  return toLocalDateTimeInput(now);
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function missionStatus(shift: SecurityShiftRecord) {
  if (shift.status === 'canceled') return 'Annulée';
  if (shift.status === 'completed') return 'Terminée';
  const now = Date.now();
  if (new Date(shift.starts_at).getTime() <= now && new Date(shift.ends_at).getTime() >= now) return 'En cours';
  if (new Date(shift.starts_at).getTime() > now) return 'Planifiée';
  return 'À compléter';
}

function emptyForm(shift?: SecurityShiftRecord | null): FormState {
  return {
    category: 'ronde',
    severity: 'info',
    title: 'Ronde effectuée',
    details: '',
    occurredAt: defaultEventTime(shift)
  };
}

export function SecurityLogbookPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const initial = defaultPeriod();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [shifts, setShifts] = useState<SecurityShiftRecord[]>([]);
  const [entries, setEntries] = useState<SecurityLogbookEntryRecord[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!organization) return;
    setLoading(true);
    setError('');

    if (demoMode || !supabase) {
      const demoShifts = JSON.parse(localStorage.getItem(`ncr-suite-security-shifts-${organization.id}`) || '[]') as SecurityShiftRecord[];
      const demoEntries = JSON.parse(localStorage.getItem(`ncr-suite-security-logbook-${organization.id}`) || '[]') as SecurityLogbookEntryRecord[];
      setShifts(demoShifts.filter((shift) => shift.status !== 'canceled'));
      setEntries(demoEntries);
      setLoading(false);
      return;
    }

    const shiftResult = await supabase
      .from('security_shifts')
      .select('id,organization_id,site_id,agent_id,title,starts_at,ends_at,break_minutes,status,notes,recurrence_group_id,duplicated_from_id,clocked_in_at,clocked_in_source,clocked_out_at,clocked_out_source,logbook_status,logbook_closed_at,logbook_closed_source,created_at,security_sites!security_shifts_site_fk(name,hourly_rate_cents,color_hex,address,postal_code,city,security_clients(company_name)),security_agents!security_shifts_agent_fk(first_name,last_name)')
      .eq('organization_id', organization.id)
      .neq('status', 'canceled')
      .lt('starts_at', `${to}T23:59:59`)
      .gt('ends_at', `${from}T00:00:00`)
      .order('starts_at', { ascending: false });

    if (shiftResult.error) {
      setError(`Chargement des vacations impossible : ${shiftResult.error.message}`);
      setLoading(false);
      return;
    }

    const entryResult = await supabase
      .from('security_logbook_entries')
      .select('id,organization_id,site_id,agent_id,shift_id,occurred_at,category,severity,title,details,status,created_at,security_sites!security_logbook_site_fk(name,color_hex),security_agents!security_logbook_agent_fk(first_name,last_name)')
      .eq('organization_id', organization.id)
      .gte('occurred_at', `${from}T00:00:00`)
      .lte('occurred_at', `${to}T23:59:59`)
      .order('occurred_at', { ascending: true });

    if (entryResult.error) {
      setError(`Chargement des mains courantes impossible : ${entryResult.error.message}`);
    } else {
      setShifts((shiftResult.data ?? []) as unknown as SecurityShiftRecord[]);
      setEntries((entryResult.data ?? []) as unknown as SecurityLogbookEntryRecord[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [organization?.id, demoMode, from, to]);

  useEffect(() => {
    if (!shifts.length) {
      setSelectedShiftId('');
      return;
    }
    if (shifts.some((shift) => shift.id === selectedShiftId)) return;
    const now = Date.now();
    const active = shifts.find((shift) => new Date(shift.starts_at).getTime() <= now && new Date(shift.ends_at).getTime() >= now);
    const upcoming = [...shifts].reverse().find((shift) => new Date(shift.starts_at).getTime() > now);
    setSelectedShiftId((active || upcoming || shifts[0]).id);
  }, [shifts, selectedShiftId]);

  const selectedShift = useMemo(
    () => shifts.find((shift) => shift.id === selectedShiftId) ?? null,
    [shifts, selectedShiftId]
  );

  useEffect(() => {
    setForm(emptyForm(selectedShift));
    setOpen(false);
    setError('');
    setSuccess('');
  }, [selectedShift?.id]);

  const entriesByShift = useMemo(() => {
    const map = new Map<string, SecurityLogbookEntryRecord[]>();
    for (const entry of entries) {
      if (!entry.shift_id) continue;
      const current = map.get(entry.shift_id) ?? [];
      current.push(entry);
      map.set(entry.shift_id, current);
    }
    return map;
  }, [entries]);

  const selectedEntries = useMemo(
    () => (selectedShift ? entriesByShift.get(selectedShift.id) ?? [] : []),
    [entriesByShift, selectedShift]
  );

  const legacyEntries = useMemo(
    () => entries.filter((entry) => !entry.shift_id),
    [entries]
  );

  const totals = useMemo(() => ({
    missions: shifts.length,
    entries: entries.filter((entry) => entry.shift_id).length,
    urgent: entries.filter((entry) => entry.shift_id && entry.severity === 'urgent').length
  }), [shifts, entries]);

  function chooseCategory(value: Category) {
    const label = categories.find(([key]) => key === value)?.[1] || 'Événement';
    setForm((current) => ({ ...current, category: value, title: label }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !selectedShift) return;
    if (selectedShift.logbook_status === 'closed') { setError('La main courante de cette vacation est clôturée.'); setOpen(false); return; }
    setSaving(true);
    setError('');

    const payload = {
      organization_id: organization.id,
      shift_id: selectedShift.id,
      site_id: selectedShift.site_id,
      agent_id: selectedShift.agent_id,
      occurred_at: new Date(form.occurredAt).toISOString(),
      category: form.category,
      severity: form.severity,
      title: form.title.trim(),
      details: form.details.trim() || null,
      created_by: user.id
    };

    try {
      if (demoMode || !supabase) {
        const created: SecurityLogbookEntryRecord = {
          id: crypto.randomUUID(),
          ...payload,
          status: 'open',
          created_at: new Date().toISOString(),
          security_sites: selectedShift.security_sites ? { name: selectedShift.security_sites.name, color_hex: selectedShift.security_sites.color_hex } : null,
          security_agents: selectedShift.security_agents
        };
        const next = [...entries, created].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
        localStorage.setItem(`ncr-suite-security-logbook-${organization.id}`, JSON.stringify(next));
        setEntries(next);
      } else {
        const { error: insertError } = await supabase.from('security_logbook_entries').insert(payload);
        if (insertError) throw insertError;
        await load();
      }
      setForm(emptyForm(selectedShift));
      setOpen(false);
      setSuccess('L’événement a été ajouté à la main courante de cette vacation.');
    } catch (cause) {
      setError(`Enregistrement impossible : ${cause instanceof Error ? cause.message : 'erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  }

  async function process(id: string) {
    if (!organization || !canManage) return;
    if (demoMode || !supabase) {
      setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, status: 'processed' } : entry));
    } else {
      const { error: updateError } = await supabase
        .from('security_logbook_entries')
        .update({ status: 'processed' })
        .eq('organization_id', organization.id)
        .eq('id', id);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await load();
    }
    setSuccess('Événement marqué comme traité.');
  }

  async function exportMissionPdf(shift: SecurityShiftRecord) {
    if (!organization) return;
    const target = prepareFileWindow('Préparation de la main courante', 'Le PDF de la vacation est en cours de génération.');
    try {
      const result = await generateSecurityMissionLogbookPdf(organization, shift, entriesByShift.get(shift.id) ?? []);
      const url = URL.createObjectURL(result.blob);
      showBlobDownload(target, url, result.filename, 'Main courante de vacation prête');
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (cause) {
      closeFileWindow(target);
      setError(`Export impossible : ${cause instanceof Error ? cause.message : 'erreur inconnue'}`);
    }
  }

  if (!organization) return null;

  return (
    <div className="page security-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">SÉCURITÉ PRIVÉE</p>
          <h1>Mains courantes par vacation</h1>
          <p>Chaque mission possède son propre journal, son site, son agent et son PDF indépendant.</p>
        </div>
        {selectedShift && (
          <div className="security-header-actions">
            <button className="secondary-button" onClick={() => void exportMissionPdf(selectedShift)}>
              <Icon name="file" size={18} /> PDF de la mission
            </button>
            {selectedShift.logbook_status !== 'closed' ? <button className="primary-button" onClick={() => setOpen(true)}>
              <Icon name="plus" size={18} /> Ajouter un événement
            </button> : <span className="security-status-pill completed"><Icon name="lock" size={15}/>Main courante clôturée</span>}
          </div>
        )}
      </header>

      {error && <div className="error-message page-message">{error}</div>}
      {success && <div className="success-message page-message">{success}</div>}

      <section className="security-planning-summary">
        <article><Icon name="calendar" size={20} /><div><strong>{totals.missions}</strong><span>vacations</span></div></article>
        <article><Icon name="clipboard" size={20} /><div><strong>{totals.entries}</strong><span>événements classés</span></div></article>
        <article><Icon name="alert" size={20} /><div><strong>{totals.urgent}</strong><span>urgents</span></div></article>
      </section>

      <section className="panel security-logbook-filters">
        <div>
          <p className="eyebrow">PÉRIODE</p>
          <h2>Vacations à consulter</h2>
        </div>
        <div>
          <label>Du<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>Au<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        </div>
      </section>

      {loading ? (
        <section className="panel security-empty">Chargement…</section>
      ) : shifts.length === 0 ? (
        <section className="panel security-empty">
          <Icon name="calendar" size={30} />
          <strong>Aucune vacation sur cette période</strong>
          <span>Une mission planifiée est obligatoire pour créer une main courante.</span>
        </section>
      ) : (
        <section className="security-mission-logbook-layout">
          <aside className="panel security-mission-list">
            <div className="panel-header">
              <div><p className="eyebrow">MISSIONS</p><h2>Par site et vacation</h2></div>
            </div>
            <div className="security-mission-list-scroll">
              {shifts.map((shift) => {
                const missionEntries = entriesByShift.get(shift.id) ?? [];
                const active = shift.id === selectedShiftId;
                const color = shift.security_sites?.color_hex || '#2997ff';
                return (
                  <article className={`security-mission-card ${active ? 'active' : ''}`} style={{ '--site-color': color } as CSSProperties} key={shift.id}>
                    <button type="button" className="security-mission-select" onClick={() => setSelectedShiftId(shift.id)}>
                      <span className="security-mission-color" />
                      <div>
                        <strong>{shift.security_sites?.name || 'Site'}</strong>
                        <span>{formatSecurityDate(shift.starts_at)} · {timeLabel(shift.starts_at)} - {timeLabel(shift.ends_at)}</span>
                        <small>{shift.security_agents ? securityPersonName(shift.security_agents.first_name, shift.security_agents.last_name) : 'Agent'} · {missionEntries.length} événement{missionEntries.length > 1 ? 's' : ''}</small>
                      </div>
                      <span className={`security-status-pill ${missionStatus(shift) === 'En cours' ? 'completed' : ''}`}>{missionStatus(shift)}</span>
                    </button>
                    <button type="button" className="security-mission-pdf" onClick={() => void exportMissionPdf(shift)} aria-label="Exporter le PDF de cette vacation">
                      <Icon name="file" size={16} /> PDF
                    </button>
                  </article>
                );
              })}
            </div>
          </aside>

          <div className="security-mission-detail">
            {selectedShift && (
              <>
                <section className="panel security-mission-summary" style={{ '--site-color': selectedShift.security_sites?.color_hex || '#2997ff' } as CSSProperties}>
                  <span className="security-mission-summary-color" />
                  <div>
                    <p className="eyebrow">MAIN COURANTE DE VACATION</p>
                    <h2>{selectedShift.security_sites?.name || 'Site'}</h2>
                    <p>{formatSecurityDate(selectedShift.starts_at)} · {timeLabel(selectedShift.starts_at)} - {timeLabel(selectedShift.ends_at)}</p>
                    <span>{selectedShift.security_agents ? securityPersonName(selectedShift.security_agents.first_name, selectedShift.security_agents.last_name) : 'Agent non renseigné'}</span>
                    <small>{formatSecurityDuration(securityShiftMinutes(selectedShift))} planifiées{selectedShift.security_sites?.security_clients?.company_name ? ` · ${selectedShift.security_sites.security_clients.company_name}` : ''}</small>
                  </div>
                  <div className="security-mission-summary-actions">
                    <button className="secondary-button compact-button" onClick={() => void exportMissionPdf(selectedShift)}><Icon name="file" size={16} />PDF</button>
                    {selectedShift.logbook_status !== 'closed' ? <button className="primary-button compact-button" onClick={() => setOpen(true)}><Icon name="plus" size={16} />Événement</button> : <span className="security-status-pill completed"><Icon name="lock" size={14}/>Clôturée</span>}
                  </div>
                </section>

                {selectedShift.logbook_status === 'closed' && <div className="security-callout"><Icon name="lock" size={20}/><div><strong>Main courante clôturée</strong><span>Aucun nouvel événement ne peut être ajouté. Le QG peut rouvrir les opérations depuis Dossiers de vacation si une correction est nécessaire.</span></div></div>}

                {open && selectedShift.logbook_status !== 'closed' && (
                  <section className="panel security-form-panel">
                    <div className="panel-header">
                      <div><p className="eyebrow">NOUVEL ÉVÉNEMENT</p><h2>{selectedShift.security_sites?.name} · {timeLabel(selectedShift.starts_at)} - {timeLabel(selectedShift.ends_at)}</h2></div>
                      <button className="secondary-button compact-button" onClick={() => setOpen(false)}>Fermer</button>
                    </div>
                    <div className="security-callout">
                      <Icon name="lock" size={19} />
                      <div><strong>Mission verrouillée</strong><span>Le site et l’agent sont repris automatiquement depuis la vacation sélectionnée.</span></div>
                    </div>
                    <form className="security-form-grid" onSubmit={submit}>
                      <label>Type d’événement<select value={form.category} onChange={(event) => chooseCategory(event.target.value as Category)}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                      <label>Gravité<select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as SecurityLogbookEntryRecord['severity'] })}><option value="info">Information</option><option value="attention">Attention</option><option value="urgent">Urgent</option></select></label>
                      <label>Date et heure<input type="datetime-local" required value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} /></label>
                      <label>Titre *<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                      <label className="full-field">Détails<textarea rows={4} value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} /></label>
                      <div className="form-actions full-field"><button className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : 'Ajouter à cette vacation'}</button></div>
                    </form>
                  </section>
                )}

                <section className="panel security-list-panel">
                  <div className="panel-header">
                    <div><p className="eyebrow">CHRONOLOGIE</p><h2>{selectedEntries.length} événement{selectedEntries.length > 1 ? 's' : ''}</h2></div>
                  </div>
                  {selectedEntries.length === 0 ? (
                    <div className="security-empty">
                      <Icon name="clipboard" size={30} />
                      <strong>Main courante vide</strong>
                      <span>Ajoute la prise de poste, les rondes, anomalies, incidents et la fin de poste de cette mission.</span>
                    </div>
                  ) : (
                    <div className="security-logbook-list">
                      {selectedEntries.map((entry) => (
                        <article className={`security-logbook-card ${entry.severity}`} key={entry.id}>
                          <div className="security-logbook-time"><strong>{timeLabel(entry.occurred_at)}</strong><span>{formatSecurityDate(entry.occurred_at)}</span></div>
                          <div className="security-record-main">
                            <strong>{entry.title}</strong>
                            <span>{categories.find(([value]) => value === entry.category)?.[1] || entry.category}</span>
                            <small>{entry.details || 'Aucun complément.'}</small>
                          </div>
                          <span className={`security-status-pill ${entry.status === 'processed' ? 'completed' : ''}`}>{entry.status === 'processed' ? 'Traité' : 'Ouvert'}</span>
                          {canManage && entry.status === 'open' && <button className="secondary-button compact-button" onClick={() => void process(entry.id)}>Marquer traité</button>}
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </section>
      )}

      {canManage && legacyEntries.length > 0 && (
        <section className="panel security-legacy-logbook">
          <div className="panel-header"><div><p className="eyebrow">HISTORIQUE V2.5.1</p><h2>{legacyEntries.length} entrée{legacyEntries.length > 1 ? 's' : ''} sans vacation</h2></div></div>
          <p>Ces anciennes entrées sont conservées pour ne perdre aucune donnée. Les nouvelles saisies sont désormais obligatoirement classées par mission.</p>
        </section>
      )}
    </div>
  );
}
