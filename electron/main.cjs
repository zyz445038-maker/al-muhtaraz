const { app, BrowserWindow, dialog, session, utilityProcess } = require('electron');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const { createWriteStream } = require('node:fs');
const { appendFile, mkdir, rm } = require('node:fs/promises');
const net = require('node:net');
const path = require('node:path');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { compareStableVersions, verifyUpdateManifest } = require('./updateManifest.cjs');

const STARTUP_TIMEOUT_MS = 30000;
const READINESS_REQUEST_TIMEOUT_MS = 2000;
const READINESS_RETRY_DELAY_MS = 250;
const READINESS_LOG_INTERVAL_MS = 5000;
const UPDATE_CHECK_URL = 'https://al-muhtaraz.vercel.app/api/desktop-update';
const UPDATE_REPOSITORY = 'zyz445038-maker/al-muhtaraz';
const UPDATE_REQUEST_TIMEOUT_MS = 15000;
const UPDATE_DOWNLOAD_TIMEOUT_MS = 30 * 60 * 1000;
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_UPDATE_SIZE_BYTES = 1024 * 1024 * 1024;
const LOOPBACK_HOST = '127.0.0.1';
const LOOPBACK_HOSTS = new Set([LOOPBACK_HOST, 'localhost', '[::1]']);
const smokeTestMode = process.argv.includes('--smoke-test');
const crashServerTestMode = process.argv.includes('--smoke-crash-server');
let serverProcess;
let serverIsRunning = false;
let isQuitting = false;
let allowQuit = false;
let serverUrl;
let logPath;
let logWrite = Promise.resolve();
let updateCheckInProgress = false;

function log(message) {
  const line = `${new Date().toISOString()} ${message}\n`;
  console.info(line.trimEnd());
  if (logPath) {
    logWrite = logWrite.then(() => appendFile(logPath, line)).catch((error) => {
      console.error('Unable to write desktop log:', error);
    });
  }
}

function getServerDirectory() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone');
  }
  return path.join(app.getAppPath(), '.next', 'standalone');
}

function getRuntimeEnvironment(port) {
  const archiveStorageRoot = path.join(app.getPath('userData'), 'archive');
  const archiveDatabasePath = path.join(archiveStorageRoot, 'archive.sqlite');
  const inheritedKeys = [
    'APPDATA',
    'HOMEDRIVE',
    'HOMEPATH',
    'LOCALAPPDATA',
    'PATH',
    'PROGRAMDATA',
    'SYSTEMROOT',
    'TEMP',
    'TMP',
    'USERPROFILE',
    'WINDIR',
  ];
  const env = {};
  for (const key of inheritedKeys) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return {
    ...env,
    HOSTNAME: LOOPBACK_HOST,
    NEXT_TELEMETRY_DISABLED: '1',
    NODE_ENV: 'production',
    PORT: String(port),
    ARCHIVE_STORAGE_ROOT: archiveStorageRoot,
    ARCHIVE_DATABASE_PATH: archiveDatabasePath,
  };
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, LOOPBACK_HOST, () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        probe.close(() => reject(new Error('Could not determine an available local port.')));
        return;
      }
      probe.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

function formatProbeError(error) {
  const details = [error.message, error.code, error.cause?.code, error.cause?.message]
    .filter(Boolean);
  return `${error.name}: ${details.join(' | ')}`;
}

function waitForServer(port, child, getOutput) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  const url = `http://${LOOPBACK_HOST}:${port}`;
  let attempts = 0;
  let lastProbeFailure = 'No HTTP readiness response was received.';
  let lastLoggedFailureAt = 0;
  log(`Checking local server readiness at ${url}/api/electron-smoke (pid=${child.pid}).`);

  return (async () => {
    while (Date.now() < deadline) {
      if (!serverIsRunning) {
        throw new Error(
          `The local Next.js server stopped unexpectedly during readiness checks.\n${getOutput()}`,
        );
      }

      attempts += 1;
      try {
        const response = await fetch(`${url}/api/electron-smoke`, {
          signal: AbortSignal.timeout(READINESS_REQUEST_TIMEOUT_MS),
        });
        const body = await response.text();
        let result;
        try {
          result = JSON.parse(body);
        } catch {
          result = undefined;
        }

        if (response.ok && result?.ok === true && result?.runtime === 'nodejs') {
          log(`Readiness check succeeded with HTTP ${response.status} after ${attempts} attempts.`);
          return url;
        }

        const bodySummary = body.replace(/\s+/g, ' ').slice(0, 500);
        lastProbeFailure = `HTTP ${response.status}; response body: ${bodySummary || '<empty>'}`;
      } catch (error) {
        lastProbeFailure = formatProbeError(error);
      }

      const now = Date.now();
      if (!lastLoggedFailureAt || now - lastLoggedFailureAt >= READINESS_LOG_INTERVAL_MS) {
        log(`Readiness check attempt ${attempts} failed: ${lastProbeFailure}`);
        lastLoggedFailureAt = now;
      }
      await new Promise((resolve) => setTimeout(resolve, READINESS_RETRY_DELAY_MS));
    }

    throw new Error(
      `The local Next.js server did not become ready within ${STARTUP_TIMEOUT_MS} ms. `
      + `URL: ${url}/api/electron-smoke; PID: ${child.pid}; attempts: ${attempts}. `
      + `Last readiness check: ${lastProbeFailure}\n${getOutput()}`,
    );
  })();
}

