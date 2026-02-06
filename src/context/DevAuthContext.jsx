import { createContext, useContext } from 'react';
import { useAuth as useProductionAuth } from '../hooks/useAuth';

// ===========================================
// DEV MODE: Set to true to bypass auth
// ===========================================
export const DEV_BYPASS_AUTH = false;

// Default dev user
export const DEFAULT_DEV_USER = {
    id: 'dev-user-123',
    email: 'dev@example.com',
    name: 'Dev User',
    avatar: null
};

// Auth context with role support (Dev mode only)
export const DevAuthContext = createContext(null);
export const useDevAuth = () => useContext(DevAuthContext);

// Export the correct hook based on mode
export const useAuth = DEV_BYPASS_AUTH ? useDevAuth : useProductionAuth;
