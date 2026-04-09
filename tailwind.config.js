/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          // Optionnel : Ajoute ici tes couleurs "Premium" si besoin
        }
      },
    },
    plugins: [],
  }