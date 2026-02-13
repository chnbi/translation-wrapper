// Excel Import/Export using SheetJS
import * as XLSX from 'xlsx'
import { LANGUAGES } from '@/lib/constants'

/**
 * Parse an Excel file and return structured data
 * @param {File} file - The Excel file to parse
 * @returns {Promise<Object>} Object with sheet names as keys and arrays of rows as values
 */
export async function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })

                const result = {}

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName]
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

                    // Skip empty sheets
                    if (jsonData.length === 0) return

                    // First row might be headers or URL reference
                    const firstRow = jsonData[0]
                    let startRow = 0
                    let sourceUrl = ''

                    // Check if first row is a URL reference
                    if (firstRow[0] && typeof firstRow[0] === 'string' && firstRow[0].startsWith('Link:')) {
                        sourceUrl = firstRow[0].replace('Link:', '').trim()
                        startRow = 1
                    }

                    // Build dynamic keywords from constants
                    const languageKeywords = ['source', 'target', 'english', 'eng', 'en'] // Always include English/Source
                    Object.values(LANGUAGES).forEach(lang => {
                        languageKeywords.push(lang.label.toLowerCase())
                        languageKeywords.push(lang.nativeLabel.toLowerCase())
                        languageKeywords.push(lang.code.toLowerCase())
                    })

                    // Find header row
                    let headerRow = startRow
                    for (let i = startRow; i < Math.min(startRow + 5, jsonData.length); i++) {
                        const row = jsonData[i]
                        if (row && row.some(cell =>
                            typeof cell === 'string' &&
                            languageKeywords.some(kw => cell.toLowerCase().includes(kw))
                        )) {
                            headerRow = i
                            break
                        }
                    }

                    const headers = jsonData[headerRow]?.map(h =>
                        typeof h === 'string' ? h.toLowerCase().trim() : ''
                    ) || []

                    // Build dynamic header map
                    const headerMap = {
                        'source': 'en',
                        'english': 'en',
                        'eng': 'en',
                        'en': 'en',
                        '英文': 'en',
                        'english (en)': 'en',
                        'bm': 'my',
                        'mandarin': 'zh',
                        '中文': 'zh',
                    }

                    Object.values(LANGUAGES).forEach(lang => {
                        if (lang.code === 'en') return
                        headerMap[lang.code] = lang.code
                        headerMap[lang.label.toLowerCase()] = lang.code
                        headerMap[lang.nativeLabel.toLowerCase()] = lang.code
                    })

                    // Normalize headers
                    const normalizedHeaders = headers.map(h => {
                        // Direct match
                        if (headerMap[h]) return headerMap[h]

                        // Partial match logic
                        if (h.includes('english') || h.includes('source')) return 'en'

                        const matchedLang = Object.values(LANGUAGES).find(lang =>
                            h.includes(lang.label.toLowerCase()) ||
                            h.includes(lang.nativeLabel.toLowerCase())
                        )
                        return matchedLang ? matchedLang.code : h
                    })

                    // Extract entries
                    const entries = []
                    for (let i = headerRow + 1; i < jsonData.length; i++) {
                        const row = jsonData[i]
                        if (!row || row.every(cell => !cell)) continue // Skip empty rows

                        const entry = {
                            rowIndex: i
                        }

                        normalizedHeaders.forEach((header, idx) => {
                            // If header matches a language code
                            if (LANGUAGES[header] && row[idx]) {
                                entry[header] = String(row[idx]).trim()
                            }

                            // Map source explicitly to 'en' if not already
                            if (header === 'en' && row[idx]) {
                                entry.en = String(row[idx]).trim()
                            }

                            if ((header === 'category') && row[idx]) {
                                entry.category = String(row[idx]).trim()
                            }
                            if ((header === 'remark' || header === 'remarks' || header === 'note' || header === 'notes') && row[idx]) {
                                entry.remark = String(row[idx]).trim()
                            }
                        })

                        // Only add if at least one field has content
                        const hasContent = Object.keys(entry).some(k => k !== 'rowIndex' && k !== 'category' && k !== 'remark')
                        if (hasContent) {
                            entries.push(entry)
                        }
                    }

                    result[sheetName] = {
                        name: sheetName,
                        sourceUrl,
                        entries
                    }
                })

                resolve(result)
            } catch (error) {
                reject(error)
            }
        }

        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsArrayBuffer(file)
    })
}

/**
 * Export data to Excel file
 * @param {Object} projectData - Project data with sheets
 * @param {string} filename - Output filename
 */
export function exportToExcel(projectData, filename = 'translations.xlsx') {
    const workbook = XLSX.utils.book_new()

    // Get all languages except source
    const targetLangs = Object.values(LANGUAGES).filter(l => l.code !== 'en')
    const headerRow = ['english', ...targetLangs.map(l => l.label.toLowerCase())]

    Object.entries(projectData.sheets || {}).forEach(([sheetName, sheetData]) => {
        const rows = []

        // Add source URL if exists
        if (sheetData.sourceUrl) {
            rows.push([`Link: ${sheetData.sourceUrl}`])
        }

        // Add headers
        rows.push(headerRow)

        // Add entries
        sheetData.entries?.forEach(entry => {
            const rowData = [entry.en || entry.english || '']
            targetLangs.forEach(lang => {
                // Determine property name - might be code or property?
                // Assuming export uses codes if normalized or passed from DB
                // We check multiple variations
                rowData.push(entry[lang.code] || entry[lang.label.toLowerCase()] || '')
            })
            rows.push(rowData)
        })

        const worksheet = XLSX.utils.aoa_to_sheet(rows)

        // Set column widths
        worksheet['!cols'] = [
            { wch: 50 }, // English
            ...targetLangs.map(() => ({ wch: 50 })) // Others
        ]

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31))
    })

    XLSX.writeFile(workbook, filename)
}
