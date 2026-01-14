// Export utilities for Excel/CSV exports
// Extracted from project-details.jsx and glossary-library.jsx

import * as XLSX from 'xlsx'

/**
 * Export data to Excel file
 * @param {Object[]} data - Array of objects to export
 * @param {string} filename - Output filename (without extension)
 * @param {string} sheetName - Sheet name in Excel
 * @param {Object} columnMapping - Optional mapping from data keys to column headers
 */
export function exportToExcel(data, filename, sheetName = 'Sheet1', columnMapping = null) {
    if (!data || data.length === 0) {
        console.warn('[Export] No data to export')
        return false
    }

    try {
        // If column mapping provided, transform data
        let exportData = data
        if (columnMapping) {
            exportData = data.map(row => {
                const mapped = {}
                Object.entries(columnMapping).forEach(([key, header]) => {
                    mapped[header] = row[key] ?? ''
                })
                return mapped
            })
        }

        const ws = XLSX.utils.json_to_sheet(exportData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
        XLSX.writeFile(wb, `${filename}.xlsx`)

        console.log(`[Export] Successfully exported ${data.length} rows to ${filename}.xlsx`)
        return true
    } catch (error) {
        console.error('[Export] Error:', error)
        return false
    }
}

/**
 * Export project rows to Excel
 * Standard format: English, Bahasa Malaysia, Chinese
 */
export function exportProjectToExcel(rows, projectName) {
    const columnMapping = {
        en: 'English',
        my: 'Bahasa Malaysia',
        zh: 'Chinese'
    }
    return exportToExcel(rows, `${projectName}_export`, projectName, columnMapping)
}

/**
 * Export glossary terms to Excel
 * Standard format: English, Bahasa Malaysia, Chinese, Category, Remark
 */
export function exportGlossaryToExcel(terms, filename = 'glossary_export') {
    const columnMapping = {
        english: 'English',
        malay: 'Bahasa Malaysia',
        chinese: 'Chinese',
        category: 'Category',
        remark: 'Remark'
    }
    return exportToExcel(terms, filename, 'Glossary', columnMapping)
}

/**
 * Export data to CSV (simpler format)
 */
export function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        console.warn('[Export] No data to export')
        return false
    }

    try {
        const ws = XLSX.utils.json_to_sheet(data)
        const csv = XLSX.utils.sheet_to_csv(ws)

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${filename}.csv`
        link.click()
        URL.revokeObjectURL(url)

        return true
    } catch (error) {
        console.error('[Export] CSV Error:', error)
        return false
    }
}
