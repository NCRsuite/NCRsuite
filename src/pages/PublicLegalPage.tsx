import { PageMetadata } from '../components/PageMetadata';
import { PublicSiteFooter } from '../components/PublicSiteFooter';
import { PublicSiteHeader } from '../components/PublicSiteHeader';

type PublicLegalPageProps = {
  kind: 'legal' | 'privacy';
};

const companyName = import.meta.env.VITE_LEGAL_COMPANY_NAME as string | undefined;
const companyAddress = import.meta.env.VITE_LEGAL_COMPANY_ADDRESS as string | undefined;
const companySiret = import.meta.env.VITE_LEGAL_COMPANY_SIRET as string | undefined;
const publicationDirector = import.meta.env.VITE_LEGAL_PUBLICATION_DIRECTOR as string | undefined;

export function PublicLegalPage({ kind }: PublicLegalPageProps) {
  const isPrivacy = kind === 'privacy';
  const title = isPrivacy ? 'Politique de confidentialité' : 'Mentions légales';

  return (
    <div className="public-form-page public-legal-page">
      <PageMetadata title={`${title} | NCR Suite`} path={isPrivacy ? '/confidentialite' : '/mentions-legales'} />
      <PublicSiteHeader compact />
      <main>
        <p className="public-section-label">NCR SUITE</p>
        <h1>{title}</h1>
        <p className="public-legal-updated">Dernière mise à jour : 25 juillet 2026</p>

        {isPrivacy ? (
          <>
            <section><h2>Responsable du traitement</h2><p>{companyName || 'NCR Suite'} traite les informations transmises depuis le formulaire de demande d’accès. Toute question peut être adressée à <a href="mailto:contact@ncr-suite.fr">contact@ncr-suite.fr</a>.</p></section>
            <section><h2>Informations collectées</h2><p>Le formulaire recueille l’identité professionnelle, les coordonnées, l’entreprise, le métier, la taille de l’équipe et la description libre du besoin. Des informations techniques limitées peuvent être utilisées pour prévenir les demandes automatisées et les abus.</p></section>
            <section><h2>Finalités</h2><p>Ces informations servent exclusivement à examiner la demande, contacter le demandeur, préparer l’ouverture éventuelle d’un compte et assurer la sécurité du service. Elles ne sont pas vendues.</p></section>
            <section><h2>Durée de conservation</h2><p>Les demandes refusées ou abandonnées sont supprimées ou anonymisées selon la procédure interne de NCR Suite. Les informations d’une demande acceptée sont rattachées au suivi du compte et à la relation contractuelle.</p></section>
            <section><h2>Prestataires techniques</h2><p>NCR Suite s’appuie notamment sur Cloudflare pour la diffusion et la protection du site, Supabase pour l’hébergement applicatif et l’authentification, et Brevo pour l’envoi des e-mails transactionnels.</p></section>
            <section><h2>Vos droits</h2><p>Vous pouvez demander l’accès, la rectification ou la suppression des informations vous concernant en écrivant à <a href="mailto:contact@ncr-suite.fr">contact@ncr-suite.fr</a>. Une vérification d’identité pourra être demandée pour protéger le compte concerné.</p></section>
          </>
        ) : (
          <>
            <section><h2>Éditeur</h2><p><strong>{companyName || 'Identité juridique à renseigner avant l’ouverture publique'}</strong><br />{companyAddress || 'Adresse du siège à renseigner'}<br />{companySiret ? `SIRET : ${companySiret}` : 'SIRET à renseigner'}<br />Contact : <a href="mailto:contact@ncr-suite.fr">contact@ncr-suite.fr</a></p></section>
            <section><h2>Direction de la publication</h2><p>{publicationDirector || 'Nom du directeur de la publication à renseigner avant l’ouverture publique.'}</p></section>
            <section><h2>Hébergement et services techniques</h2><p>Le site est diffusé par Cloudflare, Inc. Les services applicatifs et l’authentification s’appuient sur Supabase. Les e-mails transactionnels sont acheminés par Brevo.</p></section>
            <section><h2>Propriété intellectuelle</h2><p>La marque, les interfaces, les textes, les visuels et les éléments logiciels de NCR Suite sont protégés. Toute reproduction ou réutilisation non autorisée est interdite.</p></section>
            <section><h2>Disponibilité</h2><p>NCR Suite met en œuvre les moyens raisonnables pour assurer l’accès au service. Des opérations de maintenance, incidents techniques ou événements extérieurs peuvent néanmoins entraîner une interruption temporaire.</p></section>
          </>
        )}
      </main>
      <PublicSiteFooter />
    </div>
  );
}
