import url from 'node:url';

import globals from 'globals';
import pluginJs from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';
import unicornPlugin from 'eslint-plugin-unicorn';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export default tseslint.config(
    {
        plugins: {
            ['@typescript-eslint']: tseslint.plugin,
            ['import']: importPlugin,
            ['unicorn']: unicornPlugin,
        },
    },
    {
        ignores: ['**/node_modules/**', 'eslint.config.mjs'],
    },

    pluginJs.configs.recommended,
    pluginJs.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    {
        languageOptions: {
            globals: {
                ...globals.es2021,
                ...globals.node,
            },
            parserOptions: {
                project: ['tsconfig.json'],
                tsconfigRootDir: __dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-extraneous-class': 'off',
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'no-useless-escape': 'off',
        },
    },
);
