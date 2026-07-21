import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatRestaurantMoney,
  type RestaurantMenuCategoryRecord,
  type RestaurantMenuItemRecord,
  type RestaurantOrderCourse,
  type RestaurantOrderItemRecord,
  type RestaurantOrderRecord,
  type RestaurantTableRecord,
} from '../features/restaurant/types';
import { supabase } from '../lib/supabase';

const courseLabels: Record<RestaurantOrderCourse, string> = {
  drink: 'Boisson', starter: 'Entrée', main: 'Plat', dessert: 'Dessert', other: 'Autre'
};

function inferCourse(categoryName = ''): RestaurantOrderCourse {
  const value = categoryName.toLowerCase();
  if (value.includes('boisson') || value.includes('vin') || value.includes('cocktail')) return 'drink';
  if (value.includes('entrée') || value.includes('entree')) return 'starter';
  if (value.includes('dessert') || value.includes('glace')) return 'dessert';
  return 'main';
}

function stationFor(course: RestaurantOrderCourse) {
  if (course === 'drink') return 'bar';
  if (course === 'dessert') return 'dessert';
  if (course === 'starter') return 'cold';
  return 'kitchen';
}

const courseVisuals: Record<RestaurantOrderCourse, { icon: string; label: string }> = {
  drink: { icon: '🥂', label: 'Boissons' },
  starter: { icon: '🥗', label: 'Entrées' },
  main: { icon: '🍽️', label: 'Plats' },
  dessert: { icon: '🍰', label: 'Desserts' },
  other: { icon: '✨', label: 'Autres' },
};

function menuItemCourse(menuItem: RestaurantMenuItemRecord, categories: RestaurantMenuCategoryRecord[]) {
  const categoryName = menuItem.restaurant_menu_categories?.name ?? categories.find((row) => row.id === menuItem.category_id)?.name ?? '';
  return inferCourse(categoryName);
}

