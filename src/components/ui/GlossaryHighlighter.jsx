// GlossaryHighlighter - Reusable component for highlighting glossary terms
import React, { useMemo } from 'react'
import { COLORS } from '@/lib/constants'

// Escape special regex characters
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Find glossary matches in text
export function findGlossaryMatches(text, glossaryTerms, languageCode) {
    if (!text || !glossaryTerms || glossaryTerms.length === 0) return []

    // Map language code to glossary field (normalized fields from GlossaryContext)
    const fieldMap = {
        'en': 'en',
        'my': 'my',
        'zh': 'cn', // Context normalizes zh/chinese to 'cn'
        'cn': 'cn'
    }

    const field = fieldMap[languageCode]
    if (!field) return []

    const matches = []

    for (const term of glossaryTerms) {
        const targetValue = term[field]?.trim()
        const sourceValue = term['en']?.trim()

        // Terms to check: Target term AND Source term (if different and not English column)
        const termsToCheck = new Set()
        if (targetValue) termsToCheck.add(targetValue)
        if (languageCode !== 'en' && sourceValue) termsToCheck.add(sourceValue)

        for (const termValue of termsToCheck) {
            let pattern

            if (languageCode === 'zh') {
                // Chinese: No word boundaries, just escape
                pattern = escapeRegex(termValue)
            } else {
                // Others: Dynamic word boundaries
                // If term starts with word char, add \b prefix
                // If term ends with word char (and not symbol), add \b suffix
                const isWordStart = /^\w/.test(termValue)
                const isWordEnd = /\w$/.test(termValue)

                pattern = ''
                if (isWordStart) pattern += '\\b'
                pattern += escapeRegex(termValue)
                if (isWordEnd) pattern += '\\b'
            }

            try {
                // ALWAYS use 'gi' for case insensitivity (even in Chinese, for English words mixed in)
                const regex = new RegExp(pattern, 'gi')
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
                    color: 'hsl(329, 70%, 55%)', // Middle pink
                    fontWeight: 600,
                    cursor: 'default',
                    backgroundColor: isHovered ? 'hsl(329, 100%, 96%)' : 'transparent',
                    borderRadius: '4px',
                    paddingTop: 0,
                    paddingLeft: isHovered ? '2px' : 0,
                    paddingRight: isHovered ? '2px' : 0,
                    paddingBottom: 0,
                    transition: 'background-color 0.15s ease'
                }}
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
