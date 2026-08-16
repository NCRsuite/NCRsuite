import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import type { TrainingTrainerBpfIntervention, TrainingTrainerBpfOverview } from '../features/training/portalTypes';
import { supabase } from '../lib/supabase';

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

function amountInputValue(cents: number | null) {
  if (cents == null) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

function centsFromInput(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return Number.NaN;
  return Math.round(parsed * 100);
}

function csvCell(value: string | number | null | undefined) {
  const raw = value == null ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export function TrainingTrainerBpfPanel() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear - 1);
  const [overview, setOverview] = useState<TrainingTrainerBpfOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { amount: string; invoiceReference: string; invoiceDate: string; notes: string }>>({});

  const years = useMemo(() => Array.from({ length: 6 }, (_, index) => currentYear - index), [currentYear]);

  async function load(nextYear = year) {
    if (!supabase) return;
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('training_trainer_bpf_overview', { p_reporting_year: nextYear });
    if (rpcError) {
      setError(rpcError.message);
      setOverview(null);
      setLoading(false);
      return;
    }
    const next = data as TrainingTrainerBpfOverview;
    setOverview(next);
    setDrafts(Object.fromEntries(next.interventions.map((item) => [item.session_id, {
      amount: amountInputValue(item.amount_excl_tax_cents),
      invoiceReference: item.invoice_reference || '',
      invoiceDate: item.invoice_date || '',
      notes: item.notes || ''
    }])));
    setLoading(false);
  }

  useEffect(() => {
    void load(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  function updateDraft(sessionId: string, field: 'amount' | 'invoiceReference' | 'invoiceDate' | 'notes', value: string) {
    setDrafts((current) => ({
      ...current,
      [sessionId]: {
        amount: current[sessionId]?.amount || '',
        invoiceReference: current[sessionId]?.invoiceReference || '',
        invoiceDate: current[sessionId]?.invoiceDate || '',
        notes: current[sessionId]?.notes || '',
        [field]: value
      }
    }));
  }

  async function save(intervention: TrainingTrainerBpfIntervention) {
    if (!supabase) return;
    const draft = drafts[intervention.session_id] || { amount: '', invoiceReference: '', invoiceDate: '', notes: '' };
    const cents = centsFromInput(draft.amount);
    if (Number.isNaN(cents)) {
      setError('Le montant HT doit être un nombre positif.');
      return;
    }
    setSavingId(intervention.session_id);
    setError('');
    setSuccess('');
    const { error: rpcError } = await supabase.rpc('save_training_trainer_bpf_entry', {
      p_session_id: intervention.session_id,
      p_amount_excl_tax_cents: cents,
      p_invoice_reference: draft.invoiceReference.trim() || null,
      p_invoice_date: draft.invoiceDate || null,
      p_notes: draft.notes.trim() || null
    });
    if (rpcError) setError(rpcError.message);
    else {
      setSuccess('Intervention enregistrée dans votre suivi BPF.');
      await load(year);
    }
    setSavingId('');
  }

  function exportCsv() {
    if (!overview) return;
    const rows = [
      ['Centre donneur d’ordre', 'SIRET', 'Session', 'Programme', 'Date de fin', 'Heures intervention', 'Stagiaires cadre G', 'Heures-stagiaires cadre G', 'Montant HT cadre C ligne 10', 'Référence facture', 'Date facture'],
      ...overview.interventions.map((item) => [
        item.organization_name,
        item.organization_siret || '',
        item.session_title,
        item.program_title || '',
        item.ends_at.slice(0, 10),
        item.training_hours,
        item.trainee_count,
        item.trainee_hours,
        item.amount_excl_tax_cents == null ? '' : (item.amount_excl_tax_cents / 100).toFixed(2),
        item.invoice_reference || '',
        item.invoice_date || ''
      ])
    ];
    const body = ['sep=;', ...rows.map((row) => row.map(csvCell).join(';'))].join('\n');
    const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ncr-bpf-sous-traitance-${overview.reporting_year}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (loading && !overview) {
    return <div className="training-trainer-bpf-loading"><span /><p>Consolidation de vos interventions…</p></div>;
  }

  return (
    <div className="training-trainer-bpf">
      <header className="training-portal-page-heading training-trainer-bpf-heading">
        <div>
          <p className="eyebrow">MON ACTIVITÉ DE SOUS-TRAITANCE</p>
          <h1>Mon BPF</h1>
          <p>Vos heures confiées par les organismes sont consolidées automatiquement. Vous complétez uniquement ce que vous avez réellement facturé.</p>
        </div>
        <div className="training-trainer-bpf-actions">
          <label>Exercice<select value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          <button className="secondary-button compact-button" onClick={exportCsv} disabled={!overview?.interventions.length}><Icon name="file" size={16} />Exporter CSV</button>
        </div>
      </header>

      {error && <div className="training-portal-notice error"><Icon name="alert" size={18} /><span>{error}</span></div>}
      {success && <div className="training-portal-notice success"><Icon name="check" size={18} /><span>{success}</span></div>}

      <section className="training-trainer-bpf-guidance">
        <span><Icon name="chart" size={21} /></span>
        <div>
          <strong>Vue personnelle, séparée du BPF des centres</strong>
          <p>Seules les interventions où le centre vous a déclaré comme formateur externe sont intégrées. Les missions salariées ou internes restent volontairement exclues.</p>
        </div>
      </section>

      {overview && (
        <>
          <div className="training-trainer-bpf-metrics">
            <article><small>Centres</small><strong>{overview.summary.centers}</strong><span>donneurs d’ordre</span></article>
            <article><small>Cadre G</small><strong>{overview.summary.trainees}</strong><span>stagiaires</span></article>
            <article><small>Cadre G</small><strong>{decimal.format(overview.summary.trainee_hours)} h</strong><span>heures-stagiaires</span></article>
            <article className={overview.summary.to_complete ? 'attention' : 'ready'}><small>Cadre C · ligne 10</small><strong>{euro.format(overview.summary.revenue_cents / 100)}</strong><span>{overview.summary.to_complete ? `${overview.summary.to_complete} intervention(s) à compléter` : 'montants renseignés'}</span></article>
          </div>

          {overview.excluded_internal_sessions > 0 && (
            <div className="training-trainer-bpf-excluded"><Icon name="users" size={17} /><span><strong>{overview.excluded_internal_sessions}</strong> session(s) interne(s) ou salariée(s) détectée(s) sur l’exercice et non intégrée(s) à votre BPF personnel.</span></div>
          )}

          <section className="training-portal-section training-trainer-bpf-list-section">
            <header><div><h2>Interventions confiées par des organismes</h2><p>{overview.summary.interventions} intervention{overview.summary.interventions > 1 ? 's' : ''} terminée{overview.summary.interventions > 1 ? 's' : ''} sur l’exercice {overview.reporting_year}.</p></div></header>
            {overview.interventions.length === 0 ? (
              <div className="training-portal-empty"><Icon name="chart" size={28} />Aucune intervention externe terminée pour cet exercice.</div>
            ) : (
              <div className="training-trainer-bpf-interventions">
                {overview.interventions.map((item) => {
                  const draft = drafts[item.session_id] || { amount: '', invoiceReference: '', invoiceDate: '', notes: '' };
                  return (
                    <article className="training-trainer-bpf-card" key={`${item.organization_id}-${item.session_id}`}>
                      <header>
                        <div>
                          <span className="training-trainer-bpf-center"><Icon name="building" size={15} />{item.organization_name}</span>
                          <h3>{item.session_title}</h3>
                          <p>{item.program_title || 'Programme de formation'} · terminée le {date.format(new Date(item.ends_at))}</p>
                        </div>
                        <span className={`training-trainer-bpf-status ${item.amount_excl_tax_cents == null ? 'pending' : 'complete'}`}>{item.amount_excl_tax_cents == null ? 'À compléter' : 'BPF renseigné'}</span>
                      </header>

                      <div className="training-trainer-bpf-session-metrics">
                        <div><small>Heures d'intervention</small><strong>{decimal.format(item.training_hours)} h</strong></div>
                        <div><small>Stagiaires</small><strong>{item.trainee_count}</strong></div>
                        <div><small>Heures-stagiaires</small><strong>{decimal.format(item.trainee_hours)} h</strong></div>
                        <div><small>Début</small><strong>{date.format(new Date(item.starts_at))}</strong></div>
                      </div>

                      <div className="training-trainer-bpf-form">
                        <label><span>Montant HT facturé au centre</span><div className="training-trainer-bpf-money"><input inputMode="decimal" placeholder="0,00" value={draft.amount} onChange={(event) => updateDraft(item.session_id, 'amount', event.target.value)} /><b>€</b></div><small>Alimente votre total indicatif du cadre C, ligne 10.</small></label>
                        <label><span>Référence facture</span><input placeholder="Ex. FAC-2026-018" value={draft.invoiceReference} onChange={(event) => updateDraft(item.session_id, 'invoiceReference', event.target.value)} /></label>
                        <label><span>Date de facture</span><input type="date" value={draft.invoiceDate} onChange={(event) => updateDraft(item.session_id, 'invoiceDate', event.target.value)} /></label>
                        <label className="full"><span>Note personnelle</span><textarea rows={2} placeholder="Optionnel : bon de commande, précision comptable…" value={draft.notes} onChange={(event) => updateDraft(item.session_id, 'notes', event.target.value)} /></label>
                      </div>
                      <footer>
                        <span>Les données pédagogiques (stagiaires et heures) viennent du dossier de session du centre.</span>
                        <button className="primary-button compact-button" onClick={() => void save(item)} disabled={savingId === item.session_id}>{savingId === item.session_id ? 'Enregistrement…' : 'Enregistrer'}</button>
                      </footer>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
