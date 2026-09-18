'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { PlatformSettingsProvider } from '@/contexts/PlatformSettingsContext';
import { PageSpinner } from '@/components/ui/spinner';

export default function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={<PageSpinner />} persistor={persistor}>
        <PlatformSettingsProvider>
          {children}
        </PlatformSettingsProvider>
      </PersistGate>
    </Provider>
  );
}
