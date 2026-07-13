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
