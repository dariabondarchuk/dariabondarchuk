import type { AppAction, AppState } from './types';

export const initialState: AppState = {
  companies: [
    { id: 1, name: 'ПАО «Самолёт»', shortName: 'ПАО Самолёт', inn: '5024178470', ogrn: '1155024003820', okved: '41.20', activity: 'Строительство', ceo: 'Антонов М.А.', ceoPosition: 'Генеральный директор', phone: '+7(495)150-51-51', email: 'info@samolet.ru', legalAddress: '143421, МО, Красногорский р-н, автодорога Балтия, 26 км', postalAddress: '', city: 'Красногорск', pdStartDate: '2015-04-01', isOperator: true, hasCrossBorder: false, contactEmail: 'e.mayer@samolet.ru', offices: [{ name: 'Головной офис', address: 'г. Москва, ул. 2-я Звенигородская, д. 13, стр. 42' }], sites: [{ name: 'samolet.ru', url: 'https://samolet.ru' }], apps: [{ name: 'Самолёт+', url: 'https://apps.apple.com/samolet' }] },
    { id: 2, name: 'ООО «Самолёт Девелопмент»', shortName: 'Самолёт Дев', inn: '7709876543', ogrn: '', okved: '41.20', activity: 'Строительство', ceo: '', ceoPosition: '', phone: '', email: '', legalAddress: '', postalAddress: '', city: '', pdStartDate: '', isOperator: false, hasCrossBorder: false, contactEmail: '', offices: [], sites: [], apps: [] },
    { id: 3, name: 'ООО «Самолёт Плюс»', shortName: 'Самолёт Плюс', inn: '5024198765', ogrn: '', okved: '62.01', activity: 'IT', ceo: '', ceoPosition: '', phone: '', email: '', legalAddress: '', postalAddress: '', city: '', pdStartDate: '', isOperator: false, hasCrossBorder: false, contactEmail: '', offices: [], sites: [], apps: [] },
  ],
  responsibles: [
    { id: 1, companyId: 1, role: 'organizer', fio: 'Майер Е.В.', position: 'DPO', email: 'e.mayer@samolet.ru', phone: '+7(495)150-51-52', isSecurity: true, controlsCompliance: true, informsEmployees: true, handlesRequests: true },
  ],
  processes: [
    { id: 1, companyId: 1, name: 'Доставка товара клиентам', tags: ['Клиенты'], status: 'accepted', sentTo: 'Петров И.В.', sentAt: '10.04.2026', sections: { 1: { status: 'filled', data: { description: 'Организация доставки товаров клиентам', contactName: 'Петров И.В.', contactPosition: 'Начальник отдела логистики', contactEmail: 'petrov@samolet.ru' } }, 2: { status: 'filled', data: { macroGoal: 'Ведение основной деятельности', goal: 'Доставка товара клиентам', persons: 'Клиенты', count: 'less100k', hasIncapable: false } }, 3: { status: 'not_filled', data: {} }, 4: { status: 'filled', data: { sources: ['От субъекта', 'Из ИС'] } }, 5: { status: 'filled', data: { pdCategories: ['ФИО', 'адрес доставки', 'телефон', 'email'], specialCategories: false, biometric: false, consentRequired: true, legalBasis: 'Договор', actions: ['сбор', 'хранение', 'передача'], retentionPeriod: '5 лет' } }, 6: { status: 'filling', data: {} }, 7: { status: 'filling', data: {} }, 8: { status: 'filled', data: { thirdParties: ['Курьерская служба'] } }, 9: { status: 'filled', data: {} } } },
    { id: 2, companyId: 1, name: 'Кадровый учёт', tags: ['HR'], status: 'review', sentTo: 'Сидорова А.К.', sentAt: '08.04.2026', sections: { 1: { status: 'filled', data: { description: 'Ведение кадрового делопроизводства', contactName: 'Сидорова А.К.', contactPosition: 'Начальник HR', contactEmail: 'sidorova@samolet.ru' } }, 2: { status: 'filled', data: { macroGoal: 'Управление персоналом', goal: 'Ведение кадрового учёта', persons: 'Сотрудники', count: 'less10k', hasIncapable: false } }, 3: { status: 'not_filled', data: {} }, 4: { status: 'filled', data: { sources: ['От субъекта'] } }, 5: { status: 'filled', data: { pdCategories: ['ФИО', 'паспорт', 'СНИЛС', 'ИНН', 'адрес', 'телефон'], specialCategories: false, biometric: false, consentRequired: true, legalBasis: 'Трудовой договор', actions: ['сбор', 'хранение', 'систематизация'], retentionPeriod: '75 лет' } }, 6: { status: 'not_filled', data: {} }, 7: { status: 'not_filled', data: {} }, 8: { status: 'not_filled', data: {} }, 9: { status: 'not_filled', data: {} } } },
    { id: 3, companyId: 1, name: 'Маркетинговые рассылки', tags: ['Маркетинг'], status: 'not_sent', sentTo: '', sentAt: '', sections: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, { status: 'not_filled', data: {} }])) },
    { id: 4, companyId: 1, name: 'Бухгалтерский учёт', tags: ['Финансы'], status: 'accepted', sentTo: 'Козлов Д.М.', sentAt: '05.04.2026', sections: { 1: { status: 'filled', data: { description: 'Расчёт заработной платы и отчётность' } }, 2: { status: 'filled', data: { macroGoal: 'Финансовый учёт', goal: 'Расчёт зарплаты', persons: 'Сотрудники', count: 'less10k' } }, 3: { status: 'filled', data: {} }, 4: { status: 'filled', data: {} }, 5: { status: 'filled', data: {} }, 6: { status: 'not_filled', data: {} }, 7: { status: 'filled', data: {} }, 8: { status: 'not_filled', data: {} }, 9: { status: 'filled', data: {} } } },
    { id: 5, companyId: 1, name: 'Видеонаблюдение', tags: ['Безопасность'], status: 'returned', sentTo: 'Иванов П.С.', sentAt: '01.04.2026', sections: { 1: { status: 'filled', data: { description: 'Обеспечение безопасности объектов' } }, 2: { status: 'filling', data: {} }, 3: { status: 'not_filled', data: {} }, 4: { status: 'not_filled', data: {} }, 5: { status: 'not_filled', data: {} }, 6: { status: 'not_filled', data: {} }, 7: { status: 'not_filled', data: {} }, 8: { status: 'not_filled', data: {} }, 9: { status: 'not_filled', data: {} } } },
  ],
  rknNotifications: [
    { id: 1, companyId: 1, dateSubmit: '15.01.2026', dateChange: '10.04.2026', status: 'submitted', files: [{ name: 'Уведомление_ПАО_Самолёт_15012026.pdf', date: '15.01.2026', current: true }, { name: 'Уведомление_ПАО_Самолёт_10012025.pdf', date: '10.01.2025', current: false }] },
    { id: 2, companyId: 2, dateSubmit: '20.02.2026', dateChange: '20.02.2026', status: 'submitted', files: [{ name: 'Уведомление_СамолётДев_20022026.pdf', date: '20.02.2026', current: true }] },
    { id: 3, companyId: 3, dateSubmit: '', dateChange: '', status: 'not_submitted', files: [] },
  ],
  journalEntries: [
    { id: 1, companyId: 1, type: 'subject', dateIn: '12.04.2026', dateOut: '15.04.2026', sender: 'Иванов А.П.', content: 'Запрос на предоставление информации об обрабатываемых ПДн', answer: 'Предоставлена выписка из реестра процессов обработки ПДн', status: 'closed' },
    { id: 2, companyId: 2, type: 'subject', dateIn: '08.04.2026', dateOut: '12.04.2026', sender: 'Петрова М.И.', content: 'Запрос на удаление ПДн из системы рассылок', answer: 'ПДн удалены, уведомление направлено субъекту', status: 'closed' },
    { id: 3, companyId: 1, type: 'subject', dateIn: '01.04.2026', dateOut: '', sender: 'Сергеев К.Л.', content: 'Запрос на уточнение целей обработки ПДн', answer: '', status: 'in_progress' },
    { id: 4, companyId: 1, type: 'rkn', dateIn: '20.03.2026', dateOut: '25.03.2026', sender: 'РКН (Управление по ЦФО)', content: 'Запрос о соответствии порядка обработки ПДн требованиям 152-ФЗ', answer: 'Направлен ответ с приложением документов', status: 'closed' },
    { id: 5, companyId: 2, type: 'rkn', dateIn: '15.02.2026', dateOut: '20.02.2026', sender: 'РКН (Управление по ЦФО)', content: 'Уведомление о проведении плановой проверки', answer: 'Подготовлен пакет документов для проверки', status: 'closed' },
  ],
  monitorEvents: [
    { id: 1, date: '18.04.2026', companyId: 3, type: 'ceo_change', old: 'Козлов А.В.', newVal: 'Морозова Е.С.', read: false },
    { id: 2, date: '15.04.2026', companyId: 1, type: 'address_change', old: 'г. Москва, ул. Ленина, 10', newVal: 'г. Москва, ул. Тверская, 25', read: false },
    { id: 3, date: '10.04.2026', companyId: 2, type: 'okved_change', old: '41.20', newVal: '41.20, 68.10', read: true },
    { id: 4, date: '05.04.2026', companyId: 2, type: 'kpp_change', old: '770901001', newVal: '770401001', read: true },
    { id: 5, date: '01.04.2026', companyId: 1, type: 'contact_change', old: '+7(495)111-22-33', newVal: '+7(495)444-55-66', read: true },
  ],
  documents: [
    { id: 1, companyId: 1, name: 'Протокол собранной информации', type: 'protocol' },
    { id: 2, companyId: 1, name: 'Перечень процессов', type: 'process_list' },
    { id: 3, companyId: 1, name: 'Перечень систем', type: 'systems_list' },
    { id: 4, companyId: 1, name: 'Форма согласия на обработку ПДн', type: 'consent_form' },
    { id: 5, companyId: 1, name: 'Соглашения о безопасности ПДн (Поручения)', type: 'security_agreement' },
    { id: 6, companyId: 1, name: 'Акт определения уровня защищённости', type: 'protection_act' },
    { id: 7, companyId: 1, name: 'Уведомление', type: 'notification' },
    { id: 8, companyId: 1, name: 'Политика конфиденциальности', type: 'privacy_policy' },
  ],
  nextId: 100,
};

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.data };
    case 'UPDATE_COMPANY':
      return { ...state, companies: state.companies.map(c => c.id === action.id ? { ...c, ...action.data } : c) };
    case 'UPDATE_PROCESS_SECTION':
      return {
        ...state,
        processes: state.processes.map(p => p.id === action.processId ? {
          ...p,
          sections: {
            ...p.sections,
            [action.section]: {
              status: action.status || p.sections[action.section]?.status || 'not_filled',
              data: { ...(p.sections[action.section]?.data || {}), ...action.data },
            },
          },
        } : p),
      };
    case 'UPDATE_PROCESS':
      return { ...state, processes: state.processes.map(p => p.id === action.id ? { ...p, ...action.data } : p) };
    case 'ADD_PROCESS': {
      const id = state.nextId;
      return {
        ...state,
        nextId: id + 1,
        processes: [...state.processes, {
          id, companyId: action.companyId, name: action.name || 'Новый процесс', tags: [], status: 'not_sent', sentTo: '', sentAt: '',
          sections: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, { status: 'not_filled', data: {} }])),
        }],
      };
    }
    case 'ADD_PROCESS_FROM_API':
      return { ...state, processes: [...state.processes, action.process] };
    case 'REPLACE_PROCESS':
      return { ...state, processes: state.processes.map(p => p.id === action.process.id ? action.process : p) };
    case 'ADD_JOURNAL': {
      const id = state.nextId;
      return { ...state, nextId: id + 1, journalEntries: [...state.journalEntries, { id, ...action.entry } as typeof state.journalEntries[0]] };
    }
    case 'ADD_JOURNAL_FROM_API':
      return { ...state, journalEntries: [...state.journalEntries, action.entry] };
    case 'UPDATE_JOURNAL':
      return { ...state, journalEntries: state.journalEntries.map(j => j.id === action.id ? { ...j, ...action.data } : j) };
    case 'MARK_READ':
      return { ...state, monitorEvents: state.monitorEvents.map(e => e.id === action.id ? { ...e, read: true } : e) };
    case 'UPDATE_RESPONSIBLE':
      return { ...state, responsibles: state.responsibles.map(r => r.id === action.id ? { ...r, ...action.data } : r) };
    case 'SAVE_PROCESS_SECTION':
      return {
        ...state,
        processes: state.processes.map(p => p.id === action.processId ? {
          ...p,
          sections: {
            ...p.sections,
            [action.section]: { status: action.status, data: action.data },
          },
        } : p),
      };
    default:
      return state;
  }
}
