// Image Translation - Upload images and extract text for translation
// Uses Gemini Vision for OCR
import { useState } from "react"
import { Upload, Image, FileText, Sparkles, X, CheckCircle2, Clock, ArrowRight, Languages, Trash2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { extractTextFromImage, extractAndTranslate, isVisionAvailable, translateBatch } from "@/api/gemini"
import { useGlossary } from "@/context/GlossaryContext"
import { toast } from "sonner"

// Workflow states
const STATES = {
    UPLOAD: 'upload',      // Initial - waiting for file
    PREVIEW: 'preview',    // File uploaded, ready to extract
    EXTRACTING: 'extracting', // OCR in progress
    EDITING: 'editing',    // Extracted text, ready to edit/translate
    TRANSLATING: 'translating', // Translation in progress
    ERROR: 'error',        // Error state
}

export default function ImageTranslation() {
    const [state, setState] = useState(STATES.UPLOAD)
    const [uploadedFile, setUploadedFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [extractedLines, setExtractedLines] = useState([])
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState(null)

    const { terms: glossaryTerms } = useGlossary()
    const apiAvailable = isVisionAvailable()

    // Handle file upload
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            setUploadedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
            setState(STATES.PREVIEW)
            setError(null)
        }
    }

    // Handle drag and drop
    const handleDrop = (e) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith('image/')) {
            setUploadedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
            setState(STATES.PREVIEW)
            setError(null)
        }
    }

    // Extract text using Gemini Vision API
    const handleExtract = async () => {
        if (!uploadedFile) return

        setState(STATES.EXTRACTING)
        setProgress(10)
        setError(null)

        try {
            if (!apiAvailable) {
                toast.error("Gemini API Key is missing")
                setError("API Key missing. Please configure VITE_GEMINI_API_KEY.")
                setState(STATES.ERROR)
                return
            }

            setProgress(30)
            const lines = await extractTextFromImage(uploadedFile)
            setProgress(100)

            if (lines.length === 0) {
                setError('No text found in the image. Try a different image.')
                setState(STATES.PREVIEW)
                return
            }

            setExtractedLines(lines)
            setState(STATES.EDITING)

        } catch (err) {
            console.error('[OCR] Extraction failed:', err)
            setError(err.message || 'Failed to extract text from image')
            setState(STATES.ERROR)
        }
    }



    // Reset to initial state
    const handleReset = () => {
        setUploadedFile(null)
        setPreviewUrl(null)
        setExtractedLines([])
        setProgress(0)
        setError(null)
        setState(STATES.UPLOAD)
    }

    // Delete a line
    const handleDeleteLine = (lineId) => {
        setExtractedLines(prev => prev.filter(line => line.id !== lineId))
    }

    // Translate all lines using Gemini
    const handleTranslateAll = async () => {
        setState(STATES.TRANSLATING)
        setProgress(20)

        try {
            if (!apiAvailable) {
                toast.error("Gemini API Key is missing")
                return
            }

            // Use the translation service with glossary
            const results = await translateBatch(
                extractedLines,
                { name: 'Image Content', prompt: 'Translate image text naturally.' },
                { targetLanguages: ['my', 'zh'], glossaryTerms }
            )

            setProgress(90)

            // Merge results with existing lines
            setExtractedLines(prev => prev.map(line => {
                const result = results.find(r => r.id === line.id)
                return result ? { ...line, ...result, translated: true } : line
            }))

            setProgress(100)
            setState(STATES.EDITING)

        } catch (err) {
            console.error('[Translation] Failed:', err)
            setError('Translation failed: ' + (err.message || 'Unknown error'))
            setState(STATES.EDITING)
        }
    }



    // Edit line text
    const handleEditLine = (lineId, field, value) => {
        setExtractedLines(prev => prev.map(line =>
            line.id === lineId ? { ...line, [field]: value } : line
        ))
    }

    return (
        <div className="w-full pb-10 space-y-8">
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: 'hsl(222, 47%, 11%)' }}>Image Translation</h1>
                {!apiAvailable && (
                    <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>API key not configured. Functionality disabled.</span>
                    </div>
                )}
            </div>

            {/* Error State */}
            {state === STATES.ERROR && (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-8">
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-lg font-medium text-red-700 dark:text-red-400 mb-2">Extraction Failed</p>
                        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
                        <Button variant="outline" onClick={handleReset}>
                            Try Again
                        </Button>
                    </div>
                </div>
            )}

            {/* Upload Section */}
            {(state === STATES.UPLOAD || state === STATES.PREVIEW) && (
                <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 transition-colors hover:border-primary/50">
                    {state === STATES.UPLOAD ? (
                        /* Upload Zone */
                        <label
                            className="flex flex-col items-center justify-center cursor-pointer py-12"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                                <Upload className="w-8 h-8 text-primary" />
                            </div>
                            <p className="text-lg font-medium mb-1">Drop your image here</p>
                            <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                            <p className="text-xs text-muted-foreground">Supports: JPG, PNG, WEBP (Max 10MB)</p>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </label>
                    ) : (
                        /* Preview Zone */
                        <div className="space-y-6">
                            <div className="flex items-start gap-6">
                                {/* Image Preview */}
                                <div className="relative w-48 h-48 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        onClick={handleReset}
                                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* File Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Image className="w-5 h-5 text-primary" />
                                        <span className="font-medium">{uploadedFile?.name}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {(uploadedFile?.size / 1024).toFixed(1)} KB
                                    </p>

                                    {error && (
                                        <p className="text-sm text-amber-600 mb-4">{error}</p>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <Button onClick={handleExtract} className="gap-2">
                                            <Sparkles className="w-4 h-4" />
                                            Extract Text
                                        </Button>
                                        <Button variant="outline" onClick={handleReset}>
                                            Upload Different
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Extracting State */}
            {state === STATES.EXTRACTING && (
                <div className="rounded-2xl border border-border bg-card p-8">
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
                            <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-lg font-medium mb-4">Extracting text from image...</p>
                        <div className="w-64">
                            <Progress value={progress} className="h-2" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
                    </div>
                </div>
            )}

            {/* Translating State */}
            {state === STATES.TRANSLATING && (
                <div className="rounded-2xl border border-border bg-card p-8">
                    <div className="flex flex-col items-center justify-center py-8">
                        <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center mb-4">
                            <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
                        </div>
                        <p className="text-lg font-medium mb-4">Translating content...</p>
                        <div className="w-64">
                            <Progress value={progress} className="h-2" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Translating to Malay and Chinese...
                        </p>
                    </div>
                </div>
            )}

            {/* Editing State - Extracted Text */}
            {state === STATES.EDITING && (
                <>
                    {/* Image + Extracted Lines */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Original Image */}
                        <div className="rounded-2xl border border-border bg-card p-4">
                            <p className="text-sm font-medium text-muted-foreground mb-3">Original Image</p>
                            <div className="rounded-xl overflow-hidden bg-muted">
                                <img
                                    src={previewUrl}
                                    alt="Original"
                                    className="w-full h-auto"
                                />
                            </div>
                        </div>

                        {/* Extracted Lines */}
                        <div className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-medium text-muted-foreground">Extracted Text</p>
                                <span className="text-xs bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                    {extractedLines.length} lines
                                </span>
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {extractedLines.map((line, index) => (
                                    <div key={line.id} className="p-3 rounded-xl bg-muted/50 border border-border/50">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className="text-xs text-muted-foreground">Line {index + 1}</span>
                                            <button
                                                onClick={() => handleDeleteLine(line.id)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <p className="text-sm font-medium mb-2">{line.text || line.en}</p>
                                        {line.translated && (
                                            <div className="space-y-1 text-xs border-t border-border/50 pt-2 mt-2">
                                                <div className="flex gap-2">
                                                    <span className="text-muted-foreground w-6">MY:</span>
                                                    <span className="text-foreground">{line.my || '—'}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-muted-foreground w-6">ZH:</span>
                                                    <span className="text-foreground">{line.zh || '—'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border/50">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>
                                {extractedLines.some(l => l.translated)
                                    ? `${extractedLines.filter(l => l.translated).length}/${extractedLines.length} lines translated`
                                    : 'Text extracted successfully'
                                }
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handleReset}>
                                Start Over
                            </Button>
                            {!extractedLines.every(l => l.translated) && (
                                <Button className="gap-2" onClick={handleTranslateAll}>
                                    <Languages className="w-4 h-4" />
                                    Translate All
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
