// Centralized default data for seeding the database
// Used only when initializing empty collections

// ===========================================
// DEFAULT PROJECTS
// ===========================================
export const defaultProjects = [
    {
        name: 'Example Project',
        status: 'in-progress',
        progress: 0,
        sourceLanguage: 'English',
        targetLanguages: ['Bahasa Malaysia', 'Chinese'],
        totalRows: 0,
        translatedRows: 0,
        pendingReview: 0,
        team: [{ initials: 'AD' }], // Admin 
        lastUpdated: new Date().toISOString(),
        color: 'bg-gradient-to-br from-blue-500 to-blue-600',
    }
]

// ===========================================
// DEFAULT GLOSSARY TERMS
// ===========================================
export const defaultGlossaryTerms = [
    { english: "Dashboard", malay: "Papan Pemuka", chinese: "仪表板", category: "UI", status: "approved" },
    { english: "Settings", malay: "Tetapan", chinese: "设置", category: "UI", status: "approved" },
    { english: "Profile", malay: "Profil", chinese: "个人资料", category: "Account", status: "approved" },
    { english: "Submit", malay: "Hantar", chinese: "提交", category: "Actions", status: "approved" },
    { english: "Cancel", malay: "Batal", chinese: "取消", category: "Actions", status: "approved" },
    // Add common terms
    { english: "Privacy Policy", malay: "Dasar Privasi", chinese: "隐私政策", category: "Legal", status: "approved" },
    { english: "Terms of Service", malay: "Terma Perkhidmatan", chinese: "服务条款", category: "Legal", status: "approved" },
    { english: "Notification", malay: "Pemberitahuan", chinese: "通知", category: "UI", status: "approved" },
    { english: "Search", malay: "Cari", chinese: "搜索", category: "UI", status: "approved" },
    { english: "Log Out", malay: "Log Keluar", chinese: "退出登录", category: "Account", status: "approved" },
]

// ===========================================
// DEFAULT PROMPT TEMPLATES  
// ===========================================
export const defaultPromptTemplates = [
    {
        name: "Default Template",
        description: "General-purpose translation template for accurate and natural translations.",
        prompt: "Role: Creative Copywriter.\n\nGoal: Transcreate this slogan for a local audience. Focus on impact, rhythm, and memorability over literal accuracy.\n\nConstraints: Keep the length similar to the source. Use cultural idioms if they fit the brand voice.\n\nTone: Bold, Energetic, Punchy.",
        category: "default",
        tags: ["Default"],
        variables: ["target_language"],
        author: "System",
        iconName: "FileText",
        iconColor: "text-slate-600 dark:text-slate-400",
        iconBg: "bg-slate-100 dark:bg-slate-900/50",
        color: "bg-slate-50 dark:bg-slate-950/30",
        isDefault: true,  // Pinned as default, cannot be deleted
        status: "published"
    },
    {
        name: "Formal Business",
        description: "Professional tone for corporate communications, reports, and official documents.",
        prompt: "Translate the following text into {target_language}. Maintain a formal, professional tone suitable for corporate communications.",
        tags: ["Business", "Formal", "Corporate"],
        variables: ["target_language"],
        author: "System",
        iconName: "FileText",
        iconColor: "text-blue-600 dark:text-blue-400",
        iconBg: "bg-blue-100 dark:bg-blue-900/50",
        color: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
        name: "Marketing Copy",
        description: "Persuasive content for ads, promotions, and brand messaging.",
        prompt: "Translate the following marketing content into {target_language}. Prioritize emotional impact and natural flow.",
        tags: ["Marketing", "Creative", "Persuasive"],
        variables: ["target_language"],
        author: "System",
        iconName: "Megaphone",
        iconColor: "text-pink-600 dark:text-pink-400",
        iconBg: "bg-pink-100 dark:bg-pink-900/50",
        color: "bg-pink-50 dark:bg-pink-950/30",
    },
    {
        name: "Technical Docs",
        description: "Precise language for software documentation and technical guides.",
        prompt: "Translate the following technical documentation into {target_language}. Keep all code snippets unchanged.",
        tags: ["Technical", "Documentation", "Software"],
        variables: ["target_language"],
        author: "System",
        iconName: "Code",
        iconColor: "text-violet-600 dark:text-violet-400",
        iconBg: "bg-violet-100 dark:bg-violet-900/50",
        color: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
        name: "Legal Contracts",
        description: "Accurate translations for contracts, policies, and legal documents.",
        prompt: "Translate the following legal text into {target_language}. Maintain the precise legal meaning and terminology.",
        tags: ["Legal", "Compliance", "Strict"],
        variables: ["target_language"],
        author: "System",
        iconName: "Scale",
        iconColor: "text-amber-600 dark:text-amber-400",
        iconBg: "bg-amber-100 dark:bg-amber-900/50",
        color: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
        name: "Social Media",
        description: "Friendly tone for social media posts and casual communications.",
        prompt: "Translate the following text into {target_language} in a casual, conversational tone.",
        tags: ["Social", "Casual", "Chat"],
        variables: ["target_language"],
        author: "System",
        iconName: "MessageSquare",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
        color: "bg-emerald-50 dark:bg-emerald-950/30",
    },
]
