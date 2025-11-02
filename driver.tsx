import React from 'react';
import ReactDOM from 'react-dom/client';
import DriverApp from './packages/driver/DriverApp';
import { AuthProvider } from '@common/AuthContext';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <DriverApp />
    </AuthProvider>
  </React.StrictMode>
);