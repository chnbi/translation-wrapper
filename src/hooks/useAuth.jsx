// Authentication Hook - Firebase Integration
import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
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
        } catch (error) {
            setUserRole(ROLES.EDITOR);
            setUserLanguages([]);
        }
    }, []);

    useEffect(() => {
        let unsubscribeSnapshot = null;

        // Listen for auth changes
        const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
            // Cleanup previous snapshot listener if it exists
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }

            if (authUser) {
                // Initial set from Auth
                setUser({
                    id: authUser.uid,
                    email: authUser.email,
                    name: authUser.displayName || authUser.email.split('@')[0],
                    avatar: authUser.photoURL
                });

                // Set up real-time listener for Firestore profile
                // This ensures updates to Name/Avatar/Role/Languages are reflected immediately
                const userRef = doc(db, 'users', authUser.uid);
                unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUser(prev => ({
                            ...prev,
                            name: data.name || prev?.name,
                            avatar: data.avatar || prev?.avatar,
                            // We also update role/languages here to be reactive
                        }));
                        setUserRole(data.role || ROLES.EDITOR);
                        setUserLanguages(data.languages || []);
                    }
                });

            } else {
                setUser(null);
                setUserRole(ROLES.EDITOR);
                setUserLanguages([]);
            }
            loading && setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
        };
    }, []);

    const signIn = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error) {
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


            return user;
        } catch (error) {
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
            setUserRole(ROLES.EDITOR);
            setUserLanguages([]);
            // Reload not strictly necessary with Firebase listener, but good for clearing state
            window.location.reload();
        } catch (error) {
            throw error;
        }
    };

    const resetPassword = async (email) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
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
        signOut,
        resetPassword,
        canDo,
        isManager: userRole === ROLES.MANAGER || userRole === ROLES.ADMIN,
        isAdmin: userRole === ROLES.ADMIN,
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
