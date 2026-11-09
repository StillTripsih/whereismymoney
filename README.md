# WHERE IS MY MONEY (WIMM)

Private, local-first expense and savings tracker. No account is required.

## What it does

- Records expenses, income, categories, budgets and savings locally on the device.
- Supports English, Russian, Thai and Ukrainian.
- Exports and imports a full JSON backup.
- Works as an installable PWA with an offline app shell after its first load.
- Lets a user connect their own Google AI Studio key to analyse a receipt. The key stays in the current browser session and is not committed to this repository.

## Privacy model

Financial records are stored in IndexedDB on the user's device. They are not sent to this repository owner. Clearing site/app data may remove them; export a JSON backup before changing device, browser, or app installation.

Receipt analysis is optional. When a user enables it with their own Gemini key, selected receipt images, audio, or text are sent directly to Google's Gemini API. See [the privacy policy](docs/PRIVACY_POLICY.md).

## Run locally

Requires Node.js 24 or later.

```bash
npm ci
npm test
npx tsc --noEmit
npm run build
```

For a local development server:

```bash
npm run dev
```

The static site is generated in `build/`.

## Public deployment

The repository includes a GitHub Pages workflow. Enable **Settings → Pages → Source: GitHub Actions** after the repository is created. The production URL will be:

`https://stilltripsih.github.io/whereismymoney/`

GitHub Pages serves the static, user-key version of receipt analysis. It does not host a shared Gemini key or `/api/analyze` endpoint.

## License

Source code is public for viewing, but it is not open source: [all rights are reserved](LICENSE).

## Support

Use [GitHub Issues](https://github.com/StillTripsih/whereismymoney/issues) for non-sensitive bug reports. Never attach financial exports, API keys, receipt images, or other personal information.
