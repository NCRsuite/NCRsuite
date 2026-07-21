export type RestaurantEmployeeRole = 'manager' | 'server' | 'cook' | 'host' | 'dishwasher' | 'other';
export type RestaurantReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'canceled' | 'no_show';

export interface RestaurantEmployeeRecord {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  role_code: RestaurantEmployeeRole;
  email: string | null;
  phone: string | null;
  weekly_hours: number;
  linked_user_id: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at?: string;
}

export interface RestaurantShiftRecord {
  id: string;
  organization_id: string;
  employee_id: string;
  starts_at: string;
  ends_at: string;
  position_label: string | null;
  notes: string | null;
  status: 'planned' | 'completed' | 'canceled';
  restaurant_employees?: Pick<RestaurantEmployeeRecord, 'first_name' | 'last_name' | 'role_code'>;
}

export interface RestaurantMenuCategoryRecord {
  id: string;
  organization_id: string;
  name: string;
  name_en: string | null;
  name_es: string | null;
  name_it: string | null;
  translation_provider?: string | null;
  translated_at?: string | null;
  position: number;
  active: boolean;
}

export interface RestaurantMenuItemRecord {
  id: string;
  organization_id: string;
  category_id: string;
  name: string;
  name_en: string | null;
  name_es: string | null;
  name_it: string | null;
  description_fr: string | null;
  description_en: string | null;
  description_es: string | null;
  description_it: string | null;
  price_cents: number;
  cost_cents: number;
  allergens: string[];
  vegetarian: boolean;
  vegan: boolean;
  available: boolean;
  featured: boolean;
  image_url: string | null;
  translation_provider?: string | null;
  translated_at?: string | null;
  restaurant_menu_categories?: { name: string; name_en?: string | null; name_es?: string | null; name_it?: string | null } | null;
}

export interface RestaurantSupplierRecord {
  id: string;
  organization_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | 'archived';
}

export interface RestaurantStockItemRecord {
  id: string;
  organization_id: string;
  supplier_id: string | null;
  name: string;
  category: string | null;
  unit: string;
  quantity: number;
  minimum_quantity: number;
  unit_cost_cents: number;
  allergens: string[];
  status: 'active' | 'inactive' | 'archived';
  restaurant_suppliers?: { name: string } | null;
}


export interface RestaurantRecipeCardRecord {
  id: string;
  organization_id: string;
  menu_item_id: string;
  portions: number;
  prep_time_minutes: number;
  cooking_time_minutes: number;
  instructions: string | null;
  plating_notes: string | null;
  kitchen_notes: string | null;
  derived_allergens: string[];
  active: boolean;
  created_at?: string;
  updated_at?: string;
  restaurant_recipe_ingredients?: RestaurantRecipeIngredientRecord[];
}

export interface RestaurantRecipeIngredientRecord {
  id: string;
  organization_id: string;
  recipe_id: string;
  stock_item_id: string;
  quantity: number;
  unit: string;
  position: number;
  deduct_from_stock: boolean;
  notes: string | null;
  restaurant_stock_items?: Pick<RestaurantStockItemRecord, 'id' | 'name' | 'unit' | 'unit_cost_cents' | 'allergens' | 'quantity'> | null;
}

export type RestaurantStockMovementType =
  | 'manual_adjustment'
  | 'restock'
  | 'inventory'
  | 'waste'
  | 'recipe_consumption'
  | 'recipe_reversal';

export interface RestaurantStockMovementRecord {
  id: string;
  organization_id: string;
  stock_item_id: string;
  recipe_id: string | null;
  recipe_ingredient_id: string | null;
  order_id: string | null;
  order_item_id: string | null;
  waste_record_id: string | null;
  movement_type: RestaurantStockMovementType;
  quantity_delta: number;
  unit: string;
  unit_cost_cents: number;
  balance_before: number;
  balance_after: number;
  notes: string | null;
  reversal_of: string | null;
  reversed_at: string | null;
  created_at: string;
  restaurant_stock_items?: { name: string } | null;
}

export type RestaurantTableShape = 'round' | 'square' | 'rectangle';
export type RestaurantTableServiceStatus = 'available' | 'reserved' | 'occupied' | 'ordering' | 'payment' | 'cleaning' | 'unavailable';
export type RestaurantFloorElementType = 'wall' | 'door' | 'window' | 'counter' | 'kitchen' | 'toilet' | 'stairs' | 'restricted' | 'label';

