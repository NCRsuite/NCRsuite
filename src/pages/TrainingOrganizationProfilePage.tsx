import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';
import type { Organization } from '../types';

type AssetKind = 'signature' | 'stamp';

type FormState = {
  publicName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  siret: string;
  ndaNumber: string;
  legalRepresentative: string;
  replyToEmail: string;
  vatNumber: string;
  documentFooter: string;
  defaultTerms: string;
  defaultVatRate: string;
};

function formFromOrganization(organization: Organization): FormState {
  return {
    publicName: organization.public_name || organization.name,
    contactName: organization.company_contact_name || '',
    email: organization.company_email || organization.booking_contact_email || '',
    phone: organization.company_phone || organization.booking_contact_phone || '',
    address: organization.company_address || organization.booking_address || '',
    postalCode: organization.company_postal_code || '',
    city: organization.company_city || '',
    siret: organization.company_siret || '',
    ndaNumber: organization.training_nda_number || '',
    legalRepresentative: organization.training_legal_representative || '',
    replyToEmail: organization.training_reply_to_email || organization.company_email || '',
    vatNumber: organization.training_vat_number || '',
    documentFooter: organization.training_document_footer || '',
    defaultTerms: organization.training_default_terms || 'Les modalités de règlement, d’annulation et de report sont précisées dans le document contractuel.',
    defaultVatRate: String((organization.training_default_vat_basis_points ?? 0) / 100).replace('.', ',')
  };
}

