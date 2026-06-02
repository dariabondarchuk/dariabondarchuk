export const MAIN_ANKETA_NAMES: Record<string, string> = {
  company: 'Информация о компании',
  responsible: 'Ответственные за обработку и защиту ПДн',
  sites: 'Сайты и мобильные приложения',
  departments: 'Отделы и должности, работающие с персональными данными',
};

export function isValidAnketaType(type: string) {
  return type in MAIN_ANKETA_NAMES;
}
