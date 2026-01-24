/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: '#0A0A0F',
                surface: '#1F2937',
                accent: '#00E5FF',
                success: '#22C55E',
            },
        }
    },
    plugins: [],
}
