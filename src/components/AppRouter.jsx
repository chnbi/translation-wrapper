import React, { useState, useEffect } from 'react';
import Layout from './layout';
import Dashboard from '../pages/Dashboard';
import Glossary from '../pages/GlossaryLibrary';
import PromptLibrary from '../pages/PromptLibrary';
import Settings from '../pages/Settings';
import ProjectView from '../pages/ProjectDetails';
import ImageTranslation from '../pages/ImageTranslation';
import Approvals from '../pages/Approvals';
import QuickCheck from '../pages/QuickCheck';
import Submissions from '../pages/Submissions';
import UsersPage from '../pages/UsersPage';
import { useProjects } from '../context/ProjectContext';

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
    const { getProject, getProjectPages } = useProjects();

    // Get page component and breadcrumbs based on route
    const getPageConfig = () => {
        const path = route.replace('#', '') || '/';

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
                return { component: Settings, breadcrumbs: [{ label: 'Home', href: '#' }, { label: 'Settings' }] };
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

    const { component: PageComponent, breadcrumbs, projectId } = getPageConfig();

    return (
        <Layout breadcrumbs={breadcrumbs}>
            <PageComponent projectId={projectId} />
        </Layout>
    );
}
