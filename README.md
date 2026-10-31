# muhtarazm-gmail.com

## Electron runtime proof of concept

The Windows proof currently tests a packaged Electron app starting the production
Next.js standalone server on `127.0.0.1`. It does not add SQLite or offline data
operations.

```powershell
npm ci
npm run desktop:pack
npm run desktop:smoke -- --relocate
npm run desktop:smoke:crash
```

The smoke test copies the unpacked app to a temporary directory, verifies the
local Arabic page and independent API, blocks and records external renderer
requests, checks that closing Electron stops its local server, and can simulate
a stopped Next.js process. A clean Windows installation and a physically
disconnected network still require separate validation.