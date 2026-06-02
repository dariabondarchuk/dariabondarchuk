export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  accepted: { label: 'Принята', color: 'green' },
  review: { label: 'На проверке', color: 'yellow' },
  not_sent: { label: 'Не отправлена', color: 'default' },
  sent: { label: 'Отправлена', color: 'blue' },
  filling: { label: 'Заполняется', color: 'orange' },
  returned: { label: 'Возвращена', color: 'red' },
  submitted: { label: 'Подано', color: 'green' },
  not_submitted: { label: 'Не подано', color: 'red' },
  needs_update: { label: 'Требует обновления', color: 'orange' },
  new: { label: 'Новый', color: 'blue' },
  in_progress: { label: 'В работе', color: 'orange' },
  closed: { label: 'Закрыт', color: 'green' },
  filled: { label: 'Заполнено', color: 'green' },
  not_filled: { label: 'Не заполнено', color: 'default' },
};

export const SECTION_NAMES: Record<number, string> = {
  1: 'Информация о процессе',
  2: 'Цель обработки и физ. лица',
  3: 'Сотрудники и отделы',
  4: 'Источники ПДн',
  5: 'Перечень данных, основания, сроки',
  6: 'Хранение бумажных документов',
  7: 'Информационные системы',
  8: 'Третьи лица',
  9: 'Дополнительная информация',
};

export const EVENT_TYPES: Record<string, string> = {
  ceo_change: 'Смена ген. директора',
  address_change: 'Изменение юр. адреса',
  okved_change: 'Изменение ОКВЭД',
  kpp_change: 'Изменение КПП',
  contact_change: 'Изменение контактов',
};

export const TAG_COLOR_MAP: Record<string, string> = {
  green: 'success',
  yellow: 'warning',
  red: 'error',
  blue: 'processing',
  gray: 'default',
  orange: 'warning',
  default: 'default',
};
