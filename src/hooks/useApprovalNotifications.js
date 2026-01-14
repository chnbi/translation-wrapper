import { useCallback } from 'react'

/**
 * Hook to manage "New Approval" notifications
 * Tracks when a user last viewed a page to determine if approvals are "new"
 */
export function useApprovalNotifications() {

    // Get count of newly approved items
    const getNewApprovalCount = useCallback((projectId, pageId, rows) => {
        if (!rows || rows.length === 0) return 0

        const key = `viewed_${projectId}_${pageId || 'main'}`
        const lastViewedStr = localStorage.getItem(key)

        // If never viewed, all approved items are considered new
        if (!lastViewedStr) {
            return rows.filter(r => r.status === 'approved').length
        }

        const lastViewed = new Date(lastViewedStr)

        return rows.filter(r =>
            r.status === 'approved' &&
            r.approvedAt &&
            new Date(r.approvedAt) > lastViewed
        ).length
    }, [])

    // Mark a page as viewed (current timestamp)
    const markAsViewed = useCallback((projectId, pageId) => {
        const key = `viewed_${projectId}_${pageId || 'main'}`
        localStorage.setItem(key, new Date().toISOString())
        // We rely on the caller to trigger a UI refresh if needed (e.g. by state change)
        // Since this uses localStorage, it won't automatically trigger re-renders 
        // unless data passed to getNewApprovalCount changes or component re-renders.
    }, [])

    // Check if a specific row is "newly approved" (for highlighting)
    const isRowNew = useCallback((projectId, pageId, row) => {
        if (row.status !== 'approved' || !row.approvedAt) return false

        const key = `viewed_${projectId}_${pageId || 'main'}`
        const lastViewedStr = localStorage.getItem(key)

        if (!lastViewedStr) return true // Highlight if never viewed

        return new Date(row.approvedAt) > new Date(lastViewedStr)
    }, [])

    return { getNewApprovalCount, markAsViewed, isRowNew }
}
