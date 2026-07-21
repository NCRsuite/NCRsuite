import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { nullableRestaurantText, RESTAURANT_ROLE_LABELS, type RestaurantEmployeeRecord, type RestaurantShiftRecord } from '../features/restaurant/types';
import { supabase } from '../lib/supabase';

type PlanningView = 'week' | 'day';

function toLocalInput(date: Date) { const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return shifted.toISOString().slice(0, 16); }
function defaultStart() { const date = new Date(); date.setHours(date.getHours() + 1, 0, 0, 0); return toLocalInput(date); }
function defaultEnd() { const date = new Date(); date.setHours(date.getHours() + 5, 0, 0, 0); return toLocalInput(date); }
function startOfDay(date: Date) { const copy = new Date(date); copy.setHours(0, 0, 0, 0); return copy; }
function addDays(date: Date, count: number) { const copy = new Date(date); copy.setDate(copy.getDate() + count); return copy; }
function startOfWeek(date: Date) { const copy = startOfDay(date); copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7)); return copy; }
function sameDay(value: string | Date, date: Date) { const source = new Date(value); return source.getFullYear() === date.getFullYear() && source.getMonth() === date.getMonth() && source.getDate() === date.getDate(); }
function time(value: string) { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function durationMinutes(row: RestaurantShiftRecord) { return Math.max(0, Math.round((new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60000)); }
function employeeName(employee?: Pick<RestaurantEmployeeRecord, 'first_name' | 'last_name'> | null) { return employee ? `${employee.first_name} ${employee.last_name}`.trim() : 'Employé'; }
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

const roleClass: Record<string, string> = { manager: 'manager', server: 'server', cook: 'cook', host: 'host', dishwasher: 'dishwasher', other: 'other' };

export function RestaurantPlanningPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [rows, setRows] = useState<RestaurantShiftRecord[]>([]);
  const [employees, setEmployees] = useState<RestaurantEmployeeRecord[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [endsAt, setEndsAt] = useState(defaultEnd);
  const [position, setPosition] = useState('');
  const [notes, setNotes] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [view, setView] = useState<PlanningView>('week');
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    if (!organization) return;
    setLoading(true); setError('');
    const start = new Date(); start.setDate(start.getDate() - 70);
    const end = new Date(); end.setDate(end.getDate() + 150);
    if (demoMode || !supabase) {
      setEmployees(JSON.parse(localStorage.getItem(`ncr-restaurant-employees-${organization.id}`) || '[]') as RestaurantEmployeeRecord[]);
      setRows(JSON.parse(localStorage.getItem(`ncr-restaurant-shifts-${organization.id}`) || '[]') as RestaurantShiftRecord[]);
    } else {
      const [employeeResult, shiftResult] = await Promise.all([
        supabase.from('restaurant_employees').select('*').eq('organization_id', organization.id).eq('status', 'active').order('last_name'),
        supabase.from('restaurant_shifts').select('*,restaurant_employees(first_name,last_name,role_code)').eq('organization_id', organization.id).gte('starts_at', start.toISOString()).lt('starts_at', end.toISOString()).order('starts_at')
      ]);
      const firstError = employeeResult.error || shiftResult.error;
      if (firstError) setError(firstError.message);
      setEmployees((employeeResult.data ?? []) as RestaurantEmployeeRecord[]);
      setRows((shiftResult.data ?? []) as RestaurantShiftRecord[]);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id, demoMode]);

  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const activeRows = useMemo(() => rows.filter((row) => row.status !== 'canceled'), [rows]);
  const visibleEmployees = useMemo(() => employees.filter((employee) => (employeeFilter === 'all' || employee.id === employeeFilter) && (roleFilter === 'all' || employee.role_code === roleFilter)), [employees, employeeFilter, roleFilter]);
  const weekRows = useMemo(() => activeRows.filter((row) => new Date(row.starts_at) >= weekStart && new Date(row.starts_at) < addDays(weekStart, 7)), [activeRows, weekStart]);
  const dayRows = useMemo(() => activeRows.filter((row) => sameDay(row.starts_at, selectedDate) && (employeeFilter === 'all' || row.employee_id === employeeFilter) && (roleFilter === 'all' || row.restaurant_employees?.role_code === roleFilter)).sort((a, b) => a.starts_at.localeCompare(b.starts_at)), [activeRows, selectedDate, employeeFilter, roleFilter]);
  const weekMinutes = weekRows.reduce((total, row) => total + durationMinutes(row), 0);
  const activeToday = activeRows.filter((row) => sameDay(row.starts_at, new Date())).length;
  const eveningCount = weekRows.filter((row) => new Date(row.starts_at).getHours() >= 17).length;
  const scheduledEmployeeCount = new Set(weekRows.map((row) => row.employee_id)).size;

  function openCell(employee: RestaurantEmployeeRecord, day: Date) {
    const start = new Date(day); start.setHours(employee.role_code === 'cook' ? 10 : 11, 0, 0, 0);
    const end = new Date(start); end.setHours(start.getHours() + 5);
    setEmployeeId(employee.id); setPosition(RESTAURANT_ROLE_LABELS[employee.role_code]); setStartsAt(toLocalInput(start)); setEndsAt(toLocalInput(end)); setNotes(''); setFormOpen(true);
  }

  async function createShift(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !employeeId) return;
    const start = new Date(startsAt); const end = new Date(endsAt);
    if (end <= start) { setError('L’heure de fin doit être postérieure au début.'); return; }
    const conflict = activeRows.some((row) => row.employee_id === employeeId && start < new Date(row.ends_at) && end > new Date(row.starts_at));
    if (conflict) { setError('Cet employé possède déjà un service sur tout ou partie de ce créneau.'); return; }
    setSaving(true); setError(''); setSuccess('');
    const payload = { organization_id: organization.id, employee_id: employeeId, starts_at: start.toISOString(), ends_at: end.toISOString(), position_label: nullableRestaurantText(position), notes: nullableRestaurantText(notes), created_by: user.id };
    try {
      let created: RestaurantShiftRecord;
      if (demoMode || !supabase) {
        const employee = employees.find((item) => item.id === employeeId)!;
        created = { id: crypto.randomUUID(), ...payload, status: 'planned', restaurant_employees: employee };
        const next = [...rows, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
        localStorage.setItem(`ncr-restaurant-shifts-${organization.id}`, JSON.stringify(next));
      } else {
        const { data, error: insertError } = await supabase.from('restaurant_shifts').insert(payload).select('*,restaurant_employees(first_name,last_name,role_code)').single();
        if (insertError) throw insertError;
        created = data as RestaurantShiftRecord;
      }
      setRows((current) => [...current, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
      setEmployeeId(''); setPosition(''); setNotes(''); setStartsAt(defaultStart()); setEndsAt(defaultEnd()); setFormOpen(false); setSuccess('Le service a été planifié.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Planification impossible.'); } finally { setSaving(false); }
  }

  async function cancel(row: RestaurantShiftRecord) {
    if (!organization || !window.confirm('Annuler ce service ?')) return;
    try {
      if (demoMode || !supabase) {
        const next = rows.map((item) => item.id === row.id ? { ...item, status: 'canceled' as const } : item);
        localStorage.setItem(`ncr-restaurant-shifts-${organization.id}`, JSON.stringify(next)); setRows(next);
      } else {
        const { error: updateError } = await supabase.from('restaurant_shifts').update({ status: 'canceled' }).eq('organization_id', organization.id).eq('id', row.id);
        if (updateError) throw updateError;
        setRows((current) => current.map((item) => item.id === row.id ? { ...item, status: 'canceled' } : item));
      }
      setSuccess('Le service a été annulé.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Annulation impossible.'); }
  }

  if (!organization) return null;

  return <div className="page restaurant-page restaurant-planning-premium">
    <header className="page-header restaurant-planning-hero">
      <div><p className="eyebrow">RESTAURATION · PILOTAGE ÉQUIPE</p><h1>Planning des services</h1><p>Visualise instantanément les équipes du midi et du soir, les postes couverts et les coupures.</p></div>
      <button className="primary-button" disabled={!employees.length} onClick={() => setFormOpen(true)}><Icon name="plus" size={18}/>Planifier un service</button>
    </header>

    {error && <div className="error-message page-message">{error}</div>}{success && <div className="success-message page-message">{success}</div>}

    <section className="planning-kpi-row restaurant-planning-kpis">
      <article><span className="planning-kpi-icon"><Icon name="users" size={19}/></span><div><strong>{scheduledEmployeeCount}/{employees.length}</strong><span>équipiers planifiés</span></div></article>
      <article><span className="planning-kpi-icon"><Icon name="clock" size={19}/></span><div><strong>{Math.round(weekMinutes / 60)} h</strong><span>cette semaine</span></div></article>
      <article><span className="planning-kpi-icon"><Icon name="activity" size={19}/></span><div><strong>{activeToday}</strong><span>services aujourd’hui</span></div></article>
      <article><span className="planning-kpi-icon"><Icon name="utensils" size={19}/></span><div><strong>{eveningCount}</strong><span>services du soir</span></div></article>
    </section>

    {formOpen && <section className="panel planning-quick-form restaurant-form-panel">
      <div className="panel-header"><div><p className="eyebrow">NOUVEAU SERVICE</p><h2>Affecter un employé</h2><p>Le contrôle de chevauchement est effectué avant l’enregistrement.</p></div><button className="secondary-button compact-button" type="button" onClick={() => setFormOpen(false)}>Fermer</button></div>
      <form className="restaurant-form-grid" onSubmit={createShift}>
        <label className="full-field">Employé *<select required value={employeeId} onChange={(e) => { const id = e.target.value; const employee = employees.find((item) => item.id === id); setEmployeeId(id); if (employee && !position) setPosition(RESTAURANT_ROLE_LABELS[employee.role_code]); }}><option value="">Sélectionner…</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name} · {RESTAURANT_ROLE_LABELS[employee.role_code]}</option>)}</select></label>
        <label>Début *<input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)}/></label><label>Fin *<input type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)}/></label>
        <label className="full-field">Poste sur ce service<input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Salle, cuisine chaude, bar…"/></label>
        <label className="full-field">Notes<textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Coupure, remplacement, consigne particulière…"/></label>
        <div className="form-actions full-field"><button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Annuler</button><button className="primary-button" disabled={saving || employees.length === 0}>{saving ? 'Planification…' : 'Planifier le service'}</button></div>
      </form>
    </section>}

    <section className="panel planning-workspace restaurant-planning-workspace">
      <div className="planning-master-toolbar">
        <div className="planning-period-navigation"><button type="button" className="icon-nav-button" onClick={() => setSelectedDate(addDays(selectedDate, view === 'week' ? -7 : -1))}>‹</button><button type="button" className="secondary-button compact-button" onClick={() => setSelectedDate(startOfDay(new Date()))}>Aujourd’hui</button><button type="button" className="icon-nav-button" onClick={() => setSelectedDate(addDays(selectedDate, view === 'week' ? 7 : 1))}>›</button><div><p className="eyebrow">{view === 'week' ? 'SEMAINE DE SERVICE' : 'SERVICE DU JOUR'}</p><h2>{view === 'week' ? `Du ${new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(weekStart)} au ${new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(addDays(weekStart, 6))}` : new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }).format(selectedDate)}</h2></div></div>
        <div className="planning-toolbar-filters"><div className="segmented-control"><button type="button" className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Semaine</button><button type="button" className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>Jour</button></div><select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="all">Tous les postes</option>{Object.entries(RESTAURANT_ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}><option value="all">Toute l’équipe</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</option>)}</select></div>
      </div>

      <div className="planning-mobile-day-strip" aria-label="Choisir un jour">{weekDays.map((day) => <button key={dateKey(day)} type="button" className={`${sameDay(day, selectedDate) ? 'active' : ''}${sameDay(day, new Date()) ? ' today' : ''}`} onClick={() => { setSelectedDate(day); setView('day'); }}><span>{new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(day)}</span><strong>{day.getDate()}</strong><small>{weekRows.filter((row) => sameDay(row.starts_at, day)).length}</small></button>)}</div>

      {loading ? <div className="planning-empty-state">Chargement du planning…</div> : view === 'week' ? <div className="planning-grid-scroll"><div className="planning-team-grid restaurant-team-grid" style={{ gridTemplateColumns: `190px repeat(7, minmax(145px, 1fr))` }}>
        <div className="planning-grid-corner">ÉQUIPE</div>{weekDays.map((day) => <button type="button" key={dateKey(day)} className={`planning-grid-date${sameDay(day, new Date()) ? ' today' : ''}`} onClick={() => { setSelectedDate(day); setView('day'); }}><span>{new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(day)}</span><strong>{day.getDate()}</strong><small>{weekRows.filter((row) => sameDay(row.starts_at, day)).length} service{weekRows.filter((row) => sameDay(row.starts_at, day)).length > 1 ? 's' : ''}</small></button>)}
        {visibleEmployees.map((employee) => <div className="planning-grid-row" style={{ display: 'contents' }} key={employee.id}><div className="planning-person-cell"><span className={`planning-avatar role-${roleClass[employee.role_code]}`}>{employee.first_name.slice(0, 1)}{employee.last_name.slice(0, 1)}</span><div><strong>{employee.first_name} {employee.last_name}</strong><small>{RESTAURANT_ROLE_LABELS[employee.role_code]} · {employee.weekly_hours || 35} h</small></div></div>{weekDays.map((day) => { const cellRows = weekRows.filter((row) => row.employee_id === employee.id && sameDay(row.starts_at, day)); return <div className="planning-grid-cell restaurant-service-cell" key={`${employee.id}-${dateKey(day)}`} onClick={() => openCell(employee, day)}>{cellRows.map((row) => <article key={row.id} className={`restaurant-shift-block role-${roleClass[employee.role_code]}`} onClick={(event) => event.stopPropagation()}><div><strong>{time(row.starts_at)}–{time(row.ends_at)}</strong><span>{row.position_label || RESTAURANT_ROLE_LABELS[employee.role_code]}</span></div><small>{durationMinutes(row) / 60} h{row.notes ? ` · ${row.notes}` : ''}</small><button type="button" aria-label="Annuler ce service" onClick={() => void cancel(row)}>×</button></article>)}<button className="planning-cell-add" type="button" onClick={(event) => { event.stopPropagation(); openCell(employee, day); }}>+</button></div>; })}</div>)}
      </div></div> : <div className="planning-day-board restaurant-day-board">{dayRows.length === 0 ? <div className="planning-empty-state"><Icon name="calendar" size={30}/><strong>Aucun service</strong><span>L’équipe n’est pas encore planifiée sur cette journée.</span></div> : dayRows.map((row) => { const employee = employees.find((item) => item.id === row.employee_id); return <article className={`planning-day-card restaurant-day-shift role-${roleClass[employee?.role_code || 'other']}`} key={row.id}><div className="planning-day-time"><strong>{time(row.starts_at)}</strong><span>{time(row.ends_at)}</span></div><span className={`planning-avatar role-${roleClass[employee?.role_code || 'other']}`}>{employee?.first_name.slice(0, 1)}{employee?.last_name.slice(0, 1)}</span><div className="planning-day-main"><strong>{employeeName(employee)}</strong><span>{row.position_label || (employee ? RESTAURANT_ROLE_LABELS[employee.role_code] : 'Service')}</span><small>{Math.round(durationMinutes(row) / 60 * 10) / 10} h{row.notes ? ` · ${row.notes}` : ''}</small></div><button className="secondary-button compact-button" type="button" onClick={() => void cancel(row)}>Annuler</button></article>; })}</div>}
      <div className="planning-mobile-agenda"><div className="planning-mobile-agenda-heading"><p className="eyebrow">JOUR SÉLECTIONNÉ</p><strong>{new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }).format(selectedDate)}</strong></div>{dayRows.length === 0 ? <div className="planning-empty-state compact"><Icon name="calendar" size={26}/><strong>Aucun service</strong><span>La journée est encore libre.</span></div> : <div className="planning-day-board">{dayRows.map((row) => { const employee = employees.find((item) => item.id === row.employee_id); return <article className={`planning-day-card restaurant-day-shift role-${roleClass[employee?.role_code || 'other']}`} key={`mobile-${row.id}`}><div className="planning-day-time"><strong>{time(row.starts_at)}</strong><span>{time(row.ends_at)}</span></div><span className={`planning-avatar role-${roleClass[employee?.role_code || 'other']}`}>{employee?.first_name.slice(0, 1)}{employee?.last_name.slice(0, 1)}</span><div className="planning-day-main"><strong>{employeeName(employee)}</strong><span>{row.position_label || (employee ? RESTAURANT_ROLE_LABELS[employee.role_code] : 'Service')}</span><small>{Math.round(durationMinutes(row) / 60 * 10) / 10} h</small></div></article>; })}</div>}</div>
    </section>
  </div>;
}
