/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Noto Sans SC",
          "Microsoft YaHei",
          "PingFang SC",
          "Hiragino Sans GB",
          "Noto Sans CJK SC",
          "Manrope",
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
