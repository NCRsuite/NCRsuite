import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';

export function OrganizationAccessPage() {
  const { signOut } = useAuth();
  const { organization, organizations, selectOrganization } = useOrganization();
  const navigate = useNavigate();

  if (!organization) return null;
  const closed = organization.status === 'closed';
  const paymentRequired = organization.billing_access_reason === 'payment_required';
  const paymentLocked = organization.billing_access_reason === 'past_due_locked';
  const canceled = organization.billing_access_reason === 'canceled';
  const otherOrganizations = organizations.filter((item) => item.id !== organization.id && ['active', 'trial'].includes(item.status));
  const title = closed
    ? 'Cet espace est fermé.'
    : paymentRequired
      ? 'Le paiement doit être finalisé.'
      : paymentLocked
        ? 'Le délai de régularisation est terminé.'
        : canceled
          ? 'Cet abonnement est résilié.'
          : 'Cet espace est temporairement suspendu.';

  function changeOrganization(id: string) {
    selectOrganization(id);
    navigate('/', { replace: true });
  }

  return (
    <div className="organization-access-page">
      <div className="organization-access-card">
        <img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" />
        <span className="organization-access-icon"><Icon name={closed ? 'lock' : 'alert'} size={30} /></span>
        <p className="eyebrow">ACCÈS À L’ENTREPRISE</p>
        <h1>{title}</h1>
        <p>
          L’entreprise <strong>{organization.name}</strong> et toutes ses données restent enregistrées.
          Les fonctions non comprises dans l’offre active sont simplement verrouillées : aucun client, document, historique ou dossier n’est supprimé.
          Une régularisation ou une remontée en gamme rétablit les accès autorisés.
        </p>

        {otherOrganizations.length > 0 && (
          <label>
            Ouvrir une autre entreprise
            <select defaultValue="" onChange={(event) => event.target.value && changeOrganization(event.target.value)}>
              <option value="" disabled>Choisir un espace actif</option>
              {otherOrganizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        )}

        <div className="organization-access-actions">
          {!closed && <button className="primary-button" type="button" onClick={() => navigate('/abonnement')}>Gérer mon abonnement</button>}
          <a className={closed ? 'primary-button' : 'secondary-button'} href="mailto:contact@ncr-suite.fr">Contacter NCR Suite</a>
          <button className="secondary-button" type="button" onClick={() => signOut()}>Se déconnecter</button>
        </div>
      </div>
    </div>
  );
}
