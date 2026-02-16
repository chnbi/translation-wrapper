// services/firebase/roles.js (User Management)
import { db } from '../../lib/firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';

const COLLECTION = 'users';

export async function getUsers() {
    try {
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc')); // user docs use createdAt?
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
}

export async function getUser(userId) {
    try {
        const docRef = doc(db, COLLECTION, userId);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        return { id: snapshot.id, ...snapshot.data() };
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
}

export async function getUserByEmail(email) {
    try {
        const q = query(collection(db, COLLECTION), where('email', '==', email));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error('Error fetching user by email:', error);
        throw error;
    }
}

export async function upsertUser(userData) {
    try {
        // If userData has ID, use it. If not, use email to find or create.
        // In Firebase Auth, we usually have a specific UID.
        // This function assumes we are syncing a user profile.

        let userId = userData.id;

        if (!userId && userData.email) {
            const existing = await getUserByEmail(userData.email);
            if (existing) userId = existing.id;
        }

        if (userId) {
            const docRef = doc(db, COLLECTION, userId);
            await updateDoc(docRef, { ...userData, updatedAt: serverTimestamp() });
            return { id: userId, ...userData };
        } else {
            // New user without ID (shouldn't happen with Auth, but for completeness)
            const docRef = await addDoc(collection(db, COLLECTION), {
                ...userData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return { id: docRef.id, ...userData };
        }
    } catch (error) {
        console.error('Error upserting user:', error);
        throw error;
    }
}

export async function updateUserRole(userId, role) {
    try {
        const docRef = doc(db, COLLECTION, userId);
        // Use setDoc with merge to create the document if it doesn't exist
        await setDoc(docRef, { role, updatedAt: serverTimestamp() }, { merge: true });
        // Role updated
        return { id: userId, role };
    } catch (error) {
        console.error('Error updating user role:', error);
        throw error;
    }
}

export async function updateUserLanguages(userId, languages) {
    try {
        const docRef = doc(db, COLLECTION, userId);
        await setDoc(docRef, { languages, updatedAt: serverTimestamp() }, { merge: true });
        // Languages updated
        return { id: userId, languages };
    } catch (error) {
        console.error('Error updating user languages:', error);
        throw error;
    }
}

export async function deleteUser(userId) {
    try {
        await deleteDoc(doc(db, COLLECTION, userId));
        // User deleted
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
}


