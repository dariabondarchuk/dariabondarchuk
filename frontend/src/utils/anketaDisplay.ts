export type AnketaDisplayStatus = 'filled' | 'not_filled' | 'partial';

export const ANKETA_DISPLAY_STATUS_LABELS: Record<AnketaDisplayStatus, string> = {
  filled: 'Заполнено',
  not_filled: 'Не заполнено',
  partial: 'Частично заполнено',
};

export type AnketaRawStatus =
  | 'not_filled'
  | 'sent'
  | 'filling'
  | 'filled'
  | 'need_check'
  | 'verified';

export const ANKETA_RAW_STATUS_LABELS: Record<AnketaRawStatus, string> = {
  not_filled: 'Не заполнено',
  sent: 'Отправлена',
  filling: 'Частично заполнено',
  filled: 'Заполнено',
  need_check: 'Заполнена и отправлена на проверку',
  verified: 'Проверено',
};

export function getAnketaStatusLabel(rawStatus: string): string {
  return ANKETA_RAW_STATUS_LABELS[rawStatus as AnketaRawStatus] ?? rawStatus;
}

export function formatAnketaDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU');
}

export function getProcessFillStatus(process: {
  sections: Record<number, { status?: string }>;
}): AnketaDisplayStatus {
  const sections = Object.values(process.sections ?? {});
  if (!sections.length) return 'not_filled';
  const filledCount = sections.filter(s => s.status === 'filled').length;
  if (filledCount === sections.length) return 'filled';
  if (filledCount === 0 && sections.every(s => !s.status || s.status === 'not_filled')) {
    return 'not_filled';
  }
  return 'partial';
}

export function filterProcessTags(tags: string[]): string[] {
  return tags.filter(t => t !== 'Анкета');
}
