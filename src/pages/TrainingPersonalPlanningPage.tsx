import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

type ScheduleSource = 'manual' | 'organization_session' | 'connected_center';
type EmploymentMode = 'salaried' | 'subcontractor';
type RegulatoryScope = 'review_required' | 'professional_continuing' | 'apprenticeship' | 'initial_education' | 'out_of_scope';

interface PersonalScheduleEvent {
  source_kind: ScheduleSource;
  event_id: string;
  organization_id: string;
  organization_name: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  status: string;
  employment_mode: EmploymentMode;
  regulatory_scope: RegulatoryScope;
  source_detail: string;
}

function startOfDay(date: Date) { const copy = new Date(date); copy.setHours(0, 0, 0, 0); return copy; }
function addDays(date: Date, count: number) { const copy = new Date(date); copy.setDate(copy.getDate() + count); return copy; }
function startOfWeek(date: Date) { const copy = startOfDay(date); copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7)); return copy; }
function sameDay(value: string | Date, date: Date) { const source = new Date(value); return source.getFullYear() === date.getFullYear() && source.getMonth() === date.getMonth() && source.getDate() === date.getDate(); }
function dateInputValue(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

function eventClass(event: PersonalScheduleEvent) {
  if (event.status === 'canceled') return 'canceled';
  if (event.status === 'completed') return 'completed';
  if (event.source_kind === 'organization_session') return 'scheduled';
  if (event.source_kind === 'connected_center') return 'in_progress';
  return event.employment_mode === 'subcontractor' ? 'draft' : 'scheduled';
}

function sourceLabel(event: PersonalScheduleEvent) {
  if (event.source_kind === 'organization_session') return `${event.organization_name} · session NCR`;
  if (event.source_kind === 'connected_center') return `${event.organization_name} · centre connecté`;
  return event.employment_mode === 'salaried' ? `${event.organization_name} · activité salariée` : `${event.organization_name} · sous-traitance`;
}

function bpfLabel(event: PersonalScheduleEvent) {
  if (event.employment_mode === 'salaried') return 'Hors BPF de votre organisme';
  if (['professional_continuing', 'apprenticeship'].includes(event.regulatory_scope)) {
    return event.status === 'completed' ? 'Éligible à la consolidation BPF' : 'BPF après réalisation de l’intervention';
  }
  if (event.regulatory_scope === 'review_required') return 'Nature BPF à qualifier';
  return 'Hors champ BPF';
}

export function TrainingPersonalPlanningPage() {
  const { organization } = useOrganization();
  const [calendarDate, setCalendarDate] = useState(startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [events, setEvents] = useState<PersonalScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const monthStart = useMemo(() => new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1), [calendarDate]);
  const gridStart = useMemo(() => startOfWeek(monthStart), [monthStart]);
  const calendarDays = useMemo(() => Array.from({ length: 42 }, (_, index) => addDays(gridStart, index)), [gridStart]);
  const gridEnd = useMemo(() => addDays(gridStart, 41), [gridStart]);

  async function load() {
    if (!organization || !supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('training_personal_schedule', {
      p_reporting_organization_id: organization.id,
      p_start: dateInputValue(gridStart),
      p_end: dateInputValue(gridEnd)
    });
    if (rpcError) setError(`Planning impossible à charger : ${rpcError.message}`);
    else setEvents(((data ?? []) as PersonalScheduleEvent[]).sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id, dateInputValue(gridStart), dateInputValue(gridEnd)]);

  const selectedEvents = useMemo(() => events.filter((event) => sameDay(event.starts_at, selectedDate)).sort((a, b) => a.starts_at.localeCompare(b.starts_at)), [events, selectedDate]);
  const monthEvents = useMemo(() => events.filter((event) => new Date(event.starts_at).getMonth() === calendarDate.getMonth() && new Date(event.starts_at).getFullYear() === calendarDate.getFullYear() && event.status !== 'canceled'), [events, calendarDate]);
  const monthHours = useMemo(() => monthEvents.reduce((total, event) => total + Math.max(0, (new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 3_600_000), 0), [monthEvents]);
  const externalHours = useMemo(() => monthEvents.filter((event) => event.source_kind !== 'organization_session').reduce((total, event) => total + Math.max(0, (new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 3_600_000), 0), [monthEvents]);
  const upcoming = useMemo(() => events.filter((event) => event.status !== 'canceled' && new Date(event.ends_at).getTime() >= Date.now()).sort((a, b) => a.starts_at.localeCompare(b.starts_at)).slice(0, 5), [events]);

  if (!organization || organization.business_type !== 'formation') return null;

  return (
    <div className="page training-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">PLANNING PERSONNEL CONSOLIDÉ</p>
          <h1>Mon planning</h1>
          <p>Retrouve au même endroit tes sessions {organization.public_name || organization.name}, tes interventions saisies manuellement et les sessions reçues de centres utilisant NCR Suite.</p>
        </div>
        <Link className="primary-button" to="/mon-activite"><Icon name="plus" size={18} />Ajouter une intervention</Link>
      </header>

      <div className="training-kpi-grid">
        <article className="panel"><span className="training-record-icon"><Icon name="calendar" size={20} /></span><div><small>Activités ce mois</small><strong>{monthEvents.length}</strong></div></article>
        <article className="panel"><span className="training-record-icon"><Icon name="activity" size={20} /></span><div><small>Heures totales</small><strong>{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(monthHours)} h</strong></div></article>
        <article className="panel"><span className="training-record-icon"><Icon name="briefcase" size={20} /></span><div><small>Heures externes</small><strong>{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(externalHours)} h</strong></div></article>
      </div>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      <div className="training-portal-notice warning"><Icon name="alert" size={18} /><span>Les sessions de ton propre organisme apparaissent lorsqu’elles te sont affectées via une fiche Formateur utilisant la même adresse e-mail que ton compte. Ce n’est pas un deuxième compte ni un deuxième accès.</span></div>

      <div className="training-calendar-workspace">
        <div className="training-calendar-main">
          <div className="training-calendar-navigation">
            <button type="button" className="icon-nav-button" onClick={() => { const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1); setCalendarDate(date); setSelectedDate(date); }}>‹</button>
            <button type="button" className="secondary-button compact-button" onClick={() => { const today = startOfDay(new Date()); setCalendarDate(today); setSelectedDate(today); }}>Aujourd’hui</button>
            <button type="button" className="icon-nav-button" onClick={() => { const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1); setCalendarDate(date); setSelectedDate(date); }}>›</button>
            <div><p className="eyebrow">MOIS</p><h3>{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(calendarDate)}</h3></div>
          </div>

          {loading ? <div className="training-empty">Chargement du planning…</div> : (
            <div className="planning-month-calendar training-month-calendar">
              <div className="planning-month-weekdays">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label) => <span key={label}>{label}</span>)}</div>
              <div className="planning-month-grid">
                {calendarDays.map((day) => {
                  const dayEvents = events.filter((event) => event.status !== 'canceled' && sameDay(event.starts_at, day));
                  return <button type="button" key={dateInputValue(day)} className={`${day.getMonth() !== calendarDate.getMonth() ? 'outside' : ''}${sameDay(day, new Date()) ? ' today' : ''}${sameDay(day, selectedDate) ? ' selected' : ''}`} onClick={() => setSelectedDate(day)}>
                    <span>{day.getDate()}</span>
                    <strong>{dayEvents.length || ''}</strong>
                    <div className="training-calendar-dots">{dayEvents.slice(0, 4).map((event) => <i key={event.event_id} className={eventClass(event)} />)}</div>
                    {dayEvents.slice(0, 2).map((event) => <small key={event.event_id}>{event.title}</small>)}
                  </button>;
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="training-calendar-agenda">
          <div><p className="eyebrow">JOUR SÉLECTIONNÉ</p><h3>{new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }).format(selectedDate)}</h3></div>
          {selectedEvents.length === 0 ? <div className="planning-empty-state compact"><Icon name="calendar" size={25} /><strong>Aucune activité</strong><span>Cette journée est disponible.</span></div> : selectedEvents.map((event) => (
            <article key={`${event.source_kind}-${event.event_id}`} className={`training-agenda-card ${eventClass(event)}`}>
              <div><strong>{new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.starts_at))}</strong><span>{new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(event.ends_at))}</span></div>
              <section><strong>{event.title}</strong><span>{sourceLabel(event)}</span><small>{event.location || 'Lieu non renseigné'} · {bpfLabel(event)}</small></section>
              {event.source_kind === 'manual' && <Link className="secondary-button compact-button" to="/mon-activite">Gérer</Link>}
              {event.source_kind === 'organization_session' && <Link className="secondary-button compact-button" to={`/dossiers-formation?focus=${encodeURIComponent(event.event_id)}`}>Dossier</Link>}
            </article>
          ))}

          <div className="training-upcoming-strip">
            <p className="eyebrow">À VENIR</p>
            {upcoming.length === 0 ? <span>Aucune activité à venir.</span> : upcoming.map((event) => <button type="button" key={`${event.source_kind}-${event.event_id}`} onClick={() => { const date = new Date(event.starts_at); setCalendarDate(date); setSelectedDate(date); }}><span>{new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(event.starts_at))}</span><strong>{event.title}</strong></button>)}
          </div>
        </aside>
      </div>

      <section className="panel training-list-panel">
        <div className="panel-header"><div><p className="eyebrow">LÉGENDE</p><h2>Une seule vue, trois sources</h2></div></div>
        <div className="module-checks"><span>✓ Sessions de {organization.public_name || organization.name}</span><span>✓ Centres NCR Suite connectés</span><span>✓ Interventions externes manuelles</span><span>✓ Distinction automatique BPF / hors BPF</span></div>
      </section>
    </div>
  );
}
