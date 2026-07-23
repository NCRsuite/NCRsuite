import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { usePlatformAdmin } from './PlatformAdminContext';
import { supabase } from '../lib/supabase';
import type { BusinessType, Organization, OrganizationSite, Plan } from '../types';
import { organizationHasFeature } from '../config/planEntitlements';


export interface SupportSession {
  id: string;
  ticket_id: string;
  organization_id: string;
  reason: string;
  duration_minutes: number;
  started_at: string;
  expires_at: string;
}

interface CreateOrganizationInput {
  name: string;
  businessType: BusinessType;
  primaryColor: string;
  requestedPlan: Plan;
  contactName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companySiret: string;
  objective: string;
}

interface BookingSettingsInput {
  enabled: boolean;
  confirmationMode: 'automatic' | 'manual';
  slotInterval: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  cancelNoticeHours: number;
  welcomeText: string;
}

interface EmailNotificationSettingsInput {
  enabled: boolean;
  contactEmail: string;
  contactPhone: string;
  reminderHours: number;
}

interface ClientExperienceSettingsInput {
  cancellationPolicy: string;
  privacyNotice: string;
}

interface CommercialBrandingInput {
  publicName: string;
  slug: string;
  primaryColor: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  tagline: string;
  address: string;
  hoursText: string;
  practicalInfo: string;
  showNcrBranding: boolean;
}

interface OrganizationContextValue {
  organizations: Organization[];
  organization: Organization | null;
  sites: OrganizationSite[];
  activeSite: OrganizationSite | null;
  activeSiteId: string | null;
  loading: boolean;
  sitesLoading: boolean;
  supportSession: SupportSession | null;
  selectOrganization: (id: string) => void;
  selectSite: (id: string | null) => void;
  refreshOrganizations: () => void;
  refreshSites: () => void;
  endSupportSession: () => Promise<void>;
  createOrganization: (input: CreateOrganizationInput) => Promise<string>;
  updateBranding: (updates: { name?: string; primaryColor?: string }) => Promise<void>;
  updateBookingSettings: (updates: BookingSettingsInput) => Promise<void>;
  updateEmailNotificationSettings: (updates: EmailNotificationSettingsInput) => Promise<void>;
  updateClientExperienceSettings: (updates: ClientExperienceSettingsInput) => Promise<void>;
  updateCommercialBranding: (updates: CommercialBrandingInput) => Promise<void>;
}


const OrganizationContext = createContext<OrganizationContextValue | null>(null);

function backendErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim();
    if (message) return message;
  }
  return fallback;
}

