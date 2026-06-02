export const ANKETA_TEMPLATES = [
  {
    anketaType: 'company',
    name: 'Информация о компании',
    description: 'Реквизиты, контакты, сведения об операторе ПДн',
  },
  {
    anketaType: 'responsible',
    name: 'Ответственные за обработку и защиту ПДн',
    description: 'ФИО, должность и полномочия ответственного лица',
  },
  {
    anketaType: 'sites',
    name: 'Сайты и мобильные приложения',
    description: 'Перечень сайтов, приложений и наличие справочников',
  },
  {
    anketaType: 'departments',
    name: 'Отделы и должности',
    description: 'Подразделения и роли, работающие с персональными данными',
  },
] as const;

export type AnketaTemplateType = (typeof ANKETA_TEMPLATES)[number]['anketaType'];
