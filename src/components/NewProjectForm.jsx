// New Project Form - Figma-styled modal for creating new projects
import { useState } from "react"
import { X, CirclePlus } from "lucide-react"
import {
    ModalOverlay,
    ModalContent,
    ModalHeader,
    FormField,
    TextInput,
    PrimaryButton,
    SecondaryButton,
    RemovableTag,
    TagContainer,
    IconButton,
} from "@/components/ui/shared"

const AVAILABLE_LANGUAGES = [
    { id: 'my', label: 'Bahasa Malaysia' },
    { id: 'zh', label: 'Simplified Chinese' },
    { id: 'zh-TW', label: 'Traditional Chinese' },
    { id: 'id', label: 'Bahasa Indonesia' },
    { id: 'th', label: 'Thai' },
    { id: 'vi', label: 'Vietnamese' },
]

export default function NewProjectForm({ isOpen, onClose, onSubmit }) {
    const [projectName, setProjectName] = useState('')
    const [description, setDescription] = useState('')
    const [selectedLanguages, setSelectedLanguages] = useState(['my', 'zh'])

    if (!isOpen) return null

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!projectName.trim()) return

        onSubmit({
            name: projectName.trim(),
            description: description.trim(),
            targetLanguages: selectedLanguages,
        })

        // Reset form
        setProjectName('')
        setDescription('')
        setSelectedLanguages(['my', 'zh'])
    }

    const removeLanguage = (langId) => {
        setSelectedLanguages(prev => prev.filter(id => id !== langId))
    }

    const getLangLabel = (id) => AVAILABLE_LANGUAGES.find(l => l.id === id)?.label || id

    return (
        <ModalOverlay onClose={onClose}>
            <ModalContent>
                {/* Header with close button */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '24px'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: 'black',
                        padding: '4px 8px'
                    }}>
                        New Project
                    </h2>
                    <IconButton onClick={onClose}>
                        <X style={{ width: '18px', height: '18px' }} />
                    </IconButton>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Project Name */}
                    <FormField label="Project name" required>
                        <TextInput
                            placeholder="Text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            required
                        />
                    </FormField>

                    {/* Project Description */}
                    <FormField label="Project Description">
                        <TextInput
                            placeholder="Text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </FormField>

                    {/* Target Languages */}
                    <FormField label="Target Languages" style={{ marginBottom: '32px' }}>
                        <TagContainer>
                            {selectedLanguages.map(langId => (
                                <RemovableTag
                                    key={langId}
                                    label={getLangLabel(langId)}
                                    onRemove={() => removeLanguage(langId)}
                                />
                            ))}
                        </TagContainer>
                    </FormField>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <SecondaryButton onClick={onClose}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton
                            type="submit"
                            disabled={!projectName.trim()}
                        >
                            <CirclePlus style={{ width: '14px', height: '14px' }} />
                            Create project
                        </PrimaryButton>
                    </div>
                </form>
            </ModalContent>
        </ModalOverlay>
    )
}
