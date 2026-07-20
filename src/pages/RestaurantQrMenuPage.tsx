import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';

export function RestaurantQrMenuPage() {
  const { organization } = useOrganization(); const [dataUrl, setDataUrl] = useState('');
  const publicUrl = organization ? `${window.location.origin}/r/${organization.slug}/menu` : '';
  useEffect(() => { if (!publicUrl) return; QRCode.toDataURL(publicUrl, { width: 520, margin: 2, errorCorrectionLevel: 'H' }).then(setDataUrl).catch(() => setDataUrl('')); }, [publicUrl]);
  if (!organization) return null;
  return <div className="page restaurant-page"><header className="page-header"><div><p className="eyebrow">RESTAURATION</p><h1>Menu QR multilingue</h1><p>Diffuse la carte publique en français, anglais, espagnol et italien.</p></div><a className="secondary-button" href={publicUrl} target="_blank" rel="noreferrer"><Icon name="eye" size={18}/>Prévisualiser</a></header><section className="restaurant-qr-layout"><article className="panel restaurant-qr-card"><div className="restaurant-qr-frame">{dataUrl ? <img src={dataUrl} alt="QR code du menu"/> : <span>Génération…</span>}</div><h2>Menu de {organization.public_name || organization.name}</h2><p>Imprime ce QR code sur les tables, vitrines ou supports de communication.</p><a className="primary-button" href={dataUrl} download={`menu-qr-${organization.slug}.png`}><Icon name="file" size={18}/>Télécharger le QR</a></article><article className="panel restaurant-qr-settings"><p className="eyebrow">LIEN PUBLIC</p><h2>Adresse du menu</h2><div className="restaurant-public-link"><input readOnly value={publicUrl}/><button className="secondary-button compact-button" onClick={() => void navigator.clipboard.writeText(publicUrl)}>Copier</button></div><div className="restaurant-language-grid"><div><strong>FR</strong><span>Langue source</span></div><div><strong>EN</strong><span>Modifiable</span></div><div><strong>ES</strong><span>Modifiable</span></div><div><strong>IT</strong><span>Modifiable</span></div></div><div className="info-message">Les textes vides utilisent automatiquement la description française comme solution de secours.</div></article></section></div>;
}
