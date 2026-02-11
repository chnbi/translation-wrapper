import React, { useState, useEffect, Suspense } from 'react';
import Layout from './layout';
import { useProjects } from '../context/ProjectContext';
import { Loader2 } from 'lucide-react';

// Lazy load pages
const Dashboard = React.lazy(() => import('../pages/DashboardPage.jsx'));
const Glossary = React.lazy(() => import('../pages/GlossaryLibrary'));
const PromptLibrary = React.lazy(() => import('../pages/PromptLibrary'));
const Settings = React.lazy(() => import('../pages/Settings'));
const AccountSettings = React.lazy(() => import('../pages/AccountSettings'));
const ProjectView = React.lazy(() => import('../pages/ProjectDetails'));
const ImageTranslation = React.lazy(() => import('../pages/ImageTranslation'));
const Approvals = React.lazy(() => import('../pages/Approvals'));
const QuickCheck = React.lazy(() => import('../pages/QuickCheck'));
const Submissions = React.lazy(() => import('../pages/Submissions'));
const UsersPage = React.lazy(() => import('../pages/UsersPage'));

// Simple client-side routing based on URL hash
export function useRoute() {
    const [route, setRoute] = useState(window.location.hash || '#');

    useEffect(() => {
        const handleHashChange = () => setRoute(window.location.hash || '#');
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    return route;
}

// Component that uses project context for breadcrumbs
export function AppRouter() {
    const route = useRoute();
    const { getProject, getProjectPages, isLoading: projectsLoading } = useProjects();

    // Get page component and breadcrumbs based on route
    const getPageConfig = () => {
        const fullPath = route.replace('#', '') || '/';
        const [path] = fullPath.split('?');

        switch (path) {
            case '/':
            case '':
                return { component: Dashboard, breadcrumbs: [{ label: 'Home' }] };
            case 'projects':
                return { component: Dashboard, breadcrumbs: [{ label: 'Home' }] };
            case 'glossary':
                return { component: Glossary, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Glossary' }] };
            case 'prompt':
                return { component: PromptLibrary, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Prompt Library' }] };
            case 'image-translate':
                return { component: ImageTranslation, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Translate' }] };
            case 'approvals':
                return { component: Approvals, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Approvals' }] };
            case 'submissions':
                return { component: Submissions, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'My Submissions' }] };
            case 'quick-check':
                return { component: QuickCheck, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Quick Check' }] };
            case 'settings':
                return { component: Settings, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Settings' }], noPadding: true };
            case 'account-settings':
                return { component: AccountSettings, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Account Settings' }], noPadding: true };
            case 'users':
                return { component: UsersPage, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Settings', href: '#settings' }, { label: 'Users' }] };
            default:
                if (path.startsWith('project/')) {
                    const parts = path.split('/');
                    const projectIdPart = parts[1] || '';
                    const [projectId, queryString] = projectIdPart.split('?');

                    const project = getProject(projectId);
                    const projectName = project?.name || `Project #${projectId.slice(0, 8)}...`;

                    let subpageBreadcrumb = null;
                    const urlParams = new URLSearchParams(route.split('?')[1]);
                    const pageId = urlParams.get('page');

                    if (pageId) {
                        const pages = getProjectPages(projectId) || [];
                        const page = pages.find(p => p.id === pageId);
                        if (page) {
                            subpageBreadcrumb = { label: page.name };
                        }
                    }

                    return {
                        component: ProjectView,
                        breadcrumbs: [
                            { label: 'Home', href: '#' },
                            { label: projectName, href: `#project/${projectId}` },
                            ...(subpageBreadcrumb ? [subpageBreadcrumb] : [])
                        ],
                        projectId
                    };
                }
                return { component: Dashboard, breadcrumbs: [{ label: 'Home' }] };
        }
    };

    const { component: PageComponent, breadcrumbs, projectId, noPadding } = getPageConfig();

    // Show loader while projects are loading (e.g. right after login)
    if (projectsLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-muted-foreground">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" aria-hidden />
                <p className="text-sm font-medium">Loading projects...</p>
            </div>
        );
    }

    return (
        <Layout breadcrumbs={breadcrumbs} noPadding={noPadding}>
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                    <p>Loading application...</p>
                </div>
            }>
                <PageComponent projectId={projectId} />
            </Suspense>
        </Layout>
    );
}
