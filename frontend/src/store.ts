import type { AppAction, AppState } from './types';

export const initialState: AppState = {
  companies: [],
  responsibles: [],
  processes: [],
  rknNotifications: [],
  journalEntries: [],
  monitorEvents: [],
  documents: [],
  nextId: 1,
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
    case 'ADD_JOURNAL_FROM_API':
      return { ...state, journalEntries: [...state.journalEntries, action.entry] };
    case 'UPDATE_JOURNAL':
      return { ...state, journalEntries: state.journalEntries.map(j => j.id === action.id ? { ...j, ...action.data } : j) };
    case 'REPLACE_JOURNAL_ENTRY':
      return { ...state, journalEntries: state.journalEntries.map(j => j.id === action.entry.id ? action.entry : j) };
    case 'SET_RKN_NOTIFICATIONS':
      return { ...state, rknNotifications: action.items };
    case 'MARK_READ':
      return { ...state, monitorEvents: state.monitorEvents.map(e => e.id === action.id ? { ...e, read: true } : e) };
    case 'ADD_MONITOR_FROM_API':
      return { ...state, monitorEvents: [action.event, ...state.monitorEvents] };
    case 'PREPEND_MONITOR_EVENTS': {
      const existingIds = new Set(state.monitorEvents.map(e => e.id));
      const fresh = action.events.filter(e => !existingIds.has(e.id));
      return { ...state, monitorEvents: [...fresh, ...state.monitorEvents] };
    }
    case 'PATCH_COMPANIES':
      return {
        ...state,
        companies: state.companies.map(c => {
          const patch = action.companies.find(u => u.id === c.id);
          return patch ? { ...c, ...patch } : c;
        }),
      };
    case 'ADD_COMPANY_FROM_API':
      return {
        ...state,
        companies: [...state.companies, action.company],
        rknNotifications: [...state.rknNotifications, action.rknNotification],
      };
    case 'REMOVE_COMPANY':
      return {
        ...state,
        companies: state.companies.filter(c => c.id !== action.id),
        responsibles: state.responsibles.filter(r => r.companyId !== action.id),
        processes: state.processes.filter(p => p.companyId !== action.id),
        rknNotifications: state.rknNotifications.filter(n => n.companyId !== action.id),
        journalEntries: state.journalEntries.filter(j => j.companyId !== action.id),
        monitorEvents: state.monitorEvents.filter(e => e.companyId !== action.id),
        documents: state.documents.filter(d => d.companyId !== action.id),
      };
    case 'ADD_DOCUMENT_FROM_API':
      return { ...state, documents: [...state.documents, action.document] };
    case 'REMOVE_DOCUMENT':
      return { ...state, documents: state.documents.filter(d => d.id !== action.id) };
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
