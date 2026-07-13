export type BusinessType = 'coiffure' | 'nettoyage' | 'securite' | 'formation' | 'artisan';
export type MemberRole = 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';
export type Plan = 'decouverte' | 'essentielle' | 'professionnelle' | 'metier';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  plan: Plan;
  primary_color: string;
  logo_url?: string | null;
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
  | 'chart';
