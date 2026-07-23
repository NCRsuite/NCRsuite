import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { organizationHasFeature } from '../config/planEntitlements';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { restaurantErrorMessage, safeRestaurantStorageArray, toRestaurantLocalDateKey } from '../features/restaurant/runtime';
import type {
  RestaurantFloorElementRecord,
  RestaurantFloorElementType,
  RestaurantFloorRoomRecord,
  RestaurantReservationRecord,
  RestaurantTableRecord,
  RestaurantTableServiceStatus,
  RestaurantTableShape
} from '../features/restaurant/types';
import { supabase } from '../lib/supabase';

const statusLabels: Record<RestaurantTableServiceStatus, string> = {
  available: 'Libre',
  reserved: 'Réservée',
  occupied: 'Occupée',
  ordering: 'Commande en cours',
  payment: 'À encaisser',
  cleaning: 'À nettoyer',
  unavailable: 'Indisponible'
};

const shapeLabels: Record<RestaurantTableShape, string> = {
  round: 'Ronde',
  square: 'Carrée',
  rectangle: 'Rectangulaire'
};

const elementLabels: Record<RestaurantFloorElementType, string> = {
  wall: 'Mur',
  door: 'Porte',
  window: 'Fenêtre',
  counter: 'Comptoir',
  kitchen: 'Cuisine',
  toilet: 'Toilettes',
  stairs: 'Escalier',
  restricted: 'Zone interdite',
  label: 'Texte libre'
};

const elementDefaults: Record<RestaurantFloorElementType, { width: number; height: number; label: string }> = {
  wall: { width: 24, height: 2.2, label: 'Mur' },
  door: { width: 8, height: 2.8, label: 'Porte' },
  window: { width: 12, height: 2.2, label: 'Fenêtre' },
  counter: { width: 22, height: 8, label: 'Comptoir' },
  kitchen: { width: 24, height: 17, label: 'Cuisine' },
  toilet: { width: 13, height: 13, label: 'Toilettes' },
  stairs: { width: 14, height: 13, label: 'Escalier' },
  restricted: { width: 18, height: 13, label: 'Zone interdite' },
  label: { width: 16, height: 6, label: 'Nouvelle zone' }
};

const emptyTableForm = {
  name: '',
  area: 'Salle principale',
  capacity: '2',
  shape: 'round' as RestaurantTableShape
};