export function TrainingOrganizationProfilePage() {
  const { organization, refreshOrganizations } = useOrganization();
  const { demoMode } = useAuth();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<AssetKind | null>(null);
  const canManage = ['owner', 'admin'].includes(organization?.role ?? 'viewer');

  useEffect(() => {
    if (!organization) return;
    setForm(formFromOrganization(organization));
    setSignatureUrl(organization.training_signature_url || null);
    setStampUrl(organization.training_stamp_url || null);
  }, [organization]);

  const completeness = useMemo(() => {
    if (!form) return { percent: 0, missing: [] as string[] };
    const fields = [
      ['Nom de l’organisme', form.publicName],
      ['Contact', form.contactName],
      ['E-mail', form.email],
      ['Téléphone', form.phone],
      ['Adresse', form.address],
      ['Code postal', form.postalCode],
      ['Ville', form.city],
      ['SIRET', form.siret],
      ['NDA', form.ndaNumber],
      ['Représentant légal', form.legalRepresentative],
      ['Adresse de retour', form.replyToEmail]
    ] as const;
    const missing = fields.filter(([, value]) => !value.trim()).map(([label]) => label);
    return { percent: Math.round(((fields.length - missing.length) / fields.length) * 100), missing };
  }, [form]);

  async function uploadDocumentAsset(file: File, kind: AssetKind) {
    if (!organization || !canManage) return;
    if (!file.type.startsWith('image/')) { setError('Choisis une image PNG, JPEG ou WebP.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('L’image ne doit pas dépasser 5 Mo.'); return; }
    setUploadingAsset(kind); setError(''); setSuccess('');
    try {
      let publicUrl = URL.createObjectURL(file);
      if (!demoMode && supabase) {
        const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
        const path = `${organization.id}/training/${kind}-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('organization-branding').upload(path, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });
        if (uploadError) throw uploadError;
        publicUrl = supabase.storage.from('organization-branding').getPublicUrl(path).data.publicUrl;
      }
      if (kind === 'signature') setSignatureUrl(publicUrl);
      else setStampUrl(publicUrl);
      setSuccess(`${kind === 'signature' ? 'La signature' : 'Le cachet'} sera utilisé sur les documents premium après enregistrement.`);
    } catch (caught) {
      setError(`Import impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setUploadingAsset(null); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!organization || !form || !canManage) return;
    const vat = Number(form.defaultVatRate.replace(',', '.'));
    if (!Number.isFinite(vat) || vat < 0 || vat > 100) { setError('Le taux de TVA est invalide.'); return; }
    if (form.replyToEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.replyToEmail.trim())) { setError('L’adresse e-mail de retour est invalide.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      if (demoMode || !supabase) {
        const next = {
          ...organization,
          public_name: form.publicName.trim() || organization.name,
          company_contact_name: form.contactName.trim() || null,
          company_email: form.email.trim().toLowerCase() || null,
          company_phone: form.phone.trim() || null,
          company_address: form.address.trim() || null,
          company_postal_code: form.postalCode.trim() || null,
          company_city: form.city.trim() || null,
          company_siret: form.siret.trim() || null,
          training_nda_number: form.ndaNumber.trim() || null,
          training_legal_representative: form.legalRepresentative.trim() || null,
          training_reply_to_email: form.replyToEmail.trim().toLowerCase() || null,
          training_vat_number: form.vatNumber.trim() || null,
          training_document_footer: form.documentFooter.trim() || null,
          training_default_terms: form.defaultTerms.trim() || null,
          training_default_vat_basis_points: Math.round(vat * 100),
          training_signature_url: signatureUrl,
          training_stamp_url: stampUrl
        };
        localStorage.setItem('ncr-suite-demo-org', JSON.stringify(next));
      } else {
        const { error: rpcError } = await supabase.rpc('update_training_organization_profile', {
          p_organization_id: organization.id,
          p_public_name: form.publicName,
          p_contact_name: form.contactName,
          p_email: form.email,
          p_phone: form.phone,
          p_address: form.address,
          p_postal_code: form.postalCode,
          p_city: form.city,
          p_siret: form.siret,
          p_nda_number: form.ndaNumber,
          p_legal_representative: form.legalRepresentative,
          p_reply_to_email: form.replyToEmail,
          p_vat_number: form.vatNumber,
          p_document_footer: form.documentFooter,
          p_default_terms: form.defaultTerms,
          p_default_vat_basis_points: Math.round(vat * 100)
        });
        if (rpcError) throw rpcError;
        const { error: brandingError } = await supabase.rpc('update_training_document_branding', {
          p_organization_id: organization.id,
          p_signature_url: signatureUrl,
          p_stamp_url: stampUrl
        });
        if (brandingError) throw brandingError;
      }
      refreshOrganizations();
      setSuccess('Le profil de l’organisme est enregistré. Ces informations seront réutilisées dans tout le parcours Formation.');
    } catch (caught) {
      setError(`Enregistrement impossible : ${caught instanceof Error ? caught.message : 'erreur inconnue'}`);
    } finally { setSaving(false); }
  }

  if (!organization || !form) return null;

  return <div className="page training-profile-page">
    <section className="training-profile-hero">
      <div><span><Icon name="building" size={25} /></span><div><p className="eyebrow">FORMATION · PARAMÉTRAGE UNIQUE</p><h1>Profil de l’organisme</h1><p>Renseigne une seule fois les coordonnées et mentions qui alimenteront les futurs devis, conventions, convocations, attestations et e-mails.</p></div></div>
      <div className="training-profile-score" style={{ '--profile-progress': `${completeness.percent}%` } as CSSProperties}><strong>{completeness.percent}%</strong><span>profil complété</span></div>
    </section>

    {error && <div className="error-message page-message" role="alert">{error}</div>}
    {success && <div className="success-message page-message" role="status">{success}</div>}

    <form className="training-profile-layout" onSubmit={save}>
      <main className="panel training-profile-form">
        <section><header><span>01</span><div><p className="eyebrow">IDENTITÉ</p><h2>Organisme de formation</h2></div></header><div className="training-form-grid">
          <label className="full-field">Nom affiché sur les documents *<input required value={form.publicName} onChange={(event) => setForm({ ...form, publicName: event.target.value })} /></label>
          <label>Représentant légal<input value={form.legalRepresentative} onChange={(event) => setForm({ ...form, legalRepresentative: event.target.value })} /></label>
          <label>Contact principal<input value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} /></label>
          <label>SIRET<input value={form.siret} onChange={(event) => setForm({ ...form, siret: event.target.value })} placeholder="14 chiffres" /></label>
          <label>N° de déclaration d’activité<input value={form.ndaNumber} onChange={(event) => setForm({ ...form, ndaNumber: event.target.value })} placeholder="NDA" /></label>
          <label>N° TVA intracommunautaire<input value={form.vatNumber} onChange={(event) => setForm({ ...form, vatNumber: event.target.value })} /></label>
          <label>TVA par défaut (%)<input inputMode="decimal" value={form.defaultVatRate} onChange={(event) => setForm({ ...form, defaultVatRate: event.target.value })} /></label>
        </div></section>

        <section><header><span>02</span><div><p className="eyebrow">COORDONNÉES</p><h2>Contact et retours signés</h2></div></header><div className="training-form-grid">
          <label>E-mail de l’organisme<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Téléphone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label className="full-field">Adresse<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
          <label>Code postal<input value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} /></label>
          <label>Ville<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
          <label className="full-field">Adresse de réponse pour les documents signés *<input type="email" value={form.replyToEmail} onChange={(event) => setForm({ ...form, replyToEmail: event.target.value })} placeholder="administration@mon-organisme.fr" /><small>Cette adresse sera communiquée dans les propositions et utilisée comme adresse de réponse des futurs envois Brevo.</small></label>
        </div></section>

        <section><header><span>03</span><div><p className="eyebrow">DOCUMENTS</p><h2>Mentions communes</h2></div></header><div className="training-form-grid">
          <label className="full-field">Pied de page personnalisé<textarea rows={4} value={form.documentFooter} onChange={(event) => setForm({ ...form, documentFooter: event.target.value })} placeholder="Certification, accessibilité, médiation, coordonnées utiles…" /></label>
          <label className="full-field">Conditions par défaut<textarea rows={6} value={form.defaultTerms} onChange={(event) => setForm({ ...form, defaultTerms: event.target.value })} /></label>
        </div></section>

        <section><header><span>04</span><div><p className="eyebrow">SIGNATURE & CACHET</p><h2>Validation visuelle des documents</h2></div></header><div className="training-document-assets">
          {([
            { kind: 'signature' as const, label: 'Signature du représentant', url: signatureUrl, setter: setSignatureUrl, hint: 'PNG conseillé avec fond transparent.' },
            { kind: 'stamp' as const, label: 'Cachet de l’organisme', url: stampUrl, setter: setStampUrl, hint: 'Image nette, cadrée et sans marge excessive.' }
          ]).map((asset) => <article key={asset.kind} className="training-document-asset">
            <div className="training-document-asset-preview">{asset.url ? <img src={asset.url} alt="" /> : <span><Icon name="signature" size={28} /></span>}</div>
            <div><strong>{asset.label}</strong><small>{asset.hint}</small><div className="training-document-asset-actions"><label className="secondary-button compact-button">{uploadingAsset === asset.kind ? 'Import…' : asset.url ? 'Remplacer' : 'Importer'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingAsset !== null || !canManage} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadDocumentAsset(file, asset.kind); event.currentTarget.value = ''; }} /></label>{asset.url && <button type="button" className="text-button danger-text" onClick={() => asset.setter(null)}>Retirer</button>}</div></div>
          </article>)}
        </div></section>

        <div className="training-profile-submit"><div><Icon name="sparkles" size={18} /><p><strong>Une seule source de vérité</strong><span>Les documents premium utilisent directement ce profil, la signature et le cachet enregistrés.</span></p></div><button className="primary-button" disabled={saving || !canManage}>{saving ? 'Enregistrement…' : 'Enregistrer le profil'}</button></div>
      </main>

      <aside className="training-profile-aside">
        <section className="training-profile-preview"><p className="eyebrow">APERÇU D’EN-TÊTE</p><div className="training-profile-preview-brand">{organization.logo_url ? <img src={organization.logo_url} alt="" /> : <span>{form.publicName.slice(0, 2).toUpperCase()}</span>}<div><strong>{form.publicName || organization.name}</strong><small>{[form.address, form.postalCode, form.city].filter(Boolean).join(' · ') || 'Adresse à compléter'}</small></div></div><div className="training-profile-preview-lines"><i /><i /><i /></div><footer><span>SIRET {form.siret || '—'}</span><span>NDA {form.ndaNumber || '—'}</span></footer></section>
        <section className="training-profile-check"><p className="eyebrow">À COMPLÉTER</p>{completeness.missing.length === 0 ? <div className="training-profile-complete"><Icon name="check" size={19} /><span>Le profil contient toutes les informations essentielles.</span></div> : <ul>{completeness.missing.map((label) => <li key={label}><span /><b>{label}</b></li>)}</ul>}</section>
        <section className="training-profile-note"><Icon name="sparkles" size={20} /><div><strong>Identité documentaire</strong><p>Le logo et les couleurs viennent de « Personnalisation ». La signature et le cachet ci-contre complètent automatiquement les documents premium.</p></div></section>
      </aside>
    </form>
  </div>;
}
