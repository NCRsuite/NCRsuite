import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { businessTypeOptions } from '../config/businessPacks';
import { Icon } from '../components/Icon';
import { useOrganization } from '../contexts/OrganizationContext';
import type { BusinessType } from '../types';

export function OnboardingPage() {
  const { organization, createOrganization } = useOrganization();
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('coiffure');
  const [primaryColor, setPrimaryColor] = useState('#2997ff');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (organization) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await createOrganization({ name, businessType, primaryColor });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de créer l’espace.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <div className="brand brand-horizontal"><img src="/brand/ncr-suite-logo-horizontal.png" alt="NCR Suite" /></div>
        <span>Configuration initiale</span>
      </header>
      <form className="onboarding-card" onSubmit={submit}>
        <p className="eyebrow">BIENVENUE</p>
        <h1>Créons votre espace professionnel.</h1>
        <p className="muted">Le type d’activité choisi détermine automatiquement les menus et les fonctions disponibles.</p>

        <label>Nom de l’entreprise<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Studio Élégance" required /></label>

        <fieldset>
          <legend>Votre activité</legend>
          <div className="business-grid">
            {businessTypeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`business-choice ${businessType === option.id ? 'selected' : ''}`}
                onClick={() => setBusinessType(option.id)}
              >
                <span className="choice-icon"><Icon name={option.icon} /></span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="color-field">Couleur d’accent de l’espace<div><input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} /><span>{primaryColor}</span></div></label>
        {error && <div className="error-message">{error}</div>}
        <button className="primary-button" disabled={pending}>{pending ? 'Création…' : 'Créer mon espace'}</button>
      </form>
    </div>
  );
}