function numeric(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeRoom(row: RestaurantFloorRoomRecord): RestaurantFloorRoomRecord {
  return {
    ...row,
    canvas_width: numeric(row.canvas_width, 1200),
    canvas_height: numeric(row.canvas_height, 760),
    grid_size: numeric(row.grid_size, 20),
    position: numeric(row.position, 0)
  };
}

function normalizeTable(row: RestaurantTableRecord): RestaurantTableRecord {
  return {
    ...row,
    capacity: numeric(row.capacity, 2),
    position_x: numeric(row.position_x, 10),
    position_y: numeric(row.position_y, 10),
    width: numeric(row.width, 10),
    height: numeric(row.height, 14),
    rotation: numeric(row.rotation, 0),
    z_index: numeric(row.z_index, 10),
    shape: row.shape || 'round',
    service_status: row.service_status || 'available'
  };
}

function normalizeElement(row: RestaurantFloorElementRecord): RestaurantFloorElementRecord {
  return {
    ...row,
    position_x: numeric(row.position_x, 10),
    position_y: numeric(row.position_y, 10),
    width: numeric(row.width, 12),
    height: numeric(row.height, 8),
    rotation: numeric(row.rotation, 0)
  };
}

type SelectedEntity = { kind: 'table' | 'element'; id: string } | null;
type InteractionAction = 'move' | 'resize' | 'rotate';
type InteractionSession = {
  pointerId: number;
  kind: 'table' | 'element';
  id: string;
  action: InteractionAction;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startRotation: number;
  canvasRect: DOMRect;
};

function demoRoom(organizationId: string): RestaurantFloorRoomRecord {
  return {
    id: crypto.randomUUID(),
    organization_id: organizationId,
    name: 'Salle principale',
    canvas_width: 1200,
    canvas_height: 760,
    grid_enabled: true,
    grid_size: 20,
    background_url: null,
    position: 0,
    active: true
  };
}

export function RestaurantFloorPlanPage() {
  const { organization } = useOrganization();
  const { user, demoMode } = useAuth();
  const [rooms, setRooms] = useState<RestaurantFloorRoomRecord[]>([]);
  const [tables, setTables] = useState<RestaurantTableRecord[]>([]);
  const [elements, setElements] = useState<RestaurantFloorElementRecord[]>([]);
  const [reservations, setReservations] = useState<RestaurantReservationRecord[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const [mode, setMode] = useState<'service' | 'edit'>('service');
  const [zoom, setZoom] = useState(1);
  const [fitToScreen, setFitToScreen] = useState(true);
  const [tableForm, setTableForm] = useState(emptyTableForm);
  const [roomName, setRoomName] = useState('');
  const [day, setDay] = useState(toRestaurantLocalDateKey());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<InteractionSession | null>(null);
  const tablesRef = useRef<RestaurantTableRecord[]>([]);
  const elementsRef = useRef<RestaurantFloorElementRecord[]>([]);

  const canEdit = Boolean(demoMode || ['owner', 'admin', 'manager'].includes(organization?.role ?? ''));
  const hasAdvancedFloor = Boolean(organization && organizationHasFeature(organization, 'restaurant_floor_advanced'));

  useEffect(() => { tablesRef.current = tables; }, [tables]);
  useEffect(() => { elementsRef.current = elements; }, [elements]);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null,
    [rooms, selectedRoomId]
  );

  const roomTables = useMemo(
    () => tables.filter((table) => table.room_id === activeRoom?.id || (!table.room_id && rooms[0]?.id === activeRoom?.id)),
    [tables, activeRoom?.id, rooms]
  );

  const roomElements = useMemo(
    () => elements.filter((element) => element.room_id === activeRoom?.id),
    [elements, activeRoom?.id]
  );

  const selectedTable = selected?.kind === 'table' ? tables.find((table) => table.id === selected.id) ?? null : null;
  const selectedElement = selected?.kind === 'element' ? elements.find((element) => element.id === selected.id) ?? null : null;

  const reservationsByTable = useMemo(() => {
    const map = new Map<string, RestaurantReservationRecord[]>();
    for (const reservation of reservations) {
      if (!reservation.table_id || ['canceled', 'no_show'].includes(reservation.status)) continue;
      const current = map.get(reservation.table_id) ?? [];
      current.push(reservation);
      map.set(reservation.table_id, current);
    }
    return map;
  }, [reservations]);

  function roomStorageKey() { return `ncr-restaurant-floor-rooms-${organization?.id ?? 'none'}`; }
  function tableStorageKey() { return `ncr-restaurant-tables-${organization?.id ?? 'none'}`; }
  function elementStorageKey() { return `ncr-restaurant-floor-elements-${organization?.id ?? 'none'}`; }
  function reservationStorageKey() { return `ncr-restaurant-reservations-${organization?.id ?? 'none'}`; }

  async function load() {
    if (!organization) return;
    setLoading(true);
    setError('');
    try {
      if (demoMode || !supabase) {
        let demoRooms = safeRestaurantStorageArray<RestaurantFloorRoomRecord>(roomStorageKey());
        if (demoRooms.length === 0) {
          demoRooms = [demoRoom(organization.id)];
          localStorage.setItem(roomStorageKey(), JSON.stringify(demoRooms));
        }
        const demoTables = safeRestaurantStorageArray<RestaurantTableRecord>(tableStorageKey()).map((row) => normalizeTable({
          ...row,
          room_id: row.room_id || demoRooms[0].id,
          width: row.width ?? 10,
          height: row.height ?? 14,
          rotation: row.rotation ?? 0,
          shape: row.shape ?? 'round',
          service_status: row.service_status ?? 'available',
          z_index: row.z_index ?? 10
        }));
        const demoElements = safeRestaurantStorageArray<RestaurantFloorElementRecord>(elementStorageKey()).map(normalizeElement);
        const demoReservations = safeRestaurantStorageArray<RestaurantReservationRecord>(reservationStorageKey());
        setRooms(demoRooms.map(normalizeRoom));
        setTables(demoTables);
        setElements(demoElements);
        setReservations(demoReservations.filter((row) => toRestaurantLocalDateKey(row.reservation_at) === day));
        setSelectedRoomId((current) => current && demoRooms.some((room) => room.id === current) ? current : demoRooms[0].id);
      } else {
        const start = new Date(`${day}T00:00:00`);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        const [roomResult, tableResult, elementResult, reservationResult] = await Promise.all([
          supabase.from('restaurant_floor_rooms').select('*').eq('organization_id', organization.id).eq('active', true).order('position').order('created_at'),
          supabase.from('restaurant_tables').select('*').eq('organization_id', organization.id).eq('active', true).order('z_index').order('name'),
          supabase.from('restaurant_floor_elements').select('*').eq('organization_id', organization.id).eq('active', true).order('created_at'),
          supabase.from('restaurant_reservations').select('*,restaurant_tables(name,area)').eq('organization_id', organization.id).gte('reservation_at', start.toISOString()).lt('reservation_at', end.toISOString()).order('reservation_at')
        ]);
        const firstError = roomResult.error || tableResult.error || elementResult.error || reservationResult.error;
        if (firstError) throw firstError;
        const loadedRooms = (roomResult.data ?? []).map((row) => normalizeRoom(row as RestaurantFloorRoomRecord));
        const loadedTables = (tableResult.data ?? []).map((row) => normalizeTable(row as RestaurantTableRecord));
        setRooms(loadedRooms);
        setTables(loadedTables);
        setElements((elementResult.data ?? []).map((row) => normalizeElement(row as RestaurantFloorElementRecord)));
        setReservations((reservationResult.data ?? []) as RestaurantReservationRecord[]);
        setSelectedRoomId((current) => current && loadedRooms.some((room) => room.id === current) ? current : loadedRooms[0]?.id ?? '');
      }
    } catch (caught) {
      setError(restaurantErrorMessage(caught, 'Chargement du plan impossible.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [organization?.id, demoMode, day]);

  function persistDemo(nextTables = tablesRef.current, nextElements = elementsRef.current, nextRooms = rooms) {
    localStorage.setItem(tableStorageKey(), JSON.stringify(nextTables));
    localStorage.setItem(elementStorageKey(), JSON.stringify(nextElements));
    localStorage.setItem(roomStorageKey(), JSON.stringify(nextRooms));
  }

  async function createRoom(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !roomName.trim()) return;
    if (!hasAdvancedFloor && rooms.length >= 1) {
      setError('Les salles multiples nécessitent l’offre Professionnelle.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        organization_id: organization.id,
        name: roomName.trim(),
        canvas_width: 1200,
        canvas_height: 760,
        grid_enabled: true,
        grid_size: 20,
        position: rooms.length,
        created_by: user.id
      };
      let created: RestaurantFloorRoomRecord;
      if (demoMode || !supabase) {
        created = normalizeRoom({ id: crypto.randomUUID(), ...payload, background_url: null, active: true });
        const next = [...rooms, created];
        setRooms(next);
        persistDemo(tablesRef.current, elementsRef.current, next);
      } else {
        const { data, error: insertError } = await supabase.from('restaurant_floor_rooms').insert(payload).select('*').single();
        if (insertError) throw insertError;
        created = normalizeRoom(data as RestaurantFloorRoomRecord);
        setRooms((current) => [...current, created]);
      }
      setRoomName('');
      setSelectedRoomId(created.id);
      setSuccess('La nouvelle salle est prête à être aménagée.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Création de la salle impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function updateRoom(updates: Partial<RestaurantFloorRoomRecord>) {
    if (!organization || !activeRoom || !canEdit) return;
    const nextRoom = normalizeRoom({ ...activeRoom, ...updates });
    setRooms((current) => current.map((room) => room.id === activeRoom.id ? nextRoom : room));
    try {
      if (demoMode || !supabase) {
        const nextRooms = rooms.map((room) => room.id === activeRoom.id ? nextRoom : room);
        persistDemo(tablesRef.current, elementsRef.current, nextRooms);
      } else {
        const payload = {
          name: nextRoom.name,
          grid_enabled: nextRoom.grid_enabled,
          grid_size: nextRoom.grid_size,
          canvas_width: nextRoom.canvas_width,
          canvas_height: nextRoom.canvas_height
        };
        const { error: updateError } = await supabase.from('restaurant_floor_rooms').update(payload).eq('organization_id', organization.id).eq('id', activeRoom.id);
        if (updateError) throw updateError;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Mise à jour de la salle impossible.');
      void load();
    }
  }

  async function createTable(event: FormEvent) {
    event.preventDefault();
    if (!organization || !user || !activeRoom) return;
    setSaving(true);
    setError('');
    const shape = tableForm.shape;
    const capacity = clamp(Number(tableForm.capacity) || 2, 1, 30);
    const dimensions = shape === 'rectangle' ? { width: 16, height: 10 } : shape === 'square' ? { width: 12, height: 14 } : { width: 10, height: 16 };
    const payload = {
      organization_id: organization.id,
      room_id: activeRoom.id,
      name: tableForm.name.trim() || `Table ${tables.length + 1}`,
      area: tableForm.area.trim() || activeRoom.name,
      capacity,
      position_x: clamp(8 + (roomTables.length % 5) * 17, 0, 82),
      position_y: clamp(10 + Math.floor(roomTables.length / 5) * 20, 0, 78),
      width: dimensions.width,
      height: dimensions.height,
      rotation: 0,
      shape,
      service_status: 'available' as RestaurantTableServiceStatus,
      z_index: 10,
      created_by: user.id
    };
    try {
      let created: RestaurantTableRecord;
      if (demoMode || !supabase) {
        created = normalizeTable({ id: crypto.randomUUID(), ...payload, active: true });
        const next = [...tablesRef.current, created];
        tablesRef.current = next;
        setTables(next);
        persistDemo(next, elementsRef.current);
      } else {
        const { data, error: insertError } = await supabase.from('restaurant_tables').insert(payload).select('*').single();
        if (insertError) throw insertError;
        created = normalizeTable(data as RestaurantTableRecord);
        setTables((current) => [...current, created]);
      }
      setTableForm(emptyTableForm);
      setSelected({ kind: 'table', id: created.id });
      setSuccess('La table a été ajoutée. Déplace-la directement sur le plan.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Création de la table impossible.');
    } finally {
      setSaving(false);
    }
  }

  async function createElement(type: RestaurantFloorElementType) {
    if (!organization || !user || !activeRoom || !canEdit) return;
    setError('');
    const defaults = elementDefaults[type];
    const payload = {
      organization_id: organization.id,
      room_id: activeRoom.id,
      element_type: type,
      label: defaults.label,
      position_x: 8 + (roomElements.length % 5) * 16,
      position_y: 8 + Math.floor(roomElements.length / 5) * 14,
      width: defaults.width,
      height: defaults.height,
      rotation: 0,
      created_by: user.id
    };
    try {
      let created: RestaurantFloorElementRecord;
      if (demoMode || !supabase) {
        created = normalizeElement({ id: crypto.randomUUID(), ...payload, active: true });
        const next = [...elementsRef.current, created];
        elementsRef.current = next;
        setElements(next);
        persistDemo(tablesRef.current, next);
      } else {
        const { data, error: insertError } = await supabase.from('restaurant_floor_elements').insert(payload).select('*').single();
        if (insertError) throw insertError;
        created = normalizeElement(data as RestaurantFloorElementRecord);
        setElements((current) => [...current, created]);
      }
      setSelected({ kind: 'element', id: created.id });
      setSuccess(`${elementLabels[type]} ajouté au plan.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ajout impossible.');
    }
  }

  function snapValue(value: number, axis: 'x' | 'y') {
    if (!activeRoom?.grid_enabled) return value;
    const dimension = axis === 'x' ? activeRoom.canvas_width : activeRoom.canvas_height;
    const step = (activeRoom.grid_size / dimension) * 100;
    return Math.round(value / step) * step;
  }

  function startInteraction(
    event: ReactPointerEvent<HTMLElement>,
    kind: 'table' | 'element',
    id: string,
    action: InteractionAction
  ) {
    if (mode !== 'edit' || !canEdit || !canvasRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const entity = kind === 'table'
      ? tablesRef.current.find((item) => item.id === id)
      : elementsRef.current.find((item) => item.id === id);
    if (!entity) return;
    setSelected({ kind, id });
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = {
      pointerId: event.pointerId,
      kind,
      id,
      action,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: entity.position_x,
      startY: entity.position_y,
      startWidth: entity.width,
      startHeight: entity.height,
      startRotation: entity.rotation,
      canvasRect: canvasRef.current.getBoundingClientRect()
    };
  }

  function moveInteraction(event: ReactPointerEvent<HTMLElement>) {
    const session = interactionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = ((event.clientX - session.startClientX) / session.canvasRect.width) * 100;
    const dy = ((event.clientY - session.startClientY) / session.canvasRect.height) * 100;

    const mutate = <T extends RestaurantTableRecord | RestaurantFloorElementRecord>(entity: T): T => {
      let next = { ...entity };
      if (session.action === 'move') {
        next.position_x = clamp(snapValue(session.startX + dx, 'x'), 0, 100 - next.width);
        next.position_y = clamp(snapValue(session.startY + dy, 'y'), 0, 100 - next.height);
      } else if (session.action === 'resize') {
        next.width = clamp(snapValue(session.startWidth + dx, 'x'), 3, 100 - next.position_x);
        next.height = clamp(snapValue(session.startHeight + dy, 'y'), 3, 100 - next.position_y);
      } else {
        const centerX = session.canvasRect.left + ((session.startX + session.startWidth / 2) / 100) * session.canvasRect.width;
        const centerY = session.canvasRect.top + ((session.startY + session.startHeight / 2) / 100) * session.canvasRect.height;
        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI + 90;
        next.rotation = Math.round(angle / 5) * 5;
      }
      return next;
    };

    if (session.kind === 'table') {
      setTables((current) => {
        const next = current.map((item) => item.id === session.id ? mutate(item) : item);
        tablesRef.current = next;
        return next;
      });
    } else {
      setElements((current) => {
        const next = current.map((item) => item.id === session.id ? mutate(item) : item);
        elementsRef.current = next;
        return next;
      });
    }
  }

  async function endInteraction(event: ReactPointerEvent<HTMLElement>) {
    const session = interactionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    interactionRef.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* capture déjà libérée */ }
    if (session.kind === 'table') {
      const table = tablesRef.current.find((item) => item.id === session.id);
      if (table) await persistTable(table);
    } else {
      const element = elementsRef.current.find((item) => item.id === session.id);
      if (element) await persistElement(element);
    }
  }

  async function persistTable(table: RestaurantTableRecord) {
    if (!organization) return;
    try {
      if (demoMode || !supabase) {
        persistDemo(tablesRef.current, elementsRef.current);
      } else {
        const { error: updateError } = await supabase.from('restaurant_tables').update({
          name: table.name,
          area: table.area,
          capacity: table.capacity,
          room_id: table.room_id,
          position_x: table.position_x,
          position_y: table.position_y,
          width: table.width,
          height: table.height,
          rotation: table.rotation,
          shape: table.shape,
          z_index: table.z_index
        }).eq('organization_id', organization.id).eq('id', table.id);
        if (updateError) throw updateError;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement de la table impossible.');
      void load();
    }
  }

  async function persistElement(element: RestaurantFloorElementRecord) {
    if (!organization) return;
    try {
      if (demoMode || !supabase) {
        persistDemo(tablesRef.current, elementsRef.current);
      } else {
        const { error: updateError } = await supabase.from('restaurant_floor_elements').update({
          label: element.label,
          position_x: element.position_x,
          position_y: element.position_y,
          width: element.width,
          height: element.height,
          rotation: element.rotation
        }).eq('organization_id', organization.id).eq('id', element.id);
        if (updateError) throw updateError;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement de l’élément impossible.');
      void load();
    }
  }

  function patchSelectedTable(updates: Partial<RestaurantTableRecord>) {
    if (!selectedTable) return;
    setTables((current) => {
      const next = current.map((item) => item.id === selectedTable.id ? normalizeTable({ ...item, ...updates }) : item);
      tablesRef.current = next;
      return next;
    });
  }

  function patchSelectedElement(updates: Partial<RestaurantFloorElementRecord>) {
    if (!selectedElement) return;
    setElements((current) => {
      const next = current.map((item) => item.id === selectedElement.id ? normalizeElement({ ...item, ...updates }) : item);
      elementsRef.current = next;
      return next;
    });
  }

  async function saveSelection() {
    if (selectedTable) await persistTable(tablesRef.current.find((item) => item.id === selectedTable.id) ?? selectedTable);
    if (selectedElement) await persistElement(elementsRef.current.find((item) => item.id === selectedElement.id) ?? selectedElement);
    setSuccess('Les modifications du plan sont enregistrées.');
  }

  async function removeSelected() {
    if (!organization || !selected || !window.confirm('Supprimer cet élément du plan ?')) return;
    try {
      if (selected.kind === 'table') {
        if (demoMode || !supabase) {
          const next = tablesRef.current.filter((item) => item.id !== selected.id);
          tablesRef.current = next;
          setTables(next);
          persistDemo(next, elementsRef.current);
        } else {
          const { error: updateError } = await supabase.from('restaurant_tables').update({ active: false }).eq('organization_id', organization.id).eq('id', selected.id);
          if (updateError) throw updateError;
          setTables((current) => current.filter((item) => item.id !== selected.id));
        }
      } else {
        if (demoMode || !supabase) {
          const next = elementsRef.current.filter((item) => item.id !== selected.id);
          elementsRef.current = next;
          setElements(next);
          persistDemo(tablesRef.current, next);
        } else {
          const { error: updateError } = await supabase.from('restaurant_floor_elements').update({ active: false }).eq('organization_id', organization.id).eq('id', selected.id);
          if (updateError) throw updateError;
          setElements((current) => current.filter((item) => item.id !== selected.id));
        }
      }
      setSelected(null);
      setSuccess('L’élément a été retiré du plan.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Suppression impossible.');
    }
  }

  async function setTableStatus(table: RestaurantTableRecord, status: RestaurantTableServiceStatus) {
    if (!organization) return;
    setError('');
    try {
      if (demoMode || !supabase) {
        const next = tablesRef.current.map((item) => item.id === table.id ? { ...item, service_status: status } : item);
        tablesRef.current = next;
        setTables(next);
        persistDemo(next, elementsRef.current);
      } else {
        const { error: rpcError } = await supabase.rpc('set_restaurant_table_service_status', {
          p_organization_id: organization.id,
          p_table_id: table.id,
          p_status: status
        });
        if (rpcError) throw rpcError;
        setTables((current) => current.map((item) => item.id === table.id ? { ...item, service_status: status } : item));
      }
      setSuccess(`${table.name} : ${statusLabels[status].toLowerCase()}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Changement d’état impossible.');
    }
  }

  function effectiveStatus(table: RestaurantTableRecord): RestaurantTableServiceStatus {
    if (table.service_status !== 'available') return table.service_status;
    return (reservationsByTable.get(table.id)?.length ?? 0) > 0 ? 'reserved' : 'available';
  }

  if (!organization) return null;

  return (
    <div className="page restaurant-page restaurant-floor-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">RESTAURATION · PLAN DE SALLE</p>
          <h1>Plan de salle interactif</h1>
          <p>Positionne librement les tables, construis la salle et pilote son état pendant le service.</p>
        </div>
        <div className="header-actions restaurant-floor-mode-switch">
          <button type="button" className={mode === 'service' ? 'primary-button' : 'secondary-button'} onClick={() => { setMode('service'); setSelected(null); }}>
            <Icon name="eye" size={17}/>Mode service
          </button>
          {canEdit && <button type="button" className={mode === 'edit' ? 'primary-button' : 'secondary-button'} onClick={() => setMode('edit')}>
            <Icon name="settings" size={17}/>Mode édition
          </button>}
        </div>
      </header>

      {error && <div className="error-message page-message">{error}</div>}
      {success && <div className="success-message page-message">{success}</div>}

      <section className="panel restaurant-floor-command-bar">
        <div className="restaurant-floor-room-tabs">
          {rooms.map((room) => (
            <button type="button" key={room.id} className={room.id === activeRoom?.id ? 'active' : ''} onClick={() => { setSelectedRoomId(room.id); setSelected(null); }}>
              {room.name}
            </button>
          ))}
        </div>
        <div className="restaurant-floor-view-controls">
          <label>Date du service<input type="date" value={day} onChange={(event) => setDay(event.target.value)}/></label>
          <div className="restaurant-floor-display-switch" aria-label="Affichage du plan">
            <button type="button" className={fitToScreen ? 'primary-button compact-button' : 'secondary-button compact-button'} onClick={() => setFitToScreen(true)}>Adapter</button>
            <button type="button" className={!fitToScreen ? 'primary-button compact-button' : 'secondary-button compact-button'} onClick={() => setFitToScreen(false)}>Précision</button>
          </div>
          {!fitToScreen && <>
            <button type="button" className="secondary-button compact-button" onClick={() => setZoom((current) => clamp(Number((current - .1).toFixed(1)), .6, 1.8))}>−</button>
            <span>{Math.round(zoom * 100)} %</span>
            <button type="button" className="secondary-button compact-button" onClick={() => setZoom((current) => clamp(Number((current + .1).toFixed(1)), .6, 1.8))}>+</button>
            <button type="button" className="secondary-button compact-button" onClick={() => setZoom(1)}>100 %</button>
          </>}
        </div>
      </section>

      {mode === 'edit' && canEdit && (
        <section className="panel restaurant-floor-toolbox">
          <div className="restaurant-floor-tool-group">
            <strong>Éléments de salle</strong>
            <div>
              {(Object.keys(elementLabels) as RestaurantFloorElementType[]).map((type) => (
                <button key={type} type="button" className="restaurant-floor-tool" onClick={() => void createElement(type)}>{elementLabels[type]}</button>
              ))}
            </div>
          </div>
          <div className="restaurant-floor-tool-group restaurant-floor-grid-settings">
            <strong>Magnétisme</strong>
            <label><input type="checkbox" checked={Boolean(activeRoom?.grid_enabled)} onChange={(event) => void updateRoom({ grid_enabled: event.target.checked })}/>Grille active</label>
            <label>Pas <input type="number" min="5" max="100" value={activeRoom?.grid_size ?? 20} onChange={(event) => setRooms((current) => current.map((room) => room.id === activeRoom?.id ? { ...room, grid_size: Number(event.target.value) || 20 } : room))} onBlur={() => void updateRoom({ grid_size: activeRoom?.grid_size ?? 20 })}/></label>
          </div>
        </section>
      )}

      <section className="restaurant-floor-workspace">
        <article className="panel restaurant-floor-stage-panel">
          <div className="panel-header restaurant-floor-stage-header">
            <div>
              <p className="eyebrow">{mode === 'edit' ? 'ÉDITEUR LIBRE' : 'SERVICE EN COURS'}</p>
              <h2>{activeRoom?.name ?? 'Salle'} · {roomTables.length} table{roomTables.length > 1 ? 's' : ''} · {roomTables.reduce((total, table) => total + table.capacity, 0)} couverts</h2>
            </div>
            <div className="restaurant-floor-legend">
              {(Object.keys(statusLabels) as RestaurantTableServiceStatus[]).map((status) => <span key={status} className={`status-${status}`}><i/>{statusLabels[status]}</span>)}
            </div>
          </div>

          <div className={`restaurant-floor-viewport ${fitToScreen ? 'fit-to-screen' : 'precision-mode'}`}>
            {loading ? <div className="restaurant-empty">Chargement du plan…</div> : !activeRoom ? <div className="restaurant-empty"><Icon name="map" size={30}/><strong>Aucune salle</strong></div> : (
              <div
                ref={canvasRef}
                className={`restaurant-floor-editor-canvas ${fitToScreen ? 'fit-to-screen' : 'precision-mode'} ${activeRoom.grid_enabled && mode === 'edit' ? 'grid-visible' : ''}`}
                style={{
                  width: fitToScreen ? '100%' : `${zoom * 100}%`,
                  aspectRatio: `${activeRoom.canvas_width} / ${activeRoom.canvas_height}`,
                  ['--restaurant-floor-grid' as string]: `${Math.max(8, activeRoom.grid_size * zoom)}px`
                }}
                onPointerDown={() => mode === 'edit' && setSelected(null)}
              >
                {roomElements.map((element) => (
                  <div
                    key={element.id}
                    className={`restaurant-floor-element element-${element.element_type} ${selected?.kind === 'element' && selected.id === element.id ? 'selected' : ''}`}
                    style={{ left: `${element.position_x}%`, top: `${element.position_y}%`, width: `${element.width}%`, height: `${element.height}%`, transform: `rotate(${element.rotation}deg)` }}
                    onPointerDown={(event) => startInteraction(event, 'element', element.id, 'move')}
                    onPointerMove={moveInteraction}
                    onPointerUp={(event) => void endInteraction(event)}
                    onClick={(event) => { event.stopPropagation(); if (mode === 'edit') setSelected({ kind: 'element', id: element.id }); }}
                  >
                    <span>{element.label || elementLabels[element.element_type]}</span>
                    {mode === 'edit' && selected?.kind === 'element' && selected.id === element.id && <>
                      <button type="button" aria-label="Redimensionner" className="restaurant-floor-handle resize-handle" onPointerDown={(event) => startInteraction(event, 'element', element.id, 'resize')} onPointerMove={moveInteraction} onPointerUp={(event) => void endInteraction(event)}/>
                      <button type="button" aria-label="Faire pivoter" className="restaurant-floor-handle rotate-handle" onPointerDown={(event) => startInteraction(event, 'element', element.id, 'rotate')} onPointerMove={moveInteraction} onPointerUp={(event) => void endInteraction(event)}/>
                    </>}
                  </div>
                ))}

                {roomTables.map((table) => {
                  const status = effectiveStatus(table);
                  const tableReservations = reservationsByTable.get(table.id) ?? [];
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      key={table.id}
                      className={`restaurant-floor-table shape-${table.shape} status-${status} ${selected?.kind === 'table' && selected.id === table.id ? 'selected' : ''}`}
                      style={{ left: `${table.position_x}%`, top: `${table.position_y}%`, width: `${table.width}%`, height: `${table.height}%`, transform: `rotate(${table.rotation}deg)`, zIndex: table.z_index }}
                      onPointerDown={(event) => mode === 'edit' ? startInteraction(event, 'table', table.id, 'move') : undefined}
                      onPointerMove={moveInteraction}
                      onPointerUp={(event) => void endInteraction(event)}
                      onClick={(event) => { event.stopPropagation(); setSelected({ kind: 'table', id: table.id }); }}
                      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected({ kind: 'table', id: table.id }); } }}
                    >
                      <strong>{table.name}</strong>
                      <span>{table.capacity} place{table.capacity > 1 ? 's' : ''}</span>
                      {tableReservations.length > 0 && <small>{tableReservations[0].guest_name} · {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(tableReservations[0].reservation_at))}</small>}
                      {mode === 'edit' && selected?.kind === 'table' && selected.id === table.id && <>
                        <i className="restaurant-floor-drag-label">Déplacer</i>
                        <span role="button" aria-label="Redimensionner" className="restaurant-floor-handle resize-handle" onPointerDown={(event) => startInteraction(event, 'table', table.id, 'resize')} onPointerMove={moveInteraction} onPointerUp={(event) => void endInteraction(event)}/>
                        <span role="button" aria-label="Faire pivoter" className="restaurant-floor-handle rotate-handle" onPointerDown={(event) => startInteraction(event, 'table', table.id, 'rotate')} onPointerMove={moveInteraction} onPointerUp={(event) => void endInteraction(event)}/>
                      </>}
                    </div>
                  );
                })}

                {roomTables.length === 0 && roomElements.length === 0 && <div className="restaurant-floor-empty-canvas"><Icon name="map" size={34}/><strong>Cette salle est vide</strong><span>Passe en mode édition pour ajouter des tables et dessiner les zones.</span></div>}
              </div>
            )}
          </div>
          <p className="restaurant-floor-help">{mode === 'edit' ? (fitToScreen ? 'Le plan est adapté à l’écran. Passe en mode Précision pour déplacer et redimensionner les éléments plus facilement.' : 'Glisse les éléments, utilise les poignées puis fais défiler la salle avec le doigt.') : 'Le plan complet s’adapte au téléphone. Sélectionne une table pour ouvrir sa commande ou consulter son service.'}</p>
        </article>

        <aside className="restaurant-floor-sidebar">
          {mode === 'edit' && canEdit && (
            <article className="panel restaurant-floor-create-panel">
              <div className="panel-header"><div><p className="eyebrow">NOUVELLE TABLE</p><h2>Ajouter</h2></div></div>
              <form className="restaurant-form-grid restaurant-floor-table-form" onSubmit={createTable}>
                <label>Nom<input value={tableForm.name} onChange={(event) => setTableForm({ ...tableForm, name: event.target.value })} placeholder={`Table ${tables.length + 1}`}/></label>
                <label>Capacité<input type="number" min="1" max="30" value={tableForm.capacity} onChange={(event) => setTableForm({ ...tableForm, capacity: event.target.value })}/></label>
                <label>Forme<select value={tableForm.shape} onChange={(event) => setTableForm({ ...tableForm, shape: event.target.value as RestaurantTableShape })}>{Object.entries(shapeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Zone<input value={tableForm.area} onChange={(event) => setTableForm({ ...tableForm, area: event.target.value })} placeholder="Terrasse, baie vitrée…"/></label>
                <button className="primary-button full-field" disabled={saving}><Icon name="plus" size={17}/>{saving ? 'Ajout…' : 'Ajouter la table'}</button>
              </form>
            </article>
          )}

          {selectedTable && (
            <article className="panel restaurant-floor-selection-panel">
              <div className="panel-header"><div><p className="eyebrow">TABLE SÉLECTIONNÉE</p><h2>{selectedTable.name}</h2></div><span className={`restaurant-floor-status-badge status-${effectiveStatus(selectedTable)}`}>{statusLabels[effectiveStatus(selectedTable)]}</span></div>

              {mode === 'edit' && canEdit ? (
                <div className="restaurant-floor-properties">
                  <label>Nom<input value={selectedTable.name} onChange={(event) => patchSelectedTable({ name: event.target.value })}/></label>
                  <label>Zone<input value={selectedTable.area} onChange={(event) => patchSelectedTable({ area: event.target.value })}/></label>
                  <label>Capacité<input type="number" min="1" max="30" value={selectedTable.capacity} onChange={(event) => patchSelectedTable({ capacity: clamp(Number(event.target.value) || 1, 1, 30) })}/></label>
                  <label>Forme<select value={selectedTable.shape} onChange={(event) => patchSelectedTable({ shape: event.target.value as RestaurantTableShape })}>{Object.entries(shapeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label>Largeur<input type="range" min="3" max="40" step=".5" value={selectedTable.width} onChange={(event) => patchSelectedTable({ width: Number(event.target.value) })}/><span>{selectedTable.width.toFixed(1)} %</span></label>
                  <label>Hauteur<input type="range" min="3" max="40" step=".5" value={selectedTable.height} onChange={(event) => patchSelectedTable({ height: Number(event.target.value) })}/><span>{selectedTable.height.toFixed(1)} %</span></label>
                  <label>Rotation<input type="range" min="-180" max="180" step="5" value={selectedTable.rotation} onChange={(event) => patchSelectedTable({ rotation: Number(event.target.value) })}/><span>{selectedTable.rotation}°</span></label>
                  <div className="restaurant-floor-property-actions"><button type="button" className="primary-button" onClick={() => void saveSelection()}><Icon name="check" size={17}/>Enregistrer</button><button type="button" className="secondary-button danger-text" onClick={() => void removeSelected()}>Supprimer</button></div>
                </div>
              ) : (
                <div className="restaurant-floor-service-panel">
                  <Link className="primary-button restaurant-floor-order-button" to={`/commandes?table=${selectedTable.id}`}><Icon name="clipboard" size={17}/>Prendre ou ouvrir la commande</Link>
                  <div className="restaurant-floor-status-actions">
                    {(Object.keys(statusLabels) as RestaurantTableServiceStatus[]).map((status) => <button type="button" key={status} className={`status-${status} ${selectedTable.service_status === status ? 'active' : ''}`} onClick={() => void setTableStatus(selectedTable, status)}><i/>{statusLabels[status]}</button>)}
                  </div>
                  <div className="restaurant-floor-reservation-list">
                    <strong>Réservations du {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long' }).format(new Date(`${day}T12:00:00`))}</strong>
                    {(reservationsByTable.get(selectedTable.id) ?? []).length === 0 ? <span>Aucune réservation attribuée à cette table.</span> : (reservationsByTable.get(selectedTable.id) ?? []).map((reservation) => <div key={reservation.id}><b>{new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(reservation.reservation_at))} · {reservation.guest_name}</b><span>{reservation.party_size} personnes · {reservation.status}</span>{reservation.notes && <small>{reservation.notes}</small>}</div>)}
                  </div>
                </div>
              )}
            </article>
          )}

          {selectedElement && mode === 'edit' && canEdit && (
            <article className="panel restaurant-floor-selection-panel">
              <div className="panel-header"><div><p className="eyebrow">ÉLÉMENT SÉLECTIONNÉ</p><h2>{elementLabels[selectedElement.element_type]}</h2></div></div>
              <div className="restaurant-floor-properties">
                <label>Libellé<input value={selectedElement.label ?? ''} onChange={(event) => patchSelectedElement({ label: event.target.value })}/></label>
                <label>Largeur<input type="range" min="1" max="70" step=".5" value={selectedElement.width} onChange={(event) => patchSelectedElement({ width: Number(event.target.value) })}/><span>{selectedElement.width.toFixed(1)} %</span></label>
                <label>Hauteur<input type="range" min="1" max="70" step=".5" value={selectedElement.height} onChange={(event) => patchSelectedElement({ height: Number(event.target.value) })}/><span>{selectedElement.height.toFixed(1)} %</span></label>
                <label>Rotation<input type="range" min="-180" max="180" step="5" value={selectedElement.rotation} onChange={(event) => patchSelectedElement({ rotation: Number(event.target.value) })}/><span>{selectedElement.rotation}°</span></label>
                <div className="restaurant-floor-property-actions"><button type="button" className="primary-button" onClick={() => void saveSelection()}><Icon name="check" size={17}/>Enregistrer</button><button type="button" className="secondary-button danger-text" onClick={() => void removeSelected()}>Supprimer</button></div>
              </div>
            </article>
          )}

          {mode === 'edit' && canEdit && (
            <article className="panel restaurant-floor-room-panel">
              <div className="panel-header"><div><p className="eyebrow">SALLE</p><h2>Réglages</h2></div>{!hasAdvancedFloor && <span className="locked-badge"><Icon name="lock" size={13}/>Pro</span>}</div>
              {activeRoom && <label>Nom de la salle<input value={activeRoom.name} onChange={(event) => setRooms((current) => current.map((room) => room.id === activeRoom.id ? { ...room, name: event.target.value } : room))} onBlur={() => void updateRoom({ name: activeRoom.name })}/></label>}
              <form onSubmit={createRoom} className="restaurant-floor-new-room-form"><label>Nouvelle salle<input disabled={!hasAdvancedFloor} value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="Terrasse, étage…"/></label><button className="secondary-button" disabled={!hasAdvancedFloor || saving || !roomName.trim()}><Icon name="plus" size={16}/>Créer</button></form>
              {!hasAdvancedFloor && <small>Les espaces multiples sont disponibles avec l’offre Professionnelle.</small>}
            </article>
          )}

          {!selected && mode === 'service' && <article className="panel restaurant-floor-selection-panel restaurant-floor-hint-panel"><Icon name="utensils" size={28}/><strong>Sélectionne une table</strong><span>Tu pourras voir sa réservation et passer rapidement de « libre » à « occupée », « à encaisser » ou « à nettoyer ».</span></article>}
        </aside>
      </section>
    </div>
  );
}
