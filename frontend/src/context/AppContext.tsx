import { createContext, useContext } from 'react';
import type { AppState, DispatchFn } from '../types';

interface AppContextValue {
  state: AppState;
  dispatch: DispatchFn;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
