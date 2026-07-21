import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import type { RestaurantOrderItemRecord, RestaurantOrderRecord, RestaurantOrderStation } from '../features/restaurant/types';
import { supabase } from '../lib/supabase';

const stationLabels: Record<RestaurantOrderStation | 'all', string> = { all: 'Tous', kitchen: 'Cuisine', bar: 'Bar', cold: 'Froid', hot: 'Chaud', dessert: 'Desserts' };

const stationIcons: Record<RestaurantOrderStation | 'all', string> = { all: '🍽️', kitchen: '🔥', bar: '🥂', cold: '🥗', hot: '♨️', dessert: '🍰' };

function elapsedLabel(dateValue: string | null) {
  if (!dateValue) return 'À l’instant';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(dateValue).getTime()) / 60000));
  if (minutes < 1) return 'À l’instant';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

export function RestaurantKitchenPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const [orders, setOrders] = useState<RestaurantOrderRecord[]>([]);
  const [items, setItems] = useState<RestaurantOrderItemRecord[]>([]);
  const [station, setStation] = useState<RestaurantOrderStation | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAdvanced = Boolean(organization && organizationHasFeature(organization, 'restaurant_advanced_ordering'));

  async function load() {
    if (!organization) return;
    setError('');
    try {
      if (demoMode || !supabase) {
        const demoOrders = JSON.parse(localStorage.getItem(`ncr-restaurant-orders-${organization.id}`) || '[]') as RestaurantOrderRecord[];
        const demoItems = JSON.parse(localStorage.getItem(`ncr-restaurant-order-items-${organization.id}`) || '[]') as RestaurantOrderItemRecord[];
        setOrders(demoOrders.filter((row) => !['closed','canceled'].includes(row.status)));
        setItems(demoItems.filter((row) => ['sent','in_progress','ready'].includes(row.status)));
      } else {
        const orderResult = await supabase.from('restaurant_orders').select('*,restaurant_tables(name,area)').eq('organization_id', organization.id).not('status', 'in', '(closed,canceled)').order('opened_at');
        if (orderResult.error) throw orderResult.error;
        const loaded = (orderResult.data ?? []) as RestaurantOrderRecord[];
        const ids = loaded.map((row) => row.id);
        const itemResult = ids.length ? await supabase.from('restaurant_order_items').select('*').eq('organization_id', organization.id).in('order_id', ids).in('status', ['sent','in_progress','ready']).order('sent_at') : { data: [], error: null };
        if (itemResult.error) throw itemResult.error;
        setOrders(loaded); setItems((itemResult.data ?? []) as RestaurantOrderItemRecord[]);
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Chargement cuisine impossible.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 15000); return () => window.clearInterval(timer); }, [organization?.id, demoMode]);

  const visible = useMemo(() => items.filter((item) => station === 'all' || item.station === station), [items, station]);
  const grouped = useMemo(() => orders.map((order) => ({ order, items: visible.filter((item) => item.order_id === order.id) })).filter((group) => group.items.length), [orders, visible]);
  const kitchenStats = useMemo(() => ({
    sent: visible.filter((item) => item.status === 'sent').length,
    inProgress: visible.filter((item) => item.status === 'in_progress').length,
    ready: visible.filter((item) => item.status === 'ready').length,
  }), [visible]);

  async function changeStatus(item: RestaurantOrderItemRecord, status: 'in_progress' | 'ready' | 'served') {
    if (!organization) return;
    try {
      if (demoMode || !supabase) {
        const all = JSON.parse(localStorage.getItem(`ncr-restaurant-order-items-${organization.id}`) || '[]') as RestaurantOrderItemRecord[];
        const next = all.map((row) => row.id === item.id ? { ...row, status } : row);
        localStorage.setItem(`ncr-restaurant-order-items-${organization.id}`, JSON.stringify(next));
        setItems(next.filter((row) => ['sent','in_progress','ready'].includes(row.status)));
      } else {
        const { error: rpcError } = await supabase.rpc('set_restaurant_order_item_status', { p_item_id: item.id, p_status: status });
        if (rpcError) throw rpcError;
        await load();
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Mise à jour impossible.'); }
  }

  return <div className="page restaurant-page restaurant-kitchen-page restaurant-premium-workspace">
    <header className="page-header restaurant-kitchen-header"><div><p className="eyebrow">RESTAURATION · CUISINE</p><h1>Écran de préparation</h1><p>Des tickets clairs, les remarques visibles et un suivi immédiat de chaque assiette jusqu’au service.</p></div><button type="button" className="secondary-button restaurant-kitchen-refresh" onClick={() => void load()}><Icon name="activity" size={17}/>Actualiser</button></header>
    {error && <div className="error-banner">{error}</div>}

    <section className="restaurant-kitchen-summary">
      <article><span className="restaurant-kitchen-summary-icon waiting">⏱️</span><div><small>À préparer</small><strong>{kitchenStats.sent}</strong></div></article>
      <article><span className="restaurant-kitchen-summary-icon cooking">🔥</span><div><small>En préparation</small><strong>{kitchenStats.inProgress}</strong></div></article>
      <article><span className="restaurant-kitchen-summary-icon ready">✓</span><div><small>Prêts à servir</small><strong>{kitchenStats.ready}</strong></div></article>
      <article><span className="restaurant-kitchen-summary-icon tickets">🎫</span><div><small>Tickets actifs</small><strong>{grouped.length}</strong></div></article>
    </section>

    <div className="restaurant-kitchen-toolbar"><div className="restaurant-kitchen-filters">{(Object.keys(stationLabels) as Array<RestaurantOrderStation | 'all'>).map((value) => <button type="button" key={value} disabled={!isAdvanced && !['all','kitchen','bar'].includes(value)} className={station === value ? 'active' : ''} onClick={() => setStation(value)}><span>{stationIcons[value]}</span>{stationLabels[value]}{!isAdvanced && ['cold','hot','dessert'].includes(value) && <Icon name="lock" size={13}/>}</button>)}</div><span className="restaurant-kitchen-auto-refresh">Actualisation automatique toutes les 15 secondes</span></div>

    {loading ? <div className="panel restaurant-empty">Chargement…</div> : grouped.length === 0 ? <div className="panel restaurant-empty restaurant-kitchen-empty"><span className="restaurant-empty-illustration">👨‍🍳</span><strong>Aucune préparation en attente</strong><span>La cuisine est à jour.</span></div> : <section className="restaurant-kitchen-grid">{grouped.map(({ order, items: orderItems }) => {
      const oldestSentAt = orderItems.map((item) => item.sent_at || item.created_at).sort()[0] || order.opened_at;
      const hasReady = orderItems.some((item) => item.status === 'ready');
      const allInProgress = orderItems.every((item) => item.status === 'in_progress');
      const ticketStatus = hasReady ? 'ready' : allInProgress ? 'in_progress' : 'sent';
      return <article className={`panel restaurant-kitchen-ticket ${ticketStatus}`} key={order.id}><header><div className="restaurant-kitchen-ticket-identity"><span className="restaurant-kitchen-ticket-number">#{order.order_number}</span><div><p className="eyebrow">COMMANDE</p><h2>{order.restaurant_tables?.name || 'Commande libre'}</h2></div></div><div className="restaurant-kitchen-ticket-time"><strong>{elapsedLabel(oldestSentAt)}</strong><span>{new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(order.opened_at))}</span></div></header><div className="restaurant-kitchen-ticket-progress"><span className={ticketStatus}/></div><div className="restaurant-kitchen-items">{orderItems.map((item) => <div key={item.id} className={`restaurant-kitchen-item ${item.status}`}><div className="restaurant-kitchen-item-copy"><div className="restaurant-kitchen-item-title"><span className="restaurant-kitchen-quantity">{item.quantity}×</span><strong>{item.item_name}</strong></div>{item.notes && <p><span>!</span>{item.notes}</p>}<small><span>{stationIcons[item.station]}</span>{stationLabels[item.station]} · {item.status === 'sent' ? 'À préparer' : item.status === 'in_progress' ? 'En préparation' : 'Prêt à servir'}</small></div><div className="restaurant-kitchen-item-action">{item.status === 'sent' && <button type="button" className="restaurant-kitchen-action start" onClick={() => void changeStatus(item, 'in_progress')}>Commencer</button>}{item.status === 'in_progress' && <button type="button" className="restaurant-kitchen-action ready" onClick={() => void changeStatus(item, 'ready')}>Marquer prêt</button>}{item.status === 'ready' && <button type="button" className="restaurant-kitchen-action serve" onClick={() => void changeStatus(item, 'served')}>Servi ✓</button>}</div></div>)}</div></article>;
    })}</section>}
  </div>;
}
