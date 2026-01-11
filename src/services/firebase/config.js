// services/firebase/config.js - Shared Firebase config and utilities
import { db } from './client'
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore'

// Re-export everything for use in service modules
export {
    db,
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    writeBatch
}
