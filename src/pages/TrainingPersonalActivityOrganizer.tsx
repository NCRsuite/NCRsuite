import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import './TrainingPersonalActivityOrganizer.css';

type EmploymentMode = 'salaried' | 'subcontractor';
type RegulatoryScope = 'review_required' | 'professional_continuing' | 'apprenticeship' | 'initial_education' | 'out_of_scope';
type InterventionStatus = 'planned' | 'completed' | 'canceled';
type ViewMode = 'list' | 'calendar';

type PersonalIntervention = {
  id: string;
  series_id: string | null;
  center_name: string;
  activity_title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  employment_mode: EmploymentMode;
  regulatory_scope: RegulatoryScope;
  status: InterventionStatus;
  hourly_rate_cents: number | null;
  amount_excl_tax_cents: number | null;
  billing_invoice_id: string | null;
};

type Props = {
  revision?: number;
  onChanged?: () => void;
};

const statusLabels: Record<InterventionStatus, string> = {
  planned: 'Planifiée',
  completed: 'Terminée',
  canceled: 'Annulée'
};

const scopeLabels: Record<RegulatoryScope, string> = {
  review_required: 'BPF à qualifier',
  professional_continuing: 'BPF · Formation continue',
  apprenticeship: 'BPF · Apprentissage',
  initial_education: 'Formation initiale',
  out_of_scope: 'Hors BPF'
};

function monthKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1, 12);
  return monthKey(date);
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const label = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1, 12));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dayLabel(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  const label = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(year, month - 1, day, 12));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function durationHours(row: PersonalIntervention) {
  return Math.max(0, (new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 3_600_000);
}

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function nearestMonth(rows: PersonalIntervention[], current: string) {
  const months = [...new Set(rows.map((row) => monthKey(row.starts_at)))].sort();
  if (months.includes(current) || months.length === 0) return current;
  return months.find((month) => month >= current) ?? months[months.length - 1];
}

function calendarDays(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  const firstWeekday = (new Date(year, monthNumber - 1, 1, 12).getDay() + 6) % 7;
  return [
    ...Array.from({ length: firstWeekday }, () => null as number | null),
    ...Array.from({ length: days }, (_, index) => index + 1)
  ];
}

export function TrainingPersonalActivityOrganizer({ revision = 0, onChanged }: Props) {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [rows, setRows] = useState<PersonalIntervention[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));
  const [selectedDay, setSelectedDay] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const initializedMonth = useRef(false);

  async function load() {
    if (!organization || !user || !supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('training_personal_interventions')
      .select('id,series_id,center_name,activity_title,starts_at,ends_at,location,employment_mode,regulatory_scope,status,hourly_rate_cents,amount_excl_tax_cents,billing_invoice_id')
      .eq('reporting_organization_id', organization.id)
      .eq('user_id', user.id)
      .order('starts_at');

    if (loadError) {
      setError(`Chargement impossible : ${loadError.message}`);
    } else {
      const nextRows = (data ?? []).map((row) => ({
        ...row,
        hourly_rate_cents: row.hourly_rate_cents === null ? null : Number(row.hourly_rate_cents),
        amount_excl_tax_cents: row.amount_excl_tax_cents === null ? null : Number(row.amount_excl_tax_cents)
      })) as PersonalIntervention[];
      setRows(nextRows);
      if (!initializedMonth.current) {
        setSelectedMonth(nearestMonth(nextRows, monthKey(new Date())));
        initializedMonth.current = true;
      }
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id, user?.id, revision]);

  useEffect(() => {
    if (!organization || !user || !supabase) return;
    const client = supabase;
    const channel = client
      .channel(`personal-activity-organizer-${organization.id}-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'training_personal_interventions', filter: `reporting_organization_id=eq.${organization.id}` }, () => void load())
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [organization?.id, user?.id]);

  const monthRows = useMemo(() => rows.filter((row) => monthKey(row.starts_at) === selectedMonth), [rows, selectedMonth]);

  const groupedDays = useMemo(() => {
    const grouped = new Map<string, PersonalIntervention[]>();
    monthRows.forEach((row) => {
      const key = dayKey(row.starts_at);
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    });
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [monthRows]);

  const rowsByDay = useMemo(() => {
    const map = new Map<string, PersonalIntervention[]>();
    monthRows.forEach((row) => {
      const key = dayKey(row.starts_at);
      map.set(key, [...(map.get(key) ?? []), row]);
    });
    return map;
  }, [monthRows]);

  useEffect(() => {
    if (selectedDay && selectedDay.startsWith(`${selectedMonth}-`) && rowsByDay.has(selectedDay)) return;
    const today = dayKey(new Date().toISOString());
    if (today.startsWith(`${selectedMonth}-`) && rowsByDay.has(today)) setSelectedDay(today);
    else setSelectedDay(groupedDays[0]?.[0] ?? `${selectedMonth}-01`);
  }, [selectedMonth, groupedDays, rowsByDay, selectedDay]);

  const completedHours = monthRows.filter((row) => row.status === 'completed').reduce((sum, row) => sum + durationHours(row), 0);
  const billableAmount = monthRows
    .filter((row) => row.employment_mode === 'subcontractor' && row.status === 'completed' && !row.billing_invoice_id)
    .reduce((sum, row) => sum + (row.amount_excl_tax_cents ?? 0), 0);

  async function updateStatus(row: PersonalIntervention, status: InterventionStatus) {
    if (!organization || !user || !supabase || row.billing_invoice_id) return;
    setBusyId(row.id);
    setError('');
    const { error: updateError } = await supabase
      .from('training_personal_interventions')
      .update({ status })
      .eq('id', row.id)
      .eq('reporting_organization_id', organization.id)
      .eq('user_id', user.id);
    if (updateError) setError(`Modification impossible : ${updateError.message}`);
    else {
      await load();
      onChanged?.();
    }
    setBusyId('');
  }

  async function remove(row: PersonalIntervention, wholeSeries = false) {
    if (!organization || !user || !supabase || row.billing_invoice_id) return;
    const label = wholeSeries ? 'toute cette série d’interventions' : 'cette intervention';
    if (!window.confirm(`Supprimer définitivement ${label} ?`)) return;
    setBusyId(row.id);
    setError('');
    let request = supabase
      .from('training_personal_interventions')
      .delete()
      .eq('reporting_organization_id', organization.id)
      .eq('user_id', user.id);
    request = wholeSeries && row.series_id ? request.eq('series_id', row.series_id) : request.eq('id', row.id);
    const { error: deleteError } = await request;
    if (deleteError) setError(`Suppression impossible : ${deleteError.message}`);
    else {
      await load();
      onChanged?.();
    }
    setBusyId('');
  }

  function renderRow(row: PersonalIntervention, compact = false) {
    const hours = durationHours(row);
    const amount = row.amount_excl_tax_cents ?? (row.hourly_rate_cents !== null ? Math.round(hours * row.hourly_rate_cents) : null);
    const billed = Boolean(row.billing_invoice_id);
    return <article className={`activity-month-row${compact ? ' compact' : ''}${billed ? ' billed' : ''}`} key={row.id}>
      <div className="activity-month-row-time">
        <strong>{timeLabel(row.starts_at)}</strong>
        <span>→ {timeLabel(row.ends_at)}</span>
      </div>
      <div className="activity-month-row-main">
        <div className="activity-month-row-title">
          <strong>{row.activity_title}</strong>
          <span className={`activity-month-status ${row.status}`}>{statusLabels[row.status]}</span>
        </div>
        <div className="activity-month-row-center"><Icon name="building" size={15} />{row.center_name}{row.location ? ` · ${row.location}` : ''}</div>
        <div className="activity-month-row-meta">
          <span><Icon name="clock" size={14} />{hours.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h</span>
          <span><Icon name={row.employment_mode === 'subcontractor' ? 'briefcase' : 'calendar'} size={14} />{row.employment_mode === 'subcontractor' ? 'Sous-traitance' : 'Salarié'}</span>
          {amount !== null && <span><Icon name="creditCard" size={14} />{money(amount)}{row.employment_mode === 'subcontractor' ? ' HT' : ''}</span>}
          <span className={`activity-month-bpf ${row.regulatory_scope}`}>{scopeLabels[row.regulatory_scope]}</span>
          {billed && <span className="activity-month-billed"><Icon name="check" size={13} />Facturée</span>}
        </div>
      </div>
      {!compact && <div className="activity-month-row-actions">
        {!billed && row.status === 'planned' && <button type="button" disabled={busyId === row.id} onClick={() => void updateStatus(row, 'completed')}>Terminée</button>}
        {!billed && row.status !== 'canceled' && <button type="button" disabled={busyId === row.id} onClick={() => void updateStatus(row, 'canceled')}>Annuler</button>}
        {!billed && <button className="danger" type="button" disabled={busyId === row.id} onClick={() => void remove(row)}>Supprimer</button>}
        {!billed && row.series_id && <button className="danger subtle" type="button" disabled={busyId === row.id} onClick={() => void remove(row, true)}>Série</button>}
      </div>}
    </article>;
  }

  if (!organization || organization.business_type !== 'formation') return null;

  const [year, monthNumber] = selectedMonth.split('-').map(Number);
  const calendarCells = calendarDays(selectedMonth);
  const weekdayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return <section className="personal-activity-organizer" aria-label="Organisation mensuelle des interventions">
    <div className="activity-organizer-head">
      <div>
        <p className="eyebrow">ORGANISATION MENSUELLE</p>
        <h2>Mes interventions</h2>
        <span>Parcours ton activité mois par mois en liste ou en calendrier.</span>
      </div>
      <div className="activity-view-switch" role="group" aria-label="Mode d’affichage">
        <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><Icon name="menu" size={16} />Liste</button>
        <button type="button" className={viewMode === 'calendar' ? 'active' : ''} onClick={() => setViewMode('calendar')}><Icon name="calendar" size={16} />Calendrier</button>
      </div>
    </div>

    <div className="activity-month-toolbar">
      <button className="activity-month-nav" type="button" onClick={() => setSelectedMonth((month) => shiftMonth(month, -1))} aria-label="Mois précédent">‹</button>
      <label className="activity-month-picker">
        <span>{monthLabel(selectedMonth)}</span>
        <input type="month" value={selectedMonth} onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} aria-label="Choisir le mois" />
      </label>
      <button className="activity-month-nav" type="button" onClick={() => setSelectedMonth((month) => shiftMonth(month, 1))} aria-label="Mois suivant">›</button>
      <button className="activity-current-month" type="button" onClick={() => setSelectedMonth(monthKey(new Date()))}>Ce mois</button>
    </div>

    <div className="activity-month-stats">
      <span><strong>{monthRows.length}</strong> intervention{monthRows.length > 1 ? 's' : ''}</span>
      <span><strong>{completedHours.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h</strong> terminées</span>
      <span><strong>{money(billableAmount)}</strong> HT à facturer</span>
    </div>

    {error && <div className="activity-organizer-error" role="alert">{error}</div>}
    {loading ? <div className="activity-organizer-empty">Chargement des interventions…</div> : monthRows.length === 0 ? <div className="activity-organizer-empty"><Icon name="calendar" size={28} /><strong>Aucune intervention en {monthLabel(selectedMonth).toLocaleLowerCase('fr-FR')}</strong><span>Utilise les flèches pour parcourir les autres mois.</span></div> : viewMode === 'list' ? (
      <div className="activity-month-list">
        {groupedDays.map(([key, dayRows]) => <section className="activity-day-group" key={key}>
          <header><div><strong>{dayLabel(key)}</strong><span>{dayRows.length} intervention{dayRows.length > 1 ? 's' : ''}</span></div><span>{dayRows.reduce((sum, row) => sum + durationHours(row), 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h</span></header>
          <div>{dayRows.map((row) => renderRow(row))}</div>
        </section>)}
      </div>
    ) : (
      <div className="activity-calendar-layout">
        <div className="activity-calendar">
          <div className="activity-calendar-weekdays">{weekdayLabels.map((label) => <span key={label}>{label}</span>)}</div>
          <div className="activity-calendar-grid">
            {calendarCells.map((day, index) => {
              if (day === null) return <span className="activity-calendar-empty-cell" key={`empty-${index}`} />;
              const key = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayRows = rowsByDay.get(key) ?? [];
              const selected = selectedDay === key;
              const today = dayKey(new Date().toISOString()) === key;
              return <button type="button" className={`activity-calendar-day${dayRows.length ? ' has-events' : ''}${selected ? ' selected' : ''}${today ? ' today' : ''}`} key={key} onClick={() => setSelectedDay(key)}>
                <span className="activity-calendar-number">{day}</span>
                {dayRows.length > 0 && <span className="activity-calendar-count">{dayRows.length}</span>}
                <span className="activity-calendar-events">{dayRows.slice(0, 2).map((row) => <span className={`activity-calendar-event ${row.status}`} key={row.id}>{timeLabel(row.starts_at)} · {row.activity_title}</span>)}</span>
              </button>;
            })}
          </div>
        </div>

        <aside className="activity-calendar-day-detail">
          <header><div><small>JOUR SÉLECTIONNÉ</small><strong>{dayLabel(selectedDay)}</strong></div><span>{(rowsByDay.get(selectedDay) ?? []).length}</span></header>
          <div className="activity-calendar-day-rows">
            {(rowsByDay.get(selectedDay) ?? []).length > 0 ? (rowsByDay.get(selectedDay) ?? []).map((row) => renderRow(row)) : <div className="activity-day-empty">Aucune intervention ce jour.</div>}
          </div>
        </aside>
      </div>
    )}
  </section>;
}
