const DADATA_FIND_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party';
const DADATA_SUGGEST_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party';

export interface DadataPartyRequest {
  query: string;
  branch_type?: 'MAIN' | 'BRANCH';
  type?: 'LEGAL' | 'INDIVIDUAL';
  kpp?: string;
}

interface DadataName {
  full_with_opf?: string | null;
  short_with_opf?: string | null;
}

interface DadataAddress {
  value?: string | null;
  data?: { city?: string | null; settlement?: string | null } | null;
}

interface DadataManagement {
  name?: string | null;
  post?: string | null;
}

interface DadataContact {
  value?: string | null;
}

interface DadataPartyData {
  inn?: string | null;
  ogrn?: string | null;
  okved?: string | null;
  name?: DadataName | null;
  address?: DadataAddress | null;
  management?: DadataManagement | null;
  phones?: DadataContact[] | null;
  emails?: DadataContact[] | null;
}

export interface CompanyDadataPatch {
  inn: string;
  ogrn: string;
  okved: string;
  name: string;
  shortName: string;
  ceo: string;
  ceoPosition: string;
  phone: string;
  email: string;
  legalAddress: string;
  postalAddress: string;
  city: string;
}

function pickCity(address: DadataAddress | null | undefined) {
  const data = address?.data;
  return (data?.city || data?.settlement || '').trim();
}

function pickContact(items: DadataContact[] | null | undefined) {
  return items?.find(item => item.value?.trim())?.value?.trim() ?? '';
}

export function mapDadataPartyToCompany(data: DadataPartyData): CompanyDadataPatch {
  const legalAddress = data.address?.value?.trim() ?? '';
  const city = pickCity(data.address);

  return {
    inn: data.inn?.trim() ?? '',
    ogrn: data.ogrn?.trim() ?? '',
    okved: data.okved?.trim() ?? '',
    name: data.name?.full_with_opf?.trim() ?? '',
    shortName: data.name?.short_with_opf?.trim() ?? data.name?.full_with_opf?.trim() ?? '',
    ceo: data.management?.name?.trim() ?? '',
    ceoPosition: data.management?.post?.trim() ?? '',
    phone: pickContact(data.phones),
    email: pickContact(data.emails),
    legalAddress,
    postalAddress: legalAddress,
    city,
  };
}

function isInnOrOgrnQuery(query: string) {
  return /^[\d/]+$/.test(query);
}

function dadataHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Token ${apiKey}`,
  };
  const secret = process.env.DADATA_SECRET_KEY?.trim();
  if (secret) headers['X-Secret'] = secret;
  return headers;
}

async function parseDadataError(response: Response): Promise<string> {
  let message = `DaData вернула ошибку ${response.status}`;
  try {
    const err = await response.json() as { message?: string; reason?: string };
    if (err.message) {
      message = err.message.replace(/\.\s*$/, '');
      if (err.reason === 'Forbidden' && err.message.includes('SUGGESTIONS')) {
        message += '. Включите API «Подсказки» для токена в личном кабинете DaData';
      }
    }
  } catch {
    const text = await response.text().catch(() => '');
    if (text) message = text;
  }
  return message;
}

async function callDadata(url: string, body: object, apiKey: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: dadataHeaders(apiKey),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseDadataError(response));
  }

  return response.json() as Promise<{ suggestions?: Array<{ data?: DadataPartyData }> }>;
}

export async function findPartyByQuery(params: DadataPartyRequest): Promise<CompanyDadataPatch> {
  const apiKey = process.env.DADATA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('DADATA_API_KEY не настроен');
  }

  const query = params.query.trim();
  if (!query) {
    throw new Error('Укажите ИНН, ОГРН или название организации');
  }

  let payload: { suggestions?: Array<{ data?: DadataPartyData }> };

  if (isInnOrOgrnQuery(query)) {
    const body: Record<string, string> = {
      query,
      branch_type: params.branch_type ?? 'MAIN',
    };
    if (params.type) body.type = params.type;
    if (params.kpp) body.kpp = params.kpp;
    payload = await callDadata(DADATA_FIND_URL, body, apiKey);
  } else {
    payload = await callDadata(DADATA_SUGGEST_URL, { query, count: 1 }, apiKey);
  }

  const party = payload.suggestions?.[0]?.data;
  if (!party) {
    throw new Error('Организация не найдена');
  }

  return mapDadataPartyToCompany(party);
}
