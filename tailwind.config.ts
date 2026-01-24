import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                black: "#000000",
                primary: "#0B1C2D", 
                accent: "#00E5FF", 
                success: "#00C896", 
                warning: "#FFB020", 
                error: "#FF5A5F", 
                surface: "#111827", 
                text: "#E5E7EB", 
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
        },
    },
    plugins: [],
};
export default config;
