/**
 * Role-Based Access Control (RBAC) System
 * 
 * Roles: admin > manager > editor
 * 
 * Admin    - Full system access (system config, all users, all operations)
 * Manager  - Team operations (approvals, user management, content oversight)
 * Editor   - Content creation (projects, glossary, prompts, translations)
 */

export const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    EDITOR: 'editor',
}

// Actions that can be performed
export const ACTIONS = {
    // System Administration (Admin only)
    MANAGE_SYSTEM: 'manage_system',           // System settings, API keys
    VIEW_ALL_TEAMS: 'view_all_teams',         // See all team data
    MANAGE_ROLES: 'manage_roles',             // Change user roles

    // User Management (Admin + Manager)
    MANAGE_USERS: 'manage_users',             // Create/edit/delete users
    ASSIGN_LANGUAGES: 'assign_languages',     // Assign allowed_languages

    // Configuration (Admin + Manager)
    MANAGE_CATEGORIES: 'manage_categories',
    CONFIGURE_SETTINGS: 'configure_settings',

    // Review Actions (Admin + Manager)
    APPROVE_TRANSLATION: 'approve_translation',
    REJECT_TRANSLATION: 'reject_translation',
    UNDO_APPROVAL: 'undo_approval',

    // Content Operations (All roles)
    CREATE_PROJECT: 'create_project',
    EDIT_PROJECT: 'edit_project',
    DELETE_PROJECT: 'delete_project',
    IMPORT_PROJECT: 'import_project',
    EXPORT_PROJECT: 'export_project',

    // Glossary (All roles)
    CREATE_GLOSSARY: 'create_glossary',
    EDIT_GLOSSARY: 'edit_glossary',
    DELETE_GLOSSARY: 'delete_glossary',

    // Prompts (All roles)
    CREATE_PROMPT: 'create_prompt',
    EDIT_PROMPT: 'edit_prompt',
    DELETE_PROMPT: 'delete_prompt',
    SET_DEFAULT_PROMPT: 'set_default_prompt', // Manager+ only

    // Translation (All roles)
    TRANSLATE_ROW: 'translate_row',
    EDIT_TRANSLATION: 'edit_translation',

    // Read (Everyone)
    VIEW_PROJECT: 'view_project',
    VIEW_GLOSSARY: 'view_glossary',
    VIEW_PROMPT: 'view_prompt',
    VIEW_AUDIT_LOG: 'view_audit_log',         // Manager+ only
}

// Permission matrix
const permissions = {
    [ROLES.ADMIN]: Object.values(ACTIONS), // Full access

    [ROLES.MANAGER]: [
        // User & Config
        ACTIONS.MANAGE_USERS,
        ACTIONS.ASSIGN_LANGUAGES,
        ACTIONS.MANAGE_CATEGORIES,
        // Removed CONFIGURE_SETTINGS (Admin only)

        // Review
        ACTIONS.APPROVE_TRANSLATION,
        ACTIONS.REJECT_TRANSLATION,
        ACTIONS.UNDO_APPROVAL,
        // Content
        ACTIONS.CREATE_PROJECT,
        ACTIONS.EDIT_PROJECT,
        ACTIONS.DELETE_PROJECT,
        ACTIONS.IMPORT_PROJECT,
        ACTIONS.EXPORT_PROJECT,
        // Glossary
        ACTIONS.CREATE_GLOSSARY,
        ACTIONS.EDIT_GLOSSARY,
        ACTIONS.DELETE_GLOSSARY,
        // Prompts
        ACTIONS.CREATE_PROMPT,
        ACTIONS.EDIT_PROMPT,
        ACTIONS.DELETE_PROMPT,
        ACTIONS.SET_DEFAULT_PROMPT,
        // Translation
        ACTIONS.TRANSLATE_ROW,
        ACTIONS.EDIT_TRANSLATION,
        // Read
        ACTIONS.VIEW_PROJECT,
        ACTIONS.VIEW_GLOSSARY,
        ACTIONS.VIEW_PROMPT,
        ACTIONS.VIEW_AUDIT_LOG,
    ],

    [ROLES.EDITOR]: [
        // Content - VIEW ONLY
        // Removed CREATE/EDIT/DELETE PROJECT
        // Removed IMPORT/EXPORT

        // Glossary - VIEW ONLY
        // Removed CREATE/EDIT/DELETE GLOSSARY

        // Prompts - VIEW ONLY
        // Removed CREATE/EDIT/DELETE PROMPT

        // Translation - WORKER
        ACTIONS.TRANSLATE_ROW,
        ACTIONS.EDIT_TRANSLATION,

        // Read
        ACTIONS.VIEW_PROJECT,
        ACTIONS.VIEW_GLOSSARY,
        ACTIONS.VIEW_PROMPT,
    ],
}

/**
 * Check if a role can perform an action
 */
export const canDo = (role, action) => {
    return permissions[role]?.includes(action) ?? false
}


/**
 * Get role display name
 */
export const getRoleLabel = (role) => {
    const labels = {
        [ROLES.ADMIN]: 'Admin',
        [ROLES.MANAGER]: 'Manager',
        [ROLES.EDITOR]: 'Editor',
    }
    return labels[role] || 'Unknown'
}

/**
 * Get role badge color
 */
export const getRoleColor = (role) => {
    const colors = {
        [ROLES.ADMIN]: 'bg-red-100 text-red-700',
        [ROLES.MANAGER]: 'bg-purple-100 text-purple-700',
        [ROLES.EDITOR]: 'bg-blue-100 text-blue-700',
    }
    return colors[role] || 'bg-zinc-100 text-zinc-700'
}

