module.exports = {
  bin: 'mplx',
  dirname: 'mplx',
  commands: './dist/commands',
  plugins: [
    '@oclif/plugin-help',
    '@oclif/plugin-autocomplete',
    '@oclif/plugin-commands',
    '@oclif/plugin-not-found',
    '@oclif/plugin-version',
  ],
  topicSeparator: ' ',
  topics: {
    config: {
      description: 'Manage CLI configuration',
    },
    create: {
      description: 'Create digital assets',
    },
    fetch: {
      description: 'Fetch digital assets',
    },
  },
}
