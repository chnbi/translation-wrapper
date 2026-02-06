import { useState, useCallback, useRef, useEffect } from "react"
import { Upload, FileSpreadsheet, Check, Loader2, X, Plus, AlertCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { parseExcelFile } from "@/lib/excel"
import { cn } from "@/lib/utils"

export default function ImportGlossaryDialog({ open, onOpenChange, onImport }) {
    // files: { id, name, sheetName, rows: [], headers: [] }
    const [files, setFiles] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [mapping, setMapping] = useState({ en: '', my: '', cn: '' })
    const fileInputRef = useRef(null)

    // Reset when opening
    useEffect(() => {
        if (open) {
            setFiles([])
            setMapping({ en: '', my: '', cn: '' })
        }
    }, [open])

    const processFile = useCallback(async (selectedFile) => {
        if (!selectedFile) return

        setIsLoading(true)
        try {
            const parsed = await parseExcelFile(selectedFile)

            // Find first sheet with data
            const sheetEntry = Object.entries(parsed).find(([_, data]) => data.entries && data.entries.length > 0)

            if (!sheetEntry) {
                console.warn(`No data found in ${selectedFile.name}`)
                setIsLoading(false)
                return
            }

            const [sheetName, data] = sheetEntry
            const rawEntries = data.entries || []

            if (rawEntries.length === 0) {
                setIsLoading(false)
                return
            }

            // Extract headers from first row keys
            const headers = Object.keys(rawEntries[0]).filter(k => k !== '__rowNum__')

            const newFile = {
                id: Math.random().toString(36).substr(2, 9),
                name: selectedFile.name,
                sheetName,
                rows: rawEntries,
                headers,
                count: rawEntries.length
            }

            setFiles(prev => {
                const next = [...prev, newFile]
                // If this is the first file, verify default mapping matches
                if (prev.length === 0) {
                    autoMapColumns(headers)
                }
                return next
            })

        } catch (error) {
            console.error("Error reading file:", error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const autoMapColumns = (headers) => {
        const lowerHeaders = headers.map(h => h.toLowerCase())
        const newMap = { en: '', my: '', cn: '' }

        // Helper to find header
        const find = (keywords) => headers.find(h => keywords.includes(h.toLowerCase().trim())) || ''

        newMap.en = find(['english', 'en', 'term', 'source', 'source text', 'en-us'])
        newMap.my = find(['bahasa malaysia', 'malay', 'bahasa', 'my', 'bm', 'ms', 'ms-my'])
        newMap.cn = find(['chinese', 'simplified chinese', 'zh', 'cn', 'zh-cn', 'zh-hans'])

        setMapping(prev => ({ ...prev, ...newMap }))
    }

    const handleFileChange = (e) => {
        if (e.target.files?.[0]) {
            processFile(e.target.files[0])
            // Reset input so same file can be selected again if needed
            e.target.value = ''
        }
    }

    const handleRemoveFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id))
    }

    const handleImport = () => {
        // Validation
        if (!mapping.en) {
            // Show error or shake
            return
        }

        // Aggregate all terms
        const allTerms = files.flatMap(file => {
            return file.rows.map(row => ({
                en: row[mapping.en] || '',
                my: row[mapping.my] || '',
                cn: row[mapping.cn] || '',
                category: row['category'] || row['Category'] || 'General',
                remark: row['remark'] || row['Remark'] || '',
                status: 'draft' // Default imported status
            })).filter(t => t.en) // Filter empty English
        })

        onImport(allTerms)
        handleClose()
    }

    const handleClose = () => {
        setFiles([])
        onOpenChange(false)
    }

    const totalRows = files.reduce((acc, f) => acc + f.count, 0)

    // Get aggregated headers for mapping (union of all file headers? or just use first file?)
    // Simplification: Use headers from the first file for mapping setup
    // Ideally we should warn if subsequent files don't match, but for now we assume similar structure
    const displayHeaders = files.length > 0 ? files[0].headers : []

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false) }
    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        const droppedFile = e.dataTransfer.files?.[0]
        if (droppedFile) processFile(droppedFile)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Import Glossary Terms</DialogTitle>
                    <DialogDescription>
                        Upload one or more Excel files. Data will be combined.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Area 1: Files List & Upload */}
                    <div className="space-y-3">
                        <Label>Files</Label>

                        {files.length > 0 ? (
                            <div className="space-y-2">
                                {files.map(file => (
                                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-xl bg-muted/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                                                <FileSpreadsheet className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">{file.sheetName} • {file.count} terms</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveFile(file.id)}
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}

                                <Button
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border-dashed"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add another file
                                </Button>
                            </div>
                        ) : (
                            <label
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors bg-muted/10",
                                    isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/20"
                                )}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                        <span className="text-xs text-muted-foreground font-medium">Click to upload or drag file</span>
                                    </>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    {/* Area 2: Column Mapping (Only if files exist) */}
                    {files.length > 0 && (
                        <div className="space-y-3 pt-2 border-t">
                            <div className="space-y-1">
                                <Label>Map Columns</Label>
                                <p className="text-xs text-muted-foreground">Select which columns from your file match the required fields below.</p>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">English (Required)</label>
                                    <select
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={mapping.en}
                                        onChange={(e) => setMapping(prev => ({ ...prev, en: e.target.value }))}
                                    >
                                        <option value="">Select column...</option>
                                        {displayHeaders.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Bahasa Malaysia</label>
                                    <select
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={mapping.my}
                                        onChange={(e) => setMapping(prev => ({ ...prev, my: e.target.value }))}
                                    >
                                        <option value="">Select column...</option>
                                        {displayHeaders.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Chinese</label>
                                    <select
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={mapping.cn}
                                        onChange={(e) => setMapping(prev => ({ ...prev, cn: e.target.value }))}
                                    >
                                        <option value="">Select column...</option>
                                        {displayHeaders.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Cancel</Button>
                    <Button
                        onClick={handleImport}
                        disabled={files.length === 0 || !mapping.en}
                        className="min-w-[140px]"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            `Import ${totalRows} Terms`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
