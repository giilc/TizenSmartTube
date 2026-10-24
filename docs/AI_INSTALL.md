# Install with help from ChatGPT or Claude

Use this guide with a local coding agent such as Codex or Claude Code, or paste the prompt below into a chat. **Instructions do not give an assistant access to your computer or TV.** An assistant without local tools can guide you while you run the commands. A cloud environment needs an explicitly configured connection to your local network; do not expose the TV's developer port to the internet.

## Copy this prompt

```text
Help me install TizenSmartTube on my own Samsung TV.

Repository: https://github.com/giilc/TizenSmartTube
Read AGENTS.md and docs/AI_INSTALL.md from the repository's main branch.
Use the v0.2.0 WGT release unless I request another version.

First check which local terminal, browser and network tools you actually have.
Determine my computer OS, ask for my TV's LAN IP and model/Tizen version if
needed, and check whether Tizen Studio and a Samsung TV certificate profile
are already configured. Prefer the downloadable WGT so I don't have to build
from source. Verify its checksum, help me sign it with my own certificate,
install it on my identified TV, launch it, and verify picture and audio with me.

Do the steps your tools support. If you cannot access my computer or network,
give me commands for my OS and work from the output I provide. Let me enter
Samsung account credentials and certificate passwords locally, not in chat.
Don't uninstall an existing app or change unrelated devices without asking.
```

