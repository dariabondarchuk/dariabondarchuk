import type { Document } from '../types';

/** Ключ для сопоставления одного и того же файла в разных типах/разделах */
export function documentDedupeKey(doc: Pick<Document, 'name' | 'filePath'>): string | null {
  const path = doc.filePath?.trim();
  if (path) {
    const base = path.replace(/\\/g, '/').split('/').pop()?.trim().toLowerCase();
    if (base) return `file:${base}`;
  }
  const name = doc.name?.trim().toLowerCase();
  return name ? `name:${name}` : null;
}

export function collectRegisteredDedupeKeys(
  documents: Document[],
  companyId: number,
  registeredTypes: ReadonlySet<string>,
): Set<string> {
  const keys = new Set<string>();
  for (const doc of documents) {
    if (doc.companyId !== companyId || !registeredTypes.has(doc.type)) continue;
    const key = documentDedupeKey(doc);
    if (key) keys.add(key);
  }
  return keys;
}

export function isDuplicateOfRegistered(
  doc: Document,
  companyId: number,
  registeredTypes: ReadonlySet<string>,
  registeredKeys: ReadonlySet<string>,
  registeredIds: ReadonlySet<number>,
): boolean {
  if (doc.companyId !== companyId) return false;
  if (registeredTypes.has(doc.type) || registeredIds.has(doc.id)) return true;
  const key = documentDedupeKey(doc);
  return Boolean(key && registeredKeys.has(key));
}
