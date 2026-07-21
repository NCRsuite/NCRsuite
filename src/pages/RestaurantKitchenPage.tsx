import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import type { RestaurantOrderItemRecord, RestaurantOrderRecord, RestaurantOrderStation } from '../features/restaurant/types';
import { supabase } from '../lib/supabase';

const stationLabels: Record<RestaurantOrderStation | 'all', string> = { all: 'Tous', kitchen: 'Cuisine', bar: 'Bar', cold: 'Froid', hot: 'Chaud', dessert: 'Desserts' };

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

  return <div className="page restaurant-page restaurant-kitchen-page">
    <header className="page-header"><div><p className="eyebrow">RESTAURATION · CUISINE</p><h1>Écran de préparation</h1><p>Les commandes envoyées par les serveurs apparaissent ici automatiquement.</p></div><button type="button" className="secondary-button" onClick={() => void load()}><Icon name="activity" size={17}/>Actualiser</button></header>
    {error && <div className="error-banner">{error}</div>}
    <div className="restaurant-kitchen-filters">{(Object.keys(stationLabels) as Array<RestaurantOrderStation | 'all'>).map((value) => <button type="button" key={value} disabled={!isAdvanced && !['all','kitchen','bar'].includes(value)} className={station === value ? 'active' : ''} onClick={() => setStation(value)}>{stationLabels[value]}{!isAdvanced && ['cold','hot','dessert'].includes(value) && <Icon name="lock" size={13}/>}</button>)}</div>
    {loading ? <div className="panel restaurant-empty">Chargement…</div> : grouped.length === 0 ? <div className="panel restaurant-empty"><Icon name="check" size={34}/><strong>Aucune préparation en attente</strong></div> : <section className="restaurant-kitchen-grid">{grouped.map(({ order, items: orderItems }) => <article className="panel restaurant-kitchen-ticket" key={order.id}><header><div><p className="eyebrow">COMMANDE N°{order.order_number}</p><h2>{order.restaurant_tables?.name || 'Commande libre'}</h2></div><span>{new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(order.opened_at))}</span></header><div className="restaurant-kitchen-items">{orderItems.map((item) => <div key={item.id} className={`restaurant-kitchen-item ${item.status}`}><div><strong>{item.quantity} × {item.item_name}</strong>{item.notes && <p>{item.notes}</p>}<small>{stationLabels[item.station]} · {item.status === 'sent' ? 'À préparer' : item.status === 'in_progress' ? 'En préparation' : 'Prêt'}</small></div><div>{item.status === 'sent' && <button type="button" className="secondary-button compact-button" onClick={() => void changeStatus(item, 'in_progress')}>Commencer</button>}{item.status === 'in_progress' && <button type="button" className="primary-button compact-button" onClick={() => void changeStatus(item, 'ready')}>Prêt</button>}{item.status === 'ready' && <button type="button" className="primary-button compact-button" onClick={() => void changeStatus(item, 'served')}>Servi</button>}</div></div>)}</div></article>)}</section>}
  </div>;
}
