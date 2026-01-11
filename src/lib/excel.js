// Excel Import/Export using SheetJS
import * as XLSX from 'xlsx'

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

                    // Find header row (looking for language columns)
                    // Support many variations of column names
                    const languageKeywords = [
                        'english', 'malay', 'chinese', 'en', 'bm', 'cn', 'zh',
                        'source', 'target', 'bahasa', 'melayu', 'mandarin',
                        '中文', '英文', '马来文', 'chn', 'eng', 'bahasa malaysia',
                        'chinese (simplified)', 'chinese (traditional)'
                    ]

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

                    // Map common header variations to normalized names
                    const headerMap = {
                        // English variations
                        'en': 'english',
                        'eng': 'english',
                        'source': 'english',
                        '英文': 'english',
                        // Malay variations
                        'bm': 'malay',
                        'bahasa': 'malay',
                        'melayu': 'malay',
                        'bahasa malaysia': 'malay',
                        '马来文': 'malay',
                        // Chinese variations
                        'cn': 'chinese',
                        'zh': 'chinese',
                        'chn': 'chinese',
                        'mandarin': 'chinese',
                        '中文': 'chinese',
                        'chinese (simplified)': 'chinese',
                        'chinese (traditional)': 'chinese',
                    }

                    // Normalize headers - check for partial matches too
                    const normalizedHeaders = headers.map(h => {
                        // Direct match first
                        if (headerMap[h]) return headerMap[h]
                        // Partial match (e.g., "Chinese (Simplified)" contains "chinese")
                        if (h.includes('english') || h.includes('英文')) return 'english'
                        if (h.includes('malay') || h.includes('bahasa') || h.includes('melayu')) return 'malay'
                        if (h.includes('chinese') || h.includes('中文') || h.includes('mandarin')) return 'chinese'
                        return h
                    })

                    // Extract entries
                    const entries = []
                    for (let i = headerRow + 1; i < jsonData.length; i++) {
                        const row = jsonData[i]
                        if (!row || row.every(cell => !cell)) continue // Skip empty rows

                        const entry = {
                            english: '',
                            malay: '',
                            chinese: '',
                            category: '',
                            remark: '',
                            rowIndex: i
                        }

                        normalizedHeaders.forEach((header, idx) => {
                            if (['english', 'malay', 'chinese'].includes(header) && row[idx]) {
                                entry[header] = String(row[idx]).trim()
                            }
                            // Also capture category and remark for glossary imports
                            if (header === 'category' && row[idx]) {
                                entry.category = String(row[idx]).trim()
                            }
                            if ((header === 'remark' || header === 'remarks' || header === 'note' || header === 'notes') && row[idx]) {
                                entry.remark = String(row[idx]).trim()
                            }
                        })

                        // Only add if at least one field has content
                        if (entry.english || entry.malay || entry.chinese) {
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

    Object.entries(projectData.sheets || {}).forEach(([sheetName, sheetData]) => {
        const rows = []

        // Add source URL if exists
        if (sheetData.sourceUrl) {
            rows.push([`Link: ${sheetData.sourceUrl}`])
        }

        // Add headers
        rows.push(['english', 'malay', 'chinese'])

        // Add entries
        sheetData.entries?.forEach(entry => {
            rows.push([entry.english || '', entry.malay || '', entry.chinese || ''])
        })

        const worksheet = XLSX.utils.aoa_to_sheet(rows)

        // Set column widths
        worksheet['!cols'] = [
            { wch: 50 }, // English
            { wch: 50 }, // Malay
            { wch: 50 }  // Chinese
        ]

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31))
    })

    XLSX.writeFile(workbook, filename)
}
