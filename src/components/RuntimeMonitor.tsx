import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { APP_VERSION, PWA_CACHE_NAME, RUNTIME_HEARTBEAT_INTERVAL_MS } from '../config/runtime';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

type RuntimeSource = 'react' | 'window' | 'promise' | 'network' | 'service_worker' | 'release' | 'unknown';
type RuntimeSeverity = 'info' | 'warning' | 'error' | 'critical';

type RuntimeErrorDetail = {
  message?: string;
  stack?: string;
  componentStack?: string;
  pathname?: string;
  occurredAt?: string;
  source?: RuntimeSource;
  severity?: RuntimeSeverity;
};

type ReleaseState = {
  database_version?: string;
  expected_frontend_version?: string;
  expected_pwa_cache?: string;
  installed_at?: string;
};

let fallbackSessionKey = '';

function sessionKey() {
  const storageKey = 'ncr-suite-runtime-session';
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) return stored;
    const created = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(storageKey, created);
    return created;
  } catch {
    if (!fallbackSessionKey) fallbackSessionKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return fallbackSessionKey;
  }
}

function errorMessage(reason: unknown) {
  if (reason instanceof Error) return reason.message || 'Erreur inconnue';
  if (typeof reason === 'string') return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return 'Erreur inconnue';
  }
}

function errorStack(reason: unknown) {
  return reason instanceof Error ? reason.stack ?? '' : '';
}

export function RuntimeMonitor() {
  const { user, demoMode } = useAuth();
  const { organization } = useOrganization();
  const location = useLocation();
  const reporting = useRef(false);
  const lastHeartbeatAt = useRef(0);

  useEffect(() => {
    if (!supabase || !user || demoMode) return;

    async function report(
      source: RuntimeSource,
      severity: RuntimeSeverity,
      message: string,
      stack = '',
      pathname = window.location.pathname,
      metadata: Record<string, unknown> = {}
    ) {
      if (!supabase || reporting.current || !message.trim()) return;
      reporting.current = true;
      try {
        await supabase.rpc('report_client_runtime_error', {
          p_organization_id: organization?.id ?? null,
          p_source: source,
          p_severity: severity,
          p_message: message.slice(0, 2000),
          p_stack: stack.slice(0, 8000),
          p_pathname: pathname.slice(0, 500),
          p_app_version: APP_VERSION,
          p_pwa_cache: PWA_CACHE_NAME,
          p_metadata: {
            ...metadata,
            user_agent: navigator.userAgent,
            online: navigator.onLine,
            viewport: `${window.innerWidth}x${window.innerHeight}`
          }
        });
      } catch (monitoringError) {
        console.warn('Surveillance NCR Suite indisponible.', monitoringError);
      } finally {
        reporting.current = false;
      }
    }

    const onWindowError = (event: ErrorEvent) => {
      void report('window', 'error', event.message || 'Erreur JavaScript', event.error?.stack || '', window.location.pathname, {
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      void report('promise', 'error', errorMessage(event.reason), errorStack(event.reason));
    };

    const onRuntimeError = (event: Event) => {
      const detail = (event as CustomEvent<RuntimeErrorDetail>).detail ?? {};
      const stack = [detail.stack, detail.componentStack].filter(Boolean).join('\n');
      void report(
        detail.source ?? 'react',
        detail.severity ?? 'critical',
        detail.message ?? 'Erreur d’interface NCR Suite',
        stack,
        detail.pathname ?? window.location.pathname,
        { occurred_at: detail.occurredAt }
      );
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('ncr:runtime-error', onRuntimeError);

    return () => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('ncr:runtime-error', onRuntimeError);
    };
  }, [user?.id, organization?.id, demoMode]);

  useEffect(() => {
    if (!supabase || !user || demoMode) return;
    let active = true;

    async function heartbeat(force = false) {
      if (!supabase || !active) return;
      const now = Date.now();
      if (!force && now - lastHeartbeatAt.current < 30_000) return;
      lastHeartbeatAt.current = now;
      const { error } = await supabase.rpc('record_runtime_heartbeat', {
        p_organization_id: organization?.id ?? null,
        p_session_key: sessionKey(),
        p_app_version: APP_VERSION,
        p_pwa_cache: PWA_CACHE_NAME,
        p_pathname: `${location.pathname}${location.search}`,
        p_online: navigator.onLine,
        p_user_agent: navigator.userAgent
      });
      if (error) console.warn('Heartbeat NCR Suite non enregistré.', error.message);
    }

    void heartbeat(true);
    const timer = window.setInterval(() => void heartbeat(true), RUNTIME_HEARTBEAT_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void heartbeat(true);
    };
    const onOnline = () => void heartbeat(true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  }, [user?.id, organization?.id, demoMode, location.pathname, location.search]);

  useEffect(() => {
    if (!supabase || !user || demoMode) return;
    let active = true;

    async function checkRelease() {
      if (!supabase || !active) return;
      const { data, error } = await supabase.rpc('get_runtime_release_state');
      if (error || !data) return;
      const release = data as ReleaseState;
      const mismatch = release.expected_frontend_version !== APP_VERSION || release.expected_pwa_cache !== PWA_CACHE_NAME;
      window.dispatchEvent(new CustomEvent('ncr:release-status', {
        detail: {
          mismatch,
          currentVersion: APP_VERSION,
          expectedVersion: release.expected_frontend_version,
          currentCache: PWA_CACHE_NAME,
          expectedCache: release.expected_pwa_cache,
          databaseVersion: release.database_version
        }
      }));
    }

    void checkRelease();
    const timer = window.setInterval(() => void checkRelease(), 10 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user?.id, demoMode]);

  return null;
}
