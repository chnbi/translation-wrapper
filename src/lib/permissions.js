/**
 * Role-Based Access Control (RBAC) System
 * 
 * Roles: manager > editor
 */

export const ROLES = {
    MANAGER: 'manager',
    EDITOR: 'editor',
}

// Actions that can be performed
export const ACTIONS = {
    // User Management (Manager only)
    MANAGE_USERS: 'manage_users',

    // Configuration (Manager only)
    MANAGE_CATEGORIES: 'manage_categories',
    CONFIGURE_SETTINGS: 'configure_settings',

    // Review Actions (Manager only)
    APPROVE_TRANSLATION: 'approve_translation',
    REJECT_TRANSLATION: 'reject_translation',

    // Content (Manager + Editor)
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
    [ROLES.MANAGER]: Object.values(ACTIONS), // Manager can do everything

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
    const hierarchy = [ROLES.EDITOR, ROLES.MANAGER]
    return hierarchy.indexOf(role) >= hierarchy.indexOf(minimumRole)
}

/**
 * Get role display name
 */
export const getRoleLabel = (role) => {
    const labels = {
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
        [ROLES.MANAGER]: 'bg-purple-100 text-purple-700',
        [ROLES.EDITOR]: 'bg-blue-100 text-blue-700',
    }
    return colors[role] || 'bg-zinc-100 text-zinc-700'
}
