// New Project Form - Figma-styled modal for creating new projects
// Also supports import mode when importData is provided
import { useState, useEffect } from "react"
import { X, CirclePlus, Check, FileSpreadsheet } from "lucide-react"
import {
    ModalOverlay,
    ModalContent,
    FormField,
    TextInput,
    PrimaryButton,
    SecondaryButton,
    IconButton,
    COLORS,
} from "@/components/ui/shared"
import { LANGUAGES } from "@/lib/constants"
// Derive settings locally since global constants were removed for dynamic support
const AVAILABLE_TARGET_LANGUAGES = Object.values(LANGUAGES).filter(l => l.code !== 'en')
const DEFAULT_TARGET_LANGUAGES = ['my', 'zh']

// Pastel color options for project theme
const PROJECT_THEMES = [
    { id: 'pink', color: '#FFE5EC', border: '#FFB6C1', value: 'bg-[#FFE5EC]' },
    { id: 'orange', color: '#FFF0E5', border: '#FFDAB9', value: 'bg-[#FFF0E5]' },
    { id: 'yellow', color: '#FFFDE7', border: '#FFF59D', value: 'bg-[#FFFDE7]' },
    { id: 'mint', color: '#E5F9F6', border: '#A7F3D0', value: 'bg-[#E5F9F6]' },
    { id: 'cyan', color: '#E5F6FF', border: '#BAE6FD', value: 'bg-[#E5F6FF]' },
    { id: 'purple', color: '#F3E5FF', border: '#D8B4FE', value: 'bg-[#F3E5FF]' },
]

export default function NewProjectForm({ isOpen, onClose, onSubmit, importData = null }) {
    // importData shape: { fileName: string, sheets: { [sheetName]: [rows] } }
    const isImportMode = !!importData

    const [projectName, setProjectName] = useState('')
    const [description, setDescription] = useState('')
    const [selectedLanguages, setSelectedLanguages] = useState(DEFAULT_TARGET_LANGUAGES)
    const [selectedTheme, setSelectedTheme] = useState(PROJECT_THEMES[0].id)

    // Pre-fill form when importData changes
    useEffect(() => {
        if (importData) {
            setProjectName(importData.fileName || '')
            setDescription('Imported from Excel')
        } else {
            setProjectName('')
            setDescription('')
        }
    }, [importData])

    if (!isOpen) return null

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!projectName.trim()) return

        const projectData = {
            name: projectName.trim(),
            description: description.trim(),
            targetLanguages: selectedLanguages,
            themeColor: selectedTheme,
        }

        // If import mode, include the sheets data
        if (isImportMode && importData.sheets) {
            projectData.sheets = importData.sheets
        }

        onSubmit(projectData)

        // Reset form
        setProjectName('')
        setDescription('')
        setSelectedLanguages(DEFAULT_TARGET_LANGUAGES)
        setSelectedTheme(PROJECT_THEMES[0].id)
    }

    const toggleLanguage = (langId) => {
        setSelectedLanguages(prev =>
            prev.includes(langId)
                ? prev.filter(id => id !== langId)
                : [...prev, langId]
        )
    }

    return (
        <ModalOverlay onClose={onClose}>
            <ModalContent maxWidth="640px">
                {/* Header with close button */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: 'black',
                    }}>
                        {isImportMode ? 'Import Project' : 'New Project'}
                    </h2>
                    <IconButton onClick={onClose} style={{ color: '#9CA3AF' }}>
                        <X style={{ width: '20px', height: '20px' }} />
                    </IconButton>
                </div>

                {/* Import file indicator */}
                {isImportMode && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 16px',
                        backgroundColor: '#F0FDF4',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        border: '1px solid #BBF7D0'
                    }}>
                        <FileSpreadsheet style={{ width: '18px', height: '18px', color: '#16A34A' }} />
                        <span style={{ fontSize: '14px', color: '#166534' }}>
                            Importing: <strong>{importData?.fileName}.xlsx</strong>
                            {importData?.sheets && ` (${Object.keys(importData.sheets).length} sheet${Object.keys(importData.sheets).length > 1 ? 's' : ''})`}
                        </span>
                    </div>
                )}

                {/* Divider */}
                <div style={{
                    height: '1px',
                    backgroundColor: 'hsl(220, 13%, 91%)',
                    margin: '16px 0 24px'
                }} />

                <form onSubmit={handleSubmit}>
                    {/* Project Name */}
                    <FormField label="Project name" required labelStyle={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>
                        <TextInput
                            placeholder="Text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            style={{ height: '44px' }}
                            required
                        />
                    </FormField>

                    {/* Project Description */}
                    <FormField label="Project Description (Optional)" labelStyle={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>
                        <TextInput
                            placeholder="Text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{ height: '44px' }}
                        />
                    </FormField>

                    {/* Target Languages */}
                    <FormField label="Target Languages" labelStyle={{ fontSize: '14px', fontWeight: 500, color: '#6B7280', marginBottom: '8px' }}>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                        }}>
                            {AVAILABLE_TARGET_LANGUAGES.map(lang => {
                                const isSelected = selectedLanguages.includes(lang.id)
                                return (
                                    <button
                                        key={lang.id}
                                        type="button"
                                        onClick={() => toggleLanguage(lang.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 16px',
                                            borderRadius: '9999px',
                                            fontSize: '14px',
                                            fontWeight: 400,
                                            cursor: 'pointer',
                                            transition: 'all 0.1s ease',
                                            border: isSelected
                                                ? `1px solid #EC4899` // Pink-500
                                                : '1px solid #E5E7EB', // Gray-200
                                            backgroundColor: 'white',
                                            color: isSelected
                                                ? '#EC4899' // Pink-500
                                                : '#111827', // Gray-900 (or close to black)
                                        }}
                                    >
                                        {lang.label}
                                        {isSelected && (
                                            <Check style={{ width: '14px', height: '14px', marginLeft: '2px' }} />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </FormField>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '32px' }}>
                        <SecondaryButton onClick={onClose}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton
                            type="submit"
                            disabled={!projectName.trim() || selectedLanguages.length === 0}
                        >
                            {isImportMode ? 'Import project' : 'Create project'}
                        </PrimaryButton>
                    </div>
                </form>
            </ModalContent>
        </ModalOverlay>
    )
}
