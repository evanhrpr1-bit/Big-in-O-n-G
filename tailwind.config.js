/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Black Gold Empire palette
        crude: "#1B1A17", // base / crude black
        steel: "#4A5560",
        rust: "#C1440E",
        amber: "#E3A857",
        paper: "#EDE6D6",
        gas: "#5B7B6E",
        research: "#6E8CA0",
        panel: "#252320",
        lot: "#211F1B",
        hair: "#3A362F",
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
