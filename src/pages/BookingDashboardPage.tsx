import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

interface AppointmentSummary {
  starts_at: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  amount_cents: number | null;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function BookingDashboardPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    let active = true;
    async function load() {
      setLoading(true);
      const weekStart = startOfWeek(new Date());
      const weekEnd = addDays(weekStart, 7);
      if (demoMode || !supabase) {
        const rawAppointments = localStorage.getItem(`ncr-suite-demo-appointments-${organizationId}`);
        const rawClients = localStorage.getItem(`ncr-suite-demo-clients-${organizationId}`);
        if (active) {
          setAppointments(rawAppointments ? JSON.parse(rawAppointments) as AppointmentSummary[] : []);
          setClientCount(rawClients ? (JSON.parse(rawClients) as unknown[]).length : 0);
          setLoading(false);
        }
        return;
      }
      const [appointmentsResult, clientsResult] = await Promise.all([
        supabase.from('appointments').select('starts_at,status,amount_cents').eq('organization_id', organizationId).gte('starts_at', weekStart.toISOString()).lt('starts_at', weekEnd.toISOString()),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active')
      ]);
      if (!active) return;
      if (!appointmentsResult.error) setAppointments((appointmentsResult.data ?? []) as AppointmentSummary[]);
      if (!clientsResult.error) setClientCount(clientsResult.count ?? 0);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [organization, demoMode]);

  const today = new Date();
  const todayCount = appointments.filter((row) => row.status !== 'cancelled' && sameDay(new Date(row.starts_at), today)).length;
  const activeAppointments = appointments.filter((row) => row.status !== 'cancelled');
  const pendingCount = appointments.filter((row) => row.status === 'pending').length;
  const forecast = activeAppointments.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
  const dayCounts = useMemo(() => {
    const weekStart = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, index) => activeAppointments.filter((row) => sameDay(new Date(row.starts_at), addDays(weekStart, index))).length);
  }, [appointments]);
  const maxCount = Math.max(...dayCounts, 1);

  if (!organization) return null;

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div><p className="eyebrow">COIFFURE & BEAUTÉ</p><h1>Bonjour, bienvenue sur {organization.name}.</h1><p>Votre activité réelle, mise à jour depuis Supabase.</p></div>
        <div className="header-actions">
          <Link className="primary-button" to="/rendez-vous?new=1"><Icon name="calendar" size={18} />Nouveau rendez-vous</Link>
          <Link className="secondary-button" to="/clients?new=1"><Icon name="users" size={18} />Créer un client</Link>
        </div>
      </header>

      <section className="stats-grid">
        <StatCard label="Rendez-vous aujourd’hui" value={loading ? '—' : String(todayCount)} detail="hors annulations" icon="calendar" />
        <StatCard label="Rendez-vous cette semaine" value={loading ? '—' : String(activeAppointments.length)} detail="planning actuel" icon="activity" />
        <StatCard label="Clients actifs" value={loading ? '—' : String(clientCount)} detail="dans votre fichier client" icon="users" />
        <StatCard label="Chiffre prévisionnel" value={loading ? '—' : currencyFormatter.format(forecast / 100)} detail="cette semaine" icon="chart" />
      </section>

      <section className="dashboard-grid">
        <article className="panel large-panel">
          <div className="panel-header"><div><p className="eyebrow">ACTIVITÉ RÉELLE</p><h2>Rendez-vous de la semaine</h2></div><Link className="secondary-button" to="/rendez-vous">Voir le planning</Link></div>
          <div className="chart-placeholder" aria-label="Nombre de rendez-vous par jour">
            {dayCounts.map((count, index) => <span key={index} title={`${count} rendez-vous`} style={{ height: `${Math.max(8, (count / maxCount) * 100)}%` }} />)}
          </div>
          <div className="chart-labels"><span>Lun.</span><span>Mar.</span><span>Mer.</span><span>Jeu.</span><span>Ven.</span><span>Sam.</span><span>Dim.</span></div>
        </article>
        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">À TRAITER</p><h2>Priorités</h2></div></div>
          <div className="task-list">
            <div><span className="task-dot urgent"/><div><strong>Rendez-vous à confirmer</strong><small>Demandes en attente</small></div><b>{pendingCount}</b></div>
            <div><span className="task-dot"/><div><strong>Rendez-vous aujourd’hui</strong><small>À préparer</small></div><b>{todayCount}</b></div>
            <div><span className="task-dot success"/><div><strong>Rendez-vous planifiés</strong><small>Cette semaine</small></div><b>{activeAppointments.length}</b></div>
          </div>
        </article>
      </section>

      <section className="panel onboarding-note">
        <div className="note-icon"><Icon name="calendar" size={26} /></div>
        <div><p className="eyebrow">PACK MÉTIER ACTIF</p><h2>Coiffure & beauté</h2><p>Les clients, prestations, collaborateurs et rendez-vous sont maintenant reliés. La prochaine évolution ouvrira la réservation publique selon les créneaux disponibles.</p></div>
      </section>
    </div>
  );
}
