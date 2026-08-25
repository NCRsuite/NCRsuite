import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

type InterventionStatus = 'planned' | 'completed' | 'canceled';
type RegulatoryScope = 'review_required' | 'professional_continuing' | 'apprenticeship' | 'initial_education' | 'out_of_scope';

type PersonalIntervention = {
  id: string;
  center_name: string;
  activity_title: string;
  starts_at: string;
  ends_at: string;
  employment_mode: 'salaried' | 'subcontractor';
  regulatory_scope: RegulatoryScope;
  status: InterventionStatus;
  hourly_rate_cents: number | null;
  amount_excl_tax_cents: number | null;
  billing_invoice_id: string | null;
  billing_customer_id: string | null;
};

type Customer = {
  id: string;
  legal_name: string;
  billing_address: string | null;
  postal_code: string | null;
  city: string | null;
  status: string;
};

type MonthlyInvoice = {
  id: string;
  invoice_number: string | null;
  title: string;
  status: string;
  subtotal_cents: number;
  total_cents: number;
  personal_activity_center_name: string | null;
  personal_activity_period_start: string | null;
};

type CenterGroup = {
  key: string;
  center: string;
  rows: PersonalIntervention[];
  billable: PersonalIntervention[];
  alreadyBilled: PersonalIntervention[];
  planned: PersonalIntervention[];
  salaried: PersonalIntervention[];
  hours: number;
  amountCents: number;
  missingPrice: number;
  toQualify: number;
};

const scopeLabels: Record<RegulatoryScope, string> = {
  review_required: 'À qualifier pour le BPF',
  professional_continuing: 'Formation professionnelle continue',
  apprenticeship: 'Apprentissage',
  initial_education: 'Formation initiale / scolaire',
  out_of_scope: 'Hors champ BPF'
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(year, monthNumber - 1, 1);
  const next = new Date(year, monthNumber, 1);
  const end = new Date(year, monthNumber, 0);
  const date = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return { start: date(start), end: date(end), next: date(next) };
}

