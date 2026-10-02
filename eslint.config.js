import tseslint from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';

export default tseslint.config(
  { ignores: ['dist/', '.astro/', 'node_modules/', 'public/', 'playwright-report/'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/lib/**/*.ts', 'scripts/**/*.ts'],
    plugins: { jsdoc },
    rules: {
      // Every exported function must be documented (purpose, params, returns).
      'jsdoc/require-jsdoc': ['error', { publicOnly: true, require: { FunctionDeclaration: true, ArrowFunctionExpression: false } }],
      'jsdoc/require-description': 'error',
    },
  },
);
