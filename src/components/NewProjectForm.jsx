// New Project Form - Figma-styled modal for creating new projects
// Also supports import mode when importData is provided
import { useState, useEffect, useRef, useCallback } from "react"
import { X, FileSpreadsheet, FileText, Upload, Trash2, Check } from "lucide-react"
import {
    ModalOverlay,
    ModalContent,
    FormField,
    TextInput,
    PrimaryButton,
    SecondaryButton,
    IconButton,
} from "@/components/ui/shared"
import { LANGUAGES, COLORS, DESIGN_TOKENS } from "@/lib/constants"
import { parseFile, detectFileType } from "@/lib/document"
import { toast } from "sonner"

// Derive settings locally since global constants were removed for dynamic support
const AVAILABLE_TARGET_LANGUAGES = Object.values(LANGUAGES).filter(l => l.code !== 'en')
const DEFAULT_TARGET_LANGUAGES = ['my', 'zh']



export default function NewProjectForm({ isOpen, onClose, onSubmit, importData = null }) {
    // importData is legacy prop, we now handle file import internally
    // But we keep it in case Dashboard passes it (though we plan to remove it from Dashboard)

    const [projectName, setProjectName] = useState('')
    const [description, setDescription] = useState('')
    const [selectedLanguages, setSelectedLanguages] = useState(DEFAULT_TARGET_LANGUAGES)
    const [file, setFile] = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const [parsedSheets, setParsedSheets] = useState(null)
    const [isParsing, setIsParsing] = useState(false)

    // Legacy support: if importData passed, populate file state mock
    useEffect(() => {
        if (importData) {
            setProjectName(importData.fileName || '')
            // We can't easily reconstruct the File object, but we can store the parsed sheets
            setParsedSheets(importData.sheets)
            // Mock file display
            setFile({ name: `${importData.fileName}.${importData.fileType || 'xlsx'}` })
        } else {
            // Reset on open
            if (isOpen) {
                setProjectName('')
                setDescription('')
                setFile(null)
                setParsedSheets(null)
                setSelectedLanguages(DEFAULT_TARGET_LANGUAGES)
            }
        }
    }, [importData, isOpen])

    const fileInputRef = useRef(null)

    // File Handling Logic
    const handleFileSelect = async (selectedFile) => {
        if (!selectedFile) return

        setIsParsing(true)
        try {
            // Check file type
            const fileType = detectFileType(selectedFile)
            if (fileType === 'unknown') {
                toast.error('Unsupported file type. Please upload .xlsx, .docx, .pptx, .pdf, or .csv')
                setIsParsing(false)
                return
            }

            setFile(selectedFile)

            // Auto-fill project name if empty
            if (!projectName) {
                const name = selectedFile.name.replace(/\.[^/.]+$/, "")
                setProjectName(name)
            }

            // Parse file immediately
            let sheets = {}
            if (fileType === 'docx' || fileType === 'pptx' || fileType === 'pdf') {
                const data = await parseFile(selectedFile)
                sheets[data.name || 'Document'] = data.entries.map(entry => ({
                    en: entry.en || entry.text || '',
                    context: entry.context || '',
                    translations: {}
                }))
            } else {
                // Excel/CSV
                const { parseExcelFile } = await import('@/lib/excel')
                const data = await parseExcelFile(selectedFile)
                Object.values(data).forEach(sheet => {
                    sheets[sheet.name] = sheet.entries
                })
            }

            setParsedSheets(sheets)
            toast.success(`File parsed: ${Object.keys(sheets).length} sheet(s) found`)

        } catch (error) {
            console.error("File parsing error:", error)
            toast.error("Failed to parse file: " + error.message)
            setFile(null)
        } finally {
            setIsParsing(false)
        }
    }

    const onDragOver = useCallback((e) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const onDragLeave = useCallback((e) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const onDrop = useCallback((e) => {
        e.preventDefault()
        setIsDragging(false)
        const droppedFile = e.dataTransfer.files?.[0]
        if (droppedFile) {
            handleFileSelect(droppedFile)
        }
    }, [])


    if (!isOpen) return null

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!projectName.trim()) return

        const projectData = {
            name: projectName.trim(),
            description: description.trim(),
            targetLanguages: selectedLanguages,
            themeColor: 'pink', // Defaulting to pink theme as per design
        }

        // Include parsed data if exists
        if (parsedSheets) {
            projectData.sheets = parsedSheets
        }

        onSubmit(projectData)
        onClose()
    }

    const toggleLanguage = (langId) => {
        setSelectedLanguages(prev =>
            prev.includes(langId)
                ? prev.filter(id => id !== langId)
                : [...prev, langId]
        )
    }

    const getFileIcon = (fileName) => {
        if (!fileName) return <FileText />
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.csv')) return <FileSpreadsheet className="text-emerald-500" />
        if (fileName.endsWith('.pptx')) return <FileText className="text-orange-500" /> // Pptx icon?
        return <FileText className="text-blue-500" />
    }

    return (
        <ModalOverlay onClose={onClose}>
            <ModalContent maxWidth="680px" className="rounded-3xl p-8">
                {/* Header with close button */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[28px] font-bold text-gray-900 tracking-tight">
                        New Project
                    </h2>
                    <IconButton onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </IconButton>
                </div>

                {/* File Upload Section */}
                {!file ? (
                    <div
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-xl p-10 
                            flex flex-col items-center justify-center cursor-pointer 
                            transition-all duration-200 mb-6
                            ${isDragging ? 'border-primary bg-primary/5' : 'border-pink-300 hover:border-pink-400 hover:bg-pink-50/30'}
                        `}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => handleFileSelect(e.target.files?.[0])}
                            accept=".xlsx,.xls,.csv,.docx,.pptx,.pdf"
                            className="hidden"
                        />
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                            <FileText className="text-white w-6 h-6" />
                        </div>
                        <p className="text-base font-semibold text-gray-900 mb-1">
                            Browse files or drag & drop to upload
                        </p>
                        <p className="text-sm text-gray-500">
                            .csv, .xlsx, .xls, .docx, .pptx, .pdf
                        </p>
                    </div>
                ) : (
                    // File Preview Row
                    <div className="flex items-center justify-between p-5 bg-pink-50/50 rounded-2xl mb-6 border border-pink-100">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                                <FileText className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">
                                    {detectFileType(file) === 'unknown' ? '.ext' : `.${detectFileType(file)}`}
                                </p>
                            </div>
                            <p className="text-sm text-gray-700">
                                {file.name}
                            </p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setFile(null); setParsedSheets(null); }}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
                        >
                            <Trash2 className="w-[18px] h-[18px]" />
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Project Name */}
                    {/* Label with * red */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                            Project name<span className="text-primary ml-0.5">*</span>
                        </label>
                        <TextInput
                            placeholder="Project Name"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="h-[50px] rounded-lg border-gray-200 px-4 text-[15px] focus:ring-primary/20 focus:border-primary"
                            required
                        />
                    </div>

                    {/* Project Description */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-500 mb-1.5">
                            Project Description
                        </label>
                        <TextInput
                            placeholder="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="h-[50px] rounded-lg border-gray-200 px-4 text-[15px] focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    {/* Target Languages */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-500 mb-3">
                            Target Language<span className="text-primary ml-0.5">*</span>
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {AVAILABLE_TARGET_LANGUAGES.map(lang => {
                                const isSelected = selectedLanguages.includes(lang.id)
                                return (
                                    <button
                                        key={lang.id}
                                        type="button"
                                        onClick={() => toggleLanguage(lang.id)}
                                        className={`
                                            flex items-center justify-between gap-2 px-5 py-2 rounded-full text-[15px] cursor-pointer transition-all duration-150 min-w-[140px] border
                                            ${isSelected ? 'border-primary bg-white text-primary shadow-sm' : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50'}
                                        `}
                                    >
                                        {lang.label}
                                        {isSelected && (
                                            <Check className="w-4 h-4" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 mt-10">
                        <SecondaryButton
                            onClick={onClose}
                            className="rounded-full h-11 px-6 border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton
                            type="submit"
                            disabled={!projectName.trim() || selectedLanguages.length === 0 || isParsing}
                            className={`rounded-full h-11 px-6 bg-primary hover:bg-primary-hover text-white shadow-sm ${isParsing ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {isParsing ? 'Parsing...' : 'Create project'}
                        </PrimaryButton>
                    </div>
                </form>
            </ModalContent>
        </ModalOverlay>
    )
}
