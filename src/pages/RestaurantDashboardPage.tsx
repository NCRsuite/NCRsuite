import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { StatCard } from '../components/StatCard';
import { organizationHasFeature } from '../config/planEntitlements';
import { useOrganization } from '../contexts/OrganizationContext';
import { formatRestaurantDateTime, type RestaurantReservationRecord, type RestaurantShiftRecord, type RestaurantStockItemRecord, type RestaurantTemperatureRecord } from '../features/restaurant/types';
import { supabase } from '../lib/supabase';

export function RestaurantDashboardPage() {
  const { organization } = useOrganization();
  const [reservations, setReservations] = useState<RestaurantReservationRecord[]>([]);
  const [shifts, setShifts] = useState<RestaurantShiftRecord[]>([]);
  const [stock, setStock] = useState<RestaurantStockItemRecord[]>([]);
  const [temperatures, setTemperatures] = useState<RestaurantTemperatureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!organization || !supabase) { setLoading(false); return; }
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 2);
    let active = true;
    async function load() {
      setLoading(true); setError('');
      const [reservationResult, shiftResult] = await Promise.all([
        supabase!.from('restaurant_reservations').select('*,restaurant_tables(name,area)').eq('organization_id', organization!.id).gte('reservation_at', start.toISOString()).lt('reservation_at', end.toISOString()).order('reservation_at'),
        supabase!.from('restaurant_shifts').select('*,restaurant_employees(first_name,last_name,role_code)').eq('organization_id', organization!.id).gte('starts_at', start.toISOString()).lt('starts_at', end.toISOString()).neq('status', 'canceled').order('starts_at')
      ]);
      if (!active) return;
      const firstError = reservationResult.error || shiftResult.error;
      if (firstError) setError(firstError.message);
      setReservations((reservationResult.data ?? []) as RestaurantReservationRecord[]);
      setShifts((shiftResult.data ?? []) as RestaurantShiftRecord[]);
      if (organizationHasFeature(organization!, 'restaurant_basic_stock')) {
        const { data } = await supabase!.from('restaurant_stock_items').select('*').eq('organization_id', organization!.id).eq('status', 'active').order('quantity').limit(30);
        if (active) setStock((data ?? []) as RestaurantStockItemRecord[]);
      }
      if (organizationHasFeature(organization!, 'restaurant_temperatures')) {
        const { data } = await supabase!.from('restaurant_temperature_logs').select('*').eq('organization_id', organization!.id).gte('logged_at', start.toISOString()).order('logged_at', { ascending: false });
        if (active) setTemperatures((data ?? []) as RestaurantTemperatureRecord[]);
      }
      if (active) setLoading(false);
    }
    void load(); return () => { active = false; };
  }, [organization?.id, organization?.plan]);

  if (!organization) return null;
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayReservations = reservations.filter((row) => row.reservation_at.slice(0, 10) === todayKey && !['canceled', 'no_show'].includes(row.status));
  const covers = todayReservations.reduce((total, row) => total + row.party_size, 0);
  const todayShifts = shifts.filter((row) => row.starts_at.slice(0, 10) === todayKey);
  const lowStock = stock.filter((row) => Number(row.quantity) <= Number(row.minimum_quantity));
  const nonCompliant = temperatures.filter((row) => !row.compliant);
  const nextReservations = useMemo(() => todayReservations.filter((row) => new Date(row.reservation_at).getTime() >= Date.now()).slice(0, 6), [todayReservations]);

  return <div className="page restaurant-page restaurant-dashboard-page"><header className="page-header"><div><p className="eyebrow">RESTAURATION</p><h1>Pilotage du restaurant</h1><p>Réservations, équipe, carte, hygiène et stocks en un seul regard.</p></div><div className="header-actions"><Link className="primary-button" to="/reservations?new=1"><Icon name="calendar" size={18}/>Nouvelle réservation</Link></div></header>
    {error && <div className="error-message page-message">{error}</div>}
    <section className="stats-grid"><StatCard label="Réservations aujourd’hui" value={loading ? '…' : String(todayReservations.length)} detail={`${covers} couverts prévus`} icon="calendar"/><StatCard label="Employés planifiés" value={loading ? '…' : String(new Set(todayShifts.map((row) => row.employee_id)).size)} detail={`${todayShifts.length} service${todayShifts.length > 1 ? 's' : ''}`} icon="users"/><StatCard label="Stocks sous seuil" value={loading ? '…' : String(lowStock.length)} detail="produits à commander" icon="briefcase"/><StatCard label="Alertes hygiène" value={organizationHasFeature(organization, 'restaurant_temperatures') ? String(nonCompliant.length) : '—'} detail={organizationHasFeature(organization, 'restaurant_temperatures') ? 'relevés non conformes' : 'offre Essentielle'} icon="alert"/></section>
    <section className="restaurant-dashboard-grid"><article className="panel restaurant-dashboard-main"><div className="panel-header"><div><p className="eyebrow">PROCHAINEMENT</p><h2>Réservations du jour</h2></div><Link className="secondary-button compact-button" to="/reservations">Tout voir</Link></div>{nextReservations.length === 0 ? <div className="restaurant-empty"><Icon name="calendar" size={30}/><strong>Aucune réservation à venir</strong></div> : <div className="restaurant-card-list">{nextReservations.map((row) => <article className="restaurant-record-card" key={row.id}><span className="restaurant-record-icon"><Icon name="utensils" size={20}/></span><div className="restaurant-record-main"><strong>{row.guest_name} · {row.party_size} pers.</strong><span>{formatRestaurantDateTime(row.reservation_at)}{row.restaurant_tables?.name ? ` · ${row.restaurant_tables.name}` : ''}</span><small>{row.guest_phone || row.guest_email || 'Coordonnées non renseignées'}</small></div><span className={`restaurant-status-pill ${row.status}`}>{row.status === 'confirmed' ? 'Confirmée' : row.status === 'seated' ? 'Installée' : row.status === 'completed' ? 'Terminée' : 'En attente'}</span></article>)}</div>}</article>
      <article className="panel"><div className="panel-header"><div><p className="eyebrow">À TRAITER</p><h2>Priorités</h2></div></div><div className="restaurant-priority-list"><Link to="/stocks"><span className="task-dot urgent"/><div><strong>Stocks sous seuil</strong><small>Réapprovisionnement recommandé</small></div><b>{lowStock.length}</b></Link>{organizationHasFeature(organization, 'restaurant_temperatures') ? <Link to="/hygiene"><span className="task-dot"/><div><strong>Non-conformités froid</strong><small>Relevés à corriger</small></div><b>{nonCompliant.length}</b></Link> : <Link to="/abonnement"><span className="task-dot"/><div><strong>Suivi HACCP</strong><small>Disponible en Essentielle</small></div><Icon name="lock" size={16}/></Link>}<Link to="/carte"><span className="task-dot success"/><div><strong>Carte et disponibilités</strong><small>Vérifier les ruptures avant le service</small></div><Icon name="chevronRight" size={16}/></Link></div></article></section>
    {organizationHasFeature(organization, 'restaurant_statistics') ? <section className="panel restaurant-kpi-panel"><div className="panel-header"><div><p className="eyebrow">PERFORMANCE</p><h2>Indicateurs opérationnels</h2></div></div><div className="restaurant-kpi-grid"><div><span>Couverts prévus</span><strong>{covers}</strong></div><div><span>Taux de confirmation</span><strong>{todayReservations.length ? `${Math.round(todayReservations.filter((row) => row.status !== 'pending').length / todayReservations.length * 100)} %` : '—'}</strong></div><div><span>Alertes stocks</span><strong>{lowStock.length}</strong></div><div><span>Conformité températures</span><strong>{temperatures.length ? `${Math.round(temperatures.filter((row) => row.compliant).length / temperatures.length * 100)} %` : '—'}</strong></div></div></section> : <section className="panel restaurant-premium-teaser"><Icon name="lock" size={24}/><div><p className="eyebrow">OFFRE PROFESSIONNELLE</p><h2>Statistiques et rentabilité</h2><p>Suivez les couverts, pertes, coûts matière, marges et performances de la carte.</p></div><Link className="secondary-button" to="/abonnement">Voir l’offre</Link></section>}
  </div>;
}
