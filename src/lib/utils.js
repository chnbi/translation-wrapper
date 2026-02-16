import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

import { toast } from "sonner"

export function handleTranslationError(error) {
    console.error('Translation error:', error)
    if (error.message === 'API_NOT_CONFIGURED') {
        toast.error('AI Translation is currently unavailable', {
            description: 'Please configure your API key in Settings.'
        })
    } else if (error.message === 'RATE_LIMIT') {
        toast.error('Rate limited', {
            description: 'Please wait a moment and try again.'
        })
    } else {
        toast.error('Translation failed', {
            description: error.message || 'Unknown error occurred'
        })
    }
}
