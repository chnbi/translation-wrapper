// GlossaryHighlighter - Reusable component for highlighting glossary terms
import React, { useMemo } from 'react'

// Escape special regex characters
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Find glossary matches in text
export function findGlossaryMatches(text, glossaryTerms, languageCode) {
    if (!text || !glossaryTerms || glossaryTerms.length === 0) return []

    // Map language code to glossary field
    const fieldMap = {
        'en': 'english',
        'my': 'malay',
        'zh': 'chinese'
    }
    const field = fieldMap[languageCode]
    if (!field) return []

    const matches = []

    for (const term of glossaryTerms) {
        const termValue = term[field]?.trim()
        if (!termValue) continue

        // Word boundaries for EN, substring for others (ZH specifically, but also MY usually ok with boundaries but sometimes compounds)
        // Quick Check logic used boundaries for EN/MY? No, `quick-check.jsx` used:
        // const pattern = languageCode === 'zh' ? escapeRegex(termValue) : `\\b${escapeRegex(termValue)}\\b`
        // We'll stick to that logic for consistency.

        const pattern = languageCode === 'zh'
            ? escapeRegex(termValue)
            : `\\b${escapeRegex(termValue)}\\b`

        try {
            const regex = new RegExp(pattern, languageCode === 'zh' ? 'g' : 'gi')
            let match
            while ((match = regex.exec(text)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    term: term,
                    matchedText: match[0]
                })
            }
        } catch (e) {
            console.error('Invalid regex for term:', termValue)
        }
    }

    // Sort by position
    matches.sort((a, b) => a.start - b.start)

    // Remove overlapping matches (keep longer ones)
    const filtered = []
    for (const match of matches) {
        const lastMatch = filtered[filtered.length - 1]
        if (!lastMatch || match.start >= lastMatch.end) {
            filtered.push(match)
        } else if (match.end - match.start > lastMatch.end - lastMatch.start) {
            filtered[filtered.length - 1] = match
        }
    }

    return filtered
}

export function GlossaryHighlighter({ text, language, glossaryTerms, hoveredTermId, onHover }) {
    const matches = useMemo(() =>
        findGlossaryMatches(text, glossaryTerms, language),
        [text, glossaryTerms, language]
    )

    if (!text) return null
    if (!matches || matches.length === 0) {
        return <span>{text}</span>
    }

    const parts = []
    let lastIndex = 0

    for (const match of matches) {
        // Add text before match
        if (match.start > lastIndex) {
            parts.push(
                <span key={`text-${lastIndex}`}>
                    {text.slice(lastIndex, match.start)}
                </span>
            )
        }

        // Add highlighted match
        const isHovered = hoveredTermId === match.term.id
        parts.push(
            <span
                key={`match-${match.start}`}
                onMouseEnter={() => onHover && onHover(match.term.id)}
                onMouseLeave={() => onHover && onHover(null)}
                style={{
                    color: '#FF0084',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: isHovered ? 'hsl(329, 100%, 96%)' : 'transparent',
                    borderRadius: '4px',
                    padding: isHovered ? '0 2px' : 0,
                    transition: 'background-color 0.15s ease',
                }}
                title={`Glossary: ${match.term.english} = ${match.term.malay} / ${match.term.chinese}`}
            >
                {match.matchedText}
            </span>
        )

        lastIndex = match.end
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(
            <span key={`text-${lastIndex}`}>
                {text.slice(lastIndex)}
            </span>
        )
    }

    return <>{parts}</>
}
