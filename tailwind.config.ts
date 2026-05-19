import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./electron/**/*.ts"],
  theme: {
    extend: {},
  },
};

export default config;
