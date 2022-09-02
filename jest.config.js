module.exports = {
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"]
  },

  testPathIgnorePatterns: ["<rootDir>/dist/", "/_.+"],

  maxWorkers: 1
};
