# Agent instructions

This repository contains an unofficial, experimental Samsung Tizen TV application. Follow the user's requested task; these instructions do not grant access to a TV or account on their own.

## When asked to install the app

Read [docs/AI_INSTALL.md](docs/AI_INSTALL.md) before taking action. Prefer the published WGT for installation; building from source is optional. Use the user's own Samsung certificate profile and the specific TV they identify. Complete the authorized setup and installation steps your tools support; ask only for missing information, physical TV actions or required account interactions.

Do not assume that a ChatGPT or Claude conversation has local terminal, browser or LAN access. If those tools are unavailable, guide the user with commands for their OS and request the relevant output. Never claim to have connected, signed, installed or verified playback without evidence.

Do not use shared legacy certificates, root the TV, disable certificate verification, scan unrelated devices or expose debugging ports to the internet. Keep passwords, private keys, DUIDs, account tokens and personal device details out of commits, issues and public logs. Do not request certificate passwords in chat; let the user enter them in the local certificate manager.

Verify installation through the installer result, launch the application, and ask the user whether picture and audio work. A black native video plane in a screenshot is not proof that playback failed. Do not uninstall an existing app as an automatic fix; explain potential data loss and obtain the user's approval if uninstalling becomes necessary.

## When asked to change the source

- Read README.md and CONTRIBUTING.md. Preserve the standalone runtime and Chromium 85 target.
- Install dependencies with `npm ci`; validate code changes with `npm test` and `npm run package`.
- Preserve LICENSE, THIRD_PARTY_NOTICES.md, fonts/OFL.txt and licenses/ in distributed builds.
- Do not commit node_modules/, dist/, artifacts/, WGT packages, certificates or private logs.
- Keep app/version metadata consistent. Do not publish a release or alter the user's TV unless the task authorizes it.
