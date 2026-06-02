export const PDN_DOCUMENT_TYPES = [
  { type: 'policy', name: 'Положение об обработке персональных данных' },
  { type: 'consent', name: 'Согласие на обработку персональных данных' },
  { type: 'employee_notice', name: 'Уведомление работников об обработке ПДн' },
  { type: 'order_appointment', name: 'Приказ о назначении ответственного за обработку ПДн' },
  { type: 'access_rules', name: 'Регламент доступа к персональным данным' },
  { type: 'retention', name: 'Политика хранения и уничтожения ПДн' },
  { type: 'other', name: 'Иной документ по ПДн' },
] as const;

export const THREAT_DOCUMENT_TYPES = [
  { type: 'threat_model', name: 'Модель угроз (общая)' },
  { type: 'threat_assessment', name: 'Оценка актуальности угроз' },
  { type: 'security_measures', name: 'План мероприятий по защите' },
  { type: 'threat_other', name: 'Иной документ модели угроз' },
] as const;

export const ANKETA_STATUS_HINTS: Record<string, string> = {
  not_filled: 'Анкета не заполнена и ссылка не отправлена',
  sent: 'Ссылка отправлена — ожидается заполнение',
  filling: 'Заполнение начато, данные неполные',
  need_check: 'Заполнена по ссылке — требуется проверка DPO',
  filled: 'Анкета заполнена',
  verified: 'Проверено DPO',
};
