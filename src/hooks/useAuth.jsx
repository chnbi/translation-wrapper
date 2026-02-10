// Authentication Hook - Firebase Integration
import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getUser } from '../api/firebase/roles'; // For fetching user role from Firestore
import { ROLES, canDo as checkPermission, getRoleLabel, getRoleColor } from '../lib/permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(ROLES.EDITOR);
    const [userLanguages, setUserLanguages] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load user role and profile from Firestore
    const loadUserProfile = useCallback(async (uid) => {
        if (!uid) {
            setUserRole(ROLES.EDITOR);
            setUserLanguages([]);
            return;
        }

        try {
            const userDoc = await getUser(uid);
            const role = userDoc?.role || ROLES.EDITOR;
            const languages = userDoc?.languages || [];

            setUserRole(role);
            setUserLanguages(languages);
            console.log('[Firebase] User profile loaded:', { role, languages });
        } catch (error) {
            console.error('[Firebase] Error loading user profile:', error);
            setUserRole(ROLES.EDITOR);
            setUserLanguages([]);
        }
    }, []);

    useEffect(() => {
        // Listen for auth changes
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                setUser({
                    id: authUser.uid,
                    email: authUser.email,
                    name: authUser.displayName || authUser.email.split('@')[0],
                    avatar: authUser.photoURL
                });
                await loadUserProfile(authUser.uid);
            } else {
                setUser(null);
                setUserRole(ROLES.EDITOR);
                setUserLanguages([]);
            }
            loading && setLoading(false);
        });

        return () => unsubscribe();
    }, [loadUserProfile]); // loading dependency removed to avoid loops

    const signIn = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('[Firebase] User signed in:', userCredential.user.email);
            return userCredential.user;
        } catch (error) {
            console.error('Sign in error:', error);
            // Throw existing error for UI handling
            throw error;
        }
    };

    const signUp = async (email, password, userData) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user profile in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                name: userData.name || '',
                role: userData.role || ROLES.EDITOR,
                languages: userData.languages || [],
                createdAt: new Date().toISOString(),
                // Default avatar if needed
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || email)}&background=random`
            });

            console.log('[Firebase] User signed up:', user.email);
            return user;
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    };

    // OAuth not yet configured in Firebase console, but placeholder:
    const signInWithOAuth = async (provider = 'google') => {
        console.warn('OAuth not yet implemented in Firebase adapter');
        // Implementation would use signInWithPopup(auth, new GoogleAuthProvider())
        throw new Error('OAuth not supported yet');
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
            setUserRole(ROLES.EDITOR);
            setUserLanguages([]);
            console.log('[Firebase] User signed out');
            // Reload not strictly necessary with Firebase listener, but good for clearing state
            window.location.reload();
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    };

    const resetPassword = async (email) => {
        try {
            await sendPasswordResetEmail(auth, email);
            console.log('[Firebase] Password reset email sent to:', email);
        } catch (error) {
            console.error('Reset password error:', error);
            throw error;
        }
    };

    // Helper to check if user can perform an action
    const canDo = useCallback((action) => {
        return checkPermission(userRole, action);
    }, [userRole]);

    const value = {
        user,
        role: userRole,
        languages: userLanguages,
        loading,
        signIn,
        signUp,
        signInWithOAuth,
        signOut,
        resetPassword,
        canDo,
        isManager: userRole === ROLES.MANAGER,
        isEditor: userRole === ROLES.EDITOR,
        // Expose permission utilities
        getRoleLabel,
        getRoleColor,
        ROLES,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export { ROLES };
