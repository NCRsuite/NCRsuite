import { useLocation } from 'react-router-dom';
import { businessPacks } from '../config/businessPacks';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';

export function ModulePage() {
  const location = useLocation();
  const { organization } = useOrganization();
  if (!organization) return null;
  const pack = businessPacks[organization.business_type];
  const item = pack.navigation.find((nav) => nav.path === location.pathname);
  const title = item?.label ?? 'Module';
  const icon = item?.icon ?? 'briefcase';

  return (
    <div className="page">
      <header className="page-header">
        <div><p className="eyebrow">{pack.label.toUpperCase()}</p><h1>{title}</h1><p>Ce module sera développé dans son lot fonctionnel dédié.</p></div>
        <button className="primary-button"><Icon name={icon} size={18} />Nouvel élément</button>
      </header>

      <section className="panel module-empty">
        <div className="empty-icon"><Icon name={icon} size={34} /></div>
        <h2>Structure prête</h2>
        <p>La navigation, le pack métier, les permissions et la séparation par entreprise sont déjà prévus. Les fonctions détaillées de « {title} » seront branchées sur ce socle.</p>
        <div className="module-checks"><span>✓ Interface responsive</span><span>✓ Route métier active</span><span>✓ Organisation isolée</span><span>✓ Personnalisation dynamique</span></div>
      </section>
    </div>
  );
}
