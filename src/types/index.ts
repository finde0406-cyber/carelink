export type UserRole = 'family' | 'caregiver' | 'specialist'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  region?: string
  created_at: string
}

export interface CaregiverProfile {
  id: string
  user_id: string
  license_number: string
  license_type: string
  experience_years: number
  bio: string
  hourly_rate: number
  region: string
  available: boolean
  rating: number
  review_count: number
  profile: Profile
}

export interface BookingRequest {
  id: string
  family_id: string
  caregiver_id: string
  start_date: string
  end_date: string
  hours_per_day: number
  care_type: string
  notes?: string
  status: 'pending' | 'accepted' | 'rejected' | 'completed'
  total_amount: number
  created_at: string
}
