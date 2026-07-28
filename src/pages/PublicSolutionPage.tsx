import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageMetadata } from '../components/PageMetadata';
import { PublicSiteFooter } from '../components/PublicSiteFooter';
import { PublicSiteHeader } from '../components/PublicSiteHeader';
import { formatPublicMonthlyPrice, publicOfferCatalog } from '../config/publicOfferCatalog';
import seoPagesData from '../config/publicSeoPages.json';
import type { BusinessType, IconName, Plan } from '../types';

type SeoFeature = {
  icon: IconName;
  title: string;
  text: string;
};

type SeoWorkflow = {
  step: string;
  title: string;
  text: string;
};

type SeoFaq = {
  question: string;
  answer: string;
};

type SeoPage = {
  key: BusinessType;
  name: string;
  label: string;
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  lead: string;
  outcome: string;
  color: string;
  icon: IconName;
  defaultPlan: Plan;
  proofPoints: string[];
  features: SeoFeature[];
  workflow: SeoWorkflow[];
  faq: SeoFaq[];
};

const seoPages = seoPagesData as SeoPage[];
const featureLabels = ['Piloter', 'Coordonner', 'Connaître', 'Structurer', 'Automatiser', 'Mesurer'];

function SolutionFeaturePreview({
  feature,
  index,
  page
}: {
  feature: SeoFeature;
  index: number;
  page: SeoPage;
}) {
  if (index === 0) {
    return (
      <div className="public-solution-feature-preview preview-schedule" aria-hidden="true">
        <header><span>{feature.title}</span><em>Cette semaine</em></header>
        <div className="preview-schedule-days"><small>Lun</small><small>Mar</small><small>Mer</small><small>Jeu</small><small>Ven</small></div>
        <div className="preview-schedule-grid">
          <i /><i /><i /><i /><i />
          <span className="slot-a">{page.workflow[0]?.title}</span>
          <span className="slot-b">{page.workflow[1]?.title}</span>
          <span className="slot-c">{page.workflow[2]?.title}</span>
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="public-solution-feature-preview preview-selection" aria-hidden="true">
        <header><span>{feature.title}</span><em>Disponible</em></header>
        <div>
          <span><i /><strong>{page.workflow[0]?.title}</strong><small>09:30</small></span>
          <span className="selected"><i /><strong>{page.workflow[1]?.title}</strong><small>11:00</small></span>
          <span><i /><strong>{page.workflow[2]?.title}</strong><small>14:30</small></span>
        </div>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="public-solution-feature-preview preview-people" aria-hidden="true">
        <header><span>{feature.title}</span><em>À jour</em></header>
        <div>
          {page.features.slice(0, 3).map((item, itemIndex) => (
            <span key={item.title}>
              <i>{item.title.slice(0, 1)}</i>
              <strong>{item.title}</strong>
              <small>{itemIndex === 0 ? 'Actif' : 'Suivi'}</small>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (index === 3) {
    return (
      <div className="public-solution-feature-preview preview-list" aria-hidden="true">
        <header><span>{feature.title}</span><em>Organisé</em></header>
        <div>
          {page.workflow.slice(0, 3).map((item, itemIndex) => (
            <span key={item.step}><i>{item.step}</i><strong>{item.title}</strong><small>{itemIndex === 2 ? 'À valider' : 'Prêt'}</small></span>
          ))}
        </div>
      </div>
    );
  }

  if (index === 4) {
    return (
      <div className="public-solution-feature-preview preview-automation" aria-hidden="true">
        <header><span>{feature.title}</span><em>Automatique</em></header>
        <div>
          <span><Icon name="check" size={14} /><strong>Confirmation</strong><small>Envoyée</small></span>
          <span><Icon name="activity" size={14} /><strong>Suivi</strong><small>Programmé</small></span>
          <span><Icon name="check" size={14} /><strong>Historique</strong><small>Conservé</small></span>
        </div>
      </div>
    );
  }

  return (
    <div className="public-solution-feature-preview preview-chart" aria-hidden="true">
      <header><span>{feature.title}</span><em>Vue consolidée</em></header>
      <div className="preview-chart-bars"><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <footer><span><i />Activité suivie</span><strong>En temps réel</strong></footer>
    </div>
  );
}

export function PublicSolutionPage({ businessType }: { businessType: BusinessType }) {
  const page = seoPages.find((item) => item.key === businessType) ?? seoPages[0];
  const offers = publicOfferCatalog.find((item) => item.key === page.key) ?? publicOfferCatalog[0];
  const style = { '--solution-color': page.color } as CSSProperties;
  const defaultRequestPath = `/demande-acces?metier=${page.key}&offre=${page.defaultPlan}`;
  const pageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const elements = Array.from(pageRef.current?.querySelectorAll<HTMLElement>('[data-solution-reveal]') ?? []);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [page.key]);

  const structuredData = useMemo(() => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        '@id': `https://ncr-suite.fr${page.path}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'NCR Suite', item: 'https://ncr-suite.fr/' },
          { '@type': 'ListItem', position: 2, name: page.label, item: `https://ncr-suite.fr${page.path}` }
        ]
      },
      {
        '@type': 'WebPage',
        '@id': `https://ncr-suite.fr${page.path}#webpage`,
        url: `https://ncr-suite.fr${page.path}`,
        name: page.title,
        description: page.description,
        inLanguage: 'fr-FR',
        breadcrumb: { '@id': `https://ncr-suite.fr${page.path}#breadcrumb` },
        isPartOf: { '@id': 'https://ncr-suite.fr/#website' },
        about: { '@id': `https://ncr-suite.fr${page.path}#software` }
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `https://ncr-suite.fr${page.path}#software`,
        name: `NCR Suite ${page.name}`,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android, Windows, macOS',
        description: page.description,
        url: `https://ncr-suite.fr${page.path}`,
        image: 'https://ncr-suite.fr/og/ncr-suite-og-v2221.webp',
        publisher: { '@id': 'https://ncr-suite.fr/#organization' },
        offers: offers.plans.map((plan) => ({
          '@type': 'Offer',
          name: `${page.name} ${plan.name}`,
          price: (plan.monthlyPriceCents / 100).toFixed(2),
          priceCurrency: 'EUR',
          availability: 'https://schema.org/OnlineOnly',
          url: `https://ncr-suite.fr/demande-acces?metier=${page.key}&offre=${plan.key}`
        }))
      },
      {
        '@type': 'FAQPage',
        '@id': `https://ncr-suite.fr${page.path}#faq`,
        mainEntity: page.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer }
        }))
      }
    ]
  }), [offers.plans, page]);

  return (
    <div className="public-solution-page public-solution-v281 public-solution-v282" data-business={page.key} style={style} ref={pageRef}>
      <PageMetadata
        title={page.title}
        description={page.description}
        path={page.path}
        image="/og/ncr-suite-og-v2221.webp"
        imageAlt={`NCR Suite ${page.name}, logiciel de gestion métier`}
        index
        structuredData={structuredData}
      />

      <section className="public-solution-hero">
        <PublicSiteHeader />
        <div className="public-solution-interface" aria-hidden="true">
          <div className="public-solution-interface-top">
            <span><img src="/brand/ncr-suite-icon.png" alt="" /><strong>NCR Suite</strong></span>
            <span className="public-solution-interface-context">{page.name}<em><i /> Espace actif</em></span>
          </div>
          <div className="public-solution-interface-body">
            <nav aria-hidden="true">
              <span className="active"><Icon name="home" size={15} /></span>
              {page.features.slice(0, 5).map((feature) => <span key={feature.title}><Icon name={feature.icon} size={15} /></span>)}
            </nav>
            <div>
              <header className="public-solution-interface-heading">
                <span><small>ESPACE {page.name.toUpperCase()}</small><strong>Votre activité en un regard</strong></span>
                <em>Aujourd’hui</em>
              </header>
              <div className="public-solution-interface-metrics">
                <span><small>À traiter</small><strong>8</strong><em>priorités identifiées</em></span>
                <span><small>Planifiés</small><strong>24</strong><em>actions coordonnées</em></span>
                <span><small>Conformité</small><strong>96 %</strong><em>preuves disponibles</em></span>
              </div>
              <div className="public-solution-interface-workspace">
                <div>
                  <header><strong>{page.features[0]?.title}</strong><small>Vue opérationnelle</small></header>
                  {page.workflow.slice(0, 3).map((item, index) => (
                    <span key={item.step}><small>{index === 0 ? '09:00' : index === 1 ? '11:30' : '15:00'}</small><i /><strong>{item.title}</strong><em>{index === 2 ? 'À suivre' : 'Prêt'}</em></span>
                  ))}
                </div>
                <aside>
                  <header><strong>À suivre</strong><small>3 priorités</small></header>
                  {page.features.slice(1, 4).map((feature) => (
                    <span key={feature.title}><Icon name={feature.icon} size={14} /><strong>{feature.title}</strong><i /></span>
                  ))}
                </aside>
              </div>
            </div>
          </div>
        </div>
        <div className="public-solution-hero-copy">
          <p className="public-section-label">{page.eyebrow}</p>
          <h1>{page.headline}</h1>
          <p>{page.lead}</p>
          <div className="public-solution-actions">
            <Link className="public-primary-action" to={defaultRequestPath}>Demander un accès <Icon name="chevronRight" size={17} /></Link>
            <a className="public-secondary-action" href="#fonctionnalites">Voir les fonctionnalités</a>
          </div>
          <div className="public-solution-proof">
            {page.proofPoints.map((point) => <span key={point}><Icon name="check" size={14} />{point}</span>)}
          </div>
        </div>
      </section>

      <main>
        <section className="public-solution-outcome" data-solution-reveal>
          <p className="public-section-label">UNE INFORMATION QUI CIRCULE</p>
          <h2>{page.outcome}</h2>
          <p>Chaque action alimente la suivante. Les équipes travaillent dans le même contexte et les responsables gardent une vision exploitable de ce qui est prêt, incomplet ou bloquant.</p>
        </section>

        <section className="public-solution-features" id="fonctionnalites" data-solution-reveal>
          <header>
            <p className="public-section-label">FONCTIONNALITÉS MÉTIER</p>
            <h2>Tout ce qui doit rester lié dans votre activité</h2>
          </header>
          <div>
            {page.features.map((feature, index) => (
              <article className={`public-solution-feature-card feature-card-${index + 1}`} key={feature.title}>
                <header><small>{featureLabels[index]}</small><span><Icon name={feature.icon} size={20} /></span></header>
                <div className="public-solution-feature-copy">
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
                <SolutionFeaturePreview feature={feature} index={index} page={page} />
              </article>
            ))}
          </div>
        </section>

        <section className="public-solution-workflow" data-solution-reveal>
          <header>
            <p className="public-section-label">DU PREMIER SIGNAL AU PILOTAGE</p>
            <h2>Un parcours continu, sans ressaisie inutile</h2>
          </header>
          <div>
            {page.workflow.map((item) => (
              <article key={item.step}>
                <small>{item.step}</small>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-solution-offers" id="offres" data-solution-reveal>
          <header>
            <div>
              <p className="public-section-label">OFFRES {page.name.toUpperCase()}</p>
              <h2>Commencez au bon niveau, évoluez quand vous êtes prêt</h2>
            </div>
            <p>Les données restent conservées lors d’un changement de formule. Seuls les droits suivent le niveau réellement actif.</p>
          </header>
          <div>
            {offers.plans.map((plan) => (
              <article className={plan.recommended ? 'recommended' : ''} key={plan.key}>
                <div>{plan.recommended && <em>RECOMMANDÉE</em>}<small>{plan.name}</small></div>
                <p><strong>{formatPublicMonthlyPrice(plan.monthlyPriceCents)} €</strong><span>HT / mois</span></p>
                <p>{plan.summary}</p>
                <ul>{plan.highlights.map((item) => <li key={item}><Icon name="check" size={13} />{item}</li>)}</ul>
                <Link to={`/demande-acces?metier=${page.key}&offre=${plan.key}`}>Choisir {plan.name} <Icon name="chevronRight" size={14} /></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="public-solution-faq" data-solution-reveal>
          <header>
            <p className="public-section-label">QUESTIONS FRÉQUENTES</p>
            <h2>Ce qu’il faut savoir avant de choisir</h2>
          </header>
          <div>
            {page.faq.map((item) => (
              <details key={item.question}>
                <summary>{item.question}<Icon name="plus" size={17} /></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="public-solution-links" data-solution-reveal>
          <p className="public-section-label">AUTRES SOLUTIONS MÉTIER</p>
          <h2>Une suite, plusieurs environnements spécialisés</h2>
          <nav aria-label="Autres logiciels métier NCR Suite">
            {seoPages.filter((item) => item.key !== page.key).map((item) => (
              <Link to={item.path} key={item.key} style={{ '--solution-link-color': item.color } as CSSProperties}>
                <Icon name={item.icon} size={17} /><span>{item.name}</span><Icon name="chevronRight" size={15} />
              </Link>
            ))}
          </nav>
        </section>

        <section className="public-solution-final" data-solution-reveal>
          <img src="/brand/ncr-suite-application-icon-v281.png" alt="NCR Suite" />
          <p className="public-section-label">OUVERTURE SUR VALIDATION</p>
          <h2>Présentez-nous votre activité</h2>
          <p>Nous vérifions le métier, la formule et la configuration attendue avant l’ouverture de votre espace.</p>
          <Link className="public-primary-action" to={defaultRequestPath}>Demander mon accès <Icon name="chevronRight" size={17} /></Link>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
