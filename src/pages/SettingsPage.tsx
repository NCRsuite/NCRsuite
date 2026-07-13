import { FormEvent, useEffect, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';

export function SettingsPage() {
  const { organization, updateBranding } = useOrganization();
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2997ff');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!organization) return;
    setName(organization.name);
    setPrimaryColor(organization.primary_color);
  }, [organization]);

  if (!organization) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await updateBranding({ name, primaryColor });
    setMessage('Les paramètres ont été enregistrés.');
    window.setTimeout(() => setMessage(''), 2500);
  }

  return (
    <div className="page">
      <header className="page-header"><div><p className="eyebrow">ADMINISTRATION</p><h1>Paramètres</h1><p>Personnalisez l’espace de votre entreprise sans modifier le moteur NCR Suite.</p></div></header>
      <form className="panel settings-form" onSubmit={submit}>
        <div><h2>Identité de l’espace</h2><p className="muted">Le logo, les couleurs et le nom sont propres à votre entreprise.</p></div>
        <label>Nom affiché<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="color-field">Couleur principale<div><input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} /><span>{primaryColor}</span></div></label>
        <div className="settings-summary"><span>Type d’activité</span><strong>{organization.business_type}</strong><span>Formule</span><strong>{organization.plan}</strong><span>Identifiant</span><code>{organization.slug}</code></div>
        <button className="primary-button">Enregistrer</button>
        {message && <div className="success-message">{message}</div>}
      </form>
    </div>
  );
}
