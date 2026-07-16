export type GeocodedAddress = {
  address: string;
  country: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
};

export type OfficeLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string | null;
  city: string | null;
  district: string | null;
  street: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type OfficeLocationPayload = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string | null;
  city?: string | null;
  district?: string | null;
  street?: string | null;
};
