// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import next from "eslint-config-next";

const config = [{
  ignores: ["node_modules/**", ".next/**", "playwright-report/**", "test-results/**"]
}, ...next, ...storybook.configs["flat/recommended"]];

export default config;
