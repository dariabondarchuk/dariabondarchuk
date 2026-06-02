import type { CompanyDadataPatch } from '../api/dadata';

export function dadataToAnketaFormValues(
  anketaType: string,
  data: CompanyDadataPatch,
): Record<string, unknown> {
  switch (anketaType) {
    case 'company':
      return {
        inn: data.inn,
        ogrn: data.ogrn,
        okved: data.okved,
        name: data.name,
        shortName: data.shortName,
        phone: data.phone,
        email: data.email,
        ceo: data.ceo,
        ceoPosition: data.ceoPosition,
        legalAddress: data.legalAddress,
        postalAddress: data.postalAddress,
        city: data.city,
      };
    case 'responsible':
      return {
        phone: data.phone || undefined,
        email: data.email || undefined,
      };
    case 'sites':
      return {
        contactEmail: data.email || undefined,
      };
    case 'departments':
      return {
        contactEmail: data.email || undefined,
      };
    default:
      return {};
  }
}
