import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { businessPacks } from '../config/businessPacks';
import { organizationHasFeature, planLabel } from '../config/planEntitlements';
import { cleaningPathIsLocked, cleaningRequiredPlanForPath, filterNavigationForOrganization, formationPathIsLocked, formationRequiredPlanForPath, restaurantPathIsLocked, restaurantRequiredPlanForPath, securityPathIsLocked, securityRequiredPlanForPath } from '../config/moduleAccess';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { Icon } from './Icon';
import { supabase } from '../lib/supabase';

function AvatarContent({ url, initial }: { url: string | null; initial: string }) {
  return url
    ? <img src={url} alt="" referrerPolicy="no-referrer" />
    : <span aria-hidden="true">{initial}</span>;
}

interface AvatarCropState {
  sourceUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

const AVATAR_CROP_SIZE = 280;

export function AppShell() {
  const { signOut, user, demoMode } = useAuth();
  const { organization, organizations, selectOrganization, sites, activeSite, activeSiteId, selectSite, sitesLoading, supportSession, endSupportSession } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [endingSupport, setEndingSupport] = useState(false);
  const [desktopContextMenu, setDesktopContextMenu] = useState<'organization' | 'site' | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileAvatarBusy, setProfileAvatarBusy] = useState(false);
  const [profileAvatarMessage, setProfileAvatarMessage] = useState('');
  const [avatarCrop, setAvatarCrop] = useState<AvatarCropState | null>(null);
  const desktopContextRef = useRef<HTMLDivElement>(null);
  const avatarCropImageRef = useRef<HTMLImageElement>(null);
  const avatarCropDragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const userInitial = (user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'N').toUpperCase();

  useEffect(() => {
    if (!user) {
      setProfileAvatarUrl(null);
      return;
    }

    const metadataAvatar = typeof user.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : null;
    if (demoMode || !supabase) {
      setProfileAvatarUrl(metadataAvatar);
      return;
    }

    let active = true;
    void supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setProfileAvatarUrl(typeof data?.avatar_url === 'string' ? data.avatar_url : metadataAvatar);
      });

