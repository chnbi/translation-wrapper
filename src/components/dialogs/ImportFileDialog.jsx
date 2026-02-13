import { useState, useRef, useCallback } from "react"
import { X, FileSpreadsheet, FileText, Upload, Trash2, Check, Loader2 } from "lucide-react"
import {
    ModalOverlay,
    ModalContent,
    SecondaryButton,
    IconButton,
    PrimaryButton
} from "@/components/ui/shared"
import { detectFileType } from "@/lib/document"
import { toast } from "sonner"

export default function ImportFileDialog({ isOpen, onClose, onImport, title = "Import files", accept = ".xlsx,.xls,.csv,.docx,.pptx,.pdf" }) {
    const [file, setFile] = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const fileInputRef = useRef(null)

    const handleFileSelect = (selectedFile) => {
        if (!selectedFile) return

        // Basic validation
        const fileType = detectFileType(selectedFile)
        if (fileType === 'unknown') {
            toast.error('Unsupported file type')
            return
        }

        setFile(selectedFile)
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

    const handleImport = async () => {
        if (!file) return
        setIsLoading(true)
        try {
            await onImport(file)
            handleClose()
        } catch (error) {
            console.error(error)
            toast.error("Import failed")
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        setFile(null)
        onClose()
    }

    if (!isOpen) return null

    return (
        <ModalOverlay onClose={handleClose}>
            <ModalContent maxWidth="600px" className="rounded-3xl p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[24px] font-bold text-gray-900 tracking-tight">
                        {title}
                    </h2>
                    <IconButton onClick={handleClose} className="text-gray-400 hover:text-gray-600">
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
                            accept={accept}
                            className="hidden"
                        />
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
                            <FileText className="text-white w-6 h-6" />
                        </div>
                        <p className="text-base font-semibold text-gray-900 mb-1">
                            Browse files or drag & drop to upload
                        </p>
                        <p className="text-sm text-gray-500">
                            {accept.replace(/\./g, ' ').toUpperCase()}
                        </p>
                    </div>
                ) : (
                    // File Preview Row
                    <div className="flex items-center justify-between p-4 bg-pink-50/50 rounded-xl mb-8 border border-pink-100">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                                <FileText className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900 truncate max-w-[300px]">
                                    {file.name}
                                </p>
                                <p className="text-xs text-gray-500 font-medium">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 mt-2">
                    <SecondaryButton
                        onClick={handleClose}
                        className="rounded-full h-11 px-6 border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                        Cancel
                    </SecondaryButton>
                    <PrimaryButton
                        onClick={handleImport}
                        disabled={!file || isLoading}
                        className={`rounded-full h-11 px-6 bg-primary hover:bg-primary-hover text-white shadow-sm min-w-[120px] ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            'Import'
                        )}
                    </PrimaryButton>
                </div>
            </ModalContent>
        </ModalOverlay>
    )
}
