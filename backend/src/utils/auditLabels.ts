export const ENTITY_LABELS: Record<string, string> = {
  Company: 'Компания',
  CompanyResponsible: 'Ответственный',
  Process: 'Процесс',
  ProcessSection: 'Раздел процесса',
  ProcessInvite: 'Приглашение к процессу',
  AnketaInvite: 'Приглашение к анкете',
  JournalEntry: 'Обращение субъекта ПДн',
  RknNotification: 'Уведомление РКН',
  RknDocument: 'Документ РКН',
  GeneratedDocument: 'Документ',
  MonitorEvent: 'Уведомление (мониторинг)',
  EgrulCheck: 'Проверка ЕГРЮЛ',
  System: 'Система',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Создание',
  UPDATE: 'Изменение',
  DELETE: 'Удаление',
  VERIFY: 'Проверка DPO',
  SYNC_DADATA: 'Синхронизация с DaData',
  DADATA_AUTO_SYNC: 'Обновление из DaData',
  DADATA_EGRUL_CHANGE: 'Изменение в ЕГРЮЛ',
  DADATA_EGRUL_CHECK: 'Проверка изменений ЕГРЮЛ',
  UPDATE_ANKETA_LABEL: 'Переименование анкеты',
  DELETE_ANKETA: 'Удаление анкеты',
  NEW_VERSION: 'Новая версия',
  UPLOAD_ADDITIONAL: 'Загрузка файлов',
  DELETE_FILE: 'Удаление файла',
  DELETE_ADDITIONAL: 'Удаление доп. файла',
  SAVE_ANKETA_DRAFT: 'Сохранение черновика анкеты',
  SUBMIT_ANKETA: 'Отправка анкеты',
  UPDATE_SURVEY_SECTION: 'Сохранение раздела опроса',
  SUBMIT_SURVEY: 'Отправка опроса на проверку',
  PREFILL_FROM_ANKETY: 'Подстановка из анкет',
};

function pickStr(obj: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function buildSummary(entityType: string, action: string, changes: unknown): string {
  const c = (changes && typeof changes === 'object' && !Array.isArray(changes))
    ? (changes as Record<string, unknown>)
    : {};

  if (action === 'DADATA_EGRUL_CHECK') {
    const checked = c.checked ?? '—';
    const changed = c.changed ?? 0;
    const events = c.eventsCount ?? 0;
    return `Проверено компаний: ${checked}, с изменениями: ${changed}, уведомлений: ${events}`;
  }

  if (action === 'DADATA_EGRUL_CHANGE' && Array.isArray(c.changes)) {
    return `Поля: ${(c.changes as string[]).join(', ')}`;
  }

  const name = pickStr(c, ['name', 'fileName', 'sender', 'anketaType', 'email']);
  const inn = pickStr(c, ['inn']);
  const query = pickStr(c, ['query']);

  if (action === 'CREATE' && entityType === 'Company') {
    return inn ? `ИНН ${inn}` : name || 'Новая компания';
  }

  if (action === 'SYNC_DADATA' || action === 'DADATA_AUTO_SYNC') {
    return query ? `Запрос: ${query}` : 'Обновление реквизитов';
  }

  if (entityType === 'JournalEntry' && c.sender) {
    return `Заявитель: ${c.sender}`;
  }

  if (entityType === 'Process' || entityType === 'ProcessSection') {
    if (c.sectionNumber) return `Раздел №${c.sectionNumber}`;
    if (name) return name;
  }

  if (entityType === 'AnketaInvite' && c.anketaType) {
    return `Тип: ${c.anketaType}${c.email ? `, ${c.email}` : ''}`;
  }

  if (c.source === 'public_link') {
    return pickStr(c, ['email', 'anketaType']) || 'Публичная ссылка';
  }

  if (name) return name;
  if (inn) return `ИНН ${inn}`;

  const keys = Object.keys(c);
  if (keys.length === 0) return '';
  if (keys.length <= 3) {
    return keys.map(k => `${k}: ${String(c[k]).slice(0, 80)}`).join('; ');
  }
  return `${keys.length} полей`;
}

export function formatAuditLogRow(log: {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  changes: unknown;
  ipAddress: string | null;
  createdAt: Date;
  user: { id: number; email: string; name: string } | null;
}) {
  return {
    id: log.id,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action,
    entityLabel: ENTITY_LABELS[log.entityType] ?? log.entityType,
    actionLabel: ACTION_LABELS[log.action] ?? log.action,
    summary: buildSummary(log.entityType, log.action, log.changes),
    changes: log.changes,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt.toISOString(),
    user: log.user
      ? { id: log.user.id, name: log.user.name, email: log.user.email }
      : null,
  };
}
