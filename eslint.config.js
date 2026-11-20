import neostandard from 'neostandard'
import { jsdoc } from 'eslint-plugin-jsdoc'

const testFiles = ['**/*.test.js']
const sharedTypes = ['Object', 'Document']

export default [
  ...neostandard({
    env: ['node', 'vitest'],
    ignores: neostandard.resolveIgnoresFromGitignore(),
    noJsx: true,
    noStyle: true
  }),
  {
    rules: {
      // neostandard's settings (ESLint replaces rule options wholesale, so they
      // are repeated here), plus allowing `_` for skipped array items
      'no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'none',
          ignoreRestSiblings: true,
          caughtErrors: 'none',
          destructuredArrayIgnorePattern: '^_'
        }
      ]
    }
  },
  jsdoc({
    config: 'flat/recommended',
    files: ['**/*.js'],
    ignores: testFiles,
    rules: {
      'jsdoc/no-undefined-types': ['warn', { definedTypes: sharedTypes }]
    },
    settings: {
      // Destructured parameters are typed by their root, such as
      // `@param {Saved} root0` with `@param {string} root0.owner`, so the
      // root and its properties aren't each reported as untyped
      exemptDestructuredRootsFromChecks: true
    }
  }),
  {
    // DOM types, as the client scripts and the helpers that read pages run in
    // the DOM, whose types neostandard's globals don't include
    files: ['src/client/**/*.js', 'test-helpers/**/*.js'],
    ignores: testFiles,
    rules: {
      'jsdoc/no-undefined-types': [
        'warn',
        {
          definedTypes: [
            ...sharedTypes,
            'HTMLElement',
            'HTMLFormElement',
            'HTMLButtonElement',
            'SubmitEvent'
          ]
        }
      ]
    }
  }
]
