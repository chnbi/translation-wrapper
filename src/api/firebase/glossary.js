// services/firebase/glossary.js
import { db } from '../../lib/firebase';
import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    writeBatch,
    increment
} from 'firebase/firestore';

const TERMS_COLLECTION = 'glossary_terms';
const CAT_COLLECTION = 'glossary_categories';

// ==========================================
// GLOSSARY TERMS
// ==========================================

export async function getGlossaryTerms() {
    try {
        const q = query(collection(db, TERMS_COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching glossary terms:', error);
        return [];
    }
}

export async function getApprovedGlossaryTerms() {
    try {
        const q = query(
            collection(db, TERMS_COLLECTION),
            where('status', '==', 'approved'),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching approved glossary terms:', error);
        return [];
    }
}

export async function createGlossaryTerm(termData) {
    try {
        const docRef = await addDoc(collection(db, TERMS_COLLECTION), {
            ...termData,
            status: termData.status || 'draft',
            createdBy: termData.createdBy || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            version: 1
        });
        return { id: docRef.id, ...termData, version: 1 };
    } catch (error) {
        console.error('Error creating glossary term:', error);
        throw error;
    }
}

export async function createGlossaryTerms(termsArray) {
    try {
        const batch = writeBatch(db);
        const results = [];

        termsArray.forEach(term => {
            const docRef = doc(collection(db, TERMS_COLLECTION));
            const data = {
                ...term,
                status: term.status || 'draft',
                createdBy: term.createdBy || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                version: 1
            };
            batch.set(docRef, data);
            results.push({ id: docRef.id, ...data });
        });

        await batch.commit();
        return results;
    } catch (error) {
        console.error('Error creating glossary terms:', error);
        throw error;
    }
}

export async function updateGlossaryTerm(id, updates) {
    try {
        const docRef = doc(db, TERMS_COLLECTION, id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
            version: increment(1)
        });
    } catch (error) {
        console.error('Error updating glossary term:', error);
        throw error;
    }
}

export async function deleteGlossaryTerm(id) {
    try {
        await deleteDoc(doc(db, TERMS_COLLECTION, id));
    } catch (error) {
        console.error('Error deleting glossary term:', error);
        throw error;
    }
}

export async function deleteGlossaryTerms(ids) {
    try {
        const batch = writeBatch(db);
        ids.forEach(id => {
            const docRef = doc(db, TERMS_COLLECTION, id);
            batch.delete(docRef);
        });
        await batch.commit();
        // Terms deleted successfully
    } catch (error) {
        console.error('Error deleting glossary terms:', error);
        throw error;
    }
}

// ==========================================
// GLOSSARY CATEGORIES
// ==========================================

export async function getGlossaryCategories() {
    try {
        const q = query(collection(db, CAT_COLLECTION), orderBy('name'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching glossary categories:', error);
        return [];
    }
}

export async function createGlossaryCategory(categoryData) {
    try {
        const docRef = await addDoc(collection(db, CAT_COLLECTION), {
            ...categoryData,
            createdAt: serverTimestamp()
        });
        return { id: docRef.id, ...categoryData };
    } catch (error) {
        console.error('Error creating category:', error);
        throw error;
    }
}

export async function deleteGlossaryCategory(id) {
    try {
        await deleteDoc(doc(db, CAT_COLLECTION, id));
    } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
}
