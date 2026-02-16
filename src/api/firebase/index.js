// services/firebase/index.js - Barrel export for all Firebase services
// This provides a single import point with full backward compatibility

// Project operations
export {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    getProjectPages,
    addProjectPage,
    deleteProjectPage,
    renameProjectPage,
    getPageRows,
    addPageRows,
    updatePageRow,
    getProjectRows,
    addProjectRows,
    updateProjectRow,
    updateProjectRows,
    deletePageRows,
    deleteProjectRows,
    getUserSubmissions
} from './projects';

// Template operations
export {
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getOrCreateDefaultTemplate,
    DEFAULT_TEMPLATE
} from './templates';

// Glossary operations
export {
    getGlossaryTerms,
    getApprovedGlossaryTerms,
    createGlossaryTerm,
    createGlossaryTerms,
    updateGlossaryTerm,
    deleteGlossaryTerm,
    deleteGlossaryTerms,
    getGlossaryCategories,
    createGlossaryCategory,
    deleteGlossaryCategory
} from './glossary';

// Audit Trail operations
export {
    logAction,

    getAllAuditLogs,
    formatAction,
    formatRelativeTime,
    AUDIT_ACTIONS
} from './audit';

// Role & User Management
export {
    getUsers,
    getUser,
    getUserByEmail,
    upsertUser,
    updateUserRole,
    updateUserLanguages,
    deleteUser,

} from './roles';

// API Key Management
export {
    getUserApiKeys,
    saveUserApiKeys,

    getEffectiveApiKey
} from './apiKeys';

// Export Firebase instances for direct access if needed
// Replacing 'pb' with 'db' and 'auth'
import { db, auth } from '../../lib/firebase';
export { db, auth };
