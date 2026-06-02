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
  waiting_answer: { label: 'Ожидается ответ', color: 'orange' },
  answered: { label: 'Ответ дан', color: 'green' },
  in_progress: { label: 'В работе', color: 'orange' },
  closed: { label: 'Закрыт', color: 'green' },
  need_check: { label: 'Нужно проверить', color: 'orange' },
  verified: { label: 'Проверено', color: 'green' },
  filled: { label: 'Заполнено', color: 'green' },
  not_filled: { label: 'Не заполнено', color: 'default' },
};

export const MAIN_ANKETA_NAMES: Record<string, string> = {
  company: 'Информация о компании',
  responsible: 'Ответственные за обработку и защиту ПДн',
  sites: 'Сайты и мобильные приложения',
  departments: 'Отделы и должности, работающие с персональными данными',
};

export const SECTION_NAMES: Record<number, string> = {
  1: 'Информация о процессе',
  2: 'Цель обработки и физические лица, чьи данные обрабатываются',
  3: 'Сотрудники и отделы, участвующие в процессе',
  4: 'Источники получения персональных данных',
  5: 'Перечень обрабатываемых данных, законное основание, действия с ними и сроки их обработки',
  6: 'Хранение бумажных документов с персональными данными',
  7: 'Информационные системы персональных данных',
  8: 'Третьи лица, которым передаются или от которых получаются персональные данные',
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
