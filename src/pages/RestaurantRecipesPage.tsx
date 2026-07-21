import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { restaurantErrorMessage, safeRestaurantStorageArray } from '../features/restaurant/runtime';
import {
  formatRestaurantMoney,
  RESTAURANT_ALLERGENS,
  type RestaurantMenuItemRecord,
  type RestaurantRecipeCardRecord,
  type RestaurantRecipeIngredientRecord,
  type RestaurantStockItemRecord,
} from '../features/restaurant/types';
import { supabase } from '../lib/supabase';

type IngredientDraft = {
  id?: string;
  stockItemId: string;
  quantity: string;
  unit: string;
  deductFromStock: boolean;
  notes: string;
};

type RecipeForm = {
  portions: string;
  prepTime: string;
  cookingTime: string;
  instructions: string;
  platingNotes: string;
  kitchenNotes: string;
  ingredients: IngredientDraft[];
};

const emptyRecipe: RecipeForm = {
  portions: '1',
  prepTime: '0',
  cookingTime: '0',
  instructions: '',
  platingNotes: '',
  kitchenNotes: '',
  ingredients: [],
};

function normalizeUnit(value: string) {
  const unit = value.trim().toLowerCase().replace(/[éèê]/g, 'e').replace(/\./g, '');
  if (['mg', 'milligramme', 'milligrammes'].includes(unit)) return 'mg';
  if (['g', 'gr', 'gramme', 'grammes'].includes(unit)) return 'g';
  if (['kg', 'kilo', 'kilos', 'kilogramme', 'kilogrammes'].includes(unit)) return 'kg';
  if (['ml', 'millilitre', 'millilitres'].includes(unit)) return 'ml';
  if (['cl', 'centilitre', 'centilitres'].includes(unit)) return 'cl';
  if (['l', 'litre', 'litres'].includes(unit)) return 'l';
  if (['unite', 'unites', 'piece', 'pieces', 'pc', 'pcs'].includes(unit)) return 'unite';
  return unit;
}

function compatibleUnits(stockUnit: string) {
  const unit = normalizeUnit(stockUnit);
  if (['mg', 'g', 'kg'].includes(unit)) return ['g', 'kg'];
  if (['ml', 'cl', 'l'].includes(unit)) return ['ml', 'cl', 'l'];
  if (unit === 'unite') return ['unité'];
  return [stockUnit || 'unité'];
}

function convertQuantity(quantity: number, fromUnit: string, toUnit: string) {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (from === to) return quantity;
  if (['mg', 'g', 'kg'].includes(from) && ['mg', 'g', 'kg'].includes(to)) {
    const grams = quantity * (from === 'mg' ? 0.001 : from === 'kg' ? 1000 : 1);
    return grams / (to === 'mg' ? 0.001 : to === 'kg' ? 1000 : 1);
  }
  if (['ml', 'cl', 'l'].includes(from) && ['ml', 'cl', 'l'].includes(to)) {
    const millilitres = quantity * (from === 'cl' ? 10 : from === 'l' ? 1000 : 1);
    return millilitres / (to === 'cl' ? 10 : to === 'l' ? 1000 : 1);
  }
  if (from === 'unite' && to === 'unite') return quantity;
  return Number.NaN;
}

function recipeVisual(categoryName = '') {
  const category = categoryName.toLowerCase();
  if (category.includes('boisson') || category.includes('cocktail') || category.includes('vin')) return '🥂';
  if (category.includes('dessert') || category.includes('glace')) return '🍰';
  if (category.includes('entrée') || category.includes('entree') || category.includes('salade')) return '🥗';
  if (category.includes('menu')) return '📋';
  return '🍽️';
}

