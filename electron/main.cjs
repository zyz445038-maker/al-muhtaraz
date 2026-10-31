const { app, BrowserWindow, dialog, session, utilityProcess } = require('electron');
const net = require('node:net');
const path = require('node:path');
const { appendFile, mkdir } = require('node:fs/promises');

const STARTUP_TIMEOUT_MS = 30000;
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

function waitForServer(port, child, getOutput) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  const url = `http://${LOOPBACK_HOST}:${port}`;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      error ? reject(error) : resolve(url);
    };
    const timer = setInterval(async () => {
      if (!serverIsRunning) {
        finish(new Error(`The local Next.js server stopped unexpectedly.\n${getOutput()}`));
        return;
      }
      if (Date.now() >= deadline) {
        finish(new Error(`The local Next.js server did not become ready in time.\n${getOutput()}`));
        return;
      }
      try {
        const response = await fetch(`${url}/api/electron-smoke`, {
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) {
          const result = await response.json();
          if (result?.ok === true && result?.runtime === 'nodejs') {
            finish();
          }
        }
      } catch {
        if (!serverIsRunning) {
          finish(new Error(`The local Next.js server stopped unexpectedly.\n${getOutput()}`));
        }
      }
    }, 250);
    timer.unref?.();
    child.once('exit', (code) => {
      if (!settled) {
        finish(new Error(`The local Next.js server exited with code ${code}.\n${getOutput()}`));
      }
    });
  });
}

async function startServer() {
  const serverDirectory = getServerDirectory();
  const serverEntry = path.join(serverDirectory, 'server.js');
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
