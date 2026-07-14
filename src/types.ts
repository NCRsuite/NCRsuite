export type BusinessType = 'coiffure' | 'nettoyage' | 'securite' | 'formation' | 'artisan';
export type MemberRole = 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';
export type Plan = 'decouverte' | 'essentielle' | 'professionnelle' | 'metier';
export type OrganizationStatus = 'trial' | 'active' | 'suspended' | 'closed';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  plan: Plan;
  status: OrganizationStatus;
  created_at?: string;
  primary_color: string;
  logo_url?: string | null;
  public_name?: string | null;
  booking_tagline?: string | null;
  booking_banner_url?: string | null;
  booking_address?: string | null;
  booking_hours_text?: string | null;
  booking_practical_info?: string | null;
  show_ncr_branding?: boolean;
  metier_setup_fee_cents?: number;
  metier_member_limit?: number | null;
  metier_site_limit?: number | null;
  metier_storage_limit_mb?: number | null;
  metier_contract_reference?: string | null;
  metier_modules_configured?: boolean;
  white_label_enabled?: boolean;
  custom_domain?: string | null;
  custom_domain_status?: 'not_configured' | 'pending' | 'verified' | 'active' | 'error';
  custom_domain_verified_at?: string | null;
  enabled_modules?: string[];
  custom_role_id?: string | null;
  custom_role_label?: string | null;
  custom_module_keys?: string[];
  timezone?: string;
  booking_enabled?: boolean;
  booking_confirmation_mode?: 'automatic' | 'manual';
  booking_slot_interval?: number;
  booking_min_notice_hours?: number;
  booking_max_days_ahead?: number;
  booking_cancel_notice_hours?: number;
  booking_welcome_text?: string | null;
  email_notifications_enabled?: boolean;
  booking_contact_email?: string | null;
  booking_contact_phone?: string | null;
  booking_reminder_hours?: number;
  booking_cancellation_policy?: string | null;
  booking_privacy_notice?: string | null;
  role?: MemberRole;
}

export interface NavigationItem {
  label: string;
  path: string;
  icon: IconName;
  badge?: string;
}

export type IconName =
  | 'home'
  | 'calendar'
  | 'users'
  | 'briefcase'
  | 'file'
  | 'activity'
  | 'settings'
  | 'scissors'
  | 'sparkles'
  | 'map'
  | 'shield'
  | 'alert'
  | 'clipboard'
  | 'graduation'
  | 'signature'
  | 'tool'
  | 'chart'
  | 'logout'
  | 'chevronDown'
  | 'chevronRight'
  | 'check'
  | 'close'
  | 'building'
  | 'creditCard'
  | 'search'
  | 'lock'
  | 'menu'
  | 'plus';
