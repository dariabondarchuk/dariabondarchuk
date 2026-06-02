import { useReducer, useEffect, useCallback, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { initialState, reducer } from '../store';
import { fetchAppState } from '../api/client';
import { syncAction } from '../api/syncDispatch';
import { getMockAppCache, saveMockAppCache } from '../api/mockSurvey';
import { AppContext } from '../context/AppContext';
import Layout from '../components/Layout';
import type { AppAction, DispatchFn } from '../types';

export default function ProtectedApp() {
  const token = localStorage.getItem('token');
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchAppState()
      .then(data => { dispatch({ type: 'HYDRATE', data }); setLoading(false); })
      .catch(err => {
        console.warn('API unavailable, using local mock data:', err.message);
        const cache = getMockAppCache();
        dispatch({
          type: 'HYDRATE',
          data: cache ? { ...initialState, processes: cache.processes } : initialState,
        });
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (token !== 'mock-dev-token' || loading) return;
    saveMockAppCache(state.processes);
  }, [state.processes, token, loading]);

  useEffect(() => {
    if (token !== 'mock-dev-token') return;
    const onFocus = () => {
      const cache = getMockAppCache();
      if (cache) dispatch({ type: 'HYDRATE', data: { processes: cache.processes } });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [token]);

  const dispatchSync = useCallback<DispatchFn>(async (action) => {
    try {
      await syncAction(action as AppAction, dispatch);
    } catch (err) {
      console.error(err);
      dispatch(action as AppAction);
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

  return (
    <AppContext.Provider value={{ state, dispatch: dispatchSync }}>
      <Layout />
    </AppContext.Provider>
  );
}
