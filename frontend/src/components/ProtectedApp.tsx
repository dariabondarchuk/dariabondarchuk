import { useReducer, useEffect, useCallback, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Result, Spin, message } from 'antd';
import { initialState, reducer } from '../store';
import { fetchAppState } from '../api/client';
import { syncAction } from '../api/syncDispatch';
import { AppContext } from '../context/AppContext';
import Layout from '../components/Layout';
import type { AppAction, Company, DispatchFn, MonitorEvent } from '../types';
import { apiActions } from '../api/client';

export default function ProtectedApp() {
  const token = localStorage.getItem('token');
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchAppState()
      .then(data => {
        dispatch({ type: 'HYDRATE', data });
        setLoading(false);
        apiActions.checkDadataChanges()
          .then(({ data: check }) => {
            if (check.companies?.length) {
              dispatch({ type: 'PATCH_COMPANIES', companies: check.companies as Company[] });
            }
            if (check.events?.length) {
              dispatch({ type: 'PREPEND_MONITOR_EVENTS', events: check.events as MonitorEvent[] });
              message.info(`Обнаружены изменения в DaData: ${check.events.length} уведомлений`);
            }
          })
          .catch(() => {});
      })
      .catch(err => {
        setError(err?.response?.data?.error || err?.message || 'Не удалось загрузить данные');
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dispatchSync = useCallback<DispatchFn>(async (action) => {
    try {
      await syncAction(action as AppAction, dispatch);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Загрузка данных..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Result
          status="error"
          title="Ошибка загрузки"
          subTitle={error}
          extra={[
            <Button type="primary" key="retry" onClick={loadData}>Повторить</Button>,
            <Button key="login" onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}>
              Выйти
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ state, dispatch: dispatchSync }}>
      <Layout />
    </AppContext.Provider>
  );
}