export interface RestaurantFloorRoomRecord {
  id: string;
  organization_id: string;
  name: string;
  canvas_width: number;
  canvas_height: number;
  grid_enabled: boolean;
  grid_size: number;
  background_url: string | null;
  position: number;
  active: boolean;
  created_at?: string;
}

export interface RestaurantFloorElementRecord {
  id: string;
  organization_id: string;
  room_id: string;
  element_type: RestaurantFloorElementType;
  label: string | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  active: boolean;
}

export interface RestaurantTableRecord {
  id: string;
  organization_id: string;
  room_id: string | null;
  name: string;
  area: string;
  capacity: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  shape: RestaurantTableShape;
  service_status: RestaurantTableServiceStatus;
  z_index: number;
  active: boolean;
}

export interface RestaurantReservationRecord {
  id: string;
  organization_id: string;
  table_id: string | null;
  source: 'manual' | 'online';
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  party_size: number;
  reservation_at: string;
  duration_minutes: number;
  status: RestaurantReservationStatus;
  notes: string | null;
  restaurant_tables?: { name: string; area: string } | null;
}

export interface RestaurantTemperatureRecord {
  id: string;
  organization_id: string;
  employee_id: string | null;
  equipment_name: string;
  temperature_celsius: number;
  minimum_celsius: number | null;
  maximum_celsius: number | null;
  compliant: boolean;
  notes: string | null;
  logged_at: string;
  restaurant_employees?: { first_name: string; last_name: string } | null;
}

export interface RestaurantChecklistTemplateRecord {
  id: string;
  organization_id: string;
  name: string;
  checklist_type: 'opening' | 'closing' | 'cleaning';
  active: boolean;
  restaurant_checklist_items?: RestaurantChecklistItemRecord[];
}

export interface RestaurantChecklistItemRecord {
  id: string;
  organization_id: string;
  template_id: string;
  label: string;
  required: boolean;
  position: number;
}


export interface RestaurantChecklistRunRecord {
  id: string;
  organization_id: string;
  template_id: string;
  completed_item_ids: string[];
  status: 'in_progress' | 'completed' | 'non_compliant';
  notes: string | null;
  completed_at: string;
}

export interface RestaurantWasteRecord {
  id: string;
  organization_id: string;
  stock_item_id: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  reason: string;
  estimated_cost_cents: number;
  recorded_at: string;
}

export function nullableRestaurantText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function formatRestaurantMoney(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((Number(cents) || 0) / 100);
}

export function formatRestaurantDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export const RESTAURANT_ALLERGENS = ['Gluten', 'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja', 'Lait', 'Fruits à coque', 'Céleri', 'Moutarde', 'Sésame', 'Sulfites', 'Lupin', 'Mollusques'];

export const RESTAURANT_ROLE_LABELS: Record<RestaurantEmployeeRole, string> = {
  manager: 'Manager', server: 'Serveur', cook: 'Cuisine', host: 'Accueil', dishwasher: 'Plonge', other: 'Autre'
};

export type RestaurantOrderStatus = 'draft' | 'sent' | 'in_progress' | 'ready' | 'served' | 'bill_requested' | 'closed' | 'canceled';
export type RestaurantOrderItemStatus = 'draft' | 'sent' | 'in_progress' | 'ready' | 'served' | 'canceled';
export type RestaurantOrderCourse = 'drink' | 'starter' | 'main' | 'dessert' | 'other';
export type RestaurantOrderStation = 'kitchen' | 'bar' | 'cold' | 'hot' | 'dessert';

export interface RestaurantOrderRecord {
  id: string;
  organization_id: string;
  table_id: string | null;
  reservation_id: string | null;
  order_number: number;
  status: RestaurantOrderStatus;
  guest_count: number;
  notes: string | null;
  subtotal_cents: number;
  total_cents: number;
  opened_at: string;
  bill_requested_at: string | null;
  closed_at: string | null;
  restaurant_tables?: { name: string; area: string } | null;
  restaurant_reservations?: { guest_name: string; party_size: number } | null;
}

export interface RestaurantOrderItemRecord {
  id: string;
  organization_id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  unit_price_cents: number;
  quantity: number;
  course: RestaurantOrderCourse;
  station: RestaurantOrderStation;
  notes: string | null;
  status: RestaurantOrderItemStatus;
  sent_at: string | null;
  started_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  created_at: string;
}
