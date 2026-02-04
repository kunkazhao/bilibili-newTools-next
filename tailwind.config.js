/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Manrope",
          "Microsoft YaHei",
          "PingFang SC",
          "Hiragino Sans GB",
          "Noto Sans CJK SC",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        brand: "#2563EB",
      },
      boxShadow: {
        card: "none",
      },
    },
  },
  plugins: [],
}