export function RestaurantRecipesPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [searchParams] = useSearchParams();
  const [menuItems, setMenuItems] = useState<RestaurantMenuItemRecord[]>([]);
  const [stockItems, setStockItems] = useState<RestaurantStockItemRecord[]>([]);
  const [recipes, setRecipes] = useState<RestaurantRecipeCardRecord[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<RecipeForm>(emptyRecipe);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const canViewCosts = Boolean(organization && organizationHasFeature(organization, 'restaurant_food_cost') && ['owner', 'admin'].includes(organization.role ?? 'viewer'));
  const autoStock = Boolean(organization && organizationHasFeature(organization, 'restaurant_auto_stock_consumption'));

  async function load() {
    if (!organization) return;
    setLoading(true);
    setError('');
    try {
      if (demoMode || !supabase) {
        const demoMenu = safeRestaurantStorageArray<RestaurantMenuItemRecord>(`ncr-restaurant-menu-${organization.id}`);
        const demoStock = safeRestaurantStorageArray<RestaurantStockItemRecord>(`ncr-restaurant-stock-${organization.id}`)
          .map((row) => ({ ...row, allergens: row.allergens ?? [] }));
        const demoRecipes = safeRestaurantStorageArray<RestaurantRecipeCardRecord>(`ncr-restaurant-recipes-${organization.id}`);
        setMenuItems(demoMenu);
        setStockItems(demoStock);
        setRecipes(demoRecipes);
        if (!selectedItemId) { const requested = searchParams.get('plat'); setSelectedItemId(demoMenu.some((row) => row.id === requested) ? requested! : demoMenu[0]?.id ?? ''); }
        return;
      }

      const menuRequest = supabase.from('restaurant_menu_items')
        .select('*,restaurant_menu_categories(name,name_en,name_es,name_it)')
        .eq('organization_id', organization.id)
        .order('name');
      const costRequest = canViewCosts
        ? supabase.from('restaurant_menu_costs').select('menu_item_id,cost_cents').eq('organization_id', organization.id)
        : Promise.resolve({ data: [], error: null });

      if (canManage) {
        const [menuResult, stockResult, recipeResult, costResult] = await Promise.all([
          menuRequest,
          supabase.from('restaurant_stock_items')
            .select('*,restaurant_suppliers(name)')
            .eq('organization_id', organization.id)
            .eq('status', 'active')
            .order('name'),
          supabase.from('restaurant_recipe_cards')
            .select('*,restaurant_recipe_ingredients(*,restaurant_stock_items(id,name,unit,unit_cost_cents,allergens,quantity))')
            .eq('organization_id', organization.id)
            .eq('active', true)
            .order('updated_at', { ascending: false }),
          costRequest,
        ]);
        const firstError = menuResult.error || stockResult.error || recipeResult.error || costResult.error;
        if (firstError) throw firstError;
        const costs = new Map((costResult.data ?? []).map((row: { menu_item_id: string; cost_cents: number }) => [row.menu_item_id, row.cost_cents]));
        const nextMenu = ((menuResult.data ?? []) as RestaurantMenuItemRecord[])
          .map((row) => ({ ...row, cost_cents: Number(costs.get(row.id) ?? row.cost_cents ?? 0) }));
        setMenuItems(nextMenu);
        setStockItems(((stockResult.data ?? []) as RestaurantStockItemRecord[]).map((row) => ({ ...row, allergens: row.allergens ?? [] })));
        setRecipes((recipeResult.data ?? []) as RestaurantRecipeCardRecord[]);
        if (!selectedItemId) { const requested = searchParams.get('plat'); setSelectedItemId(nextMenu.some((row) => row.id === requested) ? requested! : nextMenu[0]?.id ?? ''); }
      } else {
        const [menuResult, recipeResult] = await Promise.all([
          menuRequest,
          supabase.rpc('list_restaurant_recipe_kitchen', { p_organization_id: organization.id }),
        ]);
        if (menuResult.error || recipeResult.error) throw menuResult.error || recipeResult.error;
        const nextMenu = ((menuResult.data ?? []) as RestaurantMenuItemRecord[]).map((row) => ({ ...row, cost_cents: 0 }));
        const safeRecipes = (recipeResult.data ?? []) as RestaurantRecipeCardRecord[];
        const safeStocks = new Map<string, RestaurantStockItemRecord>();
        safeRecipes.forEach((recipe) => (recipe.restaurant_recipe_ingredients ?? []).forEach((ingredient) => {
          const stock = ingredient.restaurant_stock_items;
          if (stock) safeStocks.set(stock.id, {
            id: stock.id,
            organization_id: organization.id,
            supplier_id: null,
            name: stock.name,
            category: null,
            unit: stock.unit,
            quantity: 0,
            minimum_quantity: 0,
            unit_cost_cents: 0,
            allergens: stock.allergens ?? [],
            status: 'active',
          });
        }));
        setMenuItems(nextMenu);
        setRecipes(safeRecipes);
        setStockItems([...safeStocks.values()]);
        if (!selectedItemId) { const requested = searchParams.get('plat'); setSelectedItemId(nextMenu.some((row) => row.id === requested) ? requested! : nextMenu[0]?.id ?? ''); }
      }
    } catch (caught) {
      setError(restaurantErrorMessage(caught, 'Chargement des fiches recettes impossible.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [organization?.id, demoMode, canViewCosts]);

  const selectedItem = useMemo(() => menuItems.find((item) => item.id === selectedItemId) ?? null, [menuItems, selectedItemId]);
  const selectedRecipe = useMemo(() => recipes.find((recipe) => recipe.menu_item_id === selectedItemId) ?? null, [recipes, selectedItemId]);

  useEffect(() => {
    if (!selectedItemId) { setForm(emptyRecipe); return; }
    const recipe = recipes.find((row) => row.menu_item_id === selectedItemId);
    if (!recipe) { setForm(emptyRecipe); return; }
    setForm({
      portions: String(recipe.portions),
      prepTime: String(recipe.prep_time_minutes),
      cookingTime: String(recipe.cooking_time_minutes),
      instructions: recipe.instructions ?? '',
      platingNotes: recipe.plating_notes ?? '',
      kitchenNotes: recipe.kitchen_notes ?? '',
      ingredients: (recipe.restaurant_recipe_ingredients ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((ingredient) => ({
          id: ingredient.id,
          stockItemId: ingredient.stock_item_id,
          quantity: String(ingredient.quantity),
          unit: ingredient.unit,
          deductFromStock: ingredient.deduct_from_stock,
          notes: ingredient.notes ?? '',
        })),
    });
  }, [selectedItemId, recipes]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return menuItems;
    return menuItems.filter((item) => `${item.name} ${item.restaurant_menu_categories?.name ?? ''}`.toLowerCase().includes(needle));
  }, [menuItems, query]);

  const recipeMap = useMemo(() => new Map(recipes.map((recipe) => [recipe.menu_item_id, recipe])), [recipes]);
  const stockMap = useMemo(() => new Map(stockItems.map((item) => [item.id, item])), [stockItems]);

  const computed = useMemo(() => {
    const portions = Math.max(0.0001, Number(form.portions.replace(',', '.')) || 1);
    let batchCost = 0;
    let invalidUnits = false;
    const allergens = new Set<string>();
    for (const ingredient of form.ingredients) {
      const stock = stockMap.get(ingredient.stockItemId);
      if (!stock) continue;
      stock.allergens?.forEach((allergen) => allergens.add(allergen));
      const quantity = Number(ingredient.quantity.replace(',', '.')) || 0;
      const converted = convertQuantity(quantity, ingredient.unit, stock.unit);
      if (!Number.isFinite(converted)) { invalidUnits = true; continue; }
      batchCost += converted * Number(stock.unit_cost_cents || 0);
    }
    const costPerPortion = Math.round(batchCost / portions);
    const sellingPrice = selectedItem?.price_cents ?? 0;
    const marginCents = sellingPrice - costPerPortion;
    const marginRate = sellingPrice > 0 ? (marginCents / sellingPrice) * 100 : 0;
    return { costPerPortion, marginCents, marginRate, invalidUnits, allergens: [...allergens].sort() };
  }, [form.ingredients, form.portions, selectedItem?.price_cents, stockMap]);

  function addIngredient() {
    const stock = stockItems[0];
    if (!stock) { setError('Ajoute d’abord les ingrédients dans Stocks & fournisseurs.'); return; }
    const units = compatibleUnits(stock.unit);
    setForm((current) => ({
      ...current,
      ingredients: [...current.ingredients, {
        stockItemId: stock.id,
        quantity: '1',
        unit: units[0],
        deductFromStock: true,
        notes: '',
      }],
    }));
  }

  function updateIngredient(index: number, patch: Partial<IngredientDraft>) {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const next = { ...row, ...patch };
        if (patch.stockItemId) {
          const stock = stockMap.get(patch.stockItemId);
          if (stock) next.unit = compatibleUnits(stock.unit)[0];
        }
        return next;
      }),
    }));
  }

  async function saveRecipe(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !selectedItem || !canManage) return;
    const portions = Number(form.portions.replace(',', '.'));
    if (!Number.isFinite(portions) || portions <= 0) { setError('Le nombre de portions doit être supérieur à zéro.'); return; }
    if (form.ingredients.some((row) => !row.stockItemId || !(Number(row.quantity.replace(',', '.')) > 0))) {
      setError('Chaque ingrédient doit avoir un produit et une quantité valides.'); return;
    }
    if (computed.invalidUnits) { setError('Une unité est incompatible avec l’unité du stock.'); return; }

    setSaving(true); setError(''); setSuccess('');
    try {
      const recipePayload = {
        organization_id: organization.id,
        menu_item_id: selectedItem.id,
        portions,
        prep_time_minutes: Math.max(0, Math.round(Number(form.prepTime) || 0)),
        cooking_time_minutes: Math.max(0, Math.round(Number(form.cookingTime) || 0)),
        instructions: form.instructions.trim() || null,
        plating_notes: form.platingNotes.trim() || null,
        kitchen_notes: form.kitchenNotes.trim() || null,
        active: true,
        created_by: user.id,
      };

      if (demoMode || !supabase) {
        const recipeId = selectedRecipe?.id ?? crypto.randomUUID();
        const ingredientRows: RestaurantRecipeIngredientRecord[] = form.ingredients.map((row, index) => ({
          id: row.id ?? crypto.randomUUID(),
          organization_id: organization.id,
          recipe_id: recipeId,
          stock_item_id: row.stockItemId,
          quantity: Number(row.quantity.replace(',', '.')),
          unit: row.unit,
          position: index,
          deduct_from_stock: row.deductFromStock,
          notes: row.notes.trim() || null,
          restaurant_stock_items: stockMap.get(row.stockItemId) ?? null,
        }));
        const created: RestaurantRecipeCardRecord = {
          id: recipeId,
          ...recipePayload,
          derived_allergens: computed.allergens,
          restaurant_recipe_ingredients: ingredientRows,
        };
        const next = [...recipes.filter((row) => row.menu_item_id !== selectedItem.id), created];
        localStorage.setItem(`ncr-restaurant-recipes-${organization.id}`, JSON.stringify(next));
        setRecipes(next);
      } else {
        const { error: recipeError } = await supabase.rpc('save_restaurant_recipe', {
          p_organization_id: organization.id,
          p_menu_item_id: selectedItem.id,
          p_portions: portions,
          p_prep_time_minutes: recipePayload.prep_time_minutes,
          p_cooking_time_minutes: recipePayload.cooking_time_minutes,
          p_instructions: recipePayload.instructions,
          p_plating_notes: recipePayload.plating_notes,
          p_kitchen_notes: recipePayload.kitchen_notes,
          p_ingredients: form.ingredients.map((row, index) => ({
            stock_item_id: row.stockItemId,
            quantity: Number(row.quantity.replace(',', '.')),
            unit: row.unit.trim(),
            position: index,
            deduct_from_stock: row.deductFromStock,
            notes: row.notes.trim() || null,
          })),
        });
        if (recipeError) throw recipeError;
        await load();
      }
      setSuccess(`La fiche recette « ${selectedItem.name} » a été enregistrée.`);
    } catch (caught) {
      setError(restaurantErrorMessage(caught, 'Enregistrement de la fiche recette impossible.'));
    } finally {
      setSaving(false);
    }
  }

  async function syncAllergens() {
    if (!selectedRecipe || !supabase || demoMode) {
      if (selectedItem) setMenuItems((current) => current.map((item) => item.id === selectedItem.id ? { ...item, allergens: computed.allergens } : item));
      setSuccess('Les allergènes détectés ont été appliqués à la fiche du plat.');
      return;
    }
    setSaving(true); setError('');
    try {
      const { error: syncError } = await supabase.rpc('sync_restaurant_recipe_allergens', { p_recipe_id: selectedRecipe.id });
      if (syncError) throw syncError;
      await load();
      setSuccess('Les allergènes issus des ingrédients ont été appliqués à la carte.');
    } catch (caught) {
      setError(restaurantErrorMessage(caught, 'Synchronisation des allergènes impossible.'));
    } finally { setSaving(false); }
  }

  if (!organization) return null;

  const completed = recipes.length;
  const missing = Math.max(0, menuItems.length - completed);
  const negativeStock = stockItems.filter((item) => Number(item.quantity) < 0).length;

  return <div className="page restaurant-page restaurant-recipes-page">
    <header className="page-header restaurant-recipes-header">
      <div><p className="eyebrow">CUISINE & RENTABILITÉ</p><h1>Fiches recettes</h1><p>Structure les ingrédients, les quantités, la préparation et le coût matière de chaque plat.</p></div>
      {canManage && <button className="primary-button" onClick={addIngredient} disabled={!selectedItem}><Icon name="plus" size={18}/>Ajouter un ingrédient</button>}
    </header>

    {error && <div className="error-message page-message">{error}</div>}
    {success && <div className="success-message page-message">{success}</div>}

    <section className="restaurant-recipe-stats">
      <article><span className="restaurant-recipe-stat-icon">📋</span><div><small>Fiches prêtes</small><strong>{completed}/{menuItems.length}</strong></div></article>
      <article><span className="restaurant-recipe-stat-icon">⏳</span><div><small>À compléter</small><strong>{missing}</strong></div></article>
      <article><span className="restaurant-recipe-stat-icon">🧾</span><div><small>Coût matière</small><strong>{canViewCosts && selectedItem ? formatRestaurantMoney(computed.costPerPortion) : 'Pro'}</strong></div></article>
      <article className={negativeStock > 0 ? 'warning' : ''}><span className="restaurant-recipe-stat-icon">📦</span><div><small>Stocks négatifs</small><strong>{autoStock ? negativeStock : 'Pro'}</strong></div></article>
    </section>

    <section className="restaurant-recipes-layout">
      <aside className="panel restaurant-recipe-picker">
        <div className="restaurant-recipe-picker-head"><div><p className="eyebrow">CARTE</p><h2>Choisir un plat</h2></div><span>{menuItems.length}</span></div>
        <label className="restaurant-recipe-search"><Icon name="search" size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un plat…"/></label>
        <div className="restaurant-recipe-dish-list">
          {loading ? <div className="restaurant-empty">Chargement…</div> : filteredItems.length === 0 ? <div className="restaurant-empty">Aucun plat</div> : filteredItems.map((item) => {
            const recipe = recipeMap.get(item.id);
            return <button type="button" className={selectedItemId === item.id ? 'active' : ''} key={item.id} onClick={() => setSelectedItemId(item.id)}>
              <span className="restaurant-recipe-dish-visual">{recipeVisual(item.restaurant_menu_categories?.name)}</span>
              <span><strong>{item.name}</strong><small>{item.restaurant_menu_categories?.name || 'Sans catégorie'} · {formatRestaurantMoney(item.price_cents)}</small></span>
              <span className={`restaurant-recipe-completion ${recipe ? 'ready' : ''}`}>{recipe ? <Icon name="check" size={15}/> : <Icon name="plus" size={15}/>}</span>
            </button>;
          })}
        </div>
      </aside>

      <main className="restaurant-recipe-workspace">
        {!selectedItem ? <section className="panel restaurant-empty restaurant-recipe-empty"><Icon name="clipboard" size={34}/><strong>Sélectionne un plat</strong><p>Choisis un élément de la carte pour créer ou consulter sa fiche recette.</p></section> : <form onSubmit={saveRecipe}>
          <section className="panel restaurant-recipe-hero">
            <div className="restaurant-recipe-hero-visual">{recipeVisual(selectedItem.restaurant_menu_categories?.name)}</div>
            <div className="restaurant-recipe-hero-copy"><p className="eyebrow">{selectedItem.restaurant_menu_categories?.name || 'PLAT'}</p><h2>{selectedItem.name}</h2><p>{selectedItem.description_fr || 'Ajoute la méthode, les ingrédients et le dressage de ce plat.'}</p><div><span>{formatRestaurantMoney(selectedItem.price_cents)}</span>{selectedRecipe ? <span className="ready"><Icon name="check" size={14}/>Fiche enregistrée</span> : <span>À compléter</span>}</div></div>
            <div className="restaurant-recipe-profit-card"><small>Marge théorique</small><strong>{canViewCosts ? `${computed.marginRate.toFixed(1)} %` : 'Professionnelle'}</strong>{canViewCosts && <span>{formatRestaurantMoney(computed.marginCents)} / portion</span>}</div>
          </section>

          <section className="panel restaurant-recipe-settings">
            <div className="panel-header"><div><p className="eyebrow">RENDEMENT</p><h2>Temps et portions</h2></div></div>
            <div className="restaurant-recipe-time-grid">
              <label>Nombre de portions<input disabled={!canManage} inputMode="decimal" value={form.portions} onChange={(event) => setForm({ ...form, portions: event.target.value })}/></label>
              <label>Préparation (min)<input disabled={!canManage} inputMode="numeric" value={form.prepTime} onChange={(event) => setForm({ ...form, prepTime: event.target.value })}/></label>
              <label>Cuisson (min)<input disabled={!canManage} inputMode="numeric" value={form.cookingTime} onChange={(event) => setForm({ ...form, cookingTime: event.target.value })}/></label>
              <div className="restaurant-recipe-time-total"><Icon name="clock" size={20}/><span>Temps total<strong>{Math.max(0, Number(form.prepTime) || 0) + Math.max(0, Number(form.cookingTime) || 0)} min</strong></span></div>
            </div>
          </section>

          <section className="panel restaurant-recipe-ingredients-panel">
            <div className="panel-header"><div><p className="eyebrow">COMPOSITION</p><h2>Ingrédients</h2><p>Les quantités correspondent au rendement indiqué ci-dessus.</p></div>{canManage && <button type="button" className="secondary-button compact-button" onClick={addIngredient}><Icon name="plus" size={16}/>Ajouter</button>}</div>
            {form.ingredients.length === 0 ? <div className="restaurant-empty"><Icon name="briefcase" size={28}/><strong>Aucun ingrédient</strong><p>Ajoute les produits utilisés dans cette recette.</p></div> : <div className="restaurant-recipe-ingredient-list">
              {form.ingredients.map((ingredient, index) => {
                const stock = stockMap.get(ingredient.stockItemId);
                const units = stock ? compatibleUnits(stock.unit) : ['unité'];
                return <article key={ingredient.id ?? `${ingredient.stockItemId}-${index}`}>
                  <span className="restaurant-recipe-ingredient-index">{index + 1}</span>
                  <label>Produit<select disabled={!canManage} value={ingredient.stockItemId} onChange={(event) => updateIngredient(index, { stockItemId: event.target.value })}>{stockItems.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.quantity} {item.unit}</option>)}</select></label>
                  <label>Quantité<input disabled={!canManage} inputMode="decimal" value={ingredient.quantity} onChange={(event) => updateIngredient(index, { quantity: event.target.value })}/></label>
                  <label>Unité<select disabled={!canManage} value={ingredient.unit} onChange={(event) => updateIngredient(index, { unit: event.target.value })}>{units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
                  <label className="restaurant-recipe-ingredient-note">Précision<input disabled={!canManage} value={ingredient.notes} onChange={(event) => updateIngredient(index, { notes: event.target.value })} placeholder="Émincé, égoutté…"/></label>
                  <label className="restaurant-recipe-deduct"><input type="checkbox" disabled={!canManage || !autoStock} checked={ingredient.deductFromStock} onChange={(event) => updateIngredient(index, { deductFromStock: event.target.checked })}/><span>Déduire du stock</span></label>
                  {canManage && <button type="button" className="restaurant-recipe-remove" aria-label="Retirer l’ingrédient" onClick={() => setForm((current) => ({ ...current, ingredients: current.ingredients.filter((_, rowIndex) => rowIndex !== index) }))}><Icon name="close" size={17}/></button>}
                </article>;
              })}
            </div>}
            {!autoStock && <div className="restaurant-recipe-feature-note"><Icon name="lock" size={17}/><span>Le déstockage automatique des plats servis est inclus dans l’offre Professionnelle.</span></div>}
          </section>

          <section className="restaurant-recipe-notes-grid">
            <article className="panel"><p className="eyebrow">MÉTHODE</p><h2>Préparation</h2><textarea disabled={!canManage} rows={8} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="1. Préparer…&#10;2. Cuire…&#10;3. Réserver…"/></article>
            <article className="panel"><p className="eyebrow">FINITION</p><h2>Dressage</h2><textarea disabled={!canManage} rows={4} value={form.platingNotes} onChange={(event) => setForm({ ...form, platingNotes: event.target.value })} placeholder="Disposition, assiette, sauce, finition…"/><p className="eyebrow restaurant-recipe-second-label">ÉQUIPE</p><h2>Consignes cuisine</h2><textarea disabled={!canManage} rows={3} value={form.kitchenNotes} onChange={(event) => setForm({ ...form, kitchenNotes: event.target.value })} placeholder="Conservation, mise en place, point de vigilance…"/></article>
          </section>

          <section className="panel restaurant-recipe-summary-panel">
            <div className="restaurant-recipe-summary-main"><p className="eyebrow">SYNTHÈSE</p><h2>Rentabilité et allergènes</h2><div className="restaurant-recipe-summary-metrics"><div><small>Prix de vente</small><strong>{formatRestaurantMoney(selectedItem.price_cents)}</strong></div><div><small>Coût / portion</small><strong>{canViewCosts ? formatRestaurantMoney(computed.costPerPortion) : '🔒 Pro'}</strong></div><div><small>Marge brute</small><strong>{canViewCosts ? formatRestaurantMoney(computed.marginCents) : '🔒 Pro'}</strong></div><div><small>Taux de marge</small><strong>{canViewCosts ? `${computed.marginRate.toFixed(1)} %` : '🔒 Pro'}</strong></div></div></div>
            <div className="restaurant-recipe-allergens"><div><span>Allergènes détectés</span>{computed.allergens.length > 0 ? <div>{computed.allergens.map((allergen) => <b key={allergen}>{allergen}</b>)}</div> : <small>Aucun allergène déclaré sur les ingrédients.</small>}</div>{canManage && <button type="button" className="secondary-button compact-button" disabled={!selectedRecipe || saving} onClick={() => void syncAllergens()}>Appliquer à la carte</button>}</div>
          </section>

          {canManage ? <div className="restaurant-recipe-actions"><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Enregistrement…' : selectedRecipe ? 'Mettre à jour la fiche' : 'Créer la fiche recette'}</button></div> : <div className="info-message">Cette fiche est en lecture seule. Seul un responsable peut modifier les recettes.</div>}
        </form>}
      </main>
    </section>
  </div>;
}
