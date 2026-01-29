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
        card: "0 18px 36px -24px rgba(15, 23, 42, 0.35)",
      },
    },
  },
  plugins: [],
}
