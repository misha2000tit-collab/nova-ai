# Nova AI — starter project

A starter Expo / React Native iOS chat with locally saved chat history and image input. The OpenAI key stays on the server.

## Files
- `App.js` — iPhone UI, chat, local history, image picker
- `app.json` — Expo/iOS configuration
- `eas.json` — EAS Build profiles
- `server/server.js` — Express API calling OpenAI Responses API
- `server/.env.example` — server environment-variable template

## 1. Create the project from an iPhone
1. Create a private GitHub repository named `nova-ai`.
2. Add the files from this folder to the repository, preserving the `server` folder.
3. For easiest phone-only editing, use a browser-based code workspace that supports Node.js. Open this repo there.
4. In the project root, run `npm install`. For Expo Snack, use the App.js as a UI preview only; Snack does not replace the backend or EAS build process.

## 2. Deploy the backend
1. Deploy the `server` folder as a Node.js service on a trusted host that supports environment secrets.
2. Set `OPENAI_API_KEY` in the host's secret/environment settings. Optionally set `OPENAI_MODEL` and `PORT`.
3. Start command: `npm start` (working directory `server`).
4. Check `https://YOUR-SERVER/health` and expect `{"ok":true,"service":"Nova AI API"}`.
5. Set `EXPO_PUBLIC_API_URL` to the public HTTPS base URL of the backend in the Expo app build environment. It is only the server address, not a secret.

## 3. Run / build the app
1. In the project root, run `npm install`.
2. Set a unique iOS bundle identifier in `app.json` instead of `com.example.novaai`.
3. Install/configure EAS CLI in a terminal workspace: `npm install --global eas-cli`, then `eas login`, then `eas build:configure` if asked.
4. Build iOS: `eas build --platform ios --profile production`.
5. Upload to TestFlight: `eas submit --platform ios` or use `npx testflight` in the project root.
6. In App Store Connect, finish the app record, privacy details, and TestFlight tester setup. An adult account holder should handle paid developer membership and agreements.

## Important security / product notes
- Never place `OPENAI_API_KEY` in `App.js`, `EXPO_PUBLIC_*`, GitHub, or the app bundle.
- Add authentication, request rate limits, usage limits, and abuse protection before sharing with external testers. The starter endpoint is intentionally minimal and should not be exposed widely without these controls.
- Image data is sent to your backend and then to OpenAI for analysis. Tell testers this in the privacy notice and complete Apple's privacy disclosures accurately.
- Local chat history is stored on the iPhone using AsyncStorage. It is not encrypted storage; do not store highly sensitive content.
- Replace the example bundle identifier before building.
