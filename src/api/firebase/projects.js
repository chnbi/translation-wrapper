// services/firebase/projects.js
import { db } from '../../lib/firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    writeBatch,
    collectionGroup,
    increment
} from 'firebase/firestore';

const COLLECTION = 'projects';

// ==========================================
// PROJECTS
// ==========================================

export async function getProjects() {
    try {
        const q = query(collection(db, COLLECTION), orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
    }
}

export async function getProject(projectId) {
    try {
        const docRef = doc(db, COLLECTION, projectId);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        return { id: snapshot.id, ...snapshot.data() };
    } catch (error) {
        console.error('Error fetching project:', error);
        return null;
    }
}

export async function createProject(projectData) {
    try {
        const docRef = await addDoc(collection(db, COLLECTION), {
            ...projectData,
            ownerId: projectData.ownerId || null, // Capture owner
            createdBy: projectData.createdBy || null, // Who created it
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            version: 1,
            status: projectData.status || 'draft'
        });
        return {
            id: docRef.id,
            ...projectData,
            status: projectData.status || 'draft',
            version: 1,
            createdAt: new Date().toISOString(), // Optimistic return
            updatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error creating project:', error);
        throw error;
    }
}

export async function updateProject(projectId, updates) {
    try {
        const docRef = doc(db, COLLECTION, projectId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
            version: increment(1)
        });
    } catch (error) {
        console.error('Error updating project:', error);
        throw error;
    }
}

export async function deleteProject(projectId) {
    try {
        const batch = writeBatch(db);
        let operationCount = 0;
        const batches = [batch];

        // Helper to add to batch and commit if full
        const addToBatch = async (ref) => {
            batches[batches.length - 1].delete(ref);
            operationCount++;

            if (operationCount >= 450) { // Safety margin
                batches.push(writeBatch(db));
                operationCount = 0;
            }
        };

        // 1. Get all pages
        const pagesRef = collection(db, COLLECTION, projectId, 'pages');
        const pagesSnapshot = await getDocs(pagesRef);

        // 2. For each page, get its rows and delete them
        for (const pageDoc of pagesSnapshot.docs) {
            const pageRowsRef = collection(db, COLLECTION, projectId, 'pages', pageDoc.id, 'rows');
            const pageRowsSnapshot = await getDocs(pageRowsRef);

            for (const rowDoc of pageRowsSnapshot.docs) {
                await addToBatch(rowDoc.ref);
            }

            // Delete the page itself
            await addToBatch(pageDoc.ref);
        }

        // 3. Get all legacy/flat rows (direct subcollection of project)
        const projectRowsRef = collection(db, COLLECTION, projectId, 'rows');
        const projectRowsSnapshot = await getDocs(projectRowsRef);

        for (const rowDoc of projectRowsSnapshot.docs) {
            await addToBatch(rowDoc.ref);
        }

        // 4. Delete the project document itself
        await addToBatch(doc(db, COLLECTION, projectId));

        // Commit all batches
        for (const b of batches) {
            await b.commit();
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        throw error;
    }
}

// ==========================================
// PROJECT PAGES
// ==========================================

export async function getProjectPages(projectId) {
    try {
        const q = query(
            collection(db, COLLECTION, projectId, 'pages'),
            orderBy('order', 'asc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching project pages:', error);
        return [];
    }
}

export async function addProjectPage(projectId, pageData) {
    try {
        const pages = await getProjectPages(projectId);
        const order = pages.length;

        const docRef = await addDoc(collection(db, COLLECTION, projectId, 'pages'), {
            ...pageData,
            project: projectId,
            order,
            createdAt: serverTimestamp()
        });
        return { id: docRef.id, ...pageData, order };
    } catch (error) {
        console.error('Error creating page:', error);
        throw error;
    }
}

export async function deleteProjectPage(projectId, pageId) {
    try {
        // Delete page doc 
        // Note: Subcollections (rows) are NOT automatically deleted in Firestore client SDK.
        // We manually delete rows associated with this page.
        const rows = await getPageRows(projectId, pageId);
        const batch = writeBatch(db);
        rows.forEach(row => {
            const rowRef = doc(db, COLLECTION, projectId, 'rows', row.id);
            batch.delete(rowRef);
        });
        await batch.commit();

        await deleteDoc(doc(db, COLLECTION, projectId, 'pages', pageId));
    } catch (error) {
        console.error('Error deleting page:', error);
        throw error;
    }
}

export async function renameProjectPage(projectId, pageId, newName) {
    try {
        const pageRef = doc(db, COLLECTION, projectId, 'pages', pageId);
        await updateDoc(pageRef, { name: newName });
        await updateProject(projectId, {}); // Touch lastUpdated
    } catch (error) {
        console.error('Error renaming page:', error);
        throw error;
    }
}

// ==========================================
// PAGE ROWS
// ==========================================

export async function getPageRows(projectId, pageId) {
    try {
        const q = query(
            collection(db, COLLECTION, projectId, 'rows'),
            where('pageId', '==', pageId),
            orderBy('order', 'asc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching page rows:', error);
        return [];
    }
}

export async function addPageRows(projectId, pageId, rows) {
    try {
        const results = [];
        const CHUNK_SIZE = 400; // Safety margin below 500 limit

        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const batch = writeBatch(db);
            const chunk = rows.slice(i, i + CHUNK_SIZE);
            const chunkResults = [];

            chunk.forEach((row, index) => {
                const rowRef = doc(collection(db, COLLECTION, projectId, 'rows'));
                // Destructure out the client-side temp `id` to avoid it overwriting the Firestore-generated ID
                const { id: _tempId, ...rowWithoutId } = row;
                const rowData = {
                    ...rowWithoutId,
                    project: projectId,
                    pageId: pageId,
                    order: i + index, // Correct global order
                    status: row.status || 'draft',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };
                batch.set(rowRef, rowData);
                chunkResults.push({ ...rowData, id: rowRef.id });
            });

            await batch.commit();
            results.push(...chunkResults);
        }

        await updateProject(projectId, {});
        return results;
    } catch (error) {
        console.error('Error adding rows:', error);
        throw error;
    }
}

export async function updatePageRow(projectId, pageId, rowId, updates) {
    try {
        const rowRef = doc(db, COLLECTION, projectId, 'rows', rowId);
        await updateDoc(rowRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        await updateProject(projectId, {});
    } catch (error) {
        console.error('Error updating row:', error);
        throw error;
    }
}


// ==========================================
// LEGACY PROJECT ROWS (flat structure)
// ==========================================

export async function getProjectRows(projectId) {
    try {
        // Legacy rows have empty pageId or missing pageId
        const q = query(
            collection(db, COLLECTION, projectId, 'rows'),
            where('pageId', '==', ''),
            orderBy('order', 'asc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching project rows:', error);
        return [];
    }
}

export async function addProjectRows(projectId, rows) {
    return addPageRows(projectId, '', rows);
}

export async function updateProjectRow(projectId, rowId, updates) {
    const rowRef = doc(db, COLLECTION, projectId, 'rows', rowId);
    await updateDoc(rowRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
    await updateProject(projectId, {});
}

export async function updateProjectRows(projectId, rowUpdates) {
    try {
        const CHUNK_SIZE = 400;

        for (let i = 0; i < rowUpdates.length; i += CHUNK_SIZE) {
            const batch = writeBatch(db);
            const chunk = rowUpdates.slice(i, i + CHUNK_SIZE);

            chunk.forEach(({ id, changes }) => {
                const rowRef = doc(db, COLLECTION, projectId, 'rows', id);
                batch.update(rowRef, {
                    ...changes,
                    updatedAt: serverTimestamp()
                });
            });

            await batch.commit();
        }

        await updateProject(projectId, {});
    } catch (error) {
        console.error('Error updating rows:', error);
        throw error;
    }
}

export async function deletePageRows(projectId, pageId, rowIds) {
    try {
        const CHUNK_SIZE = 400;

        for (let i = 0; i < rowIds.length; i += CHUNK_SIZE) {
            const batch = writeBatch(db);
            const chunk = rowIds.slice(i, i + CHUNK_SIZE);

            chunk.forEach(id => {
                const rowRef = doc(db, COLLECTION, projectId, 'pages', pageId, 'rows', id);
                batch.delete(rowRef);
            });

            await batch.commit();
        }

        await updateProject(projectId, {});
    } catch (error) {
        console.error('Error deleting page rows:', error);
        throw error;
    }
}

export async function deleteProjectRows(projectId, rowIds) {
    try {
        const CHUNK_SIZE = 400;

        for (let i = 0; i < rowIds.length; i += CHUNK_SIZE) {
            const batch = writeBatch(db);
            const chunk = rowIds.slice(i, i + CHUNK_SIZE);

            chunk.forEach(id => {
                const rowRef = doc(db, COLLECTION, projectId, 'rows', id);
                batch.delete(rowRef);
            });

            await batch.commit();
        }

        await updateProject(projectId, {});
    } catch (error) {
        console.error('Error deleting project rows:', error);
        throw error;
    }
}

/**
 * Get all rows with specific statuses (for Submissions view)
 * Uses Collection Group Query on 'rows' collection
 */
export async function getUserSubmissions(userId) {
    try {
        const rowsQuery = query(
            collectionGroup(db, 'rows'),
            where('status', 'in', ['review', 'approved', 'changes']),
            orderBy('updatedAt', 'desc')
        );

        const querySnapshot = await getDocs(rowsQuery);
        const submissions = [];

        // We need to fetch project and page details manually since Firestore 
        // doesn't support 'expand' like PocketBase
        // Optimisation: Cache project/page data to avoid redundant fetches
        const projectCache = {};
        const pageCache = {};

        for (const docSnap of querySnapshot.docs) {
            const rowData = { id: docSnap.id, ...docSnap.data() };
            // rowData.ref.parent.parent is the parent doc (Page or Project)
            // But getting parent data from ref requires a fetch

            // Construct parent paths
            const parentCollection = docSnap.ref.parent; // 'rows'
            const parentDoc = parentCollection.parent; // Page or Project doc ref

            if (parentDoc) {
                // If nested in Page: projects/{pid}/pages/{pageId}/rows/{rowId}
                // parentDoc is the Page. parentDoc.parent.parent is the Project.
                if (parentDoc.parent.id === 'pages') {
                    const pageId = parentDoc.id;
                    const projectId = parentDoc.parent.parent.id;

                    // Fetch Page Name
                    if (!pageCache[pageId]) {
                        const pageSnap = await getDoc(parentDoc);
                        pageCache[pageId] = pageSnap.exists() ? pageSnap.data() : { name: 'Unknown Page' };
                    }

                    // Fetch Project Name
                    if (!projectCache[projectId]) {
                        const projectSnap = await getDoc(parentDoc.parent.parent);
                        projectCache[projectId] = projectSnap.exists() ? projectSnap.data() : { name: 'Unknown Project' };
                    }

                    // Simulated 'expand' property
                    rowData.expand = {
                        project: projectCache[projectId],
                        page: pageCache[pageId]
                    };
                }
                // If direct in Project (Legacy): projects/{pid}/rows/{rowId}
                else if (parentDoc.parent.id === 'projects') {
                    const projectId = parentDoc.id;

                    if (!projectCache[projectId]) {
                        const projectSnap = await getDoc(parentDoc);
                        projectCache[projectId] = projectSnap.exists() ? projectSnap.data() : { name: 'Unknown Project' };
                    }

                    rowData.expand = {
                        project: projectCache[projectId],
                        page: null
                    };
                }
            }

            submissions.push(rowData);
        }

        return submissions;
    } catch (error) {
        console.error("Error fetching submissions:", error);
        throw error;
    }
}


