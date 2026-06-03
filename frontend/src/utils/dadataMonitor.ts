import { message } from 'antd';
import type { Dispatch } from 'react';
import { apiActions } from '../api/client';
import type { AppAction, Company, MonitorEvent } from '../types';

export async function runDadataEgrulCheck(
  dispatch: Dispatch<AppAction>,
  options?: { silent?: boolean },
) {
  const { data: check } = await apiActions.checkDadataChanges();
  if (check.companies?.length) {
    dispatch({ type: 'PATCH_COMPANIES', companies: check.companies as Company[] });
  }
  if (check.events?.length) {
    dispatch({ type: 'PREPEND_MONITOR_EVENTS', events: check.events as MonitorEvent[] });
    if (!options?.silent) {
      message.info(`Изменения в ЕГРЮЛ (DaData): ${check.events.length} уведомлений`);
    }
    return check;
  }
  if (check.errors?.length && !options?.silent) {
    const first = check.errors[0]?.error ?? '';
    if (first.includes('DADATA_API_KEY')) {
      message.warning('Укажите DADATA_API_KEY в .env backend для мониторинга ЕГРЮЛ');
    } else {
      message.warning(`Проверка DaData: ${check.errors.length} ошибок`);
    }
  } else if (!options?.silent) {
    const extra = check.baselined ? `, зафиксирована база по ${check.baselined} компаниям` : '';
    message.success(`Проверено компаний: ${check.checked ?? 0}. Изменений в ЕГРЮЛ нет${extra}.`);
  }
  return check;
}
