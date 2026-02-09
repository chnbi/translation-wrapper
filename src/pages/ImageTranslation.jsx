// Image Translation - Upload images and extract text for translation
// Uses Gemini Vision for OCR
import { useState } from "react"
import { Upload, Image, FileText, Sparkles, X, CheckCircle2, Clock, ArrowRight, Languages, Trash2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
// import { Card } from "@/components/ui/card" // Using shared Card
import { PageContainer, Card, Badge } from "@/components/ui/shared"
import { PageHeader } from "@/components/ui/common"
import { getAI } from "@/api/ai"
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

    // Get AI Provider (Gemini handle vision)
    const ai = getAI('gemini')
    const apiAvailable = !!ai

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
            if (!apiAvailable || !ai.client) {
                // Initialize checks config
                const success = ai.initialize()
                if (!success) {
                    toast.error("Gemini API Key is missing")
                    setError("API Key missing. Please configure VITE_GEMINI_API_KEY.")
                    setState(STATES.ERROR)
                    return
                }
            }

            setProgress(30)
            const lines = await ai.extractTextFromImage(uploadedFile)
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
            // Use the translation service with glossary
            // We reuse the batch translation logic from the main provider
            const results = await ai.generateBatch(
                extractedLines,
                {
                    template: { prompt: 'Translate image text naturally to {{targetLanguage}}. Keep names and numbers as is.' },
                    targetLanguages: ['my', 'zh'],
                    glossaryTerms
                }
            )

            setProgress(90)

            // Merge results with existing lines
            setExtractedLines(prev => prev.map(line => {
                const result = results.find(r => r.id === line.id)
                // Map the structured response back to flat object for this specific UI
                if (result && result.translations) {
                    return {
                        ...line,
                        my: result.translations.my?.text,
                        zh: result.translations.zh?.text,
                        translated: true
                    }
                }
                return line
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
        <PageContainer>
            {/* Header */}
            <div className="flex flex-col gap-2 mb-8">
                <PageHeader description="Translate text from images using AI" className="mb-0">Image Translation</PageHeader>
                {!apiAvailable && (
                    <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 w-fit px-3 py-1 rounded-full border border-rose-100">
                        <AlertCircle className="w-4 h-4" />
                        <span>API key not configured. Functionality disabled.</span>
                    </div>
                )}
            </div>

            {/* Error State */}
            {state === STATES.ERROR && (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/50 p-8">
                    <div className="flex flex-col items-center justify-center py-6">
                        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <p className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Extraction Failed</p>
                        <p className="text-sm text-red-600 dark:text-red-300 mb-6 text-center max-w-md">{error}</p>
                        <Button variant="outline" onClick={handleReset} className="bg-white hover:bg-red-50 border-red-200 text-red-700">
                            Try Again
                        </Button>
                    </div>
                </div>
            )}

            {/* Upload Section */}
            {(state === STATES.UPLOAD || state === STATES.PREVIEW) && (
                <Card className="border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-primary/50 transition-colors">
                    {state === STATES.UPLOAD ? (
                        /* Upload Zone */
                        <label
                            className="flex flex-col items-center justify-center cursor-pointer py-16"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 ring-8 ring-primary/5">
                                <Upload className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-foreground">Drop your image here</h3>
                            <p className="text-sm text-muted-foreground mb-8">or click to browse from your computer</p>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground bg-secondary/50 px-4 py-2 rounded-lg">
                                <span>Supports: JPG, PNG, WEBP</span>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                <span>Max 10MB</span>
                            </div>

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
                            <div className="flex flex-col md:flex-row items-start gap-8">
                                {/* Image Preview */}
                                <div className="relative w-full md:w-64 aspect-square rounded-2xl overflow-hidden bg-muted border border-border flex-shrink-0 group">
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={handleReset}
                                            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* File Info */}
                                <div className="flex-1 py-2">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Image className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground text-lg">{uploadedFile?.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {(uploadedFile?.size / 1024).toFixed(1)} KB • Image File
                                            </p>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="mt-4 p-4 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-sm">
                                            {error}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-3 mt-8">
                                        <Button onClick={handleExtract} className="h-9 px-5 rounded-xl gap-2 font-medium">
                                            <Sparkles className="w-4 h-4" />
                                            Extract Text
                                        </Button>
                                        <Button variant="outline" onClick={handleReset} className="h-9 px-5 rounded-xl">
                                            Upload Different
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* Extracting State */}
            {state === STATES.EXTRACTING && (
                <Card className="min-h-[400px] flex items-center justify-center">
                    <div className="text-center space-y-6 max-w-sm">
                        <div className="relative mx-auto w-24 h-24">
                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                            <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">Extracting Text</h3>
                            <p className="text-muted-foreground">Analyzing image content using AI...</p>
                        </div>
                        <div className="space-y-2">
                            <Progress value={progress} className="h-2 w-full" />
                            <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Translating State */}
            {state === STATES.TRANSLATING && (
                <Card className="min-h-[400px] flex items-center justify-center">
                    <div className="text-center space-y-6 max-w-sm">
                        <div className="relative mx-auto w-24 h-24">
                            <div className="absolute inset-0 bg-violet-500/20 rounded-full animate-ping delay-100" />
                            <div className="relative w-24 h-24 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-violet-600 dark:text-violet-400 animate-spin" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">Translating Content</h3>
                            <p className="text-muted-foreground">Converting to multiple languages...</p>
                        </div>
                        <div className="space-y-2">
                            <Progress value={progress} className="h-2 w-full bg-violet-100 dark:bg-violet-900/30" indicatorClassName="bg-violet-600" />
                            <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Editing State - Extracted Text */}
            {state === STATES.EDITING && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Original Image */}
                        <Card className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-foreground flex items-center gap-2">
                                    <Image className="w-4 h-4 text-muted-foreground" />
                                    Original Image
                                </h3>
                            </div>
                            <div className="rounded-xl overflow-hidden bg-muted border border-border flex-1 flex items-center justify-center bg-gray-50/50">
                                <img
                                    src={previewUrl}
                                    alt="Original"
                                    className="max-w-full max-h-[500px] object-contain"
                                />
                            </div>
                        </Card>

                        {/* Extracted Lines */}
                        <Card className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-6">
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        Extracted Text
                                    </h3>
                                    <p className="text-sm text-muted-foreground">Detected {extractedLines.length} text segments</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handleReset} className="h-9">
                                        Reset
                                    </Button>
                                    {!extractedLines.some(l => l.translated) && (
                                        <Button size="sm" onClick={handleTranslateAll} className="h-9 gap-2">
                                            <Languages className="w-4 h-4" />
                                            Translate
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 -mr-2">
                                {extractedLines.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <p>No text detected</p>
                                    </div>
                                ) : (
                                    extractedLines.map((line, index) => (
                                        <div key={line.id} className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-border transition-all hover:shadow-sm">
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <Badge variant="outline" className="bg-white">Line {index + 1}</Badge>
                                                <button
                                                    onClick={() => handleDeleteLine(line.id)}
                                                    className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="relative">
                                                    <span className="absolute left-0 top-3 w-1 h-4 bg-primary/20 rounded-r-full" />
                                                    <p className="pl-3 text-sm font-medium text-foreground leading-relaxed">{line.text || line.en}</p>
                                                </div>

                                                {line.translated && (
                                                    <div className="pt-3 mt-3 border-t border-border/60 space-y-2.5">
                                                        <div className="flex items-start gap-3 text-sm group">
                                                            <span className="w-8 shrink-0 font-medium text-muted-foreground pt-0.5">MY</span>
                                                            <span className="text-foreground group-hover:text-primary transition-colors">{line.my || '—'}</span>
                                                        </div>
                                                        <div className="flex items-start gap-3 text-sm group">
                                                            <span className="w-8 shrink-0 font-medium text-muted-foreground pt-0.5">ZH</span>
                                                            <span className="text-foreground group-hover:text-primary transition-colors">{line.zh || '—'}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Completion Status */}
                    {extractedLines.some(l => l.translated) && (
                        <div className="fixed bottom-6 right-6 z-10 animate-in slide-in-from-bottom-10 fade-in">
                            <Card className="flex items-center gap-4 p-4 shadow-xl border-primary/20 bg-background/80 backdrop-blur">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground">Translation Complete</p>
                                    <p className="text-sm text-muted-foreground">Ready to export or review</p>
                                </div>
                                <div className="flex gap-2 ml-4 border-l pl-4 border-border">
                                    <Button size="sm" onClick={() => toast.info('Export coming soon!')}>
                                        Export
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            )}
        </PageContainer>
    )
}
