import daisyui from "daisyui";
import typography from "@tailwindcss/typography";
import { valentine } from "daisyui/src/theming/themes";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  plugins: [daisyui, typography],
  daisyui: {
    themes: [
      {
        valentine: {
          fontFamily: "Outfit Variable,sans-serif",
          ...valentine,
          "--rounded-btn": "0.5rem",
          "--tab-radius": "0.5rem",
        },
      },
    ],
  },
};
