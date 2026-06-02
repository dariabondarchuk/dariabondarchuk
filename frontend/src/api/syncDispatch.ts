import type { Dispatch } from 'react';
import type { AppAction, JournalEntry, Process } from '../types';
import { apiActions } from './client';

export async function syncAction(action: AppAction, dispatch: Dispatch<AppAction>) {
  switch (action.type) {
    case 'HYDRATE':
    case 'UPDATE_PROCESS_SECTION':
      dispatch(action);
      return;

    case 'UPDATE_COMPANY': {
      dispatch(action);
      if (localStorage.getItem('token') !== 'mock-dev-token') {
        await apiActions.updateCompany(action.id, action.data);
      }
      return;
    }

    case 'UPDATE_RESPONSIBLE': {
      dispatch(action);
      if (localStorage.getItem('token') !== 'mock-dev-token') {
        const companyId = action.data.companyId!;
        const { data } = await apiActions.updateResponsible(companyId, action.data);
        dispatch({ type: 'UPDATE_RESPONSIBLE', id: data.id, data });
      }
      return;
    }

    case 'ADD_PROCESS': {
      if (localStorage.getItem('token') === 'mock-dev-token') {
        dispatch(action);
        return;
      }
      const { data } = await apiActions.addProcess(action.companyId, action.name);
      dispatch({ type: 'ADD_PROCESS_FROM_API', process: data as Process });
      return;
    }

    case 'ADD_JOURNAL': {
      if (localStorage.getItem('token') === 'mock-dev-token') {
        if (action.entry) dispatch({ type: 'ADD_JOURNAL', entry: action.entry });
        return;
      }
      const formData = action.formData;
      if (!formData) return;
      const { data } = await apiActions.addJournal(formData);
      dispatch({
        type: 'ADD_JOURNAL_FROM_API',
        entry: {
          id: data.id,
          companyId: data.companyId,
          type: (formData.get('type') as string) || 'subject',
          dateIn: (formData.get('dateIn') as string) || '',
          dateOut: '',
          sender: data.sender,
          content: data.content,
          answer: data.answer || '',
          status: (formData.get('status') as string) || 'new',
        } as JournalEntry,
      });
      return;
    }

    case 'UPDATE_JOURNAL': {
      dispatch(action);
      if (localStorage.getItem('token') !== 'mock-dev-token') {
        await apiActions.updateJournal(action.id, action.data);
      }
      return;
    }

    case 'MARK_READ': {
      dispatch(action);
      if (localStorage.getItem('token') !== 'mock-dev-token') {
        await apiActions.markRead(action.id);
      }
      return;
    }

    case 'SAVE_PROCESS_SECTION': {
      if (localStorage.getItem('token') === 'mock-dev-token') {
        dispatch(action);
        return;
      }
      const { data } = await apiActions.updateProcessSection(
        action.processId,
        action.section,
        action.status,
        action.data,
      );
      dispatch({ type: 'REPLACE_PROCESS', process: data as Process });
      return data;
    }

    default:
      dispatch(action);
  }
}
