import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useBeautyEnseigneContext } from '../hooks/useBeautyEnseigneContext';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { supabase } from '../lib/supabase';
import '../beautyStock.css';

type StockUnit = 'unit' | 'ml' | 'cl' | 'l' | 'g' | 'kg' | 'dose' | 'pair' | 'sheet' | 'box' | 'other';
type ManualMovementKind = 'purchase' | 'manual_in' | 'manual_out' | 'waste' | 'correction_add' | 'correction_remove';

interface BeautyStockItem {
  id: string;
  organization_id: string;
  company_id: string;
  site_id: string;
  name: string;
  category: string | null;
  sku: string | null;
  unit: StockUnit;
  quantity_on_hand: number | string;
  alert_threshold: number | string;
  unit_cost_cents: number | string;
  supplier: string | null;
  storage_location: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

interface BeautyConsumable {
  id: string;
  service_id: string;
  stock_item_id: string;
  quantity_used: number | string;
  automatic_deduction: boolean;
}

interface BeautyService {
  id: string;
  name: string;
  category_name: string | null;
  active: boolean;
}

interface BeautyStockMovement {
  id: string;
  stock_item_id: string;
  service_id: string | null;
  appointment_id: string | null;
  movement_type: string;
  quantity_delta: number | string;
  unit: StockUnit;
  unit_cost_cents: number | string;
  balance_before: number | string;
  balance_after: number | string;
  notes: string | null;
  reversal_of: string | null;
  reversed_at: string | null;
  created_at: string;
  beauty_stock_items?: { name?: string | null } | null;
}

interface StockForm {
  name: string;
  category: string;
  sku: string;
  siteId: string;
  unit: StockUnit;
  initialQuantity: string;
  threshold: string;
  unitCost: string;
  supplier: string;
  storageLocation: string;
  notes: string;
}

interface MovementForm {
  itemId: string;
  kind: ManualMovementKind;
  quantity: string;
  reason: string;
}

const unitLabels: Record<StockUnit, string> = {
  unit: 'unité',
  ml: 'ml',
  cl: 'cl',
  l: 'L',
  g: 'g',
  kg: 'kg',
  dose: 'dose',
  pair: 'paire',
  sheet: 'feuille',
  box: 'boîte',
  other: 'autre'
};

const movementLabels: Record<string, string> = {
  initial: 'Stock initial',
  purchase: 'Réapprovisionnement',
  manual_in: 'Entrée manuelle',
  manual_out: 'Sortie manuelle',
  correction: 'Correction',
  waste: 'Perte / casse',
  service_consumption: 'Consommation prestation',
  service_reversal: 'Réintégration prestation'
};

function emptyStockForm(siteId = ''): StockForm {
  return {
    name: '',
    category: '',
    sku: '',
    siteId,
    unit: 'unit',
    initialQuantity: '0',
    threshold: '0',
    unitCost: '0',
    supplier: '',
    storageLocation: '',
    notes: ''
  };
}

const emptyMovementForm: MovementForm = {
  itemId: '',
  kind: 'purchase',
  quantity: '1',
  reason: ''
};

function parseDecimal(value: string) {
  return Number(value.replace(',', '.'));
}

function formatQuantity(value: number | string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(number);
}

function formatMoneyFromCents(value: number | string) {
  const cents = Number(value);
  if (!Number.isFinite(cents)) return '0,00 €';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(cents / 100);
}

function movementDelta(kind: ManualMovementKind, quantity: number) {
  return ['manual_out', 'waste', 'correction_remove'].includes(kind) ? -Math.abs(quantity) : Math.abs(quantity);
}

function rpcMovementType(kind: ManualMovementKind) {
  if (kind === 'correction_add' || kind === 'correction_remove') return 'correction';
  return kind;
}

export function BeautyStockPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const { beautyMode, selectedEnseigne, selectedEnseigneId, loading: enseigneLoading } = useBeautyEnseigneContext();
  const { confirm } = useConfirmDialog();
  const [items, setItems] = useState<BeautyStockItem[]>([]);
  const [consumables, setConsumables] = useState<BeautyConsumable[]>([]);
  const [services, setServices] = useState<BeautyService[]>([]);
  const [movements, setMovements] = useState<BeautyStockMovement[]>([]);
  const [stockForm, setStockForm] = useState<StockForm>(emptyStockForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [movementForm, setMovementForm] = useState<MovementForm>(emptyMovementForm);
  const [movementOpen, setMovementOpen] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignmentQuantities, setAssignmentQuantities] = useState<Record<string, string>>({});
  const [siteFilter, setSiteFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'alert' | 'negative'>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const sites = selectedEnseigne?.sites ?? [];
  const defaultSiteId = sites.find((site) => site.is_primary)?.id ?? sites[0]?.id ?? '';

  async function loadData() {
    if (!organization || !beautyMode || !selectedEnseigneId) {
      setItems([]);
      setConsumables([]);
      setServices([]);
      setMovements([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    if (demoMode || !supabase) {
      const stockKey = `ncr-suite-demo-beauty-stock-${organization.id}`;
      const consumableKey = `ncr-suite-demo-beauty-consumables-${organization.id}`;
      const movementKey = `ncr-suite-demo-beauty-stock-movements-${organization.id}`;
      const serviceKey = `ncr-suite-demo-services-${organization.id}`;
      const allItems = JSON.parse(localStorage.getItem(stockKey) || '[]') as BeautyStockItem[];
      const scopedItems = allItems.filter((row) => row.company_id === selectedEnseigneId);
      const itemIds = new Set(scopedItems.map((row) => row.id));
      const allConsumables = JSON.parse(localStorage.getItem(consumableKey) || '[]') as BeautyConsumable[];
      const allMovements = JSON.parse(localStorage.getItem(movementKey) || '[]') as BeautyStockMovement[];
      const allServices = JSON.parse(localStorage.getItem(serviceKey) || '[]') as Array<BeautyService & { company_id?: string | null }>;
      setItems(scopedItems);
      setConsumables(allConsumables.filter((row) => itemIds.has(row.stock_item_id)));
      setMovements(allMovements.filter((row) => itemIds.has(row.stock_item_id)).slice(0, 80));
      setServices(allServices.filter((row) => row.company_id === selectedEnseigneId).map((row) => ({ id: row.id, name: row.name, category_name: row.category_name ?? null, active: row.active })));
      setLoading(false);
      return;
    }

    const [itemResult, consumableResult, serviceResult, movementResult] = await Promise.all([
      supabase.from('beauty_stock_items')
        .select('id,organization_id,company_id,site_id,name,category,sku,unit,quantity_on_hand,alert_threshold,unit_cost_cents,supplier,storage_location,notes,active,created_at')
        .eq('organization_id', organization.id)
        .eq('company_id', selectedEnseigneId)
        .order('active', { ascending: false })
        .order('name'),
      supabase.from('beauty_service_consumables')
        .select('id,service_id,stock_item_id,quantity_used,automatic_deduction')
        .eq('organization_id', organization.id)
        .eq('company_id', selectedEnseigneId),
      supabase.from('services')
        .select('id,name,category_name,active')
        .eq('organization_id', organization.id)
        .eq('company_id', selectedEnseigneId)
        .order('active', { ascending: false })
        .order('name'),
      supabase.from('beauty_stock_movements')
        .select('id,stock_item_id,service_id,appointment_id,movement_type,quantity_delta,unit,unit_cost_cents,balance_before,balance_after,notes,reversal_of,reversed_at,created_at,beauty_stock_items(name)')
        .eq('organization_id', organization.id)
        .eq('company_id', selectedEnseigneId)
        .order('created_at', { ascending: false })
        .limit(80)
    ]);

    const firstError = itemResult.error || consumableResult.error || serviceResult.error || movementResult.error;
    if (firstError) {
      setError(`Impossible de charger le stock : ${firstError.message}`);
    } else {
      setItems((itemResult.data ?? []) as BeautyStockItem[]);
      setConsumables((consumableResult.data ?? []) as BeautyConsumable[]);
      setServices((serviceResult.data ?? []) as BeautyService[]);
      setMovements((movementResult.data ?? []) as unknown as BeautyStockMovement[]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, [organization?.id, selectedEnseigneId, beautyMode, demoMode]);

  useEffect(() => {
    setEditingId(null);
    setAssigningId(null);
    setMovementOpen(false);
    setStockForm(emptyStockForm(defaultSiteId));
    setAssignmentQuantities({});
    setSiteFilter('all');
    setStockFilter('all');
    setQuery('');
    setError('');
    setSuccess('');
  }, [selectedEnseigneId, defaultSiteId]);

  const consumablesByItem = useMemo(() => {
    const map = new Map<string, BeautyConsumable[]>();
    consumables.forEach((row) => {
      const list = map.get(row.stock_item_id) ?? [];
      list.push(row);
      map.set(row.stock_item_id, list);
    });
    return map;
  }, [consumables]);

  const lowStock = items.filter((item) => item.active && Number(item.quantity_on_hand) <= Number(item.alert_threshold));
  const negativeStock = items.filter((item) => item.active && Number(item.quantity_on_hand) < 0);
  const stockValueCents = items.filter((item) => item.active).reduce((total, item) => total + Math.max(0, Number(item.quantity_on_hand)) * Number(item.unit_cost_cents), 0);
  const configuredServices = new Set(consumables.map((row) => row.service_id)).size;

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr-FR');
    return items.filter((item) => {
      if (siteFilter !== 'all' && item.site_id !== siteFilter) return false;
      if (stockFilter === 'alert' && Number(item.quantity_on_hand) > Number(item.alert_threshold)) return false;
      if (stockFilter === 'negative' && Number(item.quantity_on_hand) >= 0) return false;
      if (needle && ![item.name, item.category, item.sku, item.supplier, item.storage_location].filter(Boolean).join(' ').toLocaleLowerCase('fr-FR').includes(needle)) return false;
      return true;
    });
  }, [items, siteFilter, stockFilter, query]);

  function openCreate() {
    if (!canManage) return;
    setEditingId('new');
    setAssigningId(null);
    setMovementOpen(false);
    setStockForm(emptyStockForm(defaultSiteId));
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openEdit(item: BeautyStockItem) {
    if (!canManage) return;
    setEditingId(item.id);
    setAssigningId(null);
    setMovementOpen(false);
    setStockForm({
      name: item.name,
      category: item.category ?? '',
      sku: item.sku ?? '',
      siteId: item.site_id,
      unit: item.unit,
      initialQuantity: String(item.quantity_on_hand),
      threshold: String(item.alert_threshold),
      unitCost: String(Number(item.unit_cost_cents) / 100),
      supplier: item.supplier ?? '',
      storageLocation: item.storage_location ?? '',
      notes: item.notes ?? ''
    });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveStockItem(event: FormEvent) {
    event.preventDefault();
    if (!organization || !selectedEnseigneId || !user || !canManage) return;

    const initialQuantity = parseDecimal(stockForm.initialQuantity);
    const threshold = parseDecimal(stockForm.threshold);
    const unitCostEuros = parseDecimal(stockForm.unitCost);

    if (stockForm.name.trim().length < 2) { setError('Indiquez un nom de produit valide.'); return; }
    if (!stockForm.siteId) { setError('Sélectionnez un établissement.'); return; }
    if (editingId === 'new' && (!Number.isFinite(initialQuantity) || initialQuantity < 0)) { setError('Le stock initial doit être positif ou nul.'); return; }
    if (!Number.isFinite(threshold) || threshold < 0) { setError('Le seuil d’alerte doit être positif ou nul.'); return; }
    if (!Number.isFinite(unitCostEuros) || unitCostEuros < 0) { setError('Le coût unitaire est invalide.'); return; }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const common = {
        name: stockForm.name.trim(),
        category: stockForm.category.trim() || null,
        sku: stockForm.sku.trim() || null,
        unit: stockForm.unit,
        alert_threshold: threshold,
        unit_cost_cents: unitCostEuros * 100,
        supplier: stockForm.supplier.trim() || null,
        storage_location: stockForm.storageLocation.trim() || null,
        notes: stockForm.notes.trim() || null
      };

      if (demoMode || !supabase) {
        const key = `ncr-suite-demo-beauty-stock-${organization.id}`;
        const allRows = JSON.parse(localStorage.getItem(key) || '[]') as BeautyStockItem[];
        const existing = editingId && editingId !== 'new' ? allRows.find((row) => row.id === editingId) : null;
        const saved: BeautyStockItem = existing ? { ...existing, ...common } : {
          id: crypto.randomUUID(),
          organization_id: organization.id,
          company_id: selectedEnseigneId,
          site_id: stockForm.siteId,
          quantity_on_hand: initialQuantity,
          active: true,
          created_at: new Date().toISOString(),
          ...common
        };
        const next = existing ? allRows.map((row) => row.id === saved.id ? saved : row) : [saved, ...allRows];
        localStorage.setItem(key, JSON.stringify(next));
      } else if (editingId && editingId !== 'new') {
        const { error: updateError } = await supabase.from('beauty_stock_items').update(common)
          .eq('organization_id', organization.id)
          .eq('company_id', selectedEnseigneId)
          .eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('beauty_stock_items').insert({
          organization_id: organization.id,
          company_id: selectedEnseigneId,
          site_id: stockForm.siteId,
          quantity_on_hand: initialQuantity,
          created_by: user.id,
          ...common
        });
        if (insertError) throw insertError;
      }

      await loadData();
      const updated = editingId && editingId !== 'new';
      setEditingId(null);
      setStockForm(emptyStockForm(defaultSiteId));
      setSuccess(updated ? 'La fiche stock a été mise à jour.' : 'Le produit a été ajouté au stock.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  function openMovement(item: BeautyStockItem) {
    if (!canManage) return;
    setMovementForm({ ...emptyMovementForm, itemId: item.id });
    setMovementOpen(true);
    setEditingId(null);
    setAssigningId(null);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveMovement(event: FormEvent) {
    event.preventDefault();
    if (!organization || !selectedEnseigneId || !movementForm.itemId || !canManage) return;
    const quantity = parseDecimal(movementForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) { setError('Indiquez une quantité strictement positive.'); return; }

    const delta = movementDelta(movementForm.kind, quantity);
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (demoMode || !supabase) {
        const stockKey = `ncr-suite-demo-beauty-stock-${organization.id}`;
        const movementKey = `ncr-suite-demo-beauty-stock-movements-${organization.id}`;
        const allRows = JSON.parse(localStorage.getItem(stockKey) || '[]') as BeautyStockItem[];
        const item = allRows.find((row) => row.id === movementForm.itemId);
        if (!item) throw new Error('Produit introuvable.');
        const after = Number(item.quantity_on_hand) + delta;
        if (delta < 0 && after < 0) throw new Error('Stock insuffisant pour cette sortie.');
        const nextRows = allRows.map((row) => row.id === item.id ? { ...row, quantity_on_hand: after } : row);
        const allMovements = JSON.parse(localStorage.getItem(movementKey) || '[]') as BeautyStockMovement[];
        const movement: BeautyStockMovement = {
          id: crypto.randomUUID(),
          stock_item_id: item.id,
          service_id: null,
          appointment_id: null,
          movement_type: rpcMovementType(movementForm.kind),
          quantity_delta: delta,
          unit: item.unit,
          unit_cost_cents: item.unit_cost_cents,
          balance_before: item.quantity_on_hand,
          balance_after: after,
          notes: movementForm.reason.trim() || null,
          reversal_of: null,
          reversed_at: null,
          created_at: new Date().toISOString(),
          beauty_stock_items: { name: item.name }
        };
        localStorage.setItem(stockKey, JSON.stringify(nextRows));
        localStorage.setItem(movementKey, JSON.stringify([movement, ...allMovements]));
      } else {
        const { error: rpcError } = await supabase.rpc('adjust_beauty_stock', {
          p_organization_id: organization.id,
          p_company_id: selectedEnseigneId,
          p_stock_item_id: movementForm.itemId,
          p_quantity_delta: delta,
          p_movement_type: rpcMovementType(movementForm.kind),
          p_reason: movementForm.reason.trim() || null
        });
        if (rpcError) throw rpcError;
      }
      await loadData();
      setMovementOpen(false);
      setMovementForm(emptyMovementForm);
      setSuccess('Le mouvement de stock a été enregistré.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Mouvement impossible.');
    } finally {
      setSaving(false);
    }
  }

  function openAssignments(item: BeautyStockItem) {
    if (!canManage) return;
    const next: Record<string, string> = {};
    (consumablesByItem.get(item.id) ?? []).forEach((row) => { next[row.service_id] = String(row.quantity_used); });
    setAssignmentQuantities(next);
    setAssigningId(item.id);
    setEditingId(null);
    setMovementOpen(false);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveAssignments(event: FormEvent) {
    event.preventDefault();
    if (!organization || !selectedEnseigneId || !assigningId || !canManage) return;
    const rows = Object.entries(assignmentQuantities).map(([serviceId, raw]) => ({
      service_id: serviceId,
      quantity_used: parseDecimal(raw),
      automatic_deduction: true
    }));

    if (rows.some((row) => !Number.isFinite(row.quantity_used) || row.quantity_used <= 0)) {
      setError('Chaque quantité consommée doit être strictement positive.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (demoMode || !supabase) {
        const key = `ncr-suite-demo-beauty-consumables-${organization.id}`;
        const allRows = JSON.parse(localStorage.getItem(key) || '[]') as BeautyConsumable[];
        const kept = allRows.filter((row) => row.stock_item_id !== assigningId);
        const created = rows.map((row) => ({
          id: crypto.randomUUID(),
          service_id: row.service_id,
          stock_item_id: assigningId,
          quantity_used: row.quantity_used,
          automatic_deduction: true
        }));
        localStorage.setItem(key, JSON.stringify([...kept, ...created]));
      } else {
        const { error: rpcError } = await supabase.rpc('replace_beauty_stock_item_services', {
          p_organization_id: organization.id,
          p_company_id: selectedEnseigneId,
          p_stock_item_id: assigningId,
          p_requirements: rows
        });
        if (rpcError) throw rpcError;
      }
      await loadData();
      setAssigningId(null);
      setAssignmentQuantities({});
      setSuccess('Les consommations automatiques par prestation ont été enregistrées.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Affectation impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleItem(item: BeautyStockItem) {
    if (!organization || !selectedEnseigneId || !canManage) return;
    const nextActive = !item.active;
    const decision = await confirm({
      title: `${nextActive ? 'Réactiver' : 'Désactiver'} ${item.name} ?`,
      message: nextActive
        ? 'Le produit redeviendra disponible dans le stock et pourra de nouveau être consommé automatiquement par les prestations liées.'
        : 'Le produit restera dans l’historique, mais il ne sera plus déduit automatiquement tant qu’il est désactivé.',
      confirmLabel: nextActive ? 'Réactiver' : 'Désactiver',
      tone: nextActive ? 'default' : 'warning'
    });
    if (!decision.confirmed) return;
    setBusyId(item.id);
    setError('');
    setSuccess('');
    try {
      if (demoMode || !supabase) {
        const key = `ncr-suite-demo-beauty-stock-${organization.id}`;
        const rows = JSON.parse(localStorage.getItem(key) || '[]') as BeautyStockItem[];
        localStorage.setItem(key, JSON.stringify(rows.map((row) => row.id === item.id ? { ...row, active: nextActive } : row)));
      } else {
        const { error: updateError } = await supabase.from('beauty_stock_items').update({ active: nextActive })
          .eq('organization_id', organization.id)
          .eq('company_id', selectedEnseigneId)
          .eq('id', item.id);
        if (updateError) throw updateError;
      }
      await loadData();
      setSuccess(nextActive ? 'Le produit est de nouveau actif.' : 'Le produit est désactivé : il ne sera plus déduit automatiquement.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Mise à jour impossible.');
    } finally {
      setBusyId(null);
    }
  }

  if (!organization) return null;
  if (!beautyMode) return <div className="page"><div className="info-message page-message">Le stock Beauty est disponible avec l’offre Métier Coiffure & beauté.</div></div>;

  const assigningItem = items.find((item) => item.id === assigningId) ?? null;
  const movementItem = items.find((item) => item.id === movementForm.itemId) ?? null;

  return <div className="page beauty-stock-page">
    <header className="page-header">
      <div>
        <p className="eyebrow">GESTION AVANCÉE</p>
        <h1>Stock & consommables</h1>
        <p>{selectedEnseigne ? `Suivez les produits et consommables propres à ${selectedEnseigne.name}, avec déduction automatique à la fin des prestations.` : 'Sélectionnez une enseigne Beauty.'}</p>
      </div>
      {canManage && <button type="button" className="primary-button" onClick={openCreate} disabled={!selectedEnseigneId || sites.length === 0}><Icon name="plus" size={18}/>Ajouter un produit</button>}
    </header>

    {!selectedEnseigneId && !enseigneLoading && <div className="info-message page-message">Aucune enseigne Beauty sélectionnée.</div>}
    {selectedEnseigneId && sites.length === 0 && <div className="info-message page-message">Ajoutez d’abord un établissement à cette enseigne.</div>}
    {!canManage && <div className="info-message page-message">Votre rôle permet de consulter le stock, mais pas de le modifier.</div>}
    {negativeStock.length > 0 && <div className="error-message page-message" role="alert"><strong>{negativeStock.length} stock{negativeStock.length > 1 ? 's sont' : ' est'} négatif{negativeStock.length > 1 ? 's' : ''}.</strong> Cela signifie que des prestations ont consommé davantage que le stock théorique. Réapprovisionnez ou corrigez l’inventaire.</div>}
    {error && <div className="error-message page-message" role="alert">{error}</div>}
    {success && <div className="success-message page-message" role="status">{success}</div>}

    {editingId && canManage && <section className="panel beauty-stock-form-panel">
      <div className="panel-header">
        <div><p className="eyebrow">{editingId === 'new' ? 'NOUVEAU PRODUIT' : 'MODIFICATION'}</p><h2>{editingId === 'new' ? 'Ajouter au stock' : 'Modifier la fiche produit'}</h2><small>La quantité courante se modifie ensuite uniquement via un mouvement de stock.</small></div>
        <button type="button" className="secondary-button compact-button" onClick={() => setEditingId(null)}>Fermer</button>
      </div>
      <form className="beauty-stock-form" onSubmit={saveStockItem}>
        <label>Produit <span aria-hidden="true">*</span><input required minLength={2} value={stockForm.name} onChange={(event) => setStockForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex. Gel base, shampoing, gants…"/></label>
        <label>Catégorie<input value={stockForm.category} onChange={(event) => setStockForm((current) => ({ ...current, category: event.target.value }))} placeholder="Ongles, coloration, hygiène…"/></label>
        <label>Référence / SKU<input value={stockForm.sku} onChange={(event) => setStockForm((current) => ({ ...current, sku: event.target.value }))} placeholder="Facultatif"/></label>
        <label>Établissement<select disabled={editingId !== 'new'} value={stockForm.siteId} onChange={(event) => setStockForm((current) => ({ ...current, siteId: event.target.value }))}><option value="">Sélectionner</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
        <label>Unité<select value={stockForm.unit} onChange={(event) => setStockForm((current) => ({ ...current, unit: event.target.value as StockUnit }))}>{Object.entries(unitLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {editingId === 'new' ? <label>Stock initial<input inputMode="decimal" value={stockForm.initialQuantity} onChange={(event) => setStockForm((current) => ({ ...current, initialQuantity: event.target.value }))}/></label> : <label>Stock actuel<input disabled value={formatQuantity(items.find((item) => item.id === editingId)?.quantity_on_hand ?? 0)}/><small>Utilisez « Mouvement » pour corriger la quantité.</small></label>}
        <label>Seuil d’alerte<input inputMode="decimal" value={stockForm.threshold} onChange={(event) => setStockForm((current) => ({ ...current, threshold: event.target.value }))}/><small>Alerte dès que le stock atteint ou passe sous ce niveau.</small></label>
        <label>Coût par {unitLabels[stockForm.unit]} (€)<input inputMode="decimal" value={stockForm.unitCost} onChange={(event) => setStockForm((current) => ({ ...current, unitCost: event.target.value }))}/><small>Permet de calculer le coût réel des consommables par prestation.</small></label>
        <label>Fournisseur<input value={stockForm.supplier} onChange={(event) => setStockForm((current) => ({ ...current, supplier: event.target.value }))} placeholder="Facultatif"/></label>
        <label>Emplacement<input value={stockForm.storageLocation} onChange={(event) => setStockForm((current) => ({ ...current, storageLocation: event.target.value }))} placeholder="Ex. Réserve, meuble 2…"/></label>
        <label className="full-field">Notes<textarea rows={3} maxLength={1500} value={stockForm.notes} onChange={(event) => setStockForm((current) => ({ ...current, notes: event.target.value }))}/></label>
        <div className="form-actions full-field"><button type="button" className="secondary-button" onClick={() => setEditingId(null)}>Annuler</button><button type="submit" className="primary-button" disabled={saving} aria-busy={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      </form>
    </section>}

    {movementOpen && movementItem && canManage && <section className="panel beauty-stock-movement-panel">
      <div className="panel-header"><div><p className="eyebrow">MOUVEMENT DE STOCK</p><h2>{movementItem.name}</h2><small>Stock actuel : {formatQuantity(movementItem.quantity_on_hand)} {unitLabels[movementItem.unit]}</small></div><button type="button" className="secondary-button compact-button" onClick={() => setMovementOpen(false)}>Fermer</button></div>
      <form className="beauty-stock-movement-form" onSubmit={saveMovement}>
        <label>Type<select value={movementForm.kind} onChange={(event) => setMovementForm((current) => ({ ...current, kind: event.target.value as ManualMovementKind }))}><option value="purchase">Réapprovisionnement</option><option value="manual_in">Autre entrée</option><option value="manual_out">Sortie manuelle</option><option value="waste">Perte / casse</option><option value="correction_add">Correction +</option><option value="correction_remove">Correction −</option></select></label>
        <label>Quantité ({unitLabels[movementItem.unit]})<input autoFocus inputMode="decimal" value={movementForm.quantity} onChange={(event) => setMovementForm((current) => ({ ...current, quantity: event.target.value }))}/></label>
        <label className="full-field">Motif / note<textarea rows={2} value={movementForm.reason} onChange={(event) => setMovementForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Ex. Livraison fournisseur, inventaire, produit cassé…"/></label>
        <div className="form-actions full-field"><button type="button" className="secondary-button" onClick={() => setMovementOpen(false)}>Annuler</button><button type="submit" className="primary-button" disabled={saving} aria-busy={saving}>{saving ? 'Enregistrement…' : 'Valider le mouvement'}</button></div>
      </form>
    </section>}

    {assigningItem && canManage && <section className="panel beauty-stock-consumables-panel">
      <div className="panel-header"><div><p className="eyebrow">CONSOMMATION PAR PRESTATION</p><h2>{assigningItem.name}</h2><small>À chaque rendez-vous terminé, NCR Suite retire automatiquement la quantité définie ci-dessous.</small></div><button type="button" className="secondary-button compact-button" onClick={() => setAssigningId(null)}>Fermer</button></div>
      <form onSubmit={saveAssignments}>
        <div className="beauty-stock-service-list">{services.filter((service) => service.active).map((service) => {
          const checked = Object.prototype.hasOwnProperty.call(assignmentQuantities, service.id);
          const quantity = checked ? parseDecimal(assignmentQuantities[service.id]) : 0;
          const costCents = Number.isFinite(quantity) ? quantity * Number(assigningItem.unit_cost_cents) : 0;
          return <label className={checked ? 'active' : ''} key={service.id}>
            <input type="checkbox" checked={checked} onChange={(event) => setAssignmentQuantities((current) => {
              const next = { ...current };
              if (event.target.checked) next[service.id] = '1'; else delete next[service.id];
              return next;
            })}/>
            <span><strong>{service.name}</strong><small>{service.category_name || 'Prestation'}{checked ? ` · coût ${formatMoneyFromCents(costCents)}` : ''}</small></span>
            {checked && <span className="beauty-stock-service-quantity"><input inputMode="decimal" value={assignmentQuantities[service.id]} onChange={(event) => setAssignmentQuantities((current) => ({ ...current, [service.id]: event.target.value }))}/><em>{unitLabels[assigningItem.unit]}</em></span>}
          </label>;
        })}</div>
        {services.filter((service) => service.active).length === 0 && <div className="list-state">Aucune prestation active à configurer.</div>}
        <div className="beauty-stock-auto-note"><Icon name="activity" size={17}/><span><strong>Déduction automatique activée</strong><small>Elle se déclenche quand le rendez-vous passe à « Terminé ». Une correction du statut réintègre automatiquement le stock.</small></span></div>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setAssigningId(null)}>Annuler</button><button type="submit" className="primary-button" disabled={saving} aria-busy={saving}>{saving ? 'Enregistrement…' : 'Enregistrer les consommations'}</button></div>
      </form>
    </section>}

    <section className="service-summary-grid beauty-stock-summary">
      <article className="panel service-summary-card"><span>Références actives</span><strong>{items.filter((item) => item.active).length}</strong><small>produits suivis</small></article>
      <article className={`panel service-summary-card${lowStock.length ? ' warning' : ''}`}><span>Sous le seuil</span><strong>{lowStock.length}</strong><small>à surveiller / commander</small></article>
      <article className={`panel service-summary-card${negativeStock.length ? ' danger' : ''}`}><span>Stocks négatifs</span><strong>{negativeStock.length}</strong><small>écarts à corriger</small></article>
      <article className="panel service-summary-card"><span>Valeur théorique</span><strong>{formatMoneyFromCents(stockValueCents)}</strong><small>{configuredServices} prestation{configuredServices > 1 ? 's' : ''} configurée{configuredServices > 1 ? 's' : ''}</small></article>
    </section>

    <section className="panel beauty-stock-list-panel">
      <div className="beauty-stock-toolbar">
        <div><p className="eyebrow">INVENTAIRE{selectedEnseigne ? ` · ${selectedEnseigne.name}` : ''}</p><h2>{items.length} référence{items.length > 1 ? 's' : ''}</h2></div>
        <div className="beauty-stock-filters">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un produit"/>
          <select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}><option value="all">Tous les établissements</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select>
          <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value as 'all' | 'alert' | 'negative')}><option value="all">Tous les stocks</option><option value="alert">Sous le seuil</option><option value="negative">Négatifs</option></select>
        </div>
      </div>

      {loading || enseigneLoading ? <div className="list-state beauty-loading-state" aria-busy="true">Chargement du stock…</div> : filteredItems.length === 0 ? <div className="list-state empty-service-state"><div className="empty-icon"><Icon name="briefcase" size={30}/></div><h3>{items.length === 0 ? 'Aucun produit en stock' : 'Aucun résultat'}</h3><p>{items.length === 0 ? 'Ajoutez vos consommables puis liez-les aux prestations pour automatiser les sorties.' : 'Modifiez les filtres ou la recherche.'}</p>{items.length === 0 && canManage && sites.length > 0 && <button type="button" className="primary-button" onClick={openCreate}>Ajouter le premier produit</button>}</div> : <div className="beauty-stock-grid">{filteredItems.map((item) => {
        const quantity = Number(item.quantity_on_hand);
        const threshold = Number(item.alert_threshold);
        const negative = quantity < 0;
        const alert = quantity <= threshold;
        const site = sites.find((row) => row.id === item.site_id);
        const links = consumablesByItem.get(item.id) ?? [];
        const serviceNames = links.map((link) => services.find((service) => service.id === link.service_id)?.name).filter(Boolean) as string[];
        return <article className={`beauty-stock-card${item.active ? '' : ' inactive'}${negative ? ' negative' : alert ? ' alert' : ''}`} key={item.id}>
          <div className="beauty-stock-card-head"><span className="beauty-stock-card-icon"><Icon name="briefcase" size={20}/></span><div><span>{item.category || 'Consommable'}</span><h3>{item.name}</h3></div><em className={negative ? 'negative' : alert ? 'alert' : item.active ? 'active' : 'inactive'}>{negative ? 'Négatif' : alert ? 'À commander' : item.active ? 'Disponible' : 'Inactif'}</em></div>
          <div className="beauty-stock-level"><div><strong>{formatQuantity(item.quantity_on_hand)}</strong><span>{unitLabels[item.unit]}</span></div><small>Seuil : {formatQuantity(item.alert_threshold)} {unitLabels[item.unit]}</small></div>
          <div className="beauty-stock-meta"><span><Icon name="map" size={14}/>{site?.name || 'Établissement'}</span>{item.supplier && <span><Icon name="building" size={14}/>{item.supplier}</span>}{item.storage_location && <span><Icon name="briefcase" size={14}/>{item.storage_location}</span>}</div>
          <div className="beauty-stock-cost"><span>Coût unitaire <strong>{formatMoneyFromCents(item.unit_cost_cents)}</strong> / {unitLabels[item.unit]}</span><span>Valeur en stock <strong>{formatMoneyFromCents(Math.max(0, quantity) * Number(item.unit_cost_cents))}</strong></span></div>
          <div className="beauty-stock-linked-services"><small>Consommation automatique</small>{serviceNames.length > 0 ? <div>{serviceNames.slice(0,4).map((name) => <span key={name}>{name}</span>)}{serviceNames.length > 4 && <span>+{serviceNames.length - 4}</span>}</div> : <p>Aucune prestation liée.</p>}</div>
          {item.sku && <small className="beauty-stock-sku">Réf. {item.sku}</small>}
          {canManage && <div className="beauty-stock-actions"><button type="button" className="primary-button compact-button" onClick={() => openMovement(item)}>Mouvement</button><button type="button" className="secondary-button compact-button" onClick={() => openAssignments(item)}>Prestations</button><button type="button" className="secondary-button compact-button" onClick={() => openEdit(item)}>Modifier</button><button type="button" className={item.active ? 'danger-text-button' : 'icon-text-button'} disabled={busyId === item.id} aria-busy={busyId === item.id} onClick={() => void toggleItem(item)}>{busyId === item.id ? 'Mise à jour…' : item.active ? 'Désactiver' : 'Réactiver'}</button></div>}
        </article>;
      })}</div>}
    </section>

    <section className="panel beauty-stock-history-panel">
      <div className="panel-header"><div><p className="eyebrow">TRAÇABILITÉ</p><h2>Derniers mouvements</h2><small>Entrées, sorties, consommations automatiques et corrections.</small></div></div>
      {movements.length === 0 ? <div className="list-state">Aucun mouvement enregistré.</div> : <div className="beauty-stock-history-list">{movements.map((movement) => {
        const delta = Number(movement.quantity_delta);
        return <article key={movement.id} className={delta >= 0 ? 'positive' : 'negative'}>
          <span className="beauty-stock-history-icon"><Icon name={delta >= 0 ? 'plus' : 'minus'} size={15}/></span>
          <div><strong>{movement.beauty_stock_items?.name || items.find((item) => item.id === movement.stock_item_id)?.name || 'Produit'}</strong><small>{movementLabels[movement.movement_type] || 'Mouvement'} · {new Date(movement.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</small>{movement.notes && <p>{movement.notes}</p>}</div>
          <span className="beauty-stock-history-value"><b>{delta > 0 ? '+' : ''}{formatQuantity(delta)} {unitLabels[movement.unit]}</b><small>{formatQuantity(movement.balance_after)} après</small></span>
        </article>;
      })}</div>}
    </section>
  </div>;
}
