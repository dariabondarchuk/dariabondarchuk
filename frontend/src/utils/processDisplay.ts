import type { Process } from '../types';

export const NEW_PROCESS_LABEL = 'Новый процесс';

export function getProcessDisplayName(process: Process): string {
  const name = process.name?.trim();
  if (name && name !== NEW_PROCESS_LABEL) return name;
  const description = process.sections[1]?.data?.description;
  if (typeof description === 'string' && description.trim()) {
    return description.trim().split('\n')[0].trim();
  }
  return name || NEW_PROCESS_LABEL;
}
