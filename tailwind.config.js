import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                "primary": "#6366f1",
                "primary-content": "#ffffff",
                "secondary": "#2563eb",
                "accent": "#e11d48",
                "background": "#ffffff",
                "background-light": "#ffffff",
                "background-dark": "#0f172a",
                "surface": "#f8fafc",
                "surface-dark": "#f1f5f9",
                "border-light": "#e2e8f0",
                "text-main": "#0f172a",
                "text-muted": "#64748b",
            },
            fontFamily: {
                "display": ["Plus Jakarta Sans", "sans-serif"],
                "body": ["Noto Sans", "sans-serif"],
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "2xl": "1rem",
                "3xl": "1.5rem",
                "full": "9999px"
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
                'sharp': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                'float': '0 15px 30px -5px rgba(0, 0, 0, 0.2)',
            }
        },
    },
    plugins: [
        forms,
        containerQueries,
    ],
}
