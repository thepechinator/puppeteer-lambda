module.exports = {
    "parser": "babel-eslint",
    "extends": "eslint:recommended",
    "parserOptions": {
    	"ecmaVersion": 2017,
    },
    "env": {
        "node": true,
        "es6": true
    },
    "rules": {
        "semi": [1, "always"],
        "comma-dangle": [2, "always-multiline"],
        "no-restricted-syntax": 0,
        "max-len": 0,
        "no-shadow": 0,
        "arrow-body-style": 0,
        "arrow-parens": 0,
        "global-require": 0,
        "no-unused-expressions": 0,
        "no-confusing-arrow": 0,
        "no-unused-vars": 0,
        "no-constant-condition": 0,
        "import/no-dynamic-require": 0,
        "import/no-extraneous-dependencies": 0,
        "import/prefer-default-export": 0,
        "no-unused-vars": ["error", { "vars": "all", "args": "none", "ignoreRestSiblings": true }],
        "no-underscore-dangle": [2, {"allowAfterThis": true}],
        "object-curly-newline": 0,
        "function-paren-newline": 0,
        "no-console": 0
      }
};