    return () => { active = false; };
  }, [user?.id, demoMode]);

  useEffect(() => {
    if (!profileAvatarMessage) return;
    const timer = window.setTimeout(() => setProfileAvatarMessage(''), 4500);
    return () => window.clearTimeout(timer);
  }, [profileAvatarMessage]);

  useEffect(() => {
    if (!avatarCrop) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAvatarCrop();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [avatarCrop?.sourceUrl]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileAccountOpen(false);
    setDesktopContextMenu(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!desktopContextMenu) return;

    function onPointerDown(event: PointerEvent) {
      if (!desktopContextRef.current?.contains(event.target as Node)) {
        setDesktopContextMenu(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDesktopContextMenu(null);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [desktopContextMenu]);

  useEffect(() => {
    if (!mobileMenuOpen && !mobileAccountOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        setMobileAccountOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen, mobileAccountOpen]);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let animationFrame = 0;
    let delayedTimers: number[] = [];

    const editableSelector = 'input, textarea, select, [contenteditable="true"]';

    function editableFieldIsFocused() {
      const activeElement = document.activeElement;
      return activeElement instanceof HTMLElement && Boolean(activeElement.closest(editableSelector));
    }

    function synchronizeMobileNavigation() {
      if (window.matchMedia('(min-width: 901px)').matches) {
        root.style.removeProperty('--mobile-nav-y-compensation');
        return;
      }

      const layoutViewportHeight = Math.max(window.innerHeight, root.clientHeight);
      const visualViewportBottom = viewport
        ? viewport.offsetTop + viewport.height
        : layoutViewportHeight;
      const concealedViewportHeight = Math.max(0, layoutViewportHeight - visualViewportBottom);
      const compensation = !editableFieldIsFocused() && concealedViewportHeight > 120
        ? concealedViewportHeight
        : 0;

      root.style.setProperty('--mobile-nav-y-compensation', `${Math.round(compensation)}px`);
    }

    function scheduleSynchronization() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(synchronizeMobileNavigation);
    }

    function scheduleDelayedSynchronizations() {
      scheduleSynchronization();
      delayedTimers.forEach((timer) => window.clearTimeout(timer));
      delayedTimers = [80, 260, 650].map((delay) => window.setTimeout(scheduleSynchronization, delay));
    }

    scheduleDelayedSynchronizations();
    viewport?.addEventListener('resize', scheduleDelayedSynchronizations);
    viewport?.addEventListener('scroll', scheduleSynchronization);
    window.addEventListener('resize', scheduleDelayedSynchronizations);
    window.addEventListener('orientationchange', scheduleDelayedSynchronizations);
    window.addEventListener('pageshow', scheduleDelayedSynchronizations);
    document.addEventListener('focusin', scheduleDelayedSynchronizations);
    document.addEventListener('focusout', scheduleDelayedSynchronizations);
    document.addEventListener('visibilitychange', scheduleDelayedSynchronizations);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      delayedTimers.forEach((timer) => window.clearTimeout(timer));
      viewport?.removeEventListener('resize', scheduleDelayedSynchronizations);
      viewport?.removeEventListener('scroll', scheduleSynchronization);
      window.removeEventListener('resize', scheduleDelayedSynchronizations);
      window.removeEventListener('orientationchange', scheduleDelayedSynchronizations);
      window.removeEventListener('pageshow', scheduleDelayedSynchronizations);
      document.removeEventListener('focusin', scheduleDelayedSynchronizations);
      document.removeEventListener('focusout', scheduleDelayedSynchronizations);
      document.removeEventListener('visibilitychange', scheduleDelayedSynchronizations);
      root.style.removeProperty('--mobile-nav-y-compensation');
    };
  }, []);

  useEffect(() => {
    if (!organization || !user || !supabase) {
      setNotificationUnread(0);
      return;
    }
    const client = supabase;
    const organizationId = organization.id;
    let active = true;
    async function loadUnread() {
      const { count } = await client
        .from('notification_events')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .is('read_at', null)
        .lte('scheduled_for', new Date().toISOString());
      if (active) setNotificationUnread(count ?? 0);
    }
    void loadUnread();
    const channel = client.channel(`notification-events-shell-${organizationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_events', filter: `organization_id=eq.${organizationId}` }, () => void loadUnread())
      .subscribe();
    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [organization?.id, user?.id]);

  if (!organization) return null;

  const pack = businessPacks[organization.business_type];
  const restrictedRole = ['employee', 'viewer'].includes(organization.role ?? 'viewer');
  const canManageOrganization = ['owner', 'admin', 'manager'].includes(organization.role ?? 'viewer');
  const hasMultiSite = organizationHasFeature(organization, 'multi_site');
  const baseNavigation = pack.navigation.filter((item) => item.path !== '/abonnement');
  let navigation = baseNavigation;

  // Les propriétaires n'ont pas besoin de l'espace terrain dans leur navigation courante.
  // L'accès direct reste contrôlé par la matrice et les droits de l'offre.
  if (['securite', 'nettoyage', 'restauration'].includes(organization.business_type) && ['owner', 'admin'].includes(organization.role ?? 'viewer')) {
    navigation = navigation.filter((item) => item.path !== '/terrain');
  }

  navigation = filterNavigationForOrganization(organization, navigation);

  if (supportSession) {
    navigation = navigation.filter((item) => !['/acces-equipe','/personnalisation','/parametres','/offre-metier','/abonnement','/demarrage'].includes(item.path));
  }

  if (!supportSession && canManageOrganization && !navigation.some((item) => item.path === '/demarrage')) {
    navigation = [...navigation, { label: 'Démarrage', path: '/demarrage', icon: 'sparkles' }];
  }

  if (organization.plan === 'metier' && ['owner', 'admin'].includes(organization.role ?? 'viewer')) {
    navigation = [...navigation, { label: 'Configuration Métier', path: '/offre-metier', icon: 'tool' }];
  }

  const hasCommercialBrandingModule = navigation.some((item) => item.path === '/personnalisation');
  const canManageSubscription = !supportSession && ['owner', 'admin'].includes(organization.role ?? 'viewer');

  const primaryMobileItem = navigation.find((item) => ['securite', 'restauration'].includes(organization.business_type) && restrictedRole ? item.path === '/terrain' : ['/rendez-vous', '/planning'].includes(item.path))
    ?? navigation.find((item) => item.path !== '/')
    ?? navigation[0];
  const quickAction = !restrictedRole ? pack.quickActions[0] : null;

  function closeMobileLayers() {
    setMobileMenuOpen(false);
    setMobileAccountOpen(false);
    setDesktopContextMenu(null);
  }

  function changeSite(id: string | null) {
    selectSite(id);
    navigate('/', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMobileLayers();
  }

  function changeOrganization(id: string) {
    if (id !== organization?.id) {
      selectOrganization(id);
      navigate('/', { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    closeMobileLayers();
  }

  async function handleSignOut() {
    closeMobileLayers();
    await signOut();
  }

  function avatarCropBounds(crop: AvatarCropState, zoom = crop.zoom) {
    const baseScale = Math.max(AVATAR_CROP_SIZE / crop.naturalWidth, AVATAR_CROP_SIZE / crop.naturalHeight);
    return {
      baseScale,
      maxX: Math.max(0, (crop.naturalWidth * baseScale * zoom - AVATAR_CROP_SIZE) / 2),
      maxY: Math.max(0, (crop.naturalHeight * baseScale * zoom - AVATAR_CROP_SIZE) / 2)
    };
  }

  function clampAvatarCrop(crop: AvatarCropState, offsetX: number, offsetY: number, zoom = crop.zoom) {
    const bounds = avatarCropBounds(crop, zoom);
    return {
      offsetX: Math.max(-bounds.maxX, Math.min(bounds.maxX, offsetX)),
      offsetY: Math.max(-bounds.maxY, Math.min(bounds.maxY, offsetY))
    };
  }

  function closeAvatarCrop() {
    setAvatarCrop((current) => {
      if (current) URL.revokeObjectURL(current.sourceUrl);
      return null;
    });
    avatarCropDragRef.current = null;
  }

  async function handleProfileAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file || !user) return;
    setProfileAvatarMessage('');

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProfileAvatarMessage('Choisissez une image PNG, JPEG ou WebP');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setProfileAvatarMessage('La photo source doit peser moins de 8 Mo');
      return;
    }
    if (demoMode || !supabase) {
      setProfileAvatarMessage('La photo de profil est disponible sur un compte connecté');
      return;
    }

    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setAvatarCrop({
        sourceUrl,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        zoom: 1,
        offsetX: 0,
        offsetY: 0
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      setProfileAvatarMessage('Cette image ne peut pas être ouverte');
    };
    image.src = sourceUrl;
  }

  async function saveProfileAvatar(file: File) {
    if (!user || !supabase) return;
    setProfileAvatarBusy(true);
    try {
      const extension = file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl;
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (profileError) {
        await supabase.storage.from('profile-avatars').remove([path]);
        throw profileError;
      }

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      setProfileAvatarUrl(publicUrl);
      setProfileAvatarMessage('Photo de profil mise à jour');
    } catch {
      setProfileAvatarMessage('La photo n’a pas pu être enregistrée');
    } finally {
      setProfileAvatarBusy(false);
    }
  }

  async function confirmAvatarCrop() {
    if (!avatarCrop || !avatarCropImageRef.current) return;
    setProfileAvatarBusy(true);
    const { baseScale } = avatarCropBounds(avatarCrop);
    const renderedScale = baseScale * avatarCrop.zoom;
    const sourceSize = AVATAR_CROP_SIZE / renderedScale;
    const sourceCenterX = avatarCrop.naturalWidth / 2 - avatarCrop.offsetX / renderedScale;
    const sourceCenterY = avatarCrop.naturalHeight / 2 - avatarCrop.offsetY / renderedScale;
    const sourceX = Math.max(0, Math.min(avatarCrop.naturalWidth - sourceSize, sourceCenterX - sourceSize / 2));
    const sourceY = Math.max(0, Math.min(avatarCrop.naturalHeight - sourceSize, sourceCenterY - sourceSize / 2));
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) {
      setProfileAvatarMessage('Le recadrage n’est pas disponible sur cet appareil');
      setProfileAvatarBusy(false);
      return;
    }

    try {
      context.drawImage(
        avatarCropImageRef.current,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        canvas.width,
        canvas.height
      );
      let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', .9));
      let fileName = 'photo-profil.webp';
      if (!blob) {
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', .92));
        fileName = 'photo-profil.jpg';
      }
      if (!blob) throw new Error('avatar-export-failed');

      const croppedFile = new File([blob], fileName, { type: blob.type });
      closeAvatarCrop();
      await saveProfileAvatar(croppedFile);
    } catch {
      setProfileAvatarMessage('La photo n’a pas pu être préparée');
      setProfileAvatarBusy(false);
    }
  }

  function handleAvatarCropPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!avatarCrop) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    avatarCropDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: avatarCrop.offsetX,
      originY: avatarCrop.offsetY
    };
  }

  function handleAvatarCropPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = avatarCropDragRef.current;
    if (!avatarCrop || !drag || drag.pointerId !== event.pointerId) return;
    const next = clampAvatarCrop(
      avatarCrop,
      drag.originX + event.clientX - drag.startX,
      drag.originY + event.clientY - drag.startY
    );
    setAvatarCrop({ ...avatarCrop, ...next });
  }

  function handleAvatarCropPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (avatarCropDragRef.current?.pointerId !== event.pointerId) return;
    avatarCropDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function changeAvatarCropZoom(zoom: number) {
    setAvatarCrop((current) => {
      if (!current) return current;
      const next = clampAvatarCrop(current, current.offsetX, current.offsetY, zoom);
      return { ...current, zoom, ...next };
    });
  }

  async function handleEndSupportSession() {
    setEndingSupport(true);
    try {
      await endSupportSession();
      window.location.assign('/administration-ncr');
    } catch (error) {
      console.error(error);
      setEndingSupport(false);
    }
  }

  const avatarCropBaseScale = avatarCrop
    ? Math.max(AVATAR_CROP_SIZE / avatarCrop.naturalWidth, AVATAR_CROP_SIZE / avatarCrop.naturalHeight)
    : 1;

  return (
    <div className="app-shell">
      <input
        id="profile-avatar-upload"
        className="profile-avatar-input"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => void handleProfileAvatarUpload(event)}
        disabled={profileAvatarBusy}
      />
      {profileAvatarMessage && <div className="profile-avatar-toast" role="status">{profileAvatarMessage}</div>}
      {avatarCrop && (
        <div className="avatar-crop-overlay" role="presentation" onClick={closeAvatarCrop}>
          <section className="avatar-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title" onClick={(event) => event.stopPropagation()}>
            <header>
              <div><p className="eyebrow">RECADRAGE</p><h2 id="avatar-crop-title">Photo de profil</h2></div>
              <button className="icon-button" type="button" onClick={closeAvatarCrop} aria-label="Fermer"><Icon name="close" size={20} /></button>
            </header>
            <div
              className="avatar-crop-viewport"
              onPointerDown={handleAvatarCropPointerDown}
              onPointerMove={handleAvatarCropPointerMove}
              onPointerUp={handleAvatarCropPointerUp}
              onPointerCancel={handleAvatarCropPointerUp}
            >
              <div
                className="avatar-crop-image-layer"
                style={{
                  width: avatarCrop.naturalWidth * avatarCropBaseScale,
                  height: avatarCrop.naturalHeight * avatarCropBaseScale,
                  transform: `translate(calc(-50% + ${avatarCrop.offsetX}px), calc(-50% + ${avatarCrop.offsetY}px))`
                }}
              >
                <img
                  ref={avatarCropImageRef}
                  src={avatarCrop.sourceUrl}
                  alt=""
                  draggable={false}
                  style={{ transform: `scale(${avatarCrop.zoom})` }}
                />
              </div>
              <span className="avatar-crop-ring" aria-hidden="true" />
            </div>
            <label className="avatar-crop-zoom">
              <span>Zoom</span>
              <input type="range" min="1" max="3" step=".01" value={avatarCrop.zoom} onChange={(event) => changeAvatarCropZoom(Number(event.target.value))} />
              <strong>{Math.round(avatarCrop.zoom * 100)} %</strong>
            </label>
            <footer>
              <button className="secondary-button" type="button" onClick={() => setAvatarCrop({ ...avatarCrop, zoom: 1, offsetX: 0, offsetY: 0 })}>Réinitialiser</button>
              <div>
                <button className="secondary-button" type="button" onClick={closeAvatarCrop}>Annuler</button>
                <button className="primary-button" type="button" onClick={() => void confirmAvatarCrop()} disabled={profileAvatarBusy}>{profileAvatarBusy ? 'Enregistrement…' : 'Utiliser la photo'}</button>
              </div>
            </footer>
          </section>
        </div>
      )}
      <aside className="sidebar">
        <div className="brand brand-horizontal">
          <img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
          <span>Plateforme métier</span>
        </div>

        {supportSession ? <div className="support-sidebar-identity">
          <span><Icon name="headset" size={18} /></span>
          <div><small>ASSISTANCE NCR</small><strong>{organization.name}</strong><em>{pack.label} · session temporaire</em></div>
        </div> : (
          <div className="desktop-context-switchers" ref={desktopContextRef}>
            <div className={`context-switcher organization-switcher${desktopContextMenu === 'organization' ? ' open' : ''}`}>
              <div className="context-switcher-label">
                <span>Entreprise</span>
                <small>{organizations.length > 1 ? `${organizations.length} espaces` : 'Espace actif'}</small>
              </div>
              <button
                className="context-switcher-trigger"
                type="button"
                onClick={() => setDesktopContextMenu((current) => current === 'organization' ? null : 'organization')}
                aria-expanded={desktopContextMenu === 'organization'}
                aria-controls="desktop-organization-menu"
              >
                <span className={`context-switcher-icon organization${organization.logo_url ? ' has-image' : ''}`} style={{ background: organization.logo_url ? '#fff' : organization.primary_color || '#0a84ff' }}>
                  {organization.logo_url ? <img src={organization.logo_url} alt="" /> : <Icon name={pack.icon} size={19} />}
                </span>
                <span className="context-switcher-copy">
                  <strong>{organization.name}</strong>
                  <small>{pack.label} · {planLabel(organization.plan)}</small>
                </span>
                <span className="context-switcher-chevron"><Icon name="chevronDown" size={17} /></span>
              </button>
              <div className="context-switcher-foot">
                <span><i />{organization.custom_role_label || organization.role || 'viewer'}</span>
                <small>Actif</small>
              </div>

              {desktopContextMenu === 'organization' && (
                <div className="context-switcher-menu" id="desktop-organization-menu" role="listbox" aria-label="Choisir une entreprise">
                  <header><span>Vos entreprises</span><small>{organizations.length}</small></header>
                  <div className="context-switcher-options">
                    {organizations.map((org) => {
                      const orgPack = businessPacks[org.business_type];
                      const active = org.id === organization.id;
                      return (
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          key={org.id}
                          className={active ? 'active' : ''}
                          onClick={() => changeOrganization(org.id)}
                        >
                          <span className={`context-option-icon${org.logo_url ? ' has-image' : ''}`} style={{ background: org.logo_url ? '#fff' : org.primary_color || '#0a84ff' }}>
                            {org.logo_url ? <img src={org.logo_url} alt="" /> : <Icon name={orgPack.icon} size={17} />}
                          </span>
                          <span className="context-option-copy">
                            <strong>{org.name}</strong>
                            <small>{orgPack.label} · {planLabel(org.plan)}</small>
                          </span>
                          {active ? <span className="context-option-check"><Icon name="check" size={15} /></span> : <Icon name="chevronRight" size={15} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {hasMultiSite && sites.length > 0 && (
              <div className={`context-switcher site-switcher${desktopContextMenu === 'site' ? ' open' : ''}`}>
                <div className="context-switcher-label">
                  <span>Établissement</span>
                  <small>{sites.length} site{sites.length > 1 ? 's' : ''}</small>
                </div>
                <button
                  className="context-switcher-trigger"
                  type="button"
                  onClick={() => setDesktopContextMenu((current) => current === 'site' ? null : 'site')}
                  aria-expanded={desktopContextMenu === 'site'}
                  aria-controls="desktop-site-menu"
                  disabled={sitesLoading}
                >
                  <span className="context-switcher-icon site"><Icon name="building" size={19} /></span>
                  <span className="context-switcher-copy">
                    <strong>{activeSite?.name ?? 'Tous les établissements'}</strong>
                    <small>{activeSite?.is_primary ? 'Établissement principal' : activeSite ? 'Vue de cet établissement' : 'Vue consolidée'}</small>
                  </span>
                  <span className="context-switcher-chevron"><Icon name="chevronDown" size={17} /></span>
                </button>
                <div className="context-switcher-foot site">
                  <span><i />{activeSite ? [activeSite.address, activeSite.city].filter(Boolean).join(' · ') || 'Site sélectionné' : 'Tous les sites réunis'}</span>
                </div>

                {desktopContextMenu === 'site' && (
                  <div className="context-switcher-menu" id="desktop-site-menu" role="listbox" aria-label="Choisir un établissement">
                    <header><span>Vos établissements</span><small>{sites.length}</small></header>
                    <div className="context-switcher-options">
                      {canManageOrganization && (
                        <button type="button" role="option" aria-selected={activeSiteId === null} className={activeSiteId === null ? 'active' : ''} onClick={() => changeSite(null)}>
                          <span className="context-option-icon all-sites"><Icon name="building" size={17} /></span>
                          <span className="context-option-copy"><strong>Tous les établissements</strong><small>Vue consolidée de l’entreprise</small></span>
                          {activeSiteId === null ? <span className="context-option-check"><Icon name="check" size={15} /></span> : <Icon name="chevronRight" size={15} />}
                        </button>
                      )}
                      {sites.map((site) => {
                        const active = site.id === activeSiteId;
                        return (
                          <button type="button" role="option" aria-selected={active} key={site.id} className={active ? 'active' : ''} onClick={() => changeSite(site.id)}>
                            <span className="context-option-icon site"><Icon name="building" size={17} /></span>
                            <span className="context-option-copy">
                              <strong>{site.name}</strong>
                              <small>{site.is_primary ? 'Principal' : [site.address, site.city].filter(Boolean).join(' · ') || 'Établissement'}</small>
                            </span>
                            {active ? <span className="context-option-check"><Icon name="check" size={15} /></span> : <Icon name="chevronRight" size={15} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <nav className="main-nav" aria-label="Navigation principale">
          {navigation.map((item) => {
            const locked = formationPathIsLocked(organization, item.path) || securityPathIsLocked(organization, item.path) || cleaningPathIsLocked(organization, item.path) || restaurantPathIsLocked(organization, item.path);
            const requiredPlan = organization.business_type === 'formation' ? formationRequiredPlanForPath(item.path) : organization.business_type === 'nettoyage' ? cleaningRequiredPlanForPath(item.path) : organization.business_type === 'restauration' ? restaurantRequiredPlanForPath(item.path) : securityRequiredPlanForPath(item.path);
            return <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => `${isActive ? 'active' : ''}${locked ? ' premium-locked' : ''}`}>
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
              {locked && <Icon name="lock" size={14} />}
              {locked && requiredPlan ? <b className="nav-badge premium" title={`Disponible avec l’offre ${requiredPlan}`}>{requiredPlan === 'Professionnelle' ? 'Pro' : requiredPlan === 'Essentielle' ? 'Essentiel' : requiredPlan}</b> : item.path === '/notifications' && notificationUnread > 0 ? <b className="nav-badge notification">{notificationUnread > 99 ? '99+' : notificationUnread}</b> : item.badge && <b className="nav-badge">{item.badge}</b>}
            </NavLink>;
          })}
        </nav>

        {canManageSubscription && (
          <NavLink className="sidebar-subscription-link" to="/abonnement">
            <span><Icon name="creditCard" size={20} /></span>
            <span><strong>Mon abonnement</strong><small>{planLabel(organization.plan)} · Gérer la formule</small></span>
            <Icon name="chevronRight" size={17} />
          </NavLink>
        )}

        <div className="sidebar-footer">
          <label className={`user-avatar profile-avatar-upload${profileAvatarBusy ? ' busy' : ''}`} htmlFor="profile-avatar-upload" title="Changer la photo de profil">
            <AvatarContent url={profileAvatarUrl} initial={userInitial} />
            <i><Icon name="plus" size={10} /></i>
          </label>
          <div className="user-summary">
            <strong>{user?.user_metadata?.full_name || 'Utilisateur'}</strong>
            <span>{user?.email}</span>
          </div>
          <button className="icon-button" onClick={handleSignOut} title="Se déconnecter" aria-label="Se déconnecter">
            <Icon name="logout" size={19} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        {supportSession && <div className="support-session-banner" role="status">
          <span className="support-session-banner-icon"><Icon name="eye" size={20} /></span>
          <div><strong>Assistance NCR active dans {organization.name}</strong><small>{supportSession.reason} · fin prévue à {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(supportSession.expires_at))}</small></div>
          <button type="button" onClick={() => void handleEndSupportSession()} disabled={endingSupport}><Icon name="logout" size={16} /> {endingSupport ? 'Fermeture…' : 'Quitter l’entreprise'}</button>
        </div>}
        <header className="mobile-header">
          <button
            className="mobile-menu-trigger"
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label="Ouvrir le menu"
          >
            <Icon name="menu" size={22} />
          </button>

          <button className="mobile-header-company" type="button" onClick={() => setMobileMenuOpen(true)}>
            <img src="/brand/ncr-suite-icon.png" alt="" />
            <span>
              <strong>{organization.name}</strong>
              <small>{pack.label}</small>
            </span>
          </button>

          <button
            className="mobile-account-avatar-button"
            type="button"
            onClick={() => setMobileAccountOpen(true)}
            aria-expanded={mobileAccountOpen}
            aria-controls="mobile-account-sheet"
            aria-label="Compte et entreprises"
          >
            <AvatarContent url={profileAvatarUrl} initial={userInitial} />
          </button>
        </header>

        <Outlet />
      </main>

      <nav className="mobile-bottom-nav" aria-label="Navigation rapide">
        <NavLink to="/" end>
          <Icon name="home" size={21} />
          <span>Accueil</span>
        </NavLink>
        {primaryMobileItem && (
          <NavLink to={primaryMobileItem.path}>
            <Icon name={primaryMobileItem.icon} size={21} />
            <span>{primaryMobileItem.label}</span>
          </NavLink>
        )}
        {quickAction ? (
          <NavLink className="mobile-create-action" to={quickAction.path} aria-label={quickAction.label}>
            <span><Icon name="plus" size={25} /></span>
            <small>Nouveau</small>
          </NavLink>
        ) : (
          <NavLink className="mobile-create-action" to={primaryMobileItem?.path ?? '/'} aria-label="Ouvrir le planning">
            <span><Icon name="calendar" size={23} /></span>
            <small>Planning</small>
          </NavLink>
        )}
        <button type="button" onClick={() => setMobileMenuOpen(true)} className={mobileMenuOpen ? 'active' : ''}>
          <Icon name="menu" size={21} />
          <span>Menu</span>
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" role="presentation" onClick={() => setMobileMenuOpen(false)}>
          <aside
            id="mobile-navigation-drawer"
            className="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation NCR Suite"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-drawer-header">
              <img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
              <button className="icon-button" type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Fermer le menu">
                <Icon name="close" size={21} />
              </button>
            </div>

            <button className="mobile-drawer-organization" type="button" onClick={() => { setMobileMenuOpen(false); setMobileAccountOpen(true); }}>
              <span className={`mobile-organization-logo${organization.logo_url ? ' has-image' : ''}`} style={{ background: organization.logo_url ? '#fff' : organization.primary_color || '#0a84ff' }}>
                {organization.logo_url ? <img src={organization.logo_url} alt="" /> : organization.name.slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong>{organization.name}</strong>
                <small>{hasMultiSite && sites.length > 0 ? (activeSite ? activeSite.name : 'Tous les établissements') : organizations.length > 1 ? 'Changer d’entreprise' : `${pack.label} · ${planLabel(organization.plan)}`}</small>
              </span>
              <Icon name="chevronRight" size={18} />
            </button>

            {canManageSubscription && (
              <NavLink className="mobile-drawer-subscription-card" to="/abonnement" onClick={() => setMobileMenuOpen(false)}>
                <span className="mobile-drawer-subscription-icon"><Icon name="creditCard" size={21} /></span>
                <span><strong>Mon abonnement</strong><small>{planLabel(organization.plan)} · Offre, utilisation et changement</small></span>
                <Icon name="chevronRight" size={18} />
              </NavLink>
            )}

            <div className="mobile-drawer-section-title">Navigation</div>
            <nav className="mobile-drawer-nav" aria-label="Toutes les rubriques">
              {navigation.map((item) => {
                const locked = formationPathIsLocked(organization, item.path) || securityPathIsLocked(organization, item.path) || cleaningPathIsLocked(organization, item.path) || restaurantPathIsLocked(organization, item.path);
                const requiredPlan = organization.business_type === 'formation' ? formationRequiredPlanForPath(item.path) : organization.business_type === 'nettoyage' ? cleaningRequiredPlanForPath(item.path) : organization.business_type === 'restauration' ? restaurantRequiredPlanForPath(item.path) : securityRequiredPlanForPath(item.path);
                return <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={() => setMobileMenuOpen(false)} className={({ isActive }) => `${isActive ? 'active' : ''}${locked ? ' premium-locked' : ''}`}>
                  <span className="mobile-drawer-nav-icon"><Icon name={item.icon} size={20} /></span>
                  <span>{item.label}</span>
                  {locked && <Icon name="lock" size={14} />}
                  {locked && requiredPlan ? <b className="nav-badge premium">{requiredPlan}</b> : item.path === '/notifications' && notificationUnread > 0 ? <b className="nav-badge notification">{notificationUnread > 99 ? '99+' : notificationUnread}</b> : item.badge && <b className="nav-badge">{item.badge}</b>}
                  <Icon name="chevronRight" size={17} />
                </NavLink>;
              })}
            </nav>

            <div className="mobile-drawer-account">
              <div className="mobile-drawer-user">
                <span className={profileAvatarUrl ? 'has-image' : ''}><AvatarContent url={profileAvatarUrl} initial={userInitial} /></span>
                <div>
                  <strong>{user?.user_metadata?.full_name || 'Utilisateur'}</strong>
                  <small>{user?.email}</small>
                </div>
              </div>
              <button type="button" onClick={handleSignOut}>
                <Icon name="logout" size={19} />
                Se déconnecter
              </button>
            </div>
          </aside>
        </div>
      )}

      {mobileAccountOpen && (
        <div className="mobile-account-overlay" role="presentation" onClick={() => setMobileAccountOpen(false)}>
          <section
            id="mobile-account-sheet"
            className="mobile-account-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Compte et entreprise"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-header">
              <div className="mobile-sheet-user">
                <label className={`mobile-sheet-avatar profile-avatar-upload${profileAvatarUrl ? ' has-image' : ''}`} htmlFor="profile-avatar-upload" title="Changer la photo de profil">
                  <AvatarContent url={profileAvatarUrl} initial={userInitial} />
                  <i><Icon name="plus" size={10} /></i>
                </label>
                <div>
                  <strong>{user?.user_metadata?.full_name || 'Utilisateur'}</strong>
                  <small>{user?.email}</small>
                </div>
              </div>
              <button className="icon-button" type="button" onClick={() => setMobileAccountOpen(false)} aria-label="Fermer">
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="mobile-organization-section">
              <div className="mobile-sheet-title">
                <div>
                  <span>Entreprise active</span>
                  <small>{organizations.length > 1 ? `${organizations.length} espaces accessibles` : '1 espace accessible'}</small>
                </div>
              </div>

              <div className="mobile-organization-list">
                {organizations.map((org) => {
                  const orgPack = businessPacks[org.business_type];
                  const active = org.id === organization.id;
                  return (
                    <button
                      type="button"
                      key={org.id}
                      className={`mobile-organization-option${active ? ' active' : ''}`}
                      onClick={() => changeOrganization(org.id)}
                    >
                      <span className={`mobile-organization-logo${org.logo_url ? ' has-image' : ''}`} style={{ background: org.logo_url ? '#fff' : org.primary_color || '#0a84ff' }}>
                        {org.logo_url ? <img src={org.logo_url} alt="" /> : org.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="mobile-organization-copy">
                        <strong>{org.name}</strong>
                        <small>{orgPack.label} · {org.plan}</small>
                      </span>
                      {active && <Icon name="check" size={20} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {hasMultiSite && sites.length > 0 && (
              <div className="mobile-organization-section mobile-site-section">
                <div className="mobile-sheet-title">
                  <div>
                    <span>Établissement actif</span>
                    <small>{sites.length} site{sites.length > 1 ? 's' : ''} actif{sites.length > 1 ? 's' : ''}</small>
                  </div>
                </div>
                <div className="mobile-organization-list">
                  {canManageOrganization && (
                    <button type="button" className={`mobile-organization-option${activeSiteId === null ? ' active' : ''}`} onClick={() => changeSite(null)}>
                      <span className="mobile-organization-logo site-all"><Icon name="building" size={20} /></span>
                      <span className="mobile-organization-copy"><strong>Tous les établissements</strong><small>Vue consolidée de l’entreprise</small></span>
                      {activeSiteId === null && <Icon name="check" size={20} />}
                    </button>
                  )}
                  {sites.map((site) => {
                    const active = site.id === activeSiteId;
                    return (
                      <button type="button" key={site.id} className={`mobile-organization-option${active ? ' active' : ''}`} onClick={() => changeSite(site.id)}>
                        <span className="mobile-organization-logo" style={{ background: organization.primary_color || '#0a84ff' }}><Icon name="building" size={20} /></span>
                        <span className="mobile-organization-copy"><strong>{site.name}</strong><small>{site.is_primary ? 'Établissement principal' : [site.address, site.city].filter(Boolean).join(' · ') || 'Établissement'}</small></span>
                        {active && <Icon name="check" size={20} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mobile-account-actions">
              {hasCommercialBrandingModule && canManageOrganization && (
                <NavLink to="/personnalisation" className="mobile-account-action branding" onClick={() => setMobileAccountOpen(false)}>
                  <Icon name="sparkles" size={20} />
                  <span>Personnaliser l’entreprise</span>
                  <Icon name="chevronRight" size={17} />
                </NavLink>
              )}
              {canManageSubscription && (
                <NavLink to="/abonnement" className="mobile-account-action subscription" onClick={() => setMobileAccountOpen(false)}>
                  <Icon name="creditCard" size={20} />
                  <span>Mon abonnement</span>
                  <Icon name="chevronRight" size={17} />
                </NavLink>
              )}
              <NavLink to="/parametres" className="mobile-account-action" onClick={() => setMobileAccountOpen(false)}>
                <Icon name="settings" size={20} />
                <span>Paramètres de l’entreprise</span>
                <Icon name="chevronRight" size={17} />
              </NavLink>
              <button type="button" className="mobile-account-action danger" onClick={handleSignOut}>
                <Icon name="logout" size={20} />
                <span>Se déconnecter</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
