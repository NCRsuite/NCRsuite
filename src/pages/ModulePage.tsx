import { Link, Navigate, useLocation } from 'react-router-dom';
import { businessPacks } from '../config/businessPacks';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import { TrainingPersonalActivityPage } from './TrainingPersonalActivityPage';
import { TrainingPersonalPlanningPage } from './TrainingPersonalPlanningPage';
import { TrainingPersonalMonthlyBillingPage } from './TrainingPersonalMonthlyBillingPage';
import './TrainingPersonalActivityShortcut.css';

const MODULE_BY_PATH: Record<string, string> = {
  '/fidelite': 'loyalty',
  '/planning': 'planning',
  '/agents': 'agents',
  '/sites': 'sites',
  '/interventions': 'interventions',
  '/rapports': 'reports',
  '/anomalies': 'anomalies',
  '/prises-de-poste': 'shifts',
  '/main-courante': 'logbook',
  '/rondes': 'patrols',
  '/alertes': 'alerts',
  '/documents': 'documents',
  '/formations': 'training_programs',
  '/stagiaires': 'trainees',
  '/formateurs': 'trainers',
  '/sessions': 'sessions',
  '/mon-activite': 'sessions',
  '/mon-planning': 'sessions',
  '/facturation-mensuelle': 'training_billing',
  '/emargements': 'attendance',
  '/attestations': 'certificates',
  '/devis': 'quotes'
};

export function ModulePage() {
  const location = useLocation();
  const { organization } = useOrganization();
  if (!organization) return null;
  const pack = businessPacks[organization.business_type];
  const item = pack.navigation.find((nav) => nav.path === location.pathname);
  const moduleKey = MODULE_BY_PATH[location.pathname];
  if (organization.plan === 'metier' && moduleKey) {
    if (organization.metier_modules_configured && !(organization.enabled_modules ?? []).includes(moduleKey)) {
      return <Navigate to="/" replace />;
    }
    if (organization.custom_role_id && !(organization.custom_module_keys ?? []).includes(moduleKey)) {
      return <Navigate to="/" replace />;
    }
  }

  if (organization.business_type === 'formation' && location.pathname === '/mon-activite') return <>
    <div className="personal-activity-billing-shortcut">
      <span className="personal-activity-billing-shortcut-icon"><Icon name="file" size={19} /></span>
      <div className="personal-activity-billing-shortcut-copy">
        <small>FACTURATION MENSUELLE</small>
        <strong>Facturer tes heures terminées</strong>
        <span>Regroupe automatiquement tes interventions externes par centre et par mois.</span>
      </div>
      <Link className="personal-activity-billing-shortcut-action" to="/facturation-mensuelle">
        Ouvrir
        <Icon name="chevronRight" size={16} />
      </Link>
    </div>
    <TrainingPersonalActivityPage />
  </>;
  if (organization.business_type === 'formation' && location.pathname === '/mon-planning') return <TrainingPersonalPlanningPage />;
  if (organization.business_type === 'formation' && location.pathname === '/facturation-mensuelle') return <TrainingPersonalMonthlyBillingPage />;

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
