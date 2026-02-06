// Quick Check - Translation tool with glossary highlighting
// Uses consistent styling with DataTable component
import { useState, useMemo } from "react"
import { useGlossary } from "@/context/GlossaryContext"
import { usePrompts } from "@/context/PromptContext"
import { translateBatch } from "@/api/gemini/text"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TABLE_STYLES } from "@/components/ui/DataTable"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'my', name: 'Bahasa Malaysia' },
    { code: 'zh', name: 'Chinese' },
]

// Escape special regex characters
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Find glossary matches in text
function findGlossaryMatches(text, glossaryTerms, languageCode) {
    if (!text || !glossaryTerms || glossaryTerms.length === 0) return []

    // Map language codes to possible field names (check multiple)
    const fieldMap = {
        en: ['en', 'english'],
        my: ['my', 'malay'],
        zh: ['cn', 'chinese', 'zh']
    }
    const fields = fieldMap[languageCode]
    if (!fields) return []

    const matches = []
    const notFound = []

    for (const term of glossaryTerms) {
        // Try multiple field names
        let termValue = null
        for (const field of fields) {
            if (term[field]?.trim()) {
                termValue = term[field].trim()
                break
            }
        }
        if (!termValue) {
            // Track terms missing target language translation
            if (term.en) notFound.push({ en: term.en, reason: 'No target translation' })
            continue
        }

        const pattern = languageCode === 'zh'
            ? escapeRegex(termValue)
            : `\\b${escapeRegex(termValue)}\\b`

        const regex = new RegExp(pattern, languageCode === 'zh' ? 'g' : 'gi')

        let match
        let hasMatch = false
        while ((match = regex.exec(text)) !== null) {
            hasMatch = true
            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                term: term,
                matchedText: match[0]
            })
        }

        // Track terms that have translation but not found in text
        if (!hasMatch && term.en) {
            notFound.push({ en: term.en, searched: termValue, reason: 'Not in translated text' })
        }
    }

    matches.sort((a, b) => a.start - b.start)

    const filtered = []
    for (const match of matches) {
        const lastMatch = filtered[filtered.length - 1]
        if (!lastMatch || match.start >= lastMatch.end) {
            filtered.push(match)
        } else if (match.end - match.start > lastMatch.end - lastMatch.start) {
            filtered[filtered.length - 1] = match
        }
    }

    // Debug log
    console.log(`[QuickCheck] ${languageCode.toUpperCase()}: Found ${filtered.length} matches:`, filtered.map(m => m.matchedText))
    if (notFound.length > 0 && languageCode === 'zh') {
        console.log(`[QuickCheck] ZH terms NOT matched:`, notFound)
    }

    return filtered
}

// Render text with highlighted glossary matches (Linked Hover)
function HighlightedText({ text, matches, hoveredTermId, onHoverTerm }) {
    if (!text) return null
    if (!matches || matches.length === 0) {
        return <span>{text}</span>
    }

    const parts = []
    let lastIndex = 0

    for (const match of matches) {
        if (match.start > lastIndex) {
            parts.push(
                <span key={`text-${lastIndex}`}>
                    {text.slice(lastIndex, match.start)}
                </span>
            )
        }

        const isHovered = hoveredTermId === match.term.id

        parts.push(
            <span
                key={`match-${match.start}`}
                className="font-semibold cursor-default transition-colors px-0.5 rounded-sm"
                onMouseEnter={() => onHoverTerm && onHoverTerm(match.term.id)}
                onMouseLeave={() => onHoverTerm && onHoverTerm(null)}
                style={{
                    color: '#FF0084',
                    backgroundColor: isHovered ? 'hsl(329, 100%, 94%)' : 'transparent',
                    transition: 'background-color 0.15s'
                }}
            >
                {match.matchedText}
            </span>
        )

        lastIndex = match.end
    }

    if (lastIndex < text.length) {
        parts.push(
            <span key={`text-${lastIndex}`}>
                {text.slice(lastIndex)}
            </span>
        )
    }

    return <>{parts}</>
}

