import React from "react"

export function WordFlowLogo({ className, width = 28, height = 28 }) {
    const uniqueId = "wordflow-logo-gradient" // static ID fine if all instances are identical

    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path d="M16 4C16 4 20 8 20 12C20 16 16 20 16 20C16 20 12 16 12 12C12 8 16 4 16 4Z" fill={`url(#${uniqueId}-petal1)`} />
            <path d="M28 16C28 16 24 20 20 20C16 20 12 16 12 16C12 16 16 12 20 12C24 12 28 16 28 16Z" fill={`url(#${uniqueId}-petal2)`} />
            <path d="M16 28C16 28 12 24 12 20C12 16 16 12 16 12C16 12 20 16 20 20C20 24 16 28 16 28Z" fill={`url(#${uniqueId}-petal3)`} />
            <path d="M4 16C4 16 8 12 12 12C16 12 20 16 20 16C20 16 16 20 12 20C8 20 4 16 4 16Z" fill={`url(#${uniqueId}-petal4)`} />
            <circle cx="16" cy="16" r="3" fill="#FF6B9D" />
            <defs>
                <linearGradient id={`${uniqueId}-petal1`} x1="16" y1="4" x2="16" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF8FB1" /><stop offset="1" stopColor="#FF6B9D" />
                </linearGradient>
                <linearGradient id={`${uniqueId}-petal2`} x1="28" y1="16" x2="12" y2="16" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF8FB1" /><stop offset="1" stopColor="#FF6B9D" />
                </linearGradient>
                <linearGradient id={`${uniqueId}-petal3`} x1="16" y1="28" x2="16" y2="12" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF8FB1" /><stop offset="1" stopColor="#FF6B9D" />
                </linearGradient>
                <linearGradient id={`${uniqueId}-petal4`} x1="4" y1="16" x2="20" y2="16" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF8FB1" /><stop offset="1" stopColor="#FF6B9D" />
                </linearGradient>
            </defs>
        </svg>
    )
}
