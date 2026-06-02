export interface DepartmentsAnketaData {
  departmentsInfo: string;
  contactEmail: string;
}

export function parseDepartmentsInfo(text: string): { name: string; address: string }[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parts = trimmed.includes(';')
    ? trimmed.split(';')
    : trimmed.split('\n');

  return parts
    .map(s => s.trim())
    .filter(Boolean)
    .map(line => {
      const [name, address] = line.split('|').map(x => x.trim());
      return { name: name || line, address: address || '' };
    });
}

export function normalizeDepartmentsAnketaData(data: Record<string, unknown>): DepartmentsAnketaData {
  if (Array.isArray(data.offices)) {
    const offices = data.offices as { name?: string }[];
    return {
      departmentsInfo: offices.map(o => o.name?.trim()).filter(Boolean).join('; '),
      contactEmail: String(data.contactEmail || '').trim(),
    };
  }

  return {
    departmentsInfo: String(data.departmentsInfo || '').trim(),
    contactEmail: String(data.contactEmail || '').trim(),
  };
}
