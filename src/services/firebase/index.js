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
    getPageRows,
    addPageRows,
    updatePageRow,
    getProjectRows,
    addProjectRows,
    updateProjectRow,
    updateProjectRows,
    deletePageRows,
    deleteProjectRows
} from './projects'

// Template operations
export {
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    seedDefaultTemplates
} from './templates'

// Glossary operations
export {
    getGlossaryTerms,
    getApprovedGlossaryTerms,
    createGlossaryTerm,
    createGlossaryTerms,
    updateGlossaryTerm,
    deleteGlossaryTerm,
    deleteGlossaryTerms,
    seedDefaultGlossary,
    getGlossaryCategories,
    createGlossaryCategory,
    deleteGlossaryCategory
} from './glossary'
