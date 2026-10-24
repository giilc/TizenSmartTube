# Contributing

This is an early standalone Tizen client. Small, focused issues and pull requests are welcome.

1. Fork the repository and create a branch for your change.
2. Run `npm ci`, `npm test` and `npm run package`.
3. For playback or remote-navigation changes, test on a real TV when possible and report the model year and Tizen version. Explain what was tested versus inferred from a desktop preview.
4. Describe the problem, the resulting behavior and the validation in your pull request.

Keep runtime assets bundled and maintain compatibility with the current Chromium 85 target. Preserve third-party notices when adapting upstream code. Tests should exercise behavior and failure paths.

Do not commit certificates, signing passwords, account/session tokens, signed stream URLs, TV identifiers or personal logs. Build outputs, dependencies and signed WGT files belong outside source control. Use your own certificate profile for installation.

Known gaps are listed in the README. Please check existing issues before starting a large feature.
