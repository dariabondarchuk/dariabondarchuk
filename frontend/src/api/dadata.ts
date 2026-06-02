import api from './client';
import type { Company } from '../types';

export type CompanyDadataPatch = Pick<
  Company,
  'inn' | 'ogrn' | 'okved' | 'name' | 'shortName' | 'ceo' | 'ceoPosition' | 'phone' | 'email' | 'legalAddress' | 'postalAddress' | 'city'
>;

export async function lookupPartyByInn(query: string): Promise<CompanyDadataPatch> {
  const { data } = await api.post<CompanyDadataPatch>('/dadata/party', { query, branch_type: 'MAIN' });
  return data;
}

export async function syncCompanyFromDadata(companyId: number, query?: string): Promise<Company> {
  const { data } = await api.post<Company>(`/companies/${companyId}/sync-dadata`, {
    query,
    branch_type: 'MAIN',
  });
  return data;
}
