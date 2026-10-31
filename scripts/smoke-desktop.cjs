const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const STARTUP_TIMEOUT_MS = 60000;
const LOOPBACK_URL_PATTERN = /Local Next\.js server is ready at (http:\/\/127\.0\.0\.1:\d+)\./;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function readReport(reportPath) {
  try {
    return await fs.readFile(reportPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

async function waitForReady(child, reportPath) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let report = '';
  while (Date.now() < deadline) {
    report = await readReport(reportPath);
    if (report.includes('[smoke-test] fatal:')) {
      throw new Error(`The packaged app reported a startup failure:\n${report}`);
    }
    if (LOOPBACK_URL_PATTERN.test(report) && report.includes('[smoke-test] window loaded')) {
      return report;
    }
    if (child.exitCode !== null) {
      throw new Error(`The packaged app exited before becoming ready (code ${child.exitCode}).\n${report}`);
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for the packaged app to start.\n${report}`);
}

async function verifyRuntime(baseUrl) {
  const pageResponse = await fetch(baseUrl, { signal: AbortSignal.timeout(10000) });
  if (!pageResponse.ok) {
    throw new Error(`The local page returned HTTP ${pageResponse.status}.`);
  }
  const page = await pageResponse.text();
  if (!page.includes('<html lang="ar"')) {
    throw new Error('The local Next.js page did not return the Arabic application document.');
  }

  const apiResponse = await fetch(`${baseUrl}/api/electron-smoke`, {
    signal: AbortSignal.timeout(10000),
  });
  const api = await apiResponse.json();
  if (!apiResponse.ok || api.ok !== true || api.runtime !== 'nodejs') {
    throw new Error('The local API smoke route returned an invalid response.');
  }
}

async function waitForExit(child, closePromise, reportPath) {
  let timeout;
  const result = await Promise.race([
    closePromise,
    new Promise((resolve) => {
      timeout = setTimeout(() => resolve(null), 15000);
      timeout.unref?.();
    }),
  ]);
  clearTimeout(timeout);
  if (!result) {
    child.kill();
    throw new Error(`The packaged app did not close its local server in time.\n${await readReport(reportPath)}`);
  }
  if (result.code !== 0) {
    throw new Error(`The packaged app exited with code ${result.code}.\n${await readReport(reportPath)}`);
  }
}

async function waitForServerCrash(child, closePromise, reportPath) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const report = await readReport(reportPath);
    if (report.includes('[smoke-test] fatal: توقف خادم التطبيق المحلي.')) {
      const result = await closePromise;
      if (result.code !== 0) {
        throw new Error(`The app did not handle the server crash cleanly (exit ${result.code}).\n${report}`);
      }
      return report;
    }
    if (child.exitCode !== null) {
      throw new Error(`The app exited without reporting a server failure (exit ${child.exitCode}).\n${report}`);
    }
    await delay(100);
  }
  throw new Error(`The app did not report the server crash in time.\n${await readReport(reportPath)}`);
}

async function main() {
  const sourceDirectory = path.resolve(process.argv[2] || 'dist/win-unpacked');
  const relocate = process.argv.includes('--relocate');
  const crashServer = process.argv.includes('--crash-server');
  const entries = await fs.readdir(sourceDirectory, { withFileTypes: true });
  const executable = entries.find((entry) =>
    entry.isFile()
    && entry.name.toLowerCase().endsWith('.exe')
    && !entry.name.toLowerCase().includes('uninstall')
  );
  if (!executable) {
    throw new Error(`No application executable was found in ${sourceDirectory}.`);
  }

  const relocatedDirectory = relocate
    ? path.join(os.tmpdir(), `al-muhtaraz-desktop-${randomUUID()}`)
    : undefined;
  const appDirectory = relocatedDirectory || sourceDirectory;
  const reportPath = path.join(os.tmpdir(), `al-muhtaraz-smoke-${randomUUID()}.log`);
  let child;
  let succeeded = false;

  try {
    if (relocatedDirectory) {
      await fs.cp(sourceDirectory, relocatedDirectory, { recursive: true, errorOnExist: true });
    }

    child = spawn(
      path.join(appDirectory, executable.name),
      [
        '--smoke-test',
        ...(crashServer ? ['--smoke-crash-server'] : []),
        `--smoke-report=${reportPath}`,
      ],
      { cwd: appDirectory, windowsHide: true, stdio: 'ignore' },
    );
    const closePromise = new Promise((resolve) => {
      child.once('close', (code, signal) => resolve({ code, signal }));
    });

    const report = await waitForReady(child, reportPath);
    const match = report.match(LOOPBACK_URL_PATTERN);
    await verifyRuntime(match[1]);
    console.log('PASS: packaged app started its local Next.js server on 127.0.0.1.');
    console.log('PASS: the Arabic UI and independent Node.js API are served locally.');

    if (crashServer) {
      const serverPid = report.match(/\[smoke-test\] server-pid=(\d+)/)?.[1];
      if (!serverPid) throw new Error('The app did not report the local server process ID.');
      try {
        process.kill(Number(serverPid), 'SIGTERM');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
      const crashReport = await waitForServerCrash(child, closePromise, reportPath);
      if (!crashReport.includes('Local Next.js server exited unexpectedly')) {
        throw new Error(`The crash report did not identify the stopped server.\n${crashReport}`);
      }
      console.log('PASS: a terminated Next.js server produces a clear app error and closes Electron.');
      succeeded = true;
      return;
    }

    const externalOrigins = [...new Set(
      report.matchAll(/\[external-request\] (https?:\/\/\S+)/g),
    )].map((matchEntry) => matchEntry[1]);
    if (externalOrigins.length) {
      console.log(`External origins attempted by the UI (blocked in smoke mode): ${externalOrigins.join(', ')}`);
    } else {
      console.log('PASS: no external network requests were attempted during the smoke test.');
    }

    await waitForExit(child, closePromise, reportPath);
    try {
      await fetch(`${match[1]}/api/electron-smoke`, { signal: AbortSignal.timeout(1000) });
      throw new Error('The local Next.js server was still responding after the app exited.');
    } catch (error) {
      if (error.message.includes('still responding')) throw error;
    }
    console.log('PASS: the Electron app closed its local server cleanly.');
    succeeded = true;
  } finally {
    if (child && child.exitCode === null) child.kill();
    if (succeeded) {
      await fs.rm(reportPath, { force: true });
    } else {
      const report = await readReport(reportPath);
      if (report) console.error(`Smoke report (${reportPath}):\n${report}`);
    }
    if (relocatedDirectory) {
      await fs.rm(relocatedDirectory, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