async function startServer() {
  const serverDirectory = getServerDirectory();
  const serverEntry = path.join(serverDirectory, 'server.js');
  await mkdir(path.join(app.getPath('userData'), 'archive'), { recursive: true });
  let lastError;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const port = await findAvailablePort();
    let output = '';
    const appendOutput = (chunk) => {
      output = `${output}${chunk.toString()}`.slice(-8000);
      log(`[next] ${chunk.toString().trimEnd()}`);
    };
    const child = utilityProcess.fork(serverEntry, [], {
      cwd: serverDirectory,
      env: getRuntimeEnvironment(port),
      serviceName: 'Al-Muhtaraz Next.js',
      stdio: 'pipe',
    });
    serverProcess = child;
    serverIsRunning = true;
    log(`Started local Next.js server process (entry=${serverEntry}, port=${port}).`);
    child.once('spawn', () => {
      log(`Local Next.js server process spawned (pid=${child.pid}).`);
    });
    child.stdout?.on('data', appendOutput);
    child.stderr?.on('data', appendOutput);
    child.once('exit', (code) => {
      serverIsRunning = false;
      if (!isQuitting && serverUrl) {
        log(`Local Next.js server exited unexpectedly with code ${code}.`);
        void showFatalError('توقف خادم التطبيق المحلي. أغلق التطبيق وأعد تشغيله.');
      }
    });

    try {
      serverUrl = await waitForServer(port, child, () => output);
      log(`Local Next.js server is ready at ${serverUrl}.`);
      if (smokeTestMode) {
        log(`[smoke-test] server-pid=${child.pid}`);
      }
      return;
    } catch (error) {
      lastError = error;
      if (serverIsRunning) {
        child.kill();
      }
      if (!/EADDRINUSE|address already in use/i.test(output)) {
        break;
      }
    }
  }

  throw lastError || new Error('Could not start the local Next.js server.');
}

async function showFatalError(message) {
  if (isQuitting) return;
  isQuitting = true;
  if (smokeTestMode) {
    log(`[smoke-test] fatal: ${message}`);
    await logWrite;
    app.quit();
    return;
  }
  await dialog.showMessageBox({
    type: 'error',
    title: 'تعذر تشغيل التطبيق',
    message,
    detail: 'تحقق من ملفات تثبيت التطبيق ثم أعد تشغيله.',
  });
  app.quit();
}

