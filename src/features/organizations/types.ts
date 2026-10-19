export type BusinessType = 'salon' | 'barbershop' | 'spa' | 'trainer' | 'other';
export type MemberRole = 'owner' | 'manager' | 'staff';

export interface Business {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  updated_at: string;
}

export interface BusinessWithRole extends Business {
  role: MemberRole;
}

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