The files live on `main`; the original v0.2.0 source archive predates this guide. Agents working from that archive should open the [current guide](https://github.com/giilc/TizenSmartTube/blob/main/docs/AI_INSTALL.md).

## Agent procedure

### 1. Check the environment and target

- Identify the OS and available tools. Locate Tizen Studio's `sdb` and `tizen` CLI; on Windows the launcher may be `tizen.bat`. Use their actual paths rather than assuming an SDK installation directory.
- Ask for only missing details: the target TV's LAN IP, model year/Tizen version, Developer Mode state and existing certificate profile name. The app has only been tested on one Tizen 6.5 TV; its manifest minimum of 6.0 does not guarantee compatibility with other models.
- Prefer an existing configured device or the address the user supplies. Do not guess the TV address or scan the whole network.
- Determine the computer's LAN IPv4 address on the network connected to the TV. Explain that **Host PC IP on the TV is the computer's address**, while `sdb connect` uses the **TV's address**. Do not confuse Wi-Fi, VPN, loopback or container addresses.

### 2. Prepare the TV and SDK

Use Samsung's [TV SDK setup guide](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html) and [device connection guide](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html).

Install TV Extensions and Samsung Certificate Extension if missing. Guide the user through enabling Developer Mode in the TV's Apps screen, entering the computer's LAN IP and restarting the TV. Menu details can vary by model; do not claim a remote action happened without observing it.

Connect only to the identified TV, then inspect `sdb devices`. If several devices are connected, select the matching target explicitly for all subsequent commands.

### 3. Set up the owner's certificate

Use an existing suitable Samsung TV profile, or guide the user through [Certificate Manager](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html). Its distributor certificate must authorize the target TV's DUID. Have the user complete Samsung account sign-in and password entry locally. In Device Manager, use **Permit to install applications** when required.

A development certificate signed for one TV is not a universal certificate for everyone. Do not substitute this project's historical bundled testing certificate or copy another person's private keys. Preserve the owner's author certificate for future updates. Do not modify global CLI settings without first checking their existing configuration.

### 4. Download and verify the package

Default published package:

- [v0.2.0 release and installation notes](https://github.com/giilc/TizenSmartTube/releases/tag/v0.2.0)
- [SmartTubeTizen-0.2.0-unsigned.wgt](https://github.com/giilc/TizenSmartTube/releases/download/v0.2.0/SmartTubeTizen-0.2.0-unsigned.wgt)
- [SHA256SUMS.txt](https://github.com/giilc/TizenSmartTube/releases/download/v0.2.0/SHA256SUMS.txt)

Expected SHA-256 for that exact WGT:

```text
78f8d9c23ffa06abeb9a7ec0eb57e2b1efb3e8b7a2d9ba3f3918b5e0f686f94e
```

Download to a fresh local folder and compare the hash before extracting or signing. Use `shasum -a 256` on macOS, `sha256sum` on Linux, or `Get-FileHash -Algorithm SHA256` in PowerShell. Stop if the hash differs. This checksum detects a mismatched download; it is not an independent publisher signature. If the user selects another release, use that release's published checksum instead.

The WGT is a ZIP archive. Extract its contents into a new folder named `app`, with `config.xml` directly inside it. Use a ZIP tool, renaming a copy to `.zip` if needed. Inspect entries before extraction and reject absolute paths or `..` traversal. The published unsigned package has no signing documents or private keys. No Node.js build is required for this download path.

If the user explicitly wants a source build, follow README.md: `npm ci`, `npm test`, `npm run package`. Use that build's `dist` directory in place of the extracted `app` folder. Do not compare a rebuilt ZIP against the release ZIP hash; archive timestamps can differ.

### 5. Sign, install and launch

The following are **templates**, not commands to execute with literal angle brackets. Replace values with the user's actual profile and confirmed device target, quote paths/values for the shell, and use absolute SDK paths if needed. In PowerShell, invoke a quoted executable path with `&`.

```sh
sdb connect <TV_IP>
sdb devices
tizen package -t wgt -s <CERTIFICATE_PROFILE> -- app
tizen install -t <TARGET_NAME> -n <SIGNED_PACKAGE.wgt> -- app
tizen run -t <TARGET_NAME> -p StTizen001.Port
```

Use the signed package filename and directory actually reported by `tizen package`; do not accidentally pass the unsigned download to the installer. Inspect the signed archive for `author-signature.xml` and `signature1.xml`, and confirm application assets were not changed during signing. Those files alone do not prove the certificate is accepted by the TV.

Follow the [Samsung CLI reference](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html) for the installed SDK. Check command exit status and the installer's explicit success/failure output. Launch only after successful installation. The application ID is `StTizen001.Port`.

### 6. Verify with the user

Ask the user to confirm the app opened. Search for a public video such as Big Buck Bunny, start playback, and ask whether **both picture and audio work**. Ask them to try the remote controls and a supported quality change. Do not treat a running timer or a screenshot with a black video plane as audiovisual confirmation.

Report the installed version, selected TV, installer result, launch result, and what playback was actually confirmed. If a step is blocked, report the exact stage and a redacted error rather than claiming success. Never upload private certificates, passwords, DUIDs, session tokens or personal logs to GitHub.

## Troubleshooting

| Symptom | Next check |
| --- | --- |
| No device or connection refused | TV is awake; correct TV IP; Developer Mode and Host PC IP; restart; same network; guest-network isolation/VPN/firewall configuration. Do not disable the firewall wholesale. |
| Multiple devices | Match the chosen TV to `sdb devices` and use its explicit target. |
| Certificate/profile error | Correct Samsung TV profile, target DUID, certificate validity, and Permit to install applications. Do not bypass certificate checks. |
| Update rejected | Check author-certificate continuity. Do not automatically uninstall; it can erase app data. |
| Package installs but does not open | Confirm application ID, SDK output and TV compatibility. Collect only relevant, redacted diagnostics. |
| App opens but a video fails | Separate network/provider/video-specific errors from installation. Try another public video and report the actual result. |

The personal-certificate workflow follows Samsung's SDK documentation but has not yet been independently tested end to end with the public WGT. Accounts/subscriptions, 4K/HDR and universal TV compatibility are not established. See README.md for the current feature limits.

## Instruction files

[AGENTS.md](../AGENTS.md) holds shared agent instructions. [CLAUDE.md](../CLAUDE.md) imports them for Claude Code. A normal chat can use the prompt above and read these files explicitly; file presence alone does not enable local control.

References: [OpenAI repository instructions](https://developers.openai.com/codex/guides/agents-md) and [Claude Code instruction files](https://code.claude.com/docs/en/memory).
