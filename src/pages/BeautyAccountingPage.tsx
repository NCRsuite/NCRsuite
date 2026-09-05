import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useBeautyEnseigneContext } from '../hooks/useBeautyEnseigneContext';
import {
  generateBeautyMonthlyAccountingPdf,
  type BeautyMonthlyAccountingReport
} from '../features/beauty/monthlyAccountingPdf';
import { closeFileWindow, prepareFileWindow, showBlobDownload } from '../lib/browserFiles';
import { supabase } from '../lib/supabase';
import '../beautyAccounting.css';

type TaxMode = 'unset' | 'vat' | 'exempt';

const money = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric'
});

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonth(value: string) {
  const [year, month] = value.split('-').map(Number);
  return { year, month };
}

function shiftMonth(value: string, delta: number) {
  const { year, month } = parseMonth(value);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value: string) {
  const { year, month } = parseMonth(value);
  return monthFormatter.format(new Date(year, month - 1, 1));
}

function formatMoney(cents: number | null | undefined) {
  return cents === null || cents === undefined ? 'À configurer' : money.format(cents / 100);
}

export function BeautyAccountingPage() {
  const { organization } = useOrganization();
  const { demoMode } = useAuth();
  const { beautyMode, selectedEnseigne, selectedEnseigneId, loading: enseigneLoading } = useBeautyEnseigneContext();

  const [monthValue, setMonthValue] = useState(currentMonthValue);
  const [report, setReport] = useState<BeautyMonthlyAccountingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [taxMode, setTaxMode] = useState<TaxMode>('unset');
  const [vatRate, setVatRate] = useState('20');
  const [exemptionText, setExemptionText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canView = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');
  const canConfigure = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');

  const selectedMonthLabel = useMemo(() => monthLabel(monthValue), [monthValue]);

  async function loadReport() {
    if (!organization || !selectedEnseigneId || !canView || demoMode || !supabase) {
      setReport(null);
      setLoading(false);
      return;
    }

    const { year, month } = parseMonth(monthValue);
    setLoading(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('beauty_monthly_accounting_report', {
      p_organization_id: organization.id,
      p_company_id: selectedEnseigneId,
      p_year: year,
      p_month: month
    });

    if (requestError) {
      setError(requestError.message);
      setReport(null);
      setLoading(false);
      return;
    }

    const next = (data ?? null) as BeautyMonthlyAccountingReport | null;
    setReport(next);
    if (next) {
      setTaxMode(next.tax.mode);
      setVatRate(String((next.tax.vat_rate_basis_points || 0) / 100 || 20));
      setExemptionText(next.tax.exemption_text || '');
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadReport();
  }, [organization?.id, selectedEnseigneId, monthValue, canView, demoMode]);

  useEffect(() => {
    setSuccess('');
    setError('');
  }, [selectedEnseigneId]);

  async function saveTaxSettings() {
    if (!organization || !selectedEnseigneId || !canConfigure || !supabase) return;
    const parsedRate = Number(vatRate.replace(',', '.'));
    if (taxMode === 'vat' && (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100)) {
      setError('Renseignez un taux de TVA compris entre 0 et 100 %.');
      return;
    }

    setSavingSettings(true);
    setError('');
    setSuccess('');
    const { error: requestError } = await supabase.rpc('beauty_save_accounting_settings', {
      p_organization_id: organization.id,
      p_company_id: selectedEnseigneId,
      p_tax_mode: taxMode,
      p_vat_rate_basis_points: taxMode === 'vat' ? Math.round(parsedRate * 100) : 0,
      p_tax_exemption_text: taxMode === 'exempt' ? exemptionText.trim() || null : null
    });

    if (requestError) {
      setError(requestError.message);
    } else {
      setSuccess('Les paramètres fiscaux de cette enseigne ont été enregistrés.');
      await loadReport();
    }
    setSavingSettings(false);
  }

  async function downloadPdf() {
    if (!report || !report.tax.configured) {
      setError('Configurez d’abord le régime fiscal de cette enseigne.');
      return;
    }

    const target = prepareFileWindow('Préparation du PDF', 'La feuille comptable mensuelle est en cours de génération.');
    setExporting(true);
    setError('');
    try {
      const result = await generateBeautyMonthlyAccountingPdf(report);
      const url = URL.createObjectURL(result.blob);
      showBlobDownload(target, url, result.filename, 'Feuille comptable prête');
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch (caught) {
      closeFileWindow(target);
      const message = typeof caught === 'object' && caught && 'message' in caught
        ? String(caught.message)
        : 'Une erreur inconnue est survenue.';
      setError(`PDF impossible : ${message}`);
    } finally {
      setExporting(false);
    }
  }

  if (!organization) return null;
  if (!beautyMode) {
    return <div className="page"><div className="info-message page-message">La feuille comptable mensuelle est disponible dans l’environnement Coiffure & beauté Métier.</div></div>;
  }
  if (!canView) {
    return <div className="page"><div className="error-message page-message">La comptabilité est réservée aux propriétaires, administrateurs et managers autorisés.</div></div>;
  }

  const summary = report?.summary;

  return <div className="page beauty-accounting-page">
    <header className="page-header beauty-accounting-header">
      <div>
        <p className="eyebrow">GESTION · COMPTABILITÉ</p>
        <h1>Feuille comptable mensuelle</h1>
        <p>{selectedEnseigne
          ? `Synthèse des prestations réellement terminées pour ${selectedEnseigne.name}. Les autres enseignes ne sont jamais mélangées.`
          : 'Sélectionnez une enseigne Beauty.'}</p>
      </div>
      <button
        type="button"
        className="primary-button"
        disabled={!report?.tax.configured || exporting || loading}
        onClick={() => void downloadPdf()}
      >
        <Icon name="file" size={17}/>
        {exporting ? 'Génération…' : 'Télécharger le PDF'}
      </button>
    </header>

    {demoMode && <div className="info-message page-message">La comptabilité mensuelle utilise les rendez-vous réels Supabase et n’est pas simulée en mode démonstration.</div>}
    {!selectedEnseigneId && !enseigneLoading && <div className="info-message page-message">Aucune enseigne Beauty sélectionnée.</div>}
    {error && <div className="error-message page-message" role="alert">{error}</div>}
    {success && <div className="success-message page-message">{success}</div>}

    <section className="panel beauty-accounting-period-panel">
      <div className="beauty-accounting-period-controls">
        <button type="button" className="icon-nav-button" onClick={() => setMonthValue((value) => shiftMonth(value, -1))} aria-label="Mois précédent">‹</button>
        <label>
          <span>Mois comptable</span>
          <input type="month" value={monthValue} onChange={(event) => setMonthValue(event.target.value || currentMonthValue())}/>
        </label>
        <button type="button" className="icon-nav-button" onClick={() => setMonthValue((value) => shiftMonth(value, 1))} aria-label="Mois suivant">›</button>
      </div>
      <div className="beauty-accounting-period-copy">
        <strong>{selectedMonthLabel}</strong>
        <span>Uniquement les rendez-vous marqués « Terminé » sont comptabilisés.</span>
      </div>
    </section>

    {loading || enseigneLoading ? <div className="panel beauty-accounting-loading">Calcul de la feuille comptable…</div> : report && summary ? <>
      {!report.tax.configured && <section className="panel beauty-accounting-warning">
        <span><Icon name="alert" size={20}/></span>
        <div>
          <strong>Régime fiscal à configurer</strong>
          <p>Le TTC réel est disponible, mais NCR Suite ne calculera pas le HT ni la TVA tant que le régime fiscal de cette enseigne n’est pas renseigné.</p>
        </div>
      </section>}

      <section className="beauty-accounting-kpis">
        <article className="panel"><span>Prestations réalisées</span><strong>{summary.prestation_count}</strong><small>{summary.appointment_count} rendez-vous terminés</small></article>
        <article className="panel"><span>Total HT</span><strong>{formatMoney(summary.total_ht_cents)}</strong><small>{report.tax.configured ? 'calculé selon le régime fiscal' : 'régime fiscal requis'}</small></article>
        <article className="panel"><span>TVA</span><strong>{formatMoney(summary.total_vat_cents)}</strong><small>{report.tax.mode === 'vat' ? `taux ${(report.tax.vat_rate_basis_points / 100).toLocaleString('fr-FR')} %` : report.tax.mode === 'exempt' ? 'non applicable' : 'à configurer'}</small></article>
        <article className="panel primary"><span>Total TTC</span><strong>{formatMoney(summary.total_ttc_cents)}</strong><small>montants finaux des rendez-vous terminés</small></article>
      </section>

      <section className="panel beauty-accounting-table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">DÉTAIL DU MOIS</p>
            <h2>Prestations réalisées</h2>
            <small>Les remises éventuelles sont répercutées sur le montant final réellement enregistré.</small>
          </div>
        </div>

        {report.services.length === 0 ? <div className="list-state">Aucune prestation terminée sur ce mois.</div> : <div className="beauty-accounting-table-wrap">
          <table className="beauty-accounting-table">
            <thead><tr><th>Prestation</th><th>Quantité</th><th>HT</th><th>TVA</th><th>TTC</th></tr></thead>
            <tbody>
              {report.services.map((item, index) => <tr key={item.service_id || `${item.service_name}-${index}`}>
                <td><strong>{item.service_name || 'Prestation'}</strong><small>{item.appointment_count} RDV concerné{item.appointment_count > 1 ? 's' : ''}</small></td>
                <td>{item.prestation_count}</td>
                <td>{formatMoney(item.total_ht_cents)}</td>
                <td>{formatMoney(item.total_vat_cents)}</td>
                <td><strong>{formatMoney(item.total_ttc_cents)}</strong></td>
              </tr>)}
            </tbody>
            <tfoot><tr><td>Total</td><td>{summary.prestation_count}</td><td>{formatMoney(summary.total_ht_cents)}</td><td>{formatMoney(summary.total_vat_cents)}</td><td>{formatMoney(summary.total_ttc_cents)}</td></tr></tfoot>
          </table>
        </div>}
      </section>

      {report.sites.length > 1 && <section className="panel beauty-accounting-sites-panel">
        <div className="panel-header"><div><p className="eyebrow">ÉTABLISSEMENTS</p><h2>Répartition du TTC</h2></div></div>
        <div className="beauty-accounting-sites">
          {report.sites.map((site, index) => <article key={site.site_id || index}>
            <div><strong>{site.site_name || 'Établissement'}</strong><small>{site.prestation_count} prestation{site.prestation_count > 1 ? 's' : ''}</small></div>
            <span>{formatMoney(site.total_ttc_cents)}</span>
          </article>)}
        </div>
      </section>}

      <section className="panel beauty-accounting-tax-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">PARAMÈTRES FISCAUX · {selectedEnseigne?.name}</p>
            <h2>Calcul HT / TVA / TTC</h2>
            <small>Ces paramètres sont propres à cette enseigne et servent uniquement aux synthèses Beauty.</small>
          </div>
        </div>

        {canConfigure ? <div className="beauty-accounting-tax-form">
          <label>
            Régime fiscal
            <select value={taxMode} onChange={(event) => setTaxMode(event.target.value as TaxMode)}>
              <option value="unset">À configurer</option>
              <option value="vat">TVA applicable</option>
              <option value="exempt">TVA non applicable / exonération</option>
            </select>
          </label>

          {taxMode === 'vat' && <label>
            Taux de TVA (%)
            <input inputMode="decimal" value={vatRate} onChange={(event) => setVatRate(event.target.value)} placeholder="20"/>
          </label>}

          {taxMode === 'exempt' && <label className="wide">
            Mention d’exonération / franchise
            <textarea rows={3} value={exemptionText} onChange={(event) => setExemptionText(event.target.value)} placeholder="Ex. : mention fiscale applicable à votre régime"/>
          </label>}

          <div className="beauty-accounting-tax-actions">
            <button type="button" className="primary-button" disabled={savingSettings} onClick={() => void saveTaxSettings()}>
              {savingSettings ? 'Enregistrement…' : 'Enregistrer les paramètres'}
            </button>
          </div>
        </div> : <div className="beauty-accounting-tax-readonly">
          <Icon name="lock" size={17}/>
          <span>{report.tax.configured
            ? report.tax.mode === 'vat'
              ? `TVA applicable · ${(report.tax.vat_rate_basis_points / 100).toLocaleString('fr-FR')} %`
              : 'TVA non applicable'
            : 'Le propriétaire, un administrateur ou un responsable doit configurer le régime fiscal.'}</span>
        </div>}
      </section>

      <section className="beauty-accounting-disclaimer">
        <Icon name="info" size={14}/>
        <p>Cette feuille est une synthèse interne issue des rendez-vous terminés enregistrés dans NCR Suite. Elle facilite le suivi mensuel et la transmission au comptable, mais ne remplace pas les justificatifs comptables ou fiscaux requis.</p>
      </section>
    </> : !demoMode && <div className="panel list-state">Aucune donnée comptable disponible.</div>}
  </div>;
}