export function RestaurantOrdersPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<RestaurantMenuCategoryRecord[]>([]);
  const [menuItems, setMenuItems] = useState<RestaurantMenuItemRecord[]>([]);
  const [tables, setTables] = useState<RestaurantTableRecord[]>([]);
  const [orders, setOrders] = useState<RestaurantOrderRecord[]>([]);
  const [items, setItems] = useState<RestaurantOrderItemRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedTableId, setSelectedTableId] = useState(searchParams.get('table') || '');
  const [categoryId, setCategoryId] = useState('all');
  const [guestCount, setGuestCount] = useState('2');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hasKitchen = Boolean(organization && organizationHasFeature(organization, 'restaurant_kitchen_display'));
  const canClose = ['owner', 'admin', 'manager'].includes(organization?.role ?? '');
  const storageKey = `ncr-restaurant-orders-${organization?.id ?? 'none'}`;
  const itemStorageKey = `ncr-restaurant-order-items-${organization?.id ?? 'none'}`;

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const selectedItems = items.filter((item) => item.order_id === selectedOrderId && item.status !== 'canceled');
  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;
  const activeOrderByTable = useMemo(() => new Map(orders.filter((order) => order.table_id).map((order) => [order.table_id as string, order])), [orders]);

  const visibleMenuItems = useMemo(() => menuItems.filter((item) => {
    if (!item.available) return false;
    if (categoryId !== 'all' && item.category_id !== categoryId) return false;
    const haystack = `${item.name} ${item.description_fr ?? ''}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [menuItems, categoryId, query]);

  async function load(preferredOrderId?: string) {
    if (!organization) return;
    setLoading(true);
    setError('');
    try {
      if (demoMode || !supabase) {
        const demoCategories = JSON.parse(localStorage.getItem(`ncr-restaurant-categories-${organization.id}`) || '[]');
        const demoMenu = JSON.parse(localStorage.getItem(`ncr-restaurant-menu-${organization.id}`) || '[]');
        const demoTables = JSON.parse(localStorage.getItem(`ncr-restaurant-tables-${organization.id}`) || '[]');
        const demoOrders = JSON.parse(localStorage.getItem(storageKey) || '[]') as RestaurantOrderRecord[];
        const demoItems = JSON.parse(localStorage.getItem(itemStorageKey) || '[]') as RestaurantOrderItemRecord[];
        setCategories(demoCategories);
        setMenuItems(demoMenu);
        setTables(demoTables);
        setOrders(demoOrders.filter((row) => !['closed', 'canceled'].includes(row.status)));
        setItems(demoItems);
        const next = preferredOrderId || selectedOrderId || demoOrders.find((row) => !['closed', 'canceled'].includes(row.status))?.id || '';
        setSelectedOrderId(next);
      } else {
        const [categoryResult, menuResult, tableResult, orderResult] = await Promise.all([
          supabase.from('restaurant_menu_categories').select('*').eq('organization_id', organization.id).eq('active', true).order('position'),
          supabase.from('restaurant_menu_items').select('*,restaurant_menu_categories(name)').eq('organization_id', organization.id).eq('available', true).order('name'),
          supabase.from('restaurant_tables').select('*').eq('organization_id', organization.id).eq('active', true).order('name'),
          supabase.from('restaurant_orders').select('*,restaurant_tables(name,area),restaurant_reservations(guest_name,party_size)').eq('organization_id', organization.id).not('status', 'in', '(closed,canceled)').order('opened_at', { ascending: false })
        ]);
        const firstError = categoryResult.error || menuResult.error || tableResult.error || orderResult.error;
        if (firstError) throw firstError;
        const loadedOrders = (orderResult.data ?? []) as RestaurantOrderRecord[];
        const orderIds = loadedOrders.map((row) => row.id);
        const itemResult = orderIds.length
          ? await supabase.from('restaurant_order_items').select('*').eq('organization_id', organization.id).in('order_id', orderIds).order('created_at')
          : { data: [], error: null };
        if (itemResult.error) throw itemResult.error;
        setCategories((categoryResult.data ?? []) as RestaurantMenuCategoryRecord[]);
        setMenuItems((menuResult.data ?? []) as RestaurantMenuItemRecord[]);
        setTables((tableResult.data ?? []) as RestaurantTableRecord[]);
        setOrders(loadedOrders);
        setItems((itemResult.data ?? []) as RestaurantOrderItemRecord[]);
        const next = preferredOrderId || selectedOrderId || loadedOrders.find((row) => row.table_id === selectedTableId)?.id || loadedOrders[0]?.id || '';
        setSelectedOrderId(next);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Chargement des commandes impossible.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [organization?.id, demoMode]);

  useEffect(() => {
    const tableId = searchParams.get('table');
    if (!tableId || !orders.length) return;
    setSelectedTableId(tableId);
    const active = activeOrderByTable.get(tableId);
    if (active) setSelectedOrderId(active.id);
  }, [orders, searchParams]);

  function saveDemo(nextOrders: RestaurantOrderRecord[], nextItems: RestaurantOrderItemRecord[]) {
    localStorage.setItem(storageKey, JSON.stringify(nextOrders));
    localStorage.setItem(itemStorageKey, JSON.stringify(nextItems));
  }

  async function openOrder(tableId = selectedTableId) {
    if (!organization || !user) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const existing = tableId ? activeOrderByTable.get(tableId) : null;
      if (existing) { setSelectedOrderId(existing.id); return; }
      let id: string;
      if (demoMode || !supabase) {
        id = crypto.randomUUID();
        const table = tables.find((row) => row.id === tableId);
        const order: RestaurantOrderRecord = {
          id, organization_id: organization.id, table_id: tableId || null, reservation_id: null,
          order_number: Math.max(0, ...orders.map((row) => Number(row.order_number) || 0)) + 1,
          status: 'draft', guest_count: Math.max(1, Number(guestCount) || 1), notes: null,
          subtotal_cents: 0, total_cents: 0, opened_at: new Date().toISOString(), bill_requested_at: null, closed_at: null,
          restaurant_tables: table ? { name: table.name, area: table.area } : null
        };
        const nextOrders = [order, ...orders];
        setOrders(nextOrders); saveDemo(nextOrders, items);
      } else {
        const { data, error: rpcError } = await supabase.rpc('open_restaurant_order', {
          p_organization_id: organization.id,
          p_table_id: tableId || null,
          p_guest_count: Math.max(1, Number(guestCount) || 1),
          p_reservation_id: null
        });
        if (rpcError) throw rpcError;
        id = String(data);
      }
      setSelectedOrderId(id);
      if (tableId) setSearchParams({ table: tableId });
      await load(id);
      setSuccess('La note est ouverte. Appuie sur les produits pour les ajouter.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ouverture de la note impossible.');
    } finally { setSaving(false); }
  }

  async function addMenuItem(menuItem: RestaurantMenuItemRecord) {
    if (!organization || !user || !selectedOrder) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const categoryName = menuItem.restaurant_menu_categories?.name ?? categories.find((row) => row.id === menuItem.category_id)?.name ?? '';
      const course = inferCourse(categoryName);
      const existing = selectedItems.find((row) => row.menu_item_id === menuItem.id && row.status === 'draft' && !row.notes);
      if (demoMode || !supabase) {
        let nextItems: RestaurantOrderItemRecord[];
        if (existing) {
          nextItems = items.map((row) => row.id === existing.id ? { ...row, quantity: row.quantity + 1 } : row);
        } else {
          nextItems = [...items, {
            id: crypto.randomUUID(), organization_id: organization.id, order_id: selectedOrder.id, menu_item_id: menuItem.id,
            item_name: menuItem.name, unit_price_cents: menuItem.price_cents, quantity: 1, course, station: stationFor(course),
            notes: null, status: 'draft', sent_at: null, started_at: null, ready_at: null, served_at: null, created_at: new Date().toISOString()
          }];
        }
        const total = nextItems.filter((row) => row.order_id === selectedOrder.id && row.status !== 'canceled').reduce((sum, row) => sum + row.unit_price_cents * row.quantity, 0);
        const nextOrders = orders.map((row) => row.id === selectedOrder.id ? { ...row, subtotal_cents: total, total_cents: total } : row);
        setItems(nextItems); setOrders(nextOrders); saveDemo(nextOrders, nextItems);
      } else if (existing) {
        const { error: updateError } = await supabase.from('restaurant_order_items').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
        if (updateError) throw updateError;
        await load(selectedOrder.id);
      } else {
        const { error: insertError } = await supabase.from('restaurant_order_items').insert({
          organization_id: organization.id, order_id: selectedOrder.id, menu_item_id: menuItem.id,
          item_name: menuItem.name, unit_price_cents: menuItem.price_cents, quantity: 1,
          course, station: stationFor(course), created_by: user.id
        });
        if (insertError) throw insertError;
        await load(selectedOrder.id);
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Ajout impossible.'); }
    finally { setSaving(false); }
  }

  async function updateItem(item: RestaurantOrderItemRecord, updates: Partial<RestaurantOrderItemRecord>) {
    if (!selectedOrder) return;
    setError('');
    try {
      if (demoMode || !supabase) {
        const nextItems = items.map((row) => row.id === item.id ? { ...row, ...updates } : row);
        const total = nextItems.filter((row) => row.order_id === selectedOrder.id && row.status !== 'canceled').reduce((sum, row) => sum + row.unit_price_cents * row.quantity, 0);
        const nextOrders = orders.map((row) => row.id === selectedOrder.id ? { ...row, subtotal_cents: total, total_cents: total } : row);
        setItems(nextItems); setOrders(nextOrders); saveDemo(nextOrders, nextItems);
      } else {
        const { error: updateError } = await supabase.from('restaurant_order_items').update(updates).eq('id', item.id);
        if (updateError) throw updateError;
        await load(selectedOrder.id);
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Modification impossible.'); }
  }

  async function removeDraftItem(item: RestaurantOrderItemRecord) {
    if (!selectedOrder || item.status !== 'draft') return;
    if (demoMode || !supabase) {
      const nextItems = items.filter((row) => row.id !== item.id);
      const total = nextItems.filter((row) => row.order_id === selectedOrder.id && row.status !== 'canceled').reduce((sum, row) => sum + row.unit_price_cents * row.quantity, 0);
      const nextOrders = orders.map((row) => row.id === selectedOrder.id ? { ...row, subtotal_cents: total, total_cents: total } : row);
      setItems(nextItems); setOrders(nextOrders); saveDemo(nextOrders, nextItems); return;
    }
    const { error: deleteError } = await supabase.from('restaurant_order_items').delete().eq('id', item.id);
    if (deleteError) setError(deleteError.message); else await load(selectedOrder.id);
  }

  async function sendOrder() {
    if (!selectedOrder) return;
    setSaving(true); setError('');
    try {
      if (demoMode || !supabase) {
        const now = new Date().toISOString();
        const nextItems = items.map((row) => row.order_id === selectedOrder.id && row.status === 'draft' ? { ...row, status: 'sent' as const, sent_at: now } : row);
        const nextOrders = orders.map((row) => row.id === selectedOrder.id ? { ...row, status: 'sent' as const } : row);
        setItems(nextItems); setOrders(nextOrders); saveDemo(nextOrders, nextItems);
      } else {
        const { error: rpcError } = await supabase.rpc('send_restaurant_order', { p_order_id: selectedOrder.id });
        if (rpcError) throw rpcError;
        await load(selectedOrder.id);
      }
      setSuccess(hasKitchen ? 'Les nouveaux articles ont été envoyés en cuisine.' : 'La commande a été validée sur la note.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Envoi impossible.'); }
    finally { setSaving(false); }
  }

  async function requestBill() {
    if (!selectedOrder) return;
    setSaving(true); setError('');
    try {
      if (demoMode || !supabase) {
        const nextOrders = orders.map((row) => row.id === selectedOrder.id ? { ...row, status: 'bill_requested' as const, bill_requested_at: new Date().toISOString() } : row);
        setOrders(nextOrders); saveDemo(nextOrders, items);
      } else {
        const { error: rpcError } = await supabase.rpc('request_restaurant_bill', { p_order_id: selectedOrder.id });
        if (rpcError) throw rpcError;
        await load(selectedOrder.id);
      }
      setSuccess('La note provisoire est prête. Le règlement reste à faire sur la caisse ou le terminal habituel.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Note impossible.'); }
    finally { setSaving(false); }
  }

  async function closeOrder() {
    if (!selectedOrder || !canClose) return;
    setSaving(true); setError('');
    try {
      if (demoMode || !supabase) {
        const nextOrders = orders.filter((row) => row.id !== selectedOrder.id);
        setOrders(nextOrders); saveDemo(nextOrders, items); setSelectedOrderId(nextOrders[0]?.id ?? '');
      } else {
        const { error: rpcError } = await supabase.rpc('close_restaurant_order_without_payment', { p_order_id: selectedOrder.id });
        if (rpcError) throw rpcError;
        setSelectedOrderId(''); await load();
      }
      setSuccess('Note clôturée sans enregistrer le paiement. La table passe à nettoyer.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Clôture impossible.'); }
    finally { setSaving(false); }
  }

  return <div className="page restaurant-page restaurant-orders-page restaurant-premium-workspace">
    <header className="page-header restaurant-service-header"><div><p className="eyebrow">RESTAURATION · SERVICE</p><h1>Prise de commande</h1><p>Une interface tactile pensée pour le rythme du service : sélectionne une table, appuie sur les plats et envoie la commande en cuisine.</p></div><div className="restaurant-service-header-badge"><span>Service actif</span><strong>{orders.length} note{orders.length > 1 ? 's' : ''} ouverte{orders.length > 1 ? 's' : ''}</strong></div></header>
    {error && <div className="error-banner">{error}</div>}{success && <div className="success-banner">{success}</div>}

    <section className="restaurant-order-layout">
      <aside className="panel restaurant-order-tables restaurant-premium-panel">
        <div className="panel-header"><div><p className="eyebrow">SALLE</p><h2>Tables & commandes</h2></div><span className="restaurant-panel-counter">{tables.length}</span></div>
        <div className="restaurant-order-table-list">
          <button type="button" className={`restaurant-order-table-card ${!selectedTableId ? 'active' : ''}`} onClick={() => { setSelectedTableId(''); setSelectedOrderId(orders.find((row) => !row.table_id)?.id ?? ''); setSearchParams({}); }}><span className="restaurant-order-table-symbol">🥡</span><span><strong>Note libre</strong><small>Comptoir ou à emporter</small></span></button>
          {tables.map((table) => { const active = activeOrderByTable.get(table.id); return <button type="button" key={table.id} className={`restaurant-order-table-card ${selectedTableId === table.id ? 'active' : ''} ${active ? 'busy' : ''}`} onClick={() => { setSelectedTableId(table.id); setSelectedOrderId(active?.id ?? ''); setSearchParams({ table: table.id }); }}><span className="restaurant-order-table-symbol">{active ? '🍽️' : '🪑'}</span><span><strong>{table.name}</strong><small>{active ? `${formatRestaurantMoney(active.total_cents)} · note ouverte` : `${table.capacity} places · disponible`}</small></span><span className={`restaurant-order-table-dot ${active ? 'busy' : ''}`}/></button>; })}
        </div>
        {!selectedOrder && <div className="restaurant-order-open-box"><div className="restaurant-open-order-intro"><strong>{selectedTable?.name || 'Nouvelle commande'}</strong><span>Indique le nombre de couverts avant d’ouvrir la note.</span></div><label>Nombre de couverts<input type="number" min="1" max="100" value={guestCount} onChange={(event) => setGuestCount(event.target.value)}/></label><button type="button" className="primary-button restaurant-open-order-button" disabled={saving || (Boolean(selectedTableId) && !selectedTable)} onClick={() => void openOrder()}><Icon name="plus" size={17}/>Ouvrir la note</button></div>}
      </aside>

      <main className="panel restaurant-order-menu restaurant-premium-panel">
        <div className="restaurant-order-menu-heading"><div><p className="eyebrow">CARTE DU RESTAURANT</p><h2>Choisir les plats</h2></div>{selectedOrder && <div className="restaurant-current-table-chip"><span>{selectedOrder.restaurant_tables?.name || `Commande n°${selectedOrder.order_number}`}</span><strong>{selectedOrder.guest_count} couvert{selectedOrder.guest_count > 1 ? 's' : ''}</strong></div>}</div>
        <div className="restaurant-order-menu-toolbar"><div className="restaurant-order-search"><Icon name="search" size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un plat…"/></div><div className="restaurant-order-category-tabs"><button type="button" className={categoryId === 'all' ? 'active' : ''} onClick={() => setCategoryId('all')}><span>🍴</span>Tout</button>{categories.map((category) => { const visual = courseVisuals[inferCourse(category.name)]; return <button type="button" key={category.id} className={categoryId === category.id ? 'active' : ''} onClick={() => setCategoryId(category.id)}><span>{visual.icon}</span>{category.name}</button>; })}</div></div>
        {loading ? <div className="restaurant-empty">Chargement…</div> : !selectedOrder ? <div className="restaurant-empty restaurant-order-empty-state"><span className="restaurant-empty-illustration">🍽️</span><strong>Sélectionne une table et ouvre sa note</strong><span>Les plats apparaîtront ici sous forme de boutons tactiles.</span></div> : visibleMenuItems.length === 0 ? <div className="restaurant-empty">Aucun produit disponible dans cette catégorie.</div> : <div className="restaurant-order-product-grid">{visibleMenuItems.map((menuItem) => { const course = menuItemCourse(menuItem, categories); const visual = courseVisuals[course]; return <button type="button" key={menuItem.id} className={`restaurant-order-product-card course-${course}`} disabled={saving || selectedOrder.status === 'bill_requested'} onClick={() => void addMenuItem(menuItem)}><span className="restaurant-product-card-top"><span className="restaurant-product-icon">{visual.icon}</span><span className="restaurant-product-add">+</span></span><span className="restaurant-product-copy"><strong>{menuItem.name}</strong>{menuItem.description_fr && <small>{menuItem.description_fr}</small>}</span><span className="restaurant-product-card-bottom"><span>{menuItem.allergens.length > 0 ? `${menuItem.allergens.slice(0, 2).join(' · ')}${menuItem.allergens.length > 2 ? ' +' : ''}` : visual.label}</span><b>{formatRestaurantMoney(menuItem.price_cents)}</b></span></button>; })}</div>}
      </main>

      <aside className="panel restaurant-order-note restaurant-premium-panel">
        <div className="restaurant-order-note-header"><div><p className="eyebrow">NOTE PROVISOIRE</p><h2>{selectedOrder?.restaurant_tables?.name || (selectedOrder ? `Commande n°${selectedOrder.order_number}` : 'Aucune note')}</h2>{selectedOrder && <span>Commande n°{selectedOrder.order_number} · {selectedOrder.guest_count} couvert{selectedOrder.guest_count > 1 ? 's' : ''}</span>}</div>{selectedOrder && <span className={`restaurant-status-pill ${selectedOrder.status}`}>{selectedOrder.status === 'bill_requested' ? 'À encaisser' : selectedOrder.status === 'draft' ? 'En saisie' : 'En cours'}</span>}</div>
        {!selectedOrder ? <div className="restaurant-empty restaurant-note-empty"><span className="restaurant-empty-illustration">🧾</span><strong>La note apparaîtra ici</strong><span>Choisis une table pour commencer le service.</span></div> : <>
          <div className="restaurant-order-line-list">{selectedItems.length === 0 ? <div className="restaurant-empty restaurant-note-empty"><span className="restaurant-empty-illustration">🥄</span><strong>La note est vide</strong><span>Appuie sur un plat pour l’ajouter.</span></div> : selectedItems.map((item) => <article key={item.id} className={`restaurant-order-line ${item.status}`}><div className="restaurant-order-line-main"><span className="restaurant-order-line-course">{courseVisuals[item.course].icon} {courseLabels[item.course]}</span><strong>{item.item_name}</strong>{item.notes && <small>{item.notes}</small>}</div><div className="restaurant-order-quantity"><button type="button" disabled={item.status !== 'draft' || item.quantity <= 1} onClick={() => void updateItem(item, { quantity: item.quantity - 1 })}>−</button><b>{item.quantity}</b><button type="button" disabled={item.status !== 'draft'} onClick={() => void updateItem(item, { quantity: item.quantity + 1 })}>+</button></div><strong className="restaurant-order-line-price">{formatRestaurantMoney(item.unit_price_cents * item.quantity)}</strong>{item.status === 'draft' && <button type="button" className="restaurant-order-remove" onClick={() => void removeDraftItem(item)} aria-label={`Supprimer ${item.item_name}`}>×</button>}<textarea disabled={item.status !== 'draft'} value={item.notes ?? ''} onChange={(event) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, notes: event.target.value } : row))} onBlur={(event) => void updateItem(item, { notes: event.target.value.trim() || null })} placeholder="Cuisson, sans oignon, allergie…"/></article>)}</div>
          <div className="restaurant-order-total"><span><small>Total de la note</small>Total provisoire</span><strong>{formatRestaurantMoney(selectedOrder.total_cents)}</strong></div>
          <div className="restaurant-order-actions"><button type="button" className="primary-button restaurant-order-primary-action" disabled={saving || !selectedItems.some((item) => item.status === 'draft') || selectedOrder.status === 'bill_requested'} onClick={() => void sendOrder()}><Icon name="utensils" size={17}/>{hasKitchen ? 'Envoyer en cuisine' : 'Valider la commande'}</button><button type="button" className="secondary-button" disabled={saving || selectedItems.length === 0 || selectedOrder.status === 'bill_requested'} onClick={() => void requestBill()}><Icon name="file" size={17}/>Préparer la note</button>{selectedOrder.status === 'bill_requested' && canClose && <button type="button" className="secondary-button" disabled={saving} onClick={() => void closeOrder()}><Icon name="check" size={17}/>Clôturer après règlement externe</button>}</div>
          <p className="restaurant-order-payment-note"><Icon name="creditCard" size={16}/><span><strong>Paiement externe</strong>La caisse ou le terminal du restaurant reste utilisé pour l’encaissement.</span></p>
        </>}
      </aside>
    </section>
  </div>;
}
