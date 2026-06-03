import axios from 'axios';
import type { Dispatch } from 'react';
import type { AppAction, Company, Document, JournalEntry, MonitorEvent, Process, RknNotification } from '../types';
import { apiActions } from './client';

export async function syncAction(action: AppAction, dispatch: Dispatch<AppAction>) {
  switch (action.type) {
    case 'HYDRATE':
    case 'UPDATE_PROCESS_SECTION':
      dispatch(action);
      return;

    case 'UPDATE_COMPANY': {
      dispatch(action);
      await apiActions.updateCompany(action.id, action.data);
      return;
    }

    case 'UPDATE_RESPONSIBLE': {
      dispatch(action);
      const companyId = action.data.companyId!;
      const { data } = await apiActions.updateResponsible(companyId, action.data);
      dispatch({ type: 'UPDATE_RESPONSIBLE', id: data.id, data });
      return;
    }

    case 'ADD_PROCESS': {
      const { data } = action.isCorporate
        ? await apiActions.addCorporateProcess(action.name)
        : await apiActions.addProcess({
            companyId: action.companyId,
            name: action.name,
            isCorporate: false,
          });
      const process = data as Process & { prefillAppliedSections?: number[] };
      dispatch({ type: 'ADD_PROCESS_FROM_API', process });
      return process;
    }

    case 'ADD_JOURNAL': {
      const formData = action.formData;
      if (!formData) return;
      const { data } = await apiActions.addJournal(formData);
      dispatch({ type: 'ADD_JOURNAL_FROM_API', entry: data as JournalEntry });
      return;
    }

    case 'UPDATE_JOURNAL': {
      const { data } = await apiActions.updateJournal(action.id, action.data);
      dispatch({ type: 'REPLACE_JOURNAL_ENTRY', entry: data as JournalEntry });
      return;
    }

    case 'MARK_READ': {
      dispatch(action);
      await apiActions.markRead(action.id);
      return;
    }

    case 'ADD_MONITOR': {
      const { data } = await apiActions.addMonitorEvent(action.data);
      dispatch({ type: 'ADD_MONITOR_FROM_API', event: data as MonitorEvent });
      return;
    }

    case 'SYNC_COMPANY_DADATA': {
      const { data } = await apiActions.syncCompanyFromDadata(action.id, action.query);
      dispatch({ type: 'UPDATE_COMPANY', id: action.id, data: data.company as Company });
      const events = (data.events ?? []) as MonitorEvent[];
      if (events.length) {
        dispatch({ type: 'PREPEND_MONITOR_EVENTS', events });
      }
      return { company: data.company as Company, events };
    }

    case 'ADD_COMPANY_DADATA': {
      const { data } = await apiActions.addCompanyFromDadata(action.query);
      dispatch({
        type: 'ADD_COMPANY_FROM_API',
        company: data.company as Company,
        rknNotification: data.rknNotification as RknNotification,
      });
      return data.company as Company;
    }

    case 'DELETE_COMPANY': {
      await apiActions.deleteCompany(action.id);
      dispatch({ type: 'REMOVE_COMPANY', id: action.id });
      return;
    }

    case 'DELETE_PROCESS': {
      await apiActions.deleteProcess(action.id);
      dispatch({ type: 'REMOVE_PROCESS', id: action.id });
      return;
    }

    case 'ADD_DOCUMENT': {
      const { data } = await apiActions.addDocument(action.formData);
      dispatch({ type: 'ADD_DOCUMENT_FROM_API', document: data as Document });
      return;
    }

    case 'DELETE_DOCUMENT': {
      await apiActions.deleteDocument(action.id);
      dispatch({ type: 'REMOVE_DOCUMENT', id: action.id });
      return;
    }

    case 'SAVE_PROCESS_SECTION': {
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