const ORGANIZATION_FIELDS = [
  'id','name','slug','business_type','plan','status','created_at','primary_color','logo_url','timezone',
  'booking_enabled','booking_confirmation_mode','booking_slot_interval','booking_min_notice_hours','booking_max_days_ahead',
  'booking_cancel_notice_hours','booking_welcome_text','email_notifications_enabled','booking_contact_email','booking_contact_phone',
  'booking_reminder_hours','booking_cancellation_policy','booking_privacy_notice','public_name','booking_tagline','booking_banner_url',
  'booking_address','booking_hours_text','booking_practical_info','show_ncr_branding','security_billing_address','security_billing_postal_code',
  'security_billing_city','security_billing_siret','security_billing_vat_number','security_billing_email','security_billing_phone',
  'security_default_vat_rate','security_payment_terms_days','security_late_penalty_text','security_tax_exemption_text','security_bank_account_holder','security_bank_name','security_bank_iban','security_bank_bic','security_quote_validity_days','metier_setup_fee_cents','metier_member_limit',
  'metier_site_limit','metier_storage_limit_mb','metier_contract_reference','metier_modules_configured','white_label_enabled',
  'custom_domain','custom_domain_status','custom_domain_verified_at','training_satisfaction_enabled',
  'training_satisfaction_delay_hours','training_satisfaction_intro','training_initial_evaluation_enabled','training_initial_evaluation_lead_hours',
  'training_initial_evaluation_intro','training_evaluation_reminder_enabled','training_evaluation_reminder_delay_hours',
  'training_evaluation_reminder_max_count','training_attestation_auto_send','training_attestation_requires_final_evaluation',
  'training_nda_number','training_legal_representative',
  'training_reply_to_email','training_vat_number','training_document_footer','training_default_terms',
  'training_default_vat_basis_points','training_signature_url','training_stamp_url','company_contact_name','company_email','company_phone',
  'company_address','company_postal_code','company_city','company_siret','onboarding_status','onboarding_requested_plan',
  'onboarding_objective','onboarding_checklist','onboarding_completed_at'
].join(',');

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user, demoMode } = useAuth();
  const { isAdmin, loading: adminLoading } = usePlatformAdmin();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => localStorage.getItem('ncr-suite-org-id'));
  const [loading, setLoading] = useState(true);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [sites, setSites] = useState<OrganizationSite[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [sitesReloadVersion, setSitesReloadVersion] = useState(0);
  const [supportSession, setSupportSession] = useState<SupportSession | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user) {
        if (active) {
          setOrganizations([]);
          setSupportSession(null);
          setLoading(false);
        }
        return;
      }

      if (adminLoading) return;

      if (isAdmin && supabase) {
        const { data, error } = await supabase.rpc('get_my_active_support_session');
        if (error) {
          console.error('Impossible de charger la session d’assistance NCR.', error);
          if (active) {
            setSupportSession(null);
            setOrganizations([]);
            setLoading(false);
          }
          return;
        }
        const payload = data as ({ organization?: Organization } & SupportSession) | null;
        if (active) {
          if (payload?.organization?.id) {
            const { organization: supportOrganization, ...session } = payload;
            setSupportSession(session as SupportSession);
            setOrganizations([supportOrganization as Organization]);
            setSelectedId(supportOrganization.id);
          } else {
            setSupportSession(null);
            setOrganizations([]);
            setSelectedId(null);
          }
          setLoading(false);
        }
        return;
      }

      setSupportSession(null);

      if (demoMode || !supabase) {
        const stored = localStorage.getItem('ncr-suite-demo-org');
        const demoOrganizations = stored ? [JSON.parse(stored) as Organization] : [];
        if (active) {
          setOrganizations(demoOrganizations);
          setSelectedId(demoOrganizations[0]?.id ?? null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('organization_members')
        .select(`role,custom_role_id,organizations(${ORGANIZATION_FIELDS})`)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) {
        console.error(error);
        if (active) setLoading(false);
        return;
      }

      const membershipRows = (data ?? [])
        .map((row: any) => ({ ...row.organizations, role: row.role, custom_role_id: row.custom_role_id } as Organization))
        .filter((row: Organization) => Boolean(row.id));
      const organizationIds = membershipRows.map((row) => row.id);
      const customRoleIds = membershipRows.map((row) => row.custom_role_id).filter(Boolean) as string[];

      const moduleMap = new Map<string, string[]>();
      if (organizationIds.length > 0) {
        const { data: moduleRows, error: moduleError } = await supabase
          .from('organization_modules')
          .select('organization_id,module_key,enabled')
          .in('organization_id', organizationIds)
          .eq('enabled', true);
        if (moduleError) console.error(moduleError);
        for (const moduleRow of moduleRows ?? []) {
          const current = moduleMap.get(moduleRow.organization_id) ?? [];
          current.push(moduleRow.module_key);
          moduleMap.set(moduleRow.organization_id, current);
        }
      }

      const customRoleMap = new Map<string, { label: string; module_keys: string[] }>();
      if (customRoleIds.length > 0) {
        const { data: roleRows, error: roleError } = await supabase
          .from('organization_custom_roles')
          .select('id,label,module_keys')
          .in('id', customRoleIds)
          .eq('active', true);
        if (roleError) console.error(roleError);
        for (const roleRow of roleRows ?? []) {
          customRoleMap.set(roleRow.id, { label: roleRow.label, module_keys: roleRow.module_keys ?? [] });
        }
      }

      const rows = membershipRows.map((row) => {
        const customRole = row.custom_role_id ? customRoleMap.get(row.custom_role_id) : undefined;
        return {
          ...row,
          enabled_modules: moduleMap.get(row.id) ?? [],
          custom_role_label: customRole?.label ?? null,
          custom_module_keys: customRole?.module_keys ?? []
        } as Organization;
      });

      if (active) {
        setOrganizations(rows);
        setSelectedId((current) => current && rows.some((org) => org.id === current) ? current : rows[0]?.id ?? null);
        setLoading(false);
      }
    }

    setLoading(true);
    load();
    return () => { active = false; };
  }, [user, demoMode, reloadVersion, isAdmin, adminLoading]);

  const organization = organizations.find((org) => org.id === selectedId) ?? organizations[0] ?? null;

  useEffect(() => {
    if (!organization) {
      setSites([]);
      setActiveSiteId(null);
      return;
    }
    localStorage.setItem('ncr-suite-org-id', organization.id);
    document.documentElement.style.setProperty('--accent', organization.primary_color || '#2997ff');
  }, [organization]);

  useEffect(() => {
    let active = true;

    async function loadSites() {
      if (!organization || !organizationHasFeature(organization, 'multi_site')) {
        if (active) {
          setSites([]);
          setActiveSiteId(null);
          setSitesLoading(false);
        }
        return;
      }

      setSitesLoading(true);
      const storageKey = `ncr-suite-site-id-${organization.id}`;

      if (demoMode || !supabase) {
        const raw = localStorage.getItem(`ncr-suite-demo-sites-${organization.id}`);
        const rows = raw ? JSON.parse(raw) as OrganizationSite[] : [];
        const stored = localStorage.getItem(storageKey);
        const resolved = stored === 'all' ? null : (stored && rows.some((site) => site.id === stored) ? stored : rows.find((site) => site.is_primary)?.id ?? rows[0]?.id ?? null);
        if (active) {
          setSites(rows.filter((site) => site.status === 'active'));
          setActiveSiteId(resolved);
          setSitesLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('organization_sites')
        .select('id,organization_id,name,code,address,postal_code,city,phone,email,timezone,is_primary,status,created_at,updated_at')
        .eq('organization_id', organization.id)
        .eq('status', 'active')
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true });

      if (!active) return;
      if (error) {
        console.error(error);
        setSites([]);
        setActiveSiteId(null);
      } else {
        const rows = (data ?? []) as OrganizationSite[];
        const stored = localStorage.getItem(storageKey);
        const resolved = stored === 'all'
          ? null
          : stored && rows.some((site) => site.id === stored)
            ? stored
            : rows.find((site) => site.is_primary)?.id ?? rows[0]?.id ?? null;
        setSites(rows);
        setActiveSiteId(resolved);
      }
      setSitesLoading(false);
    }

    loadSites();
    return () => { active = false; };
  }, [organization?.id, organization?.plan, demoMode, sitesReloadVersion]);

  useEffect(() => {
    if (!supportSession) return;
    const delay = new Date(supportSession.expires_at).getTime() - Date.now();
    if (delay <= 0) {
      setSupportSession(null);
      setOrganizations([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSupportSession(null);
      setOrganizations([]);
      window.location.assign('/administration-ncr');
    }, Math.min(delay + 500, 2147483000));
    return () => window.clearTimeout(timer);
  }, [supportSession?.id, supportSession?.expires_at]);

  const activeSite = sites.find((site) => site.id === activeSiteId) ?? null;

  const value = useMemo<OrganizationContextValue>(() => ({
    organizations,
    organization,
    sites,
    activeSite,
    activeSiteId,
    loading,
    sitesLoading,
    supportSession,
    selectOrganization(id) {
      setSelectedId(id);
    },
    selectSite(id) {
      if (!organization) return;
      setActiveSiteId(id);
      localStorage.setItem(`ncr-suite-site-id-${organization.id}`, id ?? 'all');
    },
    refreshOrganizations() {
      setReloadVersion((current) => current + 1);
    },
    refreshSites() {
      setSitesReloadVersion((current) => current + 1);
    },
    async endSupportSession() {
      if (supabase && supportSession) {
        const { error } = await supabase.rpc('end_my_support_access_session');
        if (error) throw error;
      }
      setSupportSession(null);
      setOrganizations([]);
      setSelectedId(null);
      localStorage.removeItem('ncr-suite-org-id');
    },
    async createOrganization({ name, businessType, primaryColor, requestedPlan, contactName, companyEmail, companyPhone, companyAddress, companyPostalCode, companyCity, companySiret, objective }) {
      const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`;
      const plan: Plan = 'decouverte';

      if (demoMode || !supabase) {
        const org: Organization = {
          id: crypto.randomUUID(),
          name,
          slug,
          business_type: businessType,
          plan,
          status: 'active',
          primary_color: primaryColor,
          company_contact_name: contactName,
          company_email: companyEmail,
          company_phone: companyPhone,
          company_address: companyAddress,
          company_postal_code: companyPostalCode,
          company_city: companyCity,
          company_siret: companySiret,
          onboarding_requested_plan: requestedPlan,
          onboarding_objective: objective,
          onboarding_status: 'completed',
          onboarding_completed_at: new Date().toISOString(),
          onboarding_checklist: { identity: true, business: true, offer: true, branding: true },
          role: 'owner'
        };
        localStorage.setItem('ncr-suite-demo-org', JSON.stringify(org));
        setOrganizations([org]);
        setSelectedId(org.id);
        return org.id;
      }

      const { data, error } = await supabase.rpc('create_organization', {
        p_name: name,
        p_slug: slug,
        p_business_type: businessType,
        p_primary_color: primaryColor
      });
      if (error) throw error;

      const organizationId = String(data);
      const { error: onboardingError } = await supabase.rpc('complete_organization_onboarding', {
        p_organization_id: organizationId,
        p_contact_name: contactName,
        p_company_email: companyEmail,
        p_company_phone: companyPhone || null,
        p_company_address: companyAddress || null,
        p_company_postal_code: companyPostalCode || null,
        p_company_city: companyCity || null,
        p_company_siret: companySiret || null,
        p_requested_plan: requestedPlan,
        p_objective: objective || null
      });
      if (onboardingError) throw onboardingError;

      const { data: created, error: createdError } = await supabase
        .from('organizations')
        .select(ORGANIZATION_FIELDS)
        .eq('id', organizationId)
        .single();
      if (createdError) throw createdError;

      const org: Organization = { ...(created as unknown as Organization), role: 'owner' };
      setOrganizations((current) => [...current, org]);
      setSelectedId(org.id);
      return org.id;
    },
    async updateBranding({ name, primaryColor }) {
      if (!organization) return;
      const next = {
        ...organization,
        ...(name ? { name } : {}),
        ...(primaryColor ? { primary_color: primaryColor } : {})
      };

      if (demoMode || !supabase) {
        localStorage.setItem('ncr-suite-demo-org', JSON.stringify(next));
      } else {
        const { error } = await supabase.rpc('update_organization_branding', {
          p_organization_id: organization.id,
          p_name: next.name,
          p_primary_color: next.primary_color
        });
        if (error) throw error;
      }

      setOrganizations((current) => current.map((org) => org.id === next.id ? next : org));
    },
    async updateBookingSettings({ enabled, confirmationMode, slotInterval, minNoticeHours, maxDaysAhead, cancelNoticeHours, welcomeText }) {
      if (!organization) return;
      const next: Organization = {
        ...organization,
        booking_enabled: enabled,
        booking_confirmation_mode: confirmationMode,
        booking_slot_interval: slotInterval,
        booking_min_notice_hours: minNoticeHours,
        booking_max_days_ahead: maxDaysAhead,
        booking_cancel_notice_hours: cancelNoticeHours,
        booking_welcome_text: welcomeText.trim() || null
      };

      if (demoMode || !supabase) {
        localStorage.setItem('ncr-suite-demo-org', JSON.stringify(next));
      } else {
        const { error } = organization.business_type === 'restauration'
          ? await supabase.rpc('update_restaurant_public_booking_settings', {
              p_organization_id: organization.id,
              p_enabled: enabled,
              p_confirmation_mode: confirmationMode,
              p_slot_interval: slotInterval,
              p_min_notice_hours: minNoticeHours,
              p_max_days_ahead: maxDaysAhead,
              p_cancel_notice_hours: cancelNoticeHours,
              p_welcome_text: welcomeText.trim() || null
            })
          : await supabase.rpc('update_public_booking_settings', {
              p_organization_id: organization.id,
              p_enabled: enabled,
              p_confirmation_mode: confirmationMode,
              p_slot_interval: slotInterval,
              p_min_notice_hours: minNoticeHours,
              p_max_days_ahead: maxDaysAhead,
              p_cancel_notice_hours: cancelNoticeHours,
              p_welcome_text: welcomeText.trim() || null
            });
        if (error) throw error;

        if (organization.business_type === 'restauration') {
          try {
            const sourceWelcome = welcomeText.trim();
            const publicTranslations: Record<'en' | 'es' | 'it', Record<string, string>> = {
              en: { booking_welcome_text: '' },
              es: { booking_welcome_text: '' },
              it: { booking_welcome_text: '' },
            };
            let provider: string | null = null;
            if (sourceWelcome) {
              const { data: translationData, error: translationFunctionError } = await supabase.functions.invoke('translate-restaurant-menu', {
                body: { organization_id: organization.id, segments: { booking_welcome_text: sourceWelcome } },
              });
              if (translationFunctionError) throw translationFunctionError;
              if (translationData?.error) throw new Error(String(translationData.error));
              if (!translationData?.translations) throw new Error('Réponse de traduction incomplète.');
              provider = String(translationData.provider || '') || null;
              for (const language of ['en', 'es', 'it'] as const) {
                publicTranslations[language].booking_welcome_text = String(translationData.translations[language]?.booking_welcome_text || '');
              }
            }
            const { error: publicTranslationError } = await supabase.rpc('update_restaurant_public_menu_translations', {
              p_organization_id: organization.id,
              p_translations: publicTranslations,
              p_provider: provider,
            });
            if (publicTranslationError) throw publicTranslationError;
          } catch (translationCaught) {
            console.warn('Traduction du texte public de réservation non mise à jour.', translationCaught);
          }
        }
      }

      setOrganizations((current) => current.map((org) => org.id === next.id ? next : org));
    },
    async updateEmailNotificationSettings({ enabled, contactEmail, contactPhone, reminderHours }) {
      if (!organization) return;
      const next: Organization = {
        ...organization,
        email_notifications_enabled: enabled,
        booking_contact_email: contactEmail.trim() || null,
        booking_contact_phone: contactPhone.trim() || null,
        booking_reminder_hours: reminderHours
      };

      if (demoMode || !supabase) {
        localStorage.setItem('ncr-suite-demo-org', JSON.stringify(next));
      } else {
        const { error } = await supabase.rpc('update_email_notification_settings', {
          p_organization_id: organization.id,
          p_enabled: enabled,
          p_contact_email: contactEmail.trim() || null,
          p_contact_phone: contactPhone.trim() || null,
          p_reminder_hours: reminderHours
        });
        if (error) throw error;
      }

      setOrganizations((current) => current.map((org) => org.id === next.id ? next : org));
    },
    async updateClientExperienceSettings({ cancellationPolicy, privacyNotice }) {
      if (!organization) return;
      const next: Organization = {
        ...organization,
        booking_cancellation_policy: cancellationPolicy.trim() || null,
        booking_privacy_notice: privacyNotice.trim() || null
      };

      if (demoMode || !supabase) {
        localStorage.setItem('ncr-suite-demo-org', JSON.stringify(next));
      } else {
        const { error } = await supabase.rpc('update_client_experience_settings', {
          p_organization_id: organization.id,
          p_cancellation_policy: cancellationPolicy.trim() || null,
          p_privacy_notice: privacyNotice.trim() || null
        });
        if (error) throw error;
      }

      setOrganizations((current) => current.map((org) => org.id === next.id ? next : org));
    },
    async updateCommercialBranding({ publicName, slug, primaryColor, logoUrl, bannerUrl, tagline, address, hoursText, practicalInfo, showNcrBranding }) {
      if (!organization) return;
      const next: Organization = {
        ...organization,
        public_name: publicName.trim() || null,
        slug: slug.trim().toLowerCase(),
        primary_color: primaryColor,
        logo_url: logoUrl,
        booking_banner_url: bannerUrl,
        booking_tagline: tagline.trim() || null,
        booking_address: address.trim() || null,
        booking_hours_text: hoursText.trim() || null,
        booking_practical_info: practicalInfo.trim() || null,
        show_ncr_branding: showNcrBranding
      };

      if (demoMode || !supabase) {
        localStorage.setItem('ncr-suite-demo-org', JSON.stringify(next));
      } else {
        const { error } = await supabase.rpc('update_commercial_branding', {
          p_organization_id: organization.id,
          p_public_name: next.public_name,
          p_slug: next.slug,
          p_primary_color: next.primary_color,
          p_logo_url: next.logo_url,
          p_banner_url: next.booking_banner_url,
          p_tagline: next.booking_tagline,
          p_address: next.booking_address,
          p_hours_text: next.booking_hours_text,
          p_practical_info: next.booking_practical_info,
          p_show_ncr_branding: next.show_ncr_branding ?? true
        });
        if (error) throw new Error(backendErrorMessage(error, 'Enregistrement impossible.'));
      }

      setOrganizations((current) => current.map((org) => org.id === next.id ? next : org));
    }
  }), [organizations, organization, sites, activeSite, activeSiteId, loading, sitesLoading, selectedId, demoMode, supportSession]);

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization doit être utilisé dans OrganizationProvider.');
  return context;
}