function durationHours(row: PersonalIntervention) {
  return Math.max(0, (new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 3_600_000);
}

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase('fr');
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function TrainingPersonalMonthlyBillingPage() {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [rows, setRows] = useState<PersonalIntervention[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<MonthlyInvoice[]>([]);
  const [customerByCenter, setCustomerByCenter] = useState<Record<string, string>>({});
  const [vatRate, setVatRate] = useState(String((organization?.training_default_vat_basis_points ?? 0) / 100).replace('.', ','));
  const [loading, setLoading] = useState(true);
  const [busyCenter, setBusyCenter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdInvoiceId, setCreatedInvoiceId] = useState('');
  const canManage = ['owner', 'admin', 'manager'].includes(organization?.role ?? 'viewer');

  async function load() {
    if (!organization || !user || !supabase) {
      setLoading(false);
      return;
    }
    const bounds = monthBounds(month);
    setLoading(true);
    setError('');
    const [interventionResult, customerResult, invoiceResult] = await Promise.all([
      supabase
        .from('training_personal_interventions')
        .select('id,center_name,activity_title,starts_at,ends_at,employment_mode,regulatory_scope,status,hourly_rate_cents,amount_excl_tax_cents,billing_invoice_id,billing_customer_id')
        .eq('reporting_organization_id', organization.id)
        .eq('user_id', user.id)
        .gte('starts_at', `${bounds.start}T00:00:00`)
        .lt('starts_at', `${bounds.next}T00:00:00`)
        .order('starts_at'),
      supabase
        .from('training_customers')
        .select('id,legal_name,billing_address,postal_code,city,status')
        .eq('organization_id', organization.id)
        .neq('status', 'archived')
        .order('legal_name'),
      supabase
        .from('training_invoices')
        .select('id,invoice_number,title,status,subtotal_cents,total_cents,personal_activity_center_name,personal_activity_period_start')
        .eq('organization_id', organization.id)
        .eq('personal_activity_user_id', user.id)
        .eq('personal_activity_period_start', bounds.start)
        .order('created_at', { ascending: false })
    ]);
    const firstError = interventionResult.error || customerResult.error || invoiceResult.error;
    if (firstError) {
      setError(`Chargement impossible : ${firstError.message}`);
    } else {
      const nextRows = (interventionResult.data ?? []).map((row) => ({
        ...row,
        hourly_rate_cents: row.hourly_rate_cents === null ? null : Number(row.hourly_rate_cents),
        amount_excl_tax_cents: row.amount_excl_tax_cents === null ? null : Number(row.amount_excl_tax_cents)
      })) as PersonalIntervention[];
      const nextCustomers = (customerResult.data ?? []) as Customer[];
      setRows(nextRows);
      setCustomers(nextCustomers);
      setInvoices((invoiceResult.data ?? []).map((row) => ({
        ...row,
        subtotal_cents: Number(row.subtotal_cents),
        total_cents: Number(row.total_cents)
      })) as MonthlyInvoice[]);

      setCustomerByCenter((current) => {
        const next = { ...current };
        const centers = [...new Set(nextRows.map((row) => row.center_name.trim()).filter(Boolean))];
        centers.forEach((center) => {
          const key = normalized(center);
          if (next[key]) return;
          const linked = nextRows.find((row) => normalized(row.center_name) === key && row.billing_customer_id)?.billing_customer_id;
          const exact = nextCustomers.find((customer) => normalized(customer.legal_name) === key)?.id;
          if (linked || exact) next[key] = linked || exact || '';
        });
        return next;
      });
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [organization?.id, user?.id, month]);

  const groups = useMemo<CenterGroup[]>(() => {
    const grouped = new Map<string, PersonalIntervention[]>();
    rows.forEach((row) => {
      const center = row.center_name.trim() || 'Centre extérieur';
      const key = normalized(center);
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    });
    return [...grouped.entries()].map(([key, centerRows]) => {
      const center = centerRows[0]?.center_name.trim() || 'Centre extérieur';
      const billable = centerRows.filter((row) => row.employment_mode === 'subcontractor' && row.status === 'completed' && !row.billing_invoice_id);
      const alreadyBilled = centerRows.filter((row) => row.employment_mode === 'subcontractor' && Boolean(row.billing_invoice_id));
      const planned = centerRows.filter((row) => row.employment_mode === 'subcontractor' && row.status === 'planned');
      const salaried = centerRows.filter((row) => row.employment_mode === 'salaried' && row.status !== 'canceled');
      return {
        key,
        center,
        rows: centerRows,
        billable,
        alreadyBilled,
        planned,
        salaried,
        hours: billable.reduce((sum, row) => sum + durationHours(row), 0),
        amountCents: billable.reduce((sum, row) => sum + (row.amount_excl_tax_cents ?? 0), 0),
        missingPrice: billable.filter((row) => (row.amount_excl_tax_cents ?? 0) <= 0).length,
        toQualify: centerRows.filter((row) => row.employment_mode === 'subcontractor' && row.status === 'completed' && row.regulatory_scope === 'review_required').length
      };
    }).sort((a, b) => a.center.localeCompare(b.center, 'fr'));
  }, [rows]);

  const totals = useMemo(() => ({
    billableHours: groups.reduce((sum, group) => sum + group.hours, 0),
    billableAmount: groups.reduce((sum, group) => sum + group.amountCents, 0),
    billedAmount: invoices.filter((invoice) => invoice.status !== 'canceled').reduce((sum, invoice) => sum + invoice.subtotal_cents, 0),
    salariedHours: groups.reduce((sum, group) => sum + group.salaried.reduce((hours, row) => hours + durationHours(row), 0), 0)
  }), [groups, invoices]);

  async function createMonthlyInvoice(group: CenterGroup) {
    if (!organization || !user || !supabase || !canManage) return;
    const customerId = customerByCenter[group.key] || '';
    const parsedVat = Number(vatRate.replace(',', '.'));
    if (!customerId) {
      setError(`Sélectionne le client correspondant à ${group.center}.`);
      return;
    }
    if (!Number.isFinite(parsedVat) || parsedVat < 0 || parsedVat > 100) {
      setError('Le taux de TVA doit être compris entre 0 et 100 %.');
      return;
    }
    if (group.missingPrice > 0) {
      setError('Une intervention terminée n’a pas encore de montant. Complète son tarif horaire ou son forfait dans Mon activité.');
      return;
    }
    if (group.billable.length === 0) return;

    setBusyCenter(group.key);
    setError('');
    setSuccess('');
    setCreatedInvoiceId('');
    const { data, error: rpcError } = await supabase.rpc('create_training_personal_monthly_invoice', {
      p_organization_id: organization.id,
      p_center_name: group.center,
      p_customer_id: customerId,
      p_month: `${month}-01`,
      p_vat_rate_basis_points: Math.round(parsedVat * 100),
      p_due_date: null,
      p_purchase_order_number: null,
      p_notes: `Facturation mensuelle automatique des interventions de ${group.center}.`
    });
    if (rpcError) {
      setError(`Création impossible : ${rpcError.message}`);
    } else {
      setCreatedInvoiceId(String(data ?? ''));
      setSuccess(`Brouillon mensuel créé pour ${group.center}. Tu peux maintenant le contrôler, l’émettre et l’envoyer depuis Facturation.`);
      await load();
    }
    setBusyCenter('');
  }

  if (!organization || organization.business_type !== 'formation') return null;

  return (
    <div className="page training-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">FORMATION · ACTIVITÉ PERSONNELLE</p>
          <h1>Facturation mensuelle</h1>
          <p>Regroupe automatiquement tes heures de sous-traitance terminées par centre et transforme-les en facture NCR Solutions, sans recréer les interventions.</p>
        </div>
        <div className="page-header-actions">
          <Link className="secondary-button" to="/mon-activite"><Icon name="briefcase" size={18} />Mon activité</Link>
          <Link className="primary-button" to="/facturation-formation"><Icon name="file" size={18} />Facturation</Link>
        </div>
      </header>

      <section className="panel training-form-panel">
        <div className="training-form-grid">
          <label>Mois à facturer<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
          <label>TVA appliquée (%)<input inputMode="decimal" value={vatRate} onChange={(event) => setVatRate(event.target.value)} /></label>
        </div>
        <div className="training-portal-notice"><Icon name="activity" size={18} /><span>Seules les interventions <strong>Sous-traitance facturée via mon organisme</strong> et marquées <strong>Terminée</strong> sont facturées. Les activités salariées restent dans ton planning mais ne créent jamais de facture NCR.</span></div>
      </section>

      <div className="training-kpi-grid">
        <article className="panel"><span className="training-record-icon"><Icon name="calendar" size={20} /></span><div><small>Heures à facturer</small><strong>{totals.billableHours.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h</strong></div></article>
        <article className="panel"><span className="training-record-icon"><Icon name="creditCard" size={20} /></span><div><small>HT à facturer</small><strong>{money(totals.billableAmount)}</strong></div></article>
        <article className="panel"><span className="training-record-icon"><Icon name="file" size={20} /></span><div><small>Déjà mis en facture</small><strong>{money(totals.billedAmount)}</strong></div></article>
        <article className="panel"><span className="training-record-icon"><Icon name="briefcase" size={20} /></span><div><small>Heures salariées suivies</small><strong>{totals.salariedHours.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h</strong></div></article>
      </div>

      {error && <div className="error-message page-message" role="alert">{error}</div>}
      {success && <div className="success-message page-message">{success}{createdInvoiceId && <> <Link to="/facturation-formation">Ouvrir le brouillon dans Facturation →</Link></>}</div>}

      {loading ? <div className="training-empty">Chargement de la facturation mensuelle…</div> : groups.length === 0 ? (
        <section className="panel training-empty"><Icon name="calendar" size={30} /><strong>Aucune activité sur ce mois</strong><span>Les interventions de Mon activité apparaîtront ici automatiquement.</span></section>
      ) : (
        <div className="training-record-list">
          {groups.map((group) => {
            const selectedCustomer = customers.find((customer) => customer.id === customerByCenter[group.key]);
            const relatedInvoices = invoices.filter((invoice) => normalized(invoice.personal_activity_center_name || '') === group.key);
            return <article className="panel training-record-card" key={group.key}>
              <div className="training-record-main">
                <div className="training-record-title"><span className="training-record-icon"><Icon name="building" size={19} /></span><div><small>CENTRE DE FORMATION</small><strong>{group.center}</strong></div></div>
                <div className="training-record-meta">
                  <span>{group.billable.length} intervention(s) à facturer</span>
                  <span>{group.hours.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h</span>
                  <span>{money(group.amountCents)} HT</span>
                </div>
                {group.billable.length > 0 && <div className="training-record-lines">{group.billable.map((row) => <span key={row.id}><strong>{dateTime(row.starts_at)}</strong> · {row.activity_title} · {durationHours(row).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h · {money(row.amount_excl_tax_cents ?? 0)} · {scopeLabels[row.regulatory_scope]}</span>)}</div>}
                {group.toQualify > 0 && <div className="training-portal-notice warning"><Icon name="alert" size={16} /><span>{group.toQualify} intervention(s) restent à qualifier pour le BPF. Cela ne bloque pas la facture : la qualification BPF reste indépendante.</span></div>}
                {group.planned.length > 0 && <p>{group.planned.length} intervention(s) encore planifiée(s) : elles entreront dans la facturation lorsqu’elles seront terminées.</p>}
                {group.salaried.length > 0 && <p>{group.salaried.length} activité(s) salariée(s) suivie(s), volontairement exclue(s) de la facturation NCR.</p>}
                {relatedInvoices.map((invoice) => <p key={invoice.id}><strong>{invoice.invoice_number || 'Brouillon'}</strong> · {invoice.status} · {money(invoice.subtotal_cents)} HT</p>)}
              </div>

              <div className="training-record-actions">
                {group.billable.length > 0 && <>
                  <label>Client à facturer<select value={customerByCenter[group.key] || ''} onChange={(event) => setCustomerByCenter((current) => ({ ...current, [group.key]: event.target.value }))}><option value="">Sélectionner le centre client</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.legal_name}</option>)}</select></label>
                  {selectedCustomer && (!selectedCustomer.billing_address || !selectedCustomer.postal_code || !selectedCustomer.city) && <small>Adresse de facturation incomplète : le brouillon pourra être créé, mais il faudra compléter le client avant l’émission.</small>}
                  {group.missingPrice > 0 ? <span className="status-badge inactive">Tarif manquant</span> : <button type="button" className="primary-button" disabled={!canManage || busyCenter === group.key || !customerByCenter[group.key]} onClick={() => void createMonthlyInvoice(group)}><Icon name="file" size={17} />{busyCenter === group.key ? 'Création…' : `Créer le brouillon · ${money(group.amountCents)} HT`}</button>}
                </>}
                {group.alreadyBilled.length > 0 && <span className="status-badge active">{group.alreadyBilled.length} intervention(s) déjà rattachée(s) à une facture</span>}
              </div>
            </article>;
          })}
        </div>
      )}

      {customers.length === 0 && !loading && <section className="panel training-empty"><Icon name="building" size={28} /><strong>Aucun client facturable</strong><span>Crée d’abord le centre de formation comme client dans CRM & commercial, puis reviens ici. NCR Suite ne crée pas automatiquement une identité légale à partir du simple nom saisi dans ton planning.</span><Link className="secondary-button" to="/commercial">Ouvrir CRM & commercial</Link></section>}
    </div>
  );
}
