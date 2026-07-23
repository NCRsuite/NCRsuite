import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';

export function RestaurantQrMenuPage() {
  const { organization } = useOrganization();
  const [dataUrl, setDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const publicOrigin = organization?.custom_domain && organization.custom_domain_status === 'active'
    ? `https://${organization.custom_domain}`
    : typeof window === 'undefined' ? '' : window.location.origin;
  const publicUrl = organization && publicOrigin ? `${publicOrigin}/r/${organization.slug}/menu` : '';

  useEffect(() => {
    if (!publicUrl || !organization) return;
    QRCode.toDataURL(publicUrl, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: organization.primary_color || '#241a16', light: '#ffffff' },
    }).then(setDataUrl).catch(() => setDataUrl(''));
  }, [publicUrl, organization?.primary_color]);

  if (!organization) return null;

  async function copyPublicUrl() {
    setCopyError('');
    try {
      if (!navigator.clipboard) throw new Error('Copie automatique indisponible.');
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError('La copie automatique est bloquée par le navigateur. Sélectionne le lien puis copie-le manuellement.');
    }
  }

  return <div className="page restaurant-page restaurant-qr-premium-page restaurant-premium-workspace">
    <header className="page-header restaurant-branding-admin-header"><div><p className="eyebrow">RESTAURATION · DIFFUSION</p><h1>Menu QR multilingue</h1><p>Un seul QR code vers une carte moderne, traduite et entièrement personnalisée à l’image de l’enseigne.</p></div><div className="restaurant-menu-header-actions"><Link className="secondary-button" to="/personnalisation"><Icon name="sparkles" size={18}/>Personnaliser le rendu</Link><a className="primary-button" href={publicUrl} target="_blank" rel="noreferrer"><Icon name="eye" size={18}/>Prévisualiser</a></div></header>

    <section className="restaurant-qr-layout">
      <article className="panel restaurant-qr-card restaurant-qr-premium-card">
        <div className="restaurant-qr-brand"><div>{organization.logo_url ? <img src={organization.logo_url} alt=""/> : <span>{(organization.public_name || organization.name).slice(0,1).toUpperCase()}</span>}</div><p><small>MENU DIGITAL</small><strong>{organization.public_name || organization.name}</strong></p></div>
        <div className="restaurant-qr-frame">{dataUrl ? <img src={dataUrl} alt="QR code du menu"/> : <span>Génération…</span>}</div>
        <h2>Prêt à être imprimé</h2><p>À placer sur les tables, la vitrine, les chevalets ou les supports de communication.</p>
        <a className="primary-button" href={dataUrl} download={`menu-qr-${organization.slug}.png`}><Icon name="file" size={18}/>Télécharger le QR</a>
      </article>

      <article className="panel restaurant-qr-settings restaurant-qr-premium-settings">
        <div><p className="eyebrow">LIEN PUBLIC</p><h2>Adresse du menu</h2><p className="muted">Ce lien reste identique tant que l’identifiant public de l’enseigne ne change pas.</p></div>
        <div className="restaurant-public-link"><input readOnly value={publicUrl} onFocus={(event) => event.currentTarget.select()}/><button type="button" className="secondary-button compact-button" onClick={() => void copyPublicUrl()}>{copied ? 'Copié ✓' : 'Copier'}</button></div>
        {copyError && <p className="error-message restaurant-qr-copy-error" role="alert">{copyError}</p>}
        <div className="restaurant-language-grid"><div><strong>FR</strong><span>Langue source</span></div><div><strong>EN</strong><span>Auto + modifiable</span></div><div><strong>ES</strong><span>Auto + modifiable</span></div><div><strong>IT</strong><span>Auto + modifiable</span></div></div>
        <div className="restaurant-qr-premium-benefits"><article><span>✦</span><div><strong>Identité de l’enseigne</strong><p>Logo, couleurs, couverture et ambiance visuelle.</p></div></article><article><span>◉</span><div><strong>Mobile-first</strong><p>Lecture fluide sur iPhone et Android, même à une main.</p></div></article><article><span>🍽️</span><div><strong>Photos des plats</strong><p>Chaque proposition peut disposer de son propre visuel.</p></div></article></div>
        <Link className="secondary-button restaurant-qr-customize-link" to="/personnalisation"><Icon name="sparkles" size={18}/>Configurer l’apparence publique</Link>
      </article>
    </section>
  </div>;
}
