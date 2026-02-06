import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Agentation } from 'agentation';
import { Toaster } from "sonner";
import { getUserByEmail } from './api/pocketbase';

// Contexts & Providers
import { ProjectProvider } from './context/ProjectContext';
import { GlossaryProvider } from './context/GlossaryContext';
import { PromptProvider } from './context/PromptContext';
import { AuthProvider } from './hooks/useAuth';
import {
    DevAuthContext,
    useAuth as shouldUseAuth,
    DEV_BYPASS_AUTH,
    DEFAULT_DEV_USER
} from './context/DevAuthContext';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import { AppRouter } from './components/AppRouter';
import { DevTools } from './components/DevTools';
import LoginPage from './pages/LoginPage';

// Permissions
import { ROLES, getRoleLabel, getRoleColor, ACTIONS } from './lib/permissions';

// Re-export for compatibility
export const useAuth = shouldUseAuth;
export { ROLES, ACTIONS, getRoleLabel, getRoleColor };

function App() {
    // User and role state for dev mode
    const [devUser, setDevUser] = useState(DEFAULT_DEV_USER);
    const [currentRole, setCurrentRole] = useState(ROLES.MANAGER);
    const [loading, setLoading] = useState(true);

    // Load user role from PocketBase on mount (dev mode)
    const loadDevUserRole = useCallback(async () => {
        if (!DEV_BYPASS_AUTH) return;

        try {
            const userData = await getUserByEmail(DEFAULT_DEV_USER.email);
            if (userData) {
                setDevUser({
                    id: userData.id,
                    email: userData.email,
                    name: userData.name || DEFAULT_DEV_USER.name,
                    avatar: userData.avatar
                });
                setCurrentRole(userData.role || ROLES.MANAGER);
                console.log('✅ [PocketBase] Dev user role loaded:', userData.role);
            } else {
                console.log('📝 [PocketBase] No user found, using default dev role');
            }
        } catch (error) {
            console.log('📝 [PocketBase] Could not load dev user, using defaults:', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDevUserRole();
    }, [loadDevUserRole]);

    // Context value with all auth properties
    const authContextValue = useMemo(() => ({
        user: devUser || DEFAULT_DEV_USER,
        role: currentRole,
        isManager: currentRole === ROLES.MANAGER,
        isEditor: currentRole === ROLES.EDITOR,
        canDo: (action) => setCurrentRole(ROLES.MANAGER), // Mock permissions
        setRole: setCurrentRole,
        signOut: async () => setCurrentRole(ROLES.EDITOR),
        loading: false,
        getRoleLabel,
        getRoleColor,
        ROLES,
        ACTIONS
    }), [devUser, currentRole]);

    if (DEV_BYPASS_AUTH) {
        return (
            <ErrorBoundary>
                <DevAuthContext.Provider value={authContextValue}>
                    <ProjectProvider>
                        <GlossaryProvider>
                            <PromptProvider>
                                <AppRouter />
                                <Toaster />
                                <DevTools currentRole={currentRole} setCurrentRole={setCurrentRole} />
                            </PromptProvider>
                        </GlossaryProvider>
                    </ProjectProvider>
                </DevAuthContext.Provider>
            </ErrorBoundary>
        );
    }

    // Production mode - use real PocketBase auth
    function AppContent() {
        const { user, loading } = useAuth();

        if (loading) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            );
        }

        if (!user) {
            return <LoginPage />;
        }

        return <AppRouter />;
    }

    return (
        <ErrorBoundary>
            <AuthProvider>
                <ProjectProvider>
                    <GlossaryProvider>
                        <PromptProvider>
                            <AppContent />
                            <Toaster />
                            <Agentation />
                        </PromptProvider>
                    </GlossaryProvider>
                </ProjectProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
