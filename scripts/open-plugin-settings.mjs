import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { resolveLocalVault } from './local-vault.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { id } = JSON.parse(readFileSync(join(rootDir, 'manifest.json'), 'utf8'));
const vaultName = basename(resolveLocalVault(rootDir));
const run = promisify(execFile);
const cli = process.platform === 'win32' ? 'obsidian.com' : 'obsidian';
const settleMs = Number(process.env.RELOAD_SETTLE_MS ?? 2000);
if (!Number.isFinite(settleMs) || settleMs < 0) throw new Error('RELOAD_SETTLE_MS must be a nonnegative number.');
const code = `(async()=>{app.setting.open();app.setting.openTabById(${JSON.stringify(id)});await new Promise(r=>window.setTimeout(r,500));return app.setting.findTabById(${JSON.stringify(id)})?.containerEl?.isConnected?'settings-opened':'not-open';})()`;

for (let attempt = 1; attempt <= 3; attempt++) {
    await delay(settleMs);
    try {
        const { stdout } = await run(cli, [`vault=${vaultName}`, 'eval', `code=${code}`], { timeout: 20000, windowsHide: true });
        if (!stdout.includes('settings-opened')) throw new Error(`Settings page was not confirmed: ${stdout.trim()}`);
        console.log(`Opened ${id} settings in ${vaultName}`);
        break;
    } catch (error) {
        if (attempt === 3) throw error;
        console.warn(`Settings page attempt ${attempt} failed; waiting for plugin reload before retrying.`);
    }
}
