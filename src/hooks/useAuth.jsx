// Authentication Hook
import { useState, useEffect, useContext, createContext } from 'react'
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut as firebaseSignOut
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../services/firebase/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [userRole, setUserRole] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Get or create user document
                const userDocRef = doc(db, 'users', firebaseUser.uid)
                const userDoc = await getDoc(userDocRef)

                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role)
                } else {
                    // First-time user - create with default 'editor' role
                    await setDoc(userDocRef, {
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        role: 'editor',
                        createdAt: new Date().toISOString()
                    })
                    setUserRole('editor')
                }

                setUser(firebaseUser)
            } else {
                setUser(null)
                setUserRole(null)
            }
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const signIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider)
        } catch (error) {
            console.error('Sign in error:', error)
            throw error
        }
    }

    const signOut = async () => {
        try {
            await firebaseSignOut(auth)
        } catch (error) {
            console.error('Sign out error:', error)
            throw error
        }
    }

    const value = {
        user,
        userRole,
        loading,
        signIn,
        signOut,
        isManager: userRole === 'manager',
        isEditor: userRole === 'editor' || userRole === 'manager',
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
