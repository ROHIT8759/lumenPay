
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: "#0B1C2D",
                accent: "#00E5FF",
                success: "#00C896",
                warning: "#FFB020",
                error: "#FF5A5F",
                surface: "#111827",
                text: "#E5E7EB",
                
                deep: "#030014",
                glass: "rgba(255, 255, 255, 0.05)",
            },
            fontFamily: {
                sans: ['Inter-Regular'],
                bold: ['Inter-Bold'],
            }
        },
    },
    plugins: [],
}
