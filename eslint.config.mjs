import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: ["build/**", ".next/**", "node_modules/**", "electron/**"],
  },
  ...nextVitals,
  ...nextTypescript,
];

export default eslintConfig;
