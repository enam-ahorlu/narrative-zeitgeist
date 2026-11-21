import globals from 'globals';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.node, supabase: 'readonly', Chart: 'readonly' }
    },
    rules: {
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-redeclare': 'warn',
      'no-unused-vars': ['warn', { args: 'none' }]
    }
  }
];
