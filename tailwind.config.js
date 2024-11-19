/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  plugins: [require("daisyui"), require("@tailwindcss/typography")],
  daisyui: {
    themes: [
      {
        valentine: {
          fontFamily: "Outfit Variable,sans-serif",
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          ...require("daisyui/src/theming/themes")["valentine"],
          "--rounded-btn": "0.5rem",
          "--tab-radius": "0.5rem",
        },
      },
    ],
  },
};
