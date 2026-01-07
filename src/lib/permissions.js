/**
 * Role-Based Access Control (RBAC) System
 * 
 * Roles: admin > manager > editor > viewer
 */

export const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    EDITOR: 'editor',
    VIEWER: 'viewer',
}

// Actions that can be performed
export const ACTIONS = {
    // User Management (Admin only)
    MANAGE_USERS: 'manage_users',

    // Configuration (Admin + Manager)
    MANAGE_CATEGORIES: 'manage_categories',
    CONFIGURE_SETTINGS: 'configure_settings',

    // Review Actions (Admin + Manager)
    APPROVE_TRANSLATION: 'approve_translation',
    REJECT_TRANSLATION: 'reject_translation',

    // Content (Admin + Manager + Editor)
    CREATE_PROJECT: 'create_project',
    EDIT_PROJECT: 'edit_project',
    DELETE_PROJECT: 'delete_project',
    CREATE_GLOSSARY: 'create_glossary',
    EDIT_GLOSSARY: 'edit_glossary',
    DELETE_GLOSSARY: 'delete_glossary',
    CREATE_PROMPT: 'create_prompt',
    EDIT_PROMPT: 'edit_prompt',
    DELETE_PROMPT: 'delete_prompt',

    // Read (Everyone)
    VIEW_PROJECT: 'view_project',
    VIEW_GLOSSARY: 'view_glossary',
    VIEW_PROMPT: 'view_prompt',
}

// Permission matrix
const permissions = {
    [ROLES.ADMIN]: Object.values(ACTIONS), // Admin can do everything

    [ROLES.MANAGER]: [
        ACTIONS.MANAGE_USERS, // Added per user request
        ACTIONS.MANAGE_CATEGORIES,
        ACTIONS.CONFIGURE_SETTINGS,
        ACTIONS.APPROVE_TRANSLATION,
        ACTIONS.REJECT_TRANSLATION,
        ACTIONS.CREATE_PROJECT,
        ACTIONS.EDIT_PROJECT,
        ACTIONS.DELETE_PROJECT,
        ACTIONS.CREATE_GLOSSARY,
        ACTIONS.EDIT_GLOSSARY,
        ACTIONS.DELETE_GLOSSARY,
        ACTIONS.CREATE_PROMPT,
        ACTIONS.EDIT_PROMPT,
        ACTIONS.DELETE_PROMPT,
        ACTIONS.VIEW_PROJECT,
        ACTIONS.VIEW_GLOSSARY,
        ACTIONS.VIEW_PROMPT,
    ],

    [ROLES.EDITOR]: [
        ACTIONS.CREATE_PROJECT,
        ACTIONS.EDIT_PROJECT,
        ACTIONS.DELETE_PROJECT,
        ACTIONS.CREATE_GLOSSARY,
        ACTIONS.EDIT_GLOSSARY,
        ACTIONS.DELETE_GLOSSARY,
        ACTIONS.CREATE_PROMPT,
        ACTIONS.EDIT_PROMPT,
        ACTIONS.DELETE_PROMPT,
        ACTIONS.VIEW_PROJECT,
        ACTIONS.VIEW_GLOSSARY,
        ACTIONS.VIEW_PROMPT,
    ],

    [ROLES.VIEWER]: [
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
 * Check if role is at least a certain level
 */
export const isAtLeast = (role, minimumRole) => {
    const hierarchy = [ROLES.VIEWER, ROLES.EDITOR, ROLES.MANAGER, ROLES.ADMIN]
    return hierarchy.indexOf(role) >= hierarchy.indexOf(minimumRole)
}

/**
 * Get role display name
 */
export const getRoleLabel = (role) => {
    const labels = {
        [ROLES.ADMIN]: 'Admin',
        [ROLES.MANAGER]: 'Manager',
        [ROLES.EDITOR]: 'Editor',
        [ROLES.VIEWER]: 'Viewer',
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
        [ROLES.VIEWER]: 'bg-zinc-100 text-zinc-700',
    }
    return colors[role] || 'bg-zinc-100 text-zinc-700'
}
