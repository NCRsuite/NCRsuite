import { DOMAIN_OFFER_CATALOG } from '../config/domainOfferCatalog';
import { Icon } from './Icon';
import type { BusinessType, Plan } from '../types';

const domainOrder: BusinessType[] = ['coiffure', 'formation', 'securite', 'nettoyage', 'restauration'];
const planOrder: Plan[] = ['decouverte', 'essentielle', 'professionnelle', 'metier'];

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function OfferCatalogAdminPanel() {
  const activeCount = domainOrder.filter((businessType) => DOMAIN_OFFER_CATALOG[businessType].launchStatus === 'available').length;

  return (
    <section className="offer-catalog-admin">
      <header className="offer-catalog-hero panel">
        <div>
          <p className="eyebrow">CATALOGUE CENTRAL</p>
          <h2>Offres et tarifs par domaine</h2>
          <p>Cette vue est la référence commerciale de NCR Suite. Chaque formule affiche uniquement son socle ou ce qu’elle ajoute par rapport au niveau précédent.</p>
        </div>
        <div className="offer-catalog-summary">
          <span><strong>{domainOrder.length}</strong><small>domaines définis</small></span>
          <span><strong>{activeCount}</strong><small>disponibles</small></span>
          <span><strong>{domainOrder.length - activeCount}</strong><small>en préparation</small></span>
        </div>
      </header>

      <div className="offer-catalog-domain-list">
        {domainOrder.map((businessType) => {
          const domain = DOMAIN_OFFER_CATALOG[businessType];
          return (
            <article className="panel offer-catalog-domain" key={businessType}>
              <header className="offer-catalog-domain-header">
                <span className="offer-catalog-domain-icon"><Icon name={domain.icon} size={24} /></span>
                <div>
                  <div className="offer-catalog-title-line">
                    <h3>{domain.label}</h3>
                    <span className={`offer-catalog-status ${domain.launchStatus}`}>
                      {domain.launchStatus === 'available' ? 'Disponible' : 'En préparation'}
                    </span>
                  </div>
                  <p>{domain.description}</p>
                </div>
              </header>

              <div className="offer-catalog-plan-grid">
                {planOrder.map((planKey, index) => {
                  const plan = domain.plans[planKey];
                  const unit = plan.memberLimit > 1 ? domain.accessUnitPlural : domain.accessUnitSingular;
                  return (
                    <section className={`offer-catalog-plan${plan.recommended ? ' recommended' : ''}`} key={planKey}>
                      {plan.recommended && <span className="offer-catalog-recommended">Recommandée</span>}
                      <div className="offer-catalog-plan-top">
                        <div>
                          <small>{index === 0 ? 'SOCLE INCLUS' : `EN PLUS DE ${domain.plans[planOrder[index - 1]].label.toUpperCase()}`}</small>
                          <h4>{plan.label}</h4>
                        </div>
                        <strong>{plan.startingAt ? 'À partir de ' : ''}{money(plan.monthlyPriceCents)}<small> HT/mois</small></strong>
                      </div>
                      <p>{plan.detail}</p>
                      <div className="offer-catalog-access"><Icon name="users" size={16} /> Jusqu’à {plan.memberLimit} {unit}</div>
                      <ul>
                        {plan.additions.map((addition) => <li key={addition}><Icon name="check" size={15} /> {addition}</li>)}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      <div className="info-message offer-catalog-note">
        Les domaines marqués « En préparation » sont présents dans le catalogue et dans la configuration des paiements, mais leur création reste bloquée tant que leur module métier n’est pas développé et validé.
      </div>
    </section>
  );
}
