import React, { ReactElement, createContext, useContext } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Mock Toast Context
const MockToastContext = createContext({
  showToast: () => {},
});

const MockToastProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockToastContext.Provider value={{ showToast: () => {} }}>
      {children}
    </MockToastContext.Provider>
  );
};

// Mock Auth Context
const MockAuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockAuthContext.Provider
      value={{
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: async () => {},
        register: async () => {},
        logout: () => {},
        refreshUser: async () => {},
      }}
    >
      {children}
    </MockAuthContext.Provider>
  );
};

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockToastProvider>
      <MockAuthProvider>
        {children}
      </MockAuthProvider>
    </MockToastProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

