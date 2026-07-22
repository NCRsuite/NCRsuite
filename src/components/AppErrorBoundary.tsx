import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur d’interface NCR Suite', error, info.componentStack);
    window.dispatchEvent(new CustomEvent('ncr:runtime-error', {
      detail: {
        message: error.message,
        pathname: window.location.pathname,
        occurredAt: new Date().toISOString()
      }
    }));
  }

  private retry = () => this.setState({ error: null });

  private reload = () => window.location.reload();

  private resetAndReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith('ncr-suite-')).map((key) => caches.delete(key)));
      }
    } finally {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="app-crash-screen" role="alert">
        <section className="app-crash-card">
          <img src="/brand/ncr-suite-icon.png" alt="" />
          <p className="eyebrow">NCR SUITE · RÉCUPÉRATION</p>
          <h1>Cette page a rencontré un problème.</h1>
          <p>Vos données enregistrées ne sont pas supprimées. Réessaie d’abord, puis recharge l’application si le problème persiste.</p>
          <div className="app-crash-actions">
            <button type="button" className="primary-button" onClick={this.retry}>Réessayer</button>
            <button type="button" className="secondary-button" onClick={this.reload}>Recharger</button>
            <button type="button" className="text-button" onClick={() => void this.resetAndReload()}>Réinitialiser le cache</button>
          </div>
          <details>
            <summary>Détail technique</summary>
            <code>{this.state.error.message || 'Erreur inconnue'}</code>
          </details>
        </section>
      </main>
    );
  }
}
