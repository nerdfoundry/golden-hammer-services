module.exports = {
  root: true,
  env: {
    node: true,
    commonjs: true,
    es6: true,
    jquery: false,
    jest: true,
    jasmine: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: '2020'
  },
  rules: {
    indent: ['warn', 'spaces', { SwitchCase: 1 }],
    quotes: ['warn', 'double'],
    semi: ['error', 'always'],
    'no-var': ['error'],
    'no-console': ['off'],
    'no-unused-vars': ['error'],
    'no-mixed-spaces-and-tabs': ['warn']
  }
};