export default function QuickCheck() {
    const { terms: glossaryTerms } = useGlossary()
    const { templates } = usePrompts()

    const [sourceLanguage, setSourceLanguage] = useState('en')
    const [targetLanguage, setTargetLanguage] = useState('zh')
    const [sourceText, setSourceText] = useState('')
    const [translatedText, setTranslatedText] = useState('')
    const [isTranslating, setIsTranslating] = useState(false)
    const [hasTranslated, setHasTranslated] = useState(false)
    const [isEditing, setIsEditing] = useState(true)
    const [hoveredTermId, setHoveredTermId] = useState(null)

    // Get default template
    const defaultTemplate = useMemo(() => {
        const publishedTemplates = templates?.filter(t => t.status !== 'draft') || []
        return publishedTemplates.find(t => t.isDefault) ||
            publishedTemplates[0] ||
        {
            name: 'Default',
            prompt: 'Translate accurately while maintaining the original meaning and tone.'
        }
    }, [templates])

    // Find matches in source and target text
    const sourceMatches = useMemo(() =>
        hasTranslated ? findGlossaryMatches(sourceText, glossaryTerms, sourceLanguage) : [],
        [sourceText, glossaryTerms, sourceLanguage, hasTranslated]
    )

    const targetMatches = useMemo(() =>
        hasTranslated ? findGlossaryMatches(translatedText, glossaryTerms, targetLanguage) : [],
        [translatedText, glossaryTerms, targetLanguage, hasTranslated]
    )

    const canTranslate = sourceText.trim().length > 0 && !isTranslating

    const handleTranslate = async () => {
        if (!canTranslate) return

        setIsTranslating(true)
        setTranslatedText('')
        setHasTranslated(false)

        try {
            const results = await translateBatch(
                [{ id: 1, [sourceLanguage]: sourceText }],
                defaultTemplate,
                {
                    sourceLanguage: sourceLanguage,
                    targetLanguages: [targetLanguage],
                    glossaryTerms: glossaryTerms || []
                }
            )

            const result = results[0]
            setTranslatedText(result?.[targetLanguage] || '')
            setHasTranslated(true)
            setIsEditing(false)

            if (result?.status === 'error') {
                toast.error('Translation failed')
            }
        } catch (error) {
            console.error('Translation error:', error)
            if (error.message === 'API_NOT_CONFIGURED') {
                toast.error('API key not configured. Check settings.')
            } else {
                toast.error('Translation failed. Please try again.')
            }
        } finally {
            setIsTranslating(false)
        }
    }

    const handleSourceChange = (e) => {
        setSourceText(e.target.value)
        setHasTranslated(false)
    }

    // Header row style matching DataTable - using TABLE_STYLES constants
    const headerStyle = {
        padding: TABLE_STYLES.headerPadding,
        backgroundColor: TABLE_STYLES.headerBg,
        borderBottom: `1px solid ${TABLE_STYLES.borderColor}`,
        fontSize: '14px',
        fontWeight: 400,
        color: TABLE_STYLES.headerText
    }

    // Scroll sync handler
    const handleScroll = (e) => {
        const overlay = document.getElementById('highlight-overlay')
        if (overlay) {
            overlay.scrollTop = e.target.scrollTop
        }
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Quick Check</h1>
            </div>

            {/* Two Column Layout - Using DataTable container styling */}
            <div className={TABLE_STYLES.container} style={{ overflow: 'hidden' }}>
                <div className="grid grid-cols-2">
                    {/* Source Panel */}
                    <div className="border-r border-border/50">
                        {/* Header Row */}
                        <div className="flex items-center gap-3" style={headerStyle}>
                            <span className="whitespace-nowrap">Translate from</span>
                            <Select value={sourceLanguage} onValueChange={(val) => { setSourceLanguage(val); setHasTranslated(false); }}>
                                <SelectTrigger className="w-40 h-8 bg-transparent border-0 shadow-none">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LANGUAGES.map(lang => (
                                        <SelectItem key={lang.code} value={lang.code} disabled={lang.code === targetLanguage}>
                                            {lang.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Text area container */}
                        <div className="relative h-[280px]">
                            {/* Highlighted View (View Mode) */}
                            {hasTranslated && sourceMatches.length > 0 && !isEditing ? (
                                <div
                                    onClick={() => setIsEditing(true)}
                                    className="w-full h-full p-4 overflow-auto text-sm leading-relaxed whitespace-pre-wrap font-sans cursor-text hover:bg-slate-50 transition-colors"
                                    style={{
                                        color: 'inherit'
                                    }}
                                    title="Click to edit"
                                >
                                    <HighlightedText
                                        text={sourceText}
                                        matches={sourceMatches}
                                        hoveredTermId={hoveredTermId}
                                        onHoverTerm={setHoveredTermId}
                                    />
                                </div>
                            ) : (
                                /* Editable textarea (Edit Mode) */
                                <textarea
                                    value={sourceText}
                                    onChange={(e) => {
                                        handleSourceChange(e)
                                        setIsEditing(true)
                                    }}
                                    autoFocus={isEditing && hasTranslated}
                                    placeholder="Enter text to translate..."
                                    className="w-full h-full p-4 bg-transparent resize-none border-none focus:ring-0 focus:outline-none text-sm leading-relaxed font-sans"
                                    style={{
                                        color: 'inherit',
                                        caretColor: 'hsl(222, 47%, 11%)'
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Target Panel */}
                    <div>
                        {/* Header Row */}
                        <div className="flex items-center gap-3" style={headerStyle}>
                            <span className="whitespace-nowrap">Translate to</span>
                            <Select value={targetLanguage} onValueChange={(val) => { setTargetLanguage(val); setHasTranslated(false); }}>
                                <SelectTrigger className="w-40 h-8 bg-transparent border-0 shadow-none">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LANGUAGES.map(lang => (
                                        <SelectItem key={lang.code} value={lang.code} disabled={lang.code === sourceLanguage}>
                                            {lang.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Result area */}
                        <div className="min-h-[280px] p-4 text-sm leading-relaxed">
                            {isTranslating ? (
                                <div className="flex items-center text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Translating...
                                </div>
                            ) : translatedText ? (
                                <div className="whitespace-pre-wrap">
                                    <HighlightedText
                                        text={translatedText}
                                        matches={targetMatches}
                                        hoveredTermId={hoveredTermId}
                                        onHoverTerm={setHoveredTermId}
                                    />
                                </div>
                            ) : (
                                <span className="text-muted-foreground">
                                    Translation will appear here...
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Centered Translate Button */}
            <div className="flex justify-center mt-6">
                <Button
                    onClick={handleTranslate}
                    disabled={!canTranslate}
                    className="px-6 rounded-full"
                    style={{
                        backgroundColor: canTranslate ? '#FF0084' : undefined,
                    }}
                >
                    {isTranslating ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Translating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Translate
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
