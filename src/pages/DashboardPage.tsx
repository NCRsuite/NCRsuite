import { Link } from 'react-router-dom';
import { businessPacks } from '../config/businessPacks';
import { Icon } from '../components/Icon';
import { StatCard } from '../components/StatCard';
import { useOrganization } from '../contexts/OrganizationContext';
import { BookingDashboardPage } from './BookingDashboardPage';
import { TrainingDashboardPage } from './TrainingDashboardPage';
import { SecurityDashboardPage } from './SecurityDashboardPage';
import { SecurityAgentPortalPage } from './SecurityAgentPortalPage';

export function DashboardPage() {
  const { organization } = useOrganization();
  if (!organization) return null;
  if (organization.business_type === 'coiffure') return <BookingDashboardPage />;
  if (organization.business_type === 'formation') return <TrainingDashboardPage />;
  if (organization.business_type === 'securite') return organization.role === 'employee' ? <SecurityAgentPortalPage /> : <SecurityDashboardPage />;
  const pack = businessPacks[organization.business_type];

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{pack.label.toUpperCase()}</p>
          <h1>Bonjour, bienvenue sur {organization.name}.</h1>
          <p>Voici l’essentiel de votre activité aujourd’hui.</p>
        </div>
        <div className="header-actions">
          {pack.quickActions.map((action) => (
            <Link key={action.label} className="primary-button" to={action.path}><Icon name={action.icon} size={18} />{action.label}</Link>
          ))}
        </div>
      </header>

      <section className="stats-grid">
        {pack.metrics.map((metric) => <StatCard key={metric.label} {...metric} />)}
      </section>

      <section className="dashboard-grid">
        <article className="panel large-panel">
          <div className="panel-header"><div><p className="eyebrow">ACTIVITÉ</p><h2>Vue de la semaine</h2></div><button className="secondary-button">Voir le détail</button></div>
          <div className="chart-placeholder" aria-label="Graphique de démonstration">
            {[42, 64, 53, 82, 70, 91, 58].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
          </div>
          <div className="chart-labels"><span>Lun.</span><span>Mar.</span><span>Mer.</span><span>Jeu.</span><span>Ven.</span><span>Sam.</span><span>Dim.</span></div>
        </article>

        <article className="panel">
          <div className="panel-header"><div><p className="eyebrow">À TRAITER</p><h2>Priorités</h2></div></div>
          <div className="task-list">
            <div><span className="task-dot urgent"/><div><strong>Élément prioritaire</strong><small>À vérifier aujourd’hui</small></div><b>1</b></div>
            <div><span className="task-dot"/><div><strong>Documents en attente</strong><small>Action recommandée</small></div><b>4</b></div>
            <div><span className="task-dot success"/><div><strong>Éléments validés</strong><small>Cette semaine</small></div><b>12</b></div>
          </div>
        </article>
      </section>

      <section className="panel onboarding-note">
        <div className="note-icon"><Icon name={pack.icon} size={26} /></div>
        <div><p className="eyebrow">PACK MÉTIER ACTIF</p><h2>{pack.label}</h2><p>{pack.description} Les autres métiers utilisent le même socle NCR Suite, mais disposent de menus et de tableaux de bord différents.</p></div>
      </section>
    </div>
  );
}
