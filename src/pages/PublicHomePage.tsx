import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageMetadata } from '../components/PageMetadata';
import { publicHomeModuleUrl } from '../components/public-home/moduleUrl';

type PublicHomeComponent = React.ComponentType<{ navigate: (path: string) => void }>;
type PublicHomeRuntime = { PublicHome: PublicHomeComponent };
const bridgeKey = Symbol.for('ncr.public-home.react');

export function PublicHomePage() {
  const [Component, setComponent] = useState<PublicHomeComponent | null>(null);
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let cancelled = false;
    const bridge = { React, jsx };
    const bridgeHost = globalThis as unknown as Record<symbol, unknown>;
    bridgeHost[bridgeKey] = bridge;
    setState('loading');
    // Keep the historic SaaS bundle and PWA shell unchanged. Only this public page
    // requests the separately built, versioned marketing module.
    void import(/* @vite-ignore */ publicHomeModuleUrl).then((runtime: PublicHomeRuntime) => {
      if (cancelled) return;
      setComponent(() => runtime.PublicHome);
      setState('ready');
    }).catch(() => { if (!cancelled) setState('error'); }).finally(() => {
      if (bridgeHost[bridgeKey] === bridge) delete bridgeHost[bridgeKey];
    });
    return () => { cancelled = true; };
  }, [navigate]);
  return <>
    <PageMetadata title="NCR Suite — Une plateforme, cinq expériences métier" description="Formation, sécurité privée, nettoyage, restauration, coiffure et beauté : une plateforme de gestion commune, des outils adaptés à votre activité." path="/" image="/og/ncr-suite-og-v2221.webp" index />
    {state !== 'ready' && <main aria-busy={state === 'loading'} data-public-home-startup={state} style={{
      position: 'fixed', inset: 0, zIndex: 2147483646, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, boxSizing: 'border-box',
      overflowY: 'auto', background: '#080d12', color: '#fff', textAlign: 'center',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', lineHeight: 1.5,
    }}>
      <img src="/brand/ncr-suite-icon.png" alt="" width={72} height={72} style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover' }} />
      {state === 'loading' ? <>
        <strong style={{ margin: 0, fontSize: 22 }}>NCR Suite</strong>
        <span role="status" style={{ fontSize: 12, color: '#8e9aa4' }}>Chargement de la présentation…</span>
      </> : <>
        <h1 style={{ margin: 0, maxWidth: 640, fontSize: 24 }}>NCR Suite — Une plateforme, cinq expériences métier</h1>
        <p role="status" style={{ margin: 0, maxWidth: 480 }}>La présentation immersive n’a pas pu se charger. Les accès ci-dessous restent disponibles.</p>
        <nav aria-label="Accès NCR Suite" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24 }}>
          <Link style={{ color: '#fff', textDecoration: 'underline', padding: 12 }} to="/connexion">Connexion</Link>
          <Link style={{ color: '#fff', textDecoration: 'underline', padding: 12 }} to="/demande-acces?essai=7">Essai gratuit de 7 jours</Link>
        </nav>
      </>}
    </main>}
    <div id="ncr-public-home" className="ncr-public-home">{Component && <Component navigate={navigate} />}</div>
  </>;
}
