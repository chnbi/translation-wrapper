import { useState, useEffect, Component } from 'react'
import Layout from './components/layout'
import Dashboard from './pages/dashboard'
import Glossary from './pages/glossary-library'
import PromptLibrary from './pages/prompt-library'
import Settings from './pages/settings'
import ProjectView from './pages/project-details'
import ImageTranslation from './pages/image-translation'
import Approvals from './pages/approvals'
import QuickCheck from './pages/quick-check'
import { createContext, useContext } from 'react'
import { ROLES, canDo as checkPermission, getRoleLabel, getRoleColor, ACTIONS } from './lib/permissions'
import { ProjectProvider, useProjects } from './context/ProjectContext'
import { GlossaryProvider } from './context/GlossaryContext'
import { PromptProvider } from './context/PromptContext'
import { Toaster } from "sonner"
import { AlertCircle } from "lucide-react"

// ===========================================
// DEV MODE: Set to true to bypass auth
// ===========================================
const DEV_BYPASS_AUTH = true

// Mock user for development
const mockUser = {
    uid: 'dev-user-123',
    email: 'dev@example.com',
    displayName: 'Dev User',
    photoURL: null
}

// Error Boundary
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-zinc-950 p-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-pink-100 dark:border-pink-900/30 p-8 max-w-md w-full text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-pink-100 dark:bg-pink-900/30">
                            <AlertCircle className="w-8 h-8 text-pink-400" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Something went wrong</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            We encountered an unexpected error. Try refreshing the page.
                        </p>
                        <div className="bg-slate-100 dark:bg-zinc-800 rounded-lg p-3 text-left overflow-auto max-h-40 mb-6">
                            <code className="text-xs text-red-600 dark:text-red-400">{this.state.error?.toString()}</code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-white px-4 py-2 rounded-lg text-sm font-medium w-full hover:opacity-90 transition-opacity bg-pink-500 hover:bg-pink-600"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// Auth context with role support
const DevAuthContext = createContext(null)
export const useAuth = () => useContext(DevAuthContext)

// Export permissions for use in components
export { ROLES, ACTIONS, getRoleLabel, getRoleColor }


// Simple client-side routing based on URL hash
function useRoute() {
    const [route, setRoute] = useState(window.location.hash || '#')

    useEffect(() => {
        const handleHashChange = () => setRoute(window.location.hash || '#')
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    return route
}

// Component that uses project context for breadcrumbs
function AppWithRouting() {
    const route = useRoute()
    const { getProject, getProjectPages } = useProjects()

    // Get page component and breadcrumbs based on route
    const getPageConfig = () => {
        const path = route.replace('#', '') || '/'

        switch (path) {
            case '/':
            case '':
                return { component: Dashboard, breadcrumbs: [{ label: 'Home' }] }
            case 'projects':
                // Redirect alias for Home/Projects - keep breadcrumb as Home
                return { component: Dashboard, breadcrumbs: [{ label: 'Home' }] }
            case 'glossary':
                return { component: Glossary, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Glossary' }] }
            case 'prompt':
                return { component: PromptLibrary, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Prompt Library' }] }
            case 'image-translate':
                return { component: ImageTranslation, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Translate' }] }
            case 'approvals':
                return { component: Approvals, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Approvals' }] }
            case 'quick-check':
                return { component: QuickCheck, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Quick Check' }] }
            case 'settings':
                return { component: Settings, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Settings' }] }
            default:
                if (path.startsWith('project/')) {
                    // Split to remove query string (e.g., "xxx?page=yyy" -> "xxx")
                    const parts = path.split('/')
                    const projectIdPart = parts[1] || ''
                    const [projectId, queryString] = projectIdPart.split('?')

                    const project = getProject(projectId)
                    const projectName = project?.name || `Project #${projectId.slice(0, 8)}...`

                    // Subpage Breadcrumb Logic
                    let subpageBreadcrumb = null

                    // Parse ?page=xyz from the FULL route string or parts
                    // route is like "#project/123?page=456"
                    const urlParams = new URLSearchParams(route.split('?')[1])
                    const pageId = urlParams.get('page')

                    if (pageId) {
                        const pages = getProjectPages(projectId) || []
                        const page = pages.find(p => p.id === pageId)
                        if (page) {
                            subpageBreadcrumb = { label: page.name }
                        }
                    }

                    return {
                        component: ProjectView,
                        breadcrumbs: [
                            { label: 'Home', href: '#' },
                            // { label: 'Projects', href: '#' }, // Removed "Projects" intermediate per request
                            { label: projectName, href: `#project/${projectId}` }, // Link to project root
                            ...(subpageBreadcrumb ? [subpageBreadcrumb] : [])
                        ],
                        projectId
                    }
                }
                return { component: Dashboard, breadcrumbs: [{ label: 'Home' }] }
        }
    }

    const { component: PageComponent, breadcrumbs, projectId } = getPageConfig()

    return (
        <Layout breadcrumbs={breadcrumbs}>
            <PageComponent projectId={projectId} />
        </Layout>
    )
}

function App() {
    // Role state for dev testing
    const [currentRole, setCurrentRole] = useState(ROLES.MANAGER)

    // Create context value with canDo helper
    const authContextValue = {
        user: mockUser,
        role: currentRole,
        setRole: setCurrentRole,
        loading: false,
        signIn: () => console.log('Sign in clicked'),
        signOut: () => console.log('Sign out clicked'),
        canDo: (action) => checkPermission(currentRole, action),
        isManager: currentRole === ROLES.MANAGER,
        isEditor: currentRole === ROLES.EDITOR,
    }

    if (DEV_BYPASS_AUTH) {
        return (
            <ErrorBoundary>
                <DevAuthContext.Provider value={authContextValue}>
                    <ProjectProvider>
                        <GlossaryProvider>
                            <PromptProvider>
                                <AppWithRouting />
                                <Toaster />
                            </PromptProvider>
                        </GlossaryProvider>
                    </ProjectProvider>
                </DevAuthContext.Provider>
            </ErrorBoundary>
        )
    }

    // Production mode - use real auth
    const { AuthProvider, useAuth: realUseAuth } = require('./hooks/useAuth.jsx')

    function AppContent() {
        const { user, loading } = realUseAuth()

        if (loading) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            )
        }

        if (!user) return <Login />

        return (
            <Layout breadcrumbs={[{ label: 'Home' }]}>
                <Home />
            </Layout>
        )
    }

    return (
        <ErrorBoundary>
            <AuthProvider>
                <ProjectProvider>
                    <GlossaryProvider>
                        <PromptProvider>
                            <AppContent />
                            <Toaster />
                        </PromptProvider>
                    </GlossaryProvider>
                </ProjectProvider>
            </AuthProvider>
        </ErrorBoundary>
    )
}

export default App
