import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  formatRestaurantMoney,
  nullableRestaurantText,
  RESTAURANT_ALLERGENS,
  type RestaurantMenuCategoryRecord,
  type RestaurantMenuItemRecord,
} from '../features/restaurant/types';
import { supabase } from '../lib/supabase';

type MenuForm = {
  categoryId: string;
  name: string;
  nameEn: string;
  nameEs: string;
  nameIt: string;
  descriptionFr: string;
  descriptionEn: string;
  descriptionEs: string;
  descriptionIt: string;
  price: string;
  cost: string;
  allergens: string[];
  vegetarian: boolean;
  vegan: boolean;
  featured: boolean;
};

type TranslationPayload = {
  provider: string;
  translations: Record<'en' | 'es' | 'it', Record<string, string>>;
};

const emptyItem: MenuForm = {
  categoryId: '',
  name: '',
  nameEn: '',
  nameEs: '',
  nameIt: '',
  descriptionFr: '',
  descriptionEn: '',
  descriptionEs: '',
  descriptionIt: '',
  price: '',
  cost: '',
  allergens: [],
  vegetarian: false,
  vegan: false,
  featured: false,
};

function centsFromInput(value: string) {
  const amount = Number(value.replace(',', '.'));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

function menuVisual(categoryName = '') {
  const value = categoryName.toLowerCase();
  if (value.includes('boisson') || value.includes('vin') || value.includes('cocktail')) return '🥂';
  if (value.includes('entrée') || value.includes('entree') || value.includes('salade')) return '🥗';
  if (value.includes('dessert') || value.includes('glace')) return '🍰';
  if (value.includes('menu')) return '📖';
  return '🍽️';
}

function mergeTranslatedForm(form: MenuForm, payload: TranslationPayload): MenuForm {
  const { translations } = payload;
  return {
    ...form,
    nameEn: form.nameEn || translations.en.name || '',
    nameEs: form.nameEs || translations.es.name || '',
    nameIt: form.nameIt || translations.it.name || '',
    descriptionEn: form.descriptionEn || translations.en.description || '',
    descriptionEs: form.descriptionEs || translations.es.description || '',
    descriptionIt: form.descriptionIt || translations.it.description || '',
  };
}

export function RestaurantMenuPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [categories, setCategories] = useState<RestaurantMenuCategoryRecord[]>([]);
  const [items, setItems] = useState<RestaurantMenuItemRecord[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [form, setForm] = useState<MenuForm>(emptyItem);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');

  const hasQr = Boolean(organization && organizationHasFeature(organization, 'restaurant_multilingual_qr_menu'));
  const hasCost = Boolean(organization && organizationHasFeature(organization, 'restaurant_food_cost'));
  const canViewCosts = hasCost && ['owner', 'admin'].includes(organization?.role ?? 'viewer');

  async function load() {
    if (!organization) return;
    setError('');
    if (demoMode || !supabase) {
      setCategories(JSON.parse(localStorage.getItem(`ncr-restaurant-categories-${organization.id}`) || '[]'));
      setItems((JSON.parse(localStorage.getItem(`ncr-restaurant-menu-${organization.id}`) || '[]') as RestaurantMenuItemRecord[])
        .map((row) => ({ ...row, cost_cents: Number(row.cost_cents ?? 0) })));
      return;
    }

    const [categoryResult, itemResult, costResult] = await Promise.all([
      supabase.from('restaurant_menu_categories').select('*').eq('organization_id', organization.id).eq('active', true).order('position'),
      supabase.from('restaurant_menu_items')
        .select('*,restaurant_menu_categories(name,name_en,name_es,name_it)')
        .eq('organization_id', organization.id)
        .order('name'),
      canViewCosts
        ? supabase.from('restaurant_menu_costs').select('menu_item_id,cost_cents').eq('organization_id', organization.id)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const firstError = categoryResult.error || itemResult.error || costResult.error;
    if (firstError) setError(firstError.message);
    const costs = new Map((costResult.data ?? []).map((row: { menu_item_id: string; cost_cents: number }) => [row.menu_item_id, row.cost_cents]));
    setCategories((categoryResult.data ?? []) as RestaurantMenuCategoryRecord[]);
    setItems(((itemResult.data ?? []) as RestaurantMenuItemRecord[]).map((row) => ({ ...row, cost_cents: Number(costs.get(row.id) ?? 0) })));
  }

  useEffect(() => { void load(); }, [organization?.id, demoMode, canViewCosts]);

  async function requestTranslation(segments: Record<string, string>): Promise<TranslationPayload> {
    if (!organization || !supabase || demoMode) throw new Error('La traduction automatique nécessite Supabase.');
    const { data, error: functionError } = await supabase.functions.invoke('translate-restaurant-menu', {
      body: { organization_id: organization.id, segments },
    });
    if (functionError) throw new Error(functionError.message || 'La fonction de traduction est indisponible.');
    if (data?.error) throw new Error(String(data.error));
    if (!data?.translations) throw new Error('Réponse de traduction incomplète.');
    return data as TranslationPayload;
  }

  async function translateDraft() {
    if (!form.name.trim()) { setError('Indique d’abord le nom français du plat.'); return; }
    setTranslating(true); setError(''); setWarning('');
    try {
      const translated = await requestTranslation({
        name: form.name.trim(),
        ...(form.descriptionFr.trim() ? { description: form.descriptionFr.trim() } : {}),
      });
      setForm((current) => mergeTranslatedForm({
        ...current,
        nameEn: '', nameEs: '', nameIt: '',
        descriptionEn: '', descriptionEs: '', descriptionIt: '',
      }, translated));
      setSuccess(`Traductions générées avec ${translated.provider === 'deepl' ? 'DeepL' : 'le moteur automatique'}. Tu peux les relire avant d’enregistrer.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Traduction impossible.');
    } finally {
      setTranslating(false);
    }
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !categoryName.trim()) return;
    setSaving(true); setError(''); setSuccess(''); setWarning('');
    try {
      let translations: TranslationPayload | null = null;
      if (hasQr && supabase && !demoMode) {
        try { translations = await requestTranslation({ category: categoryName.trim() }); }
        catch (caught) { setWarning(`Catégorie créée en français, mais traduction non générée : ${caught instanceof Error ? caught.message : 'service indisponible'}`); }
      }
      const payload = {
        organization_id: organization.id,
        name: categoryName.trim(),
        name_en: translations?.translations.en.category || null,
        name_es: translations?.translations.es.category || null,
        name_it: translations?.translations.it.category || null,
        translation_provider: translations?.provider || null,
        translated_at: translations ? new Date().toISOString() : null,
        position: categories.length,
        created_by: user.id,
      };
      let created: RestaurantMenuCategoryRecord;
      if (demoMode || !supabase) {
        created = { id: crypto.randomUUID(), ...payload, active: true };
        localStorage.setItem(`ncr-restaurant-categories-${organization.id}`, JSON.stringify([...categories, created]));
      } else {
        const { data, error: insertError } = await supabase.from('restaurant_menu_categories').insert(payload).select('*').single();
        if (insertError) throw insertError;
        created = data as RestaurantMenuCategoryRecord;
      }
      setCategories((current) => [...current, created]);
      setCategoryName('');
      setSuccess(translations ? 'La catégorie et ses traductions ont été ajoutées.' : 'La catégorie a été ajoutée.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Création impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function submitItem(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !form.categoryId || !form.name.trim()) return;
    const priceCents = centsFromInput(form.price);
    if (priceCents === null) { setError('Le prix du plat est invalide.'); return; }
    const costCents = canViewCosts ? centsFromInput(form.cost || '0') : 0;
    if (canViewCosts && costCents === null) { setError('Le coût matière est invalide.'); return; }

    setSaving(true); setError(''); setSuccess(''); setWarning('');
    let resolvedForm = form;
    const currentItem = editingId ? items.find((row) => row.id === editingId) : null;
    let translationProvider: string | null = currentItem?.translation_provider ?? null;
    let translatedAt: string | null = currentItem?.translated_at ?? null;
    if (hasQr && supabase && !demoMode) {
      const missing = !form.nameEn || !form.nameEs || !form.nameIt
        || (Boolean(form.descriptionFr.trim()) && (!form.descriptionEn || !form.descriptionEs || !form.descriptionIt));
      if (missing) {
        try {
          const translated = await requestTranslation({
            name: form.name.trim(),
            ...(form.descriptionFr.trim() ? { description: form.descriptionFr.trim() } : {}),
          });
          resolvedForm = mergeTranslatedForm(form, translated);
          translationProvider = translated.provider;
          translatedAt = new Date().toISOString();
          setForm(resolvedForm);
        } catch (caught) {
          setWarning(`Le plat sera enregistré, mais la traduction automatique a échoué : ${caught instanceof Error ? caught.message : 'service indisponible'}`);
        }
      }
    }

    const category = categories.find((row) => row.id === resolvedForm.categoryId);
    const payload = {
      organization_id: organization.id,
      category_id: resolvedForm.categoryId,
      name: resolvedForm.name.trim(),
      name_en: hasQr ? nullableRestaurantText(resolvedForm.nameEn) : null,
      name_es: hasQr ? nullableRestaurantText(resolvedForm.nameEs) : null,
      name_it: hasQr ? nullableRestaurantText(resolvedForm.nameIt) : null,
      description_fr: nullableRestaurantText(resolvedForm.descriptionFr),
      description_en: hasQr ? nullableRestaurantText(resolvedForm.descriptionEn) : null,
      description_es: hasQr ? nullableRestaurantText(resolvedForm.descriptionEs) : null,
      description_it: hasQr ? nullableRestaurantText(resolvedForm.descriptionIt) : null,
      price_cents: priceCents,
      allergens: resolvedForm.allergens,
      vegetarian: resolvedForm.vegetarian,
      vegan: resolvedForm.vegan,
      featured: resolvedForm.featured,
      translation_provider: translationProvider,
      translated_at: translationProvider ? (translatedAt || new Date().toISOString()) : null,
      created_by: user.id,
    };

    try {
      let saved: RestaurantMenuItemRecord;
      if (demoMode || !supabase) {
        const base = {
          ...payload,
          cost_cents: Number(costCents ?? 0),
          available: editingId ? (items.find((row) => row.id === editingId)?.available ?? true) : true,
          image_url: null,
          restaurant_menu_categories: category ? { name: category.name, name_en: category.name_en, name_es: category.name_es, name_it: category.name_it } : null,
        };
        saved = { id: editingId || crypto.randomUUID(), ...base };
        const next = editingId ? items.map((row) => row.id === editingId ? saved : row) : [...items, saved];
        localStorage.setItem(`ncr-restaurant-menu-${organization.id}`, JSON.stringify(next));
      } else if (editingId) {
        const { created_by: _createdBy, ...updatePayload } = payload;
        const { data, error: updateError } = await supabase.from('restaurant_menu_items')
          .update(updatePayload)
          .eq('organization_id', organization.id)
          .eq('id', editingId)
          .select('*,restaurant_menu_categories(name,name_en,name_es,name_it)')
          .single();
        if (updateError) throw updateError;
        saved = { ...(data as RestaurantMenuItemRecord), cost_cents: Number(costCents ?? 0) };
      } else {
        const { data, error: insertError } = await supabase.from('restaurant_menu_items')
          .insert(payload)
          .select('*,restaurant_menu_categories(name,name_en,name_es,name_it)')
          .single();
        if (insertError) throw insertError;
        saved = { ...(data as RestaurantMenuItemRecord), cost_cents: Number(costCents ?? 0) };
      }

      if (!demoMode && supabase && canViewCosts) {
        const { error: costError } = await supabase.from('restaurant_menu_costs').upsert({
          organization_id: organization.id,
          menu_item_id: saved.id,
          cost_cents: Number(costCents ?? 0),
          created_by: user.id,
        }, { onConflict: 'organization_id,menu_item_id' });
        if (costError) throw costError;
      }

      setItems((current) => editingId
        ? current.map((row) => row.id === editingId ? saved : row)
        : [...current, saved]);
      setForm(emptyItem);
      setEditingId(null);
      setSuccess(editingId ? 'Le plat a été modifié.' : 'Le plat a été ajouté à la carte.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  function startEditing(row: RestaurantMenuItemRecord) {
    setEditingId(row.id);
    setForm({
      categoryId: row.category_id,
      name: row.name,
      nameEn: row.name_en || '',
      nameEs: row.name_es || '',
      nameIt: row.name_it || '',
      descriptionFr: row.description_fr || '',
      descriptionEn: row.description_en || '',
      descriptionEs: row.description_es || '',
      descriptionIt: row.description_it || '',
      price: (row.price_cents / 100).toFixed(2).replace('.', ','),
      cost: ((row.cost_cents ?? 0) / 100).toFixed(2).replace('.', ','),
      allergens: row.allergens ?? [],
      vegetarian: row.vegetarian,
      vegan: row.vegan,
      featured: row.featured,
    });
    setError(''); setSuccess(''); setWarning('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function translateExisting(row: RestaurantMenuItemRecord) {
    if (!organization || !supabase || demoMode) return;
    setTranslating(true); setError(''); setSuccess('');
    try {
      const translated = await requestTranslation({
        name: row.name,
        ...(row.description_fr ? { description: row.description_fr } : {}),
      });
      const updates = {
        name_en: translated.translations.en.name || null,
        name_es: translated.translations.es.name || null,
        name_it: translated.translations.it.name || null,
        description_en: translated.translations.en.description || null,
        description_es: translated.translations.es.description || null,
        description_it: translated.translations.it.description || null,
        translation_provider: translated.provider,
        translated_at: new Date().toISOString(),
      };
      const { error: updateError } = await supabase.from('restaurant_menu_items').update(updates)
        .eq('organization_id', organization.id).eq('id', row.id);
      if (updateError) throw updateError;
      setItems((current) => current.map((item) => item.id === row.id ? { ...item, ...updates } : item));
      setSuccess(`« ${row.name} » a été traduit en anglais, espagnol et italien.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Traduction impossible.');
    } finally {
      setTranslating(false);
    }
  }

  async function translateCategory(row: RestaurantMenuCategoryRecord) {
    if (!organization || !supabase || demoMode) return;
    setTranslating(true); setError(''); setSuccess('');
    try {
      const translated = await requestTranslation({ category: row.name });
      const updates = {
        name_en: translated.translations.en.category || null,
        name_es: translated.translations.es.category || null,
        name_it: translated.translations.it.category || null,
        translation_provider: translated.provider,
        translated_at: new Date().toISOString(),
      };
      const { error: updateError } = await supabase.from('restaurant_menu_categories').update(updates)
        .eq('organization_id', organization.id).eq('id', row.id);
      if (updateError) throw updateError;
      setCategories((current) => current.map((category) => category.id === row.id ? { ...category, ...updates } : category));
      setSuccess(`La catégorie « ${row.name} » a été traduite.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Traduction impossible.');
    } finally {
      setTranslating(false);
    }
  }

  async function toggleAvailability(row: RestaurantMenuItemRecord) {
    if (!organization) return;
    const available = !row.available;
    try {
      if (demoMode || !supabase) {
        const next = items.map((item) => item.id === row.id ? { ...item, available } : item);
        localStorage.setItem(`ncr-restaurant-menu-${organization.id}`, JSON.stringify(next));
        setItems(next);
      } else {
        const { error: updateError } = await supabase.from('restaurant_menu_items').update({ available })
          .eq('organization_id', organization.id).eq('id', row.id);
        if (updateError) throw updateError;
        setItems((current) => current.map((item) => item.id === row.id ? { ...item, available } : item));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Modification impossible.');
    }
  }

  async function removeItem(row: RestaurantMenuItemRecord) {
    if (!organization || !window.confirm(`Supprimer définitivement « ${row.name} » ?`)) return;
    try {
      if (demoMode || !supabase) {
        const next = items.filter((item) => item.id !== row.id);
        localStorage.setItem(`ncr-restaurant-menu-${organization.id}`, JSON.stringify(next));
        setItems(next);
      } else {
        const { error: deleteError } = await supabase.from('restaurant_menu_items').delete()
          .eq('organization_id', organization.id).eq('id', row.id);
        if (deleteError) throw deleteError;
        setItems((current) => current.filter((item) => item.id !== row.id));
      }
      if (editingId === row.id) { setEditingId(null); setForm(emptyItem); }
      setSuccess('Le plat a été supprimé.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Suppression impossible.');
    }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? items.filter((row) => `${row.name} ${row.name_en ?? ''} ${row.restaurant_menu_categories?.name ?? ''} ${row.allergens.join(' ')}`.toLowerCase().includes(needle))
      : items;
  }, [items, query]);
  const availableCount = items.filter((row) => row.available).length;
  const featuredCount = items.filter((row) => row.featured && row.available).length;
  const translatedCount = items.filter((row) => row.name_en && row.name_es && row.name_it).length;

  if (!organization) return null;
  return <div className="page restaurant-page restaurant-menu-admin-page restaurant-premium-workspace">
    <header className="page-header restaurant-menu-admin-header"><div><p className="eyebrow">RESTAURATION · CARTE</p><h1>Carte & menus</h1><p>Construis une carte élégante, claire et directement exploitable pour la commande tactile et le menu QR multilingue.</p></div><div className="restaurant-menu-header-actions"><span className="restaurant-menu-header-visual">🍽️</span>{hasQr && <a className="secondary-button" href={`/r/${organization.slug}/menu`} target="_blank" rel="noreferrer"><Icon name="eye" size={18}/>Voir le menu public</a>}</div></header>
    {error && <div className="error-message page-message">{error}</div>}
    {warning && <div className="info-message page-message">{warning}</div>}
    {success && <div className="success-message page-message">{success}</div>}

    <section className="restaurant-menu-overview">
      <article><span>🍽️</span><div><small>Plats disponibles</small><strong>{availableCount}</strong></div></article>
      <article><span>⭐</span><div><small>Suggestions du chef</small><strong>{featuredCount}</strong></div></article>
      <article><span>🌍</span><div><small>Traductions prêtes</small><strong>{translatedCount}/{items.length}</strong></div></article>
      <article><span>📚</span><div><small>Catégories</small><strong>{categories.length}</strong></div></article>
    </section>

    <section className="restaurant-menu-layout">
      <article className="panel restaurant-form-panel">
        <div className="panel-header"><div><p className="eyebrow">CATÉGORIES</p><h2>Structurer la carte</h2></div></div>
        <form className="restaurant-inline-form" onSubmit={addCategory}><input required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Entrées, plats, desserts…"/><button className="secondary-button" disabled={saving}>Ajouter</button></form>
        <div className="restaurant-category-list">{categories.map((row) => <div key={row.id}><span>{row.name}</span>{hasQr && <button type="button" className="text-button" disabled={translating} onClick={() => void translateCategory(row)}>{row.name_en && row.name_es && row.name_it ? 'Retraduire' : 'Traduire'}</button>}</div>)}</div>
      </article>

      <article className="panel restaurant-form-panel restaurant-menu-form">
        <div className="panel-header"><div><p className="eyebrow">{editingId ? 'MODIFICATION' : 'NOUVEAU PLAT'}</p><h2>{editingId ? 'Modifier le plat' : 'Ajouter à la carte'}</h2></div>{editingId && <button type="button" className="text-button" onClick={() => { setEditingId(null); setForm(emptyItem); }}>Annuler</button>}</div>
        <form className="restaurant-form-grid" onSubmit={submitItem}>
          <label>Catégorie *<select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Sélectionner…</option>{categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label>Nom français *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></label>
          <label>Prix TTC (€) *<input required inputMode="decimal" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })}/></label>
          {canViewCosts && <label>Coût matière (€)<input inputMode="decimal" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })}/></label>}
          <label className="full-field">Description française<textarea rows={3} value={form.descriptionFr} onChange={(event) => setForm({ ...form, descriptionFr: event.target.value })}/></label>

          {hasQr && <>
            <div className="full-field restaurant-translation-toolbar"><div><strong>Traductions automatiques</strong><span>Nom et description du plat en trois langues, entièrement modifiables.</span></div><button type="button" className="secondary-button" disabled={translating || !form.name.trim()} onClick={() => void translateDraft()}><Icon name="sparkles" size={18}/>{translating ? 'Traduction…' : 'Traduire automatiquement'}</button></div>
            <label>Nom anglais<input value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })}/></label>
            <label>Nom espagnol<input value={form.nameEs} onChange={(event) => setForm({ ...form, nameEs: event.target.value })}/></label>
            <label className="full-field">Nom italien<input value={form.nameIt} onChange={(event) => setForm({ ...form, nameIt: event.target.value })}/></label>
            <label>Description anglaise<textarea rows={3} value={form.descriptionEn} onChange={(event) => setForm({ ...form, descriptionEn: event.target.value })}/></label>
            <label>Description espagnole<textarea rows={3} value={form.descriptionEs} onChange={(event) => setForm({ ...form, descriptionEs: event.target.value })}/></label>
            <label className="full-field">Description italienne<textarea rows={3} value={form.descriptionIt} onChange={(event) => setForm({ ...form, descriptionIt: event.target.value })}/></label>
          </>}

          <fieldset className="full-field restaurant-allergen-field"><legend>Allergènes</legend><div>{RESTAURANT_ALLERGENS.map((allergen) => <label key={allergen}><input type="checkbox" checked={form.allergens.includes(allergen)} onChange={(event) => setForm({ ...form, allergens: event.target.checked ? [...form.allergens, allergen] : form.allergens.filter((value) => value !== allergen) })}/>{allergen}</label>)}</div></fieldset>
          <div className="full-field restaurant-switch-row"><label><input type="checkbox" checked={form.vegetarian} onChange={(event) => setForm({ ...form, vegetarian: event.target.checked })}/>Végétarien</label><label><input type="checkbox" checked={form.vegan} onChange={(event) => setForm({ ...form, vegan: event.target.checked })}/>Végan</label><label><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })}/>À la une</label></div>
          <button className="primary-button full-field" disabled={saving || categories.length === 0}>{saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Ajouter le plat'}</button>
        </form>
      </article>
    </section>

    <section className="panel restaurant-list-panel restaurant-menu-catalog-panel">
      <div className="panel-header"><div><p className="eyebrow">CARTE ACTIVE</p><h2>{items.length} plat{items.length > 1 ? 's' : ''}</h2></div><div className="restaurant-search"><Icon name="search" size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher…"/></div></div>
      <div className="restaurant-menu-list">{filtered.map((row) => {
        const margin = row.price_cents > 0 && row.cost_cents > 0 ? Math.round(((row.price_cents - row.cost_cents) / row.price_cents) * 100) : null;
        const translated = Boolean(row.name_en && row.name_es && row.name_it && (!row.description_fr || (row.description_en && row.description_es && row.description_it)));
        const categoryName = row.restaurant_menu_categories?.name || 'Sans catégorie';
        return <article key={row.id} className={`restaurant-dish-admin-card ${!row.available ? 'is-muted' : ''} ${row.featured ? 'is-featured' : ''}`}><div className="restaurant-dish-admin-visual"><span>{menuVisual(categoryName)}</span>{row.featured && <small>Suggestion</small>}</div><div className="restaurant-menu-copy"><div><span>{categoryName}</span>{hasQr && <small className={translated ? 'translation-ok' : 'translation-missing'}>{translated ? '3 langues prêtes' : 'Traduction à compléter'}</small>}</div><h3>{row.name}</h3><p>{row.description_fr || 'Ajoute une description pour mieux présenter ce plat sur le menu public.'}</p><div className="restaurant-menu-tags">{row.vegetarian && <span>🌿 Végétarien</span>}{row.vegan && <span>🌱 Végan</span>}{row.allergens.map((allergen) => <span key={allergen} className="warning">{allergen}</span>)}</div></div><div className="restaurant-menu-price"><strong>{formatRestaurantMoney(row.price_cents)}</strong><span className={row.available ? 'available' : 'unavailable'}>{row.available ? 'Disponible' : 'Indisponible'}</span>{canViewCosts && <div className="restaurant-menu-margin"><span>Coût {formatRestaurantMoney(row.cost_cents)}</span>{margin !== null && <small>{margin}% de marge brute</small>}</div>}</div><div className="restaurant-item-actions"><Link className="secondary-button compact-button" to={`/recettes?plat=${row.id}`}>Fiche recette</Link><button className="secondary-button compact-button" type="button" onClick={() => startEditing(row)}>Modifier</button>{hasQr && <button className="secondary-button compact-button" type="button" disabled={translating} onClick={() => void translateExisting(row)}>{translated ? 'Retraduire' : 'Traduire'}</button>}<button className="secondary-button compact-button" type="button" onClick={() => void toggleAvailability(row)}>{row.available ? 'Masquer' : 'Remettre en vente'}</button><button className="text-button danger-text" type="button" onClick={() => void removeItem(row)}>Supprimer</button></div></article>;
      })}{filtered.length === 0 && <div className="restaurant-empty"><Icon name="utensils" size={30}/><strong>Aucun plat dans cette sélection.</strong></div>}</div>
    </section>
  </div>;
}
