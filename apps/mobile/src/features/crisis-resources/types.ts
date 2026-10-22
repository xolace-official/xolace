export type Resource = {
  type: 'phone' | 'url' | 'text' | 'email';
  source: 'crisis_line' | 'xolace_support' | 'text_support' | 'local_service' | 'online_resource';
  priority: number;
  label: string;
  value: string;
  description?: string;
};

export type CountryCode = 'GH' | 'US' | 'GB' | 'AU' | 'CA' | 'NG' | 'DE' | 'KE' | 'FR' | 'ZA';

export type CountryData = {
  name: string;
  flag: string;
  emergencyNumber: string;
  resources: Resource[];
};