async function downloadUpdate(payload) {
  if (payload.sizeBytes > MAX_UPDATE_SIZE_BYTES) {
    throw new Error('The signed update installer exceeds the 1 GiB safety limit.');
  }

  const updateDirectory = path.join(app.getPath('userData'), 'updates');
  await mkdir(updateDirectory, { recursive: true });
  const installerPath = path.join(updateDirectory, payload.fileName);
  await rm(installerPath, { force: true });
  const response = await fetch(payload.downloadUrl, {
    signal: AbortSignal.timeout(UPDATE_DOWNLOAD_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Installer download failed with HTTP ${response.status}.`);
  }
  if (!response.body) {
    throw new Error('Installer download returned an empty response stream.');
  }

  const hash = createHash('sha256');
  let downloadedBytes = 0;
  const verifier = new Transform({
    transform(chunk, _encoding, callback) {
      downloadedBytes += chunk.length;
      if (downloadedBytes > payload.sizeBytes) {
        callback(new Error('Downloaded installer is larger than the signed size.'));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(response.body),
      verifier,
      createWriteStream(installerPath, { flags: 'wx' }),
    );
    if (downloadedBytes !== payload.sizeBytes) {
      throw new Error(
        `Downloaded installer size mismatch: expected ${payload.sizeBytes}, received ${downloadedBytes}.`,
      );
    }
    const actualHash = hash.digest('hex');
    if (actualHash !== payload.sha256) {
      throw new Error('Downloaded installer SHA-256 does not match the signed update manifest.');
    }
    return installerPath;
  } catch (error) {
    await rm(installerPath, { force: true });
    throw error;
  }
}

async function showUpdateDownloadWindow() {
  const parentWindow = BrowserWindow.getAllWindows().find((window) => !window.isDestroyed());
  const downloadWindow = new BrowserWindow({
    width: 520,
    height: 220,
    ...(parentWindow ? { parent: parentWindow } : {}),
    autoHideMenuBar: true,
    resizable: false,
    show: false,
    title: 'جارٍ تنزيل التحديث',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>جارٍ تنزيل التحديث</title>
  <style>
    body { font-family: "Segoe UI", Tahoma, sans-serif; margin: 0; padding: 28px; color: #172033; }
    h1 { font-size: 19px; margin: 0 0 14px; }
    p { font-size: 15px; line-height: 1.8; margin: 0 0 18px; }
    progress { width: 100%; height: 12px; }
  </style>
</head>
<body>
  <main>
    <h1>جارٍ تنزيل التحديث والتحقق منه</h1>
    <p>جارٍ تنزيل التحديث والتحقق منه. يمكنك مواصلة العمل، ويرجى إبقاء المحترز مفتوحًا حتى يظهر زر التثبيت.</p>
    <progress aria-label="جارٍ تنزيل التحديث والتحقق منه"></progress>
  </main>
</body>
</html>`;
  await downloadWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  downloadWindow.show();
  return downloadWindow;
}

async function checkForUpdate() {
  if (!app.isPackaged || smokeTestMode) {
    return;
  }

  const response = await fetch(UPDATE_CHECK_URL, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(UPDATE_REQUEST_TIMEOUT_MS),
  });
  if (response.status === 204) {
    log('Update check completed; no published update is available.');
    return;
  }
  if (!response.ok) {
    throw new Error(`Update check failed with HTTP ${response.status}.`);
  }

  const manifestText = await response.text();
  if (Buffer.byteLength(manifestText, 'utf8') > 64 * 1024) {
    throw new Error('Update service returned a manifest larger than 64 KiB.');
  }
  const manifest = JSON.parse(manifestText);
  const payload = verifyUpdateManifest(manifest);
  if (payload.repository !== UPDATE_REPOSITORY) {
    throw new Error('Update manifest belongs to an unexpected GitHub repository.');
  }
  if (compareStableVersions(payload.version, app.getVersion()) <= 0) {
    log(`Update check completed; current version ${app.getVersion()} is up to date.`);
    return;
  }

  log(`Found signed update ${payload.version} (current=${app.getVersion()}).`);
  const downloadChoice = await dialog.showMessageBox({
    type: 'info',
    title: 'يتوفر تحديث جديد',
    message: `يتوفر تحديث جديد للمحترز للحاويات (${payload.version}).`,
    detail: 'هل تريد تنزيل ملف التحديث الآن؟ سيتم التحقق من توقيعه وبصمته قبل عرضه للتثبيت.',
    buttons: ['تنزيل التحديث', 'لاحقًا'],
    defaultId: 0,
    cancelId: 1,
  });
  if (downloadChoice.response !== 0) {
    log(`User postponed update ${payload.version}.`);
    return;
  }

  let installerPath;
  let downloadWindow;
  try {
    log(`Downloading update ${payload.version} from ${payload.downloadUrl}.`);
    downloadWindow = await showUpdateDownloadWindow();
    installerPath = await downloadUpdate(payload);
    if (!downloadWindow.isDestroyed()) {
      downloadWindow.close();
    }
    downloadWindow = undefined;
    log(`Downloaded and verified update ${payload.version} at ${installerPath}.`);
    const installChoice = await dialog.showMessageBox({
      type: 'info',
      title: 'اكتمل تنزيل التحديث',
      message: `تم تنزيل التحديث ${payload.version} والتحقق منه بنجاح.`,
      detail: 'احفظ عملك قبل المتابعة. عند الضغط على «تشغيل برنامج التثبيت»، سيُغلق المحترز تلقائيًا، ثم يُفتح من جديد بعد اكتمال التحديث. يرجى الانتظار. وافق على التثبيت فوق النسخة الحالية عند ظهور نافذة Windows.',
      buttons: ['تشغيل برنامج التثبيت', 'إلغاء'],
      defaultId: 0,
      cancelId: 1,
    });
    if (installChoice.response !== 0) {
      await rm(installerPath, { force: true });
      log(`User cancelled installation of update ${payload.version}.`);
      return;
    }

    await new Promise((resolve, reject) => {
      const installer = spawn(installerPath, [], { detached: true, stdio: 'ignore' });
      installer.once('error', reject);
      installer.once('spawn', () => {
        installer.unref();
        resolve();
      });
    });
    log(`Started installer for update ${payload.version}.`);
    app.quit();
  } catch (error) {
    if (downloadWindow && !downloadWindow.isDestroyed()) {
      downloadWindow.close();
    }
    if (installerPath) {
      await rm(installerPath, { force: true });
    }
    log(`Could not download or start update ${payload.version}: ${error.stack || error.message}`);
    await dialog.showMessageBox({
      type: 'error',
      title: 'تعذر إكمال التحديث',
      message: `تعذر تنزيل التحديث ${payload.version} أو تشغيله.`,
      detail: error.message,
    });
  }
}

async function runScheduledUpdateCheck() {
  if (updateCheckInProgress || isQuitting) {
    return;
  }

  updateCheckInProgress = true;
  try {
    await checkForUpdate();
  } catch (error) {
    log(`Update check failed: ${error.stack || error.message}`);
  } finally {
    updateCheckInProgress = false;
  }
}

function registerExternalRequestLog() {
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
    try {
      const requestUrl = new URL(details.url);
      if (!['file:', 'data:'].includes(requestUrl.protocol) && !LOOPBACK_HOSTS.has(requestUrl.hostname)) {
        let initiator = 'unknown';
        try {
          if (details.initiator) initiator = new URL(details.initiator).origin;
        } catch {
          initiator = 'unparseable';
        }
        log(`[external-request] ${requestUrl.origin} initiator=${initiator}`);
        callback({ cancel: smokeTestMode });
        return;
      }
    } catch (error) {
      log(`[network-log-error] ${error.message}`);
      callback({ cancel: smokeTestMode });
      return;
    }
    callback({});
  });
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== new URL(serverUrl).origin) {
      event.preventDefault();
    }
  });
  window.webContents.on('did-fail-load', (_event, code, description, validatedUrl, isMainFrame) => {
    if (isMainFrame && code !== -3) {
      log(`Window failed to load ${validatedUrl}: ${description} (${code}).`);
      void showFatalError('تعذر فتح واجهة التطبيق المحلية.');
    }
  });
  await window.loadURL(serverUrl);
  window.show();
  log('[smoke-test] window loaded');
  if (smokeTestMode) {
    setTimeout(() => app.quit(), 5000);
  } else {
    setTimeout(() => void runScheduledUpdateCheck(), 3000);
    const updateCheckTimer = setInterval(
      () => void runScheduledUpdateCheck(),
      UPDATE_CHECK_INTERVAL_MS,
    );
    updateCheckTimer.unref?.();
  }
}

app.on('before-quit', (event) => {
  isQuitting = true;
  if (!allowQuit && serverProcess && serverIsRunning) {
    event.preventDefault();
    const child = serverProcess;
    child.once('exit', () => {
      allowQuit = true;
      app.quit();
    });
    child.kill();
  }
});

app.whenReady().then(async () => {
  const reportArgument = process.argv.find((argument) => argument.startsWith('--smoke-report='));
  logPath = reportArgument
    ? path.resolve(reportArgument.slice('--smoke-report='.length))
    : path.join(app.getPath('userData'), 'desktop-runtime.log');
  await mkdir(path.dirname(logPath), { recursive: true });
  registerExternalRequestLog();
  try {
    await startServer();
    await createWindow();
  } catch (error) {
    log(`Startup failed: ${error.stack || error.message}`);
    await showFatalError(`لم يتمكن التطبيق من تشغيل خادمه المحلي.\n${error.message}`);
  }
}).catch(async (error) => {
  log(`Electron initialization failed: ${error.stack || error.message}`);
  await showFatalError('تعذر تهيئة التطبيق على هذا الجهاز.');
});

app.on('window-all-closed', () => {
  app.quit();
});
