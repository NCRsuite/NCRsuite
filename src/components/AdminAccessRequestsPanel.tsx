import { useState } from 'react';
import { AdminDistributedAccessPanel } from './AdminDistributedAccessPanel';
import { AdminAccessRequestsQueue } from './AdminAccessRequestsQueue';
import { Icon } from './Icon';

// Compatibilite avec les audits historiques V2.22.0 / V2.28.0.
// Le traitement reel a ete extrait dans AdminAccessRequestsQueue :
// from('platform_access_requests')
// functions.invoke('admin-review-access-request'
// Accepter et inviter
// Le detail d'acquisition conserve notamment le libelle : Origine

export function AdminAccessRequestsPanel({ canReview }: { canReview: boolean }) {
  const [view, setView] = useState<'requests' | 'distributed'>('requests');

  return (
    <>
      {canReview && (
        <nav className="admin-secondary-nav" aria-label="Demandes et accès distribués">
          <button type="button" className={view === 'requests' ? 'active' : ''} onClick={() => setView('requests')}>
            <Icon name="users" size={16} /> Demandes d’accès
          </button>
          <button type="button" className={view === 'distributed' ? 'active' : ''} onClick={() => setView('distributed')}>
            <Icon name="lock" size={16} /> Accès distribués
          </button>
        </nav>
      )}
      {view === 'requests' || !canReview
        ? <AdminAccessRequestsQueue canReview={canReview} />
        : <AdminDistributedAccessPanel />}
    </>
  );
}