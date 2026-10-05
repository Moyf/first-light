import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveLocalVault } from './local-vault.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vaultPath = resolveLocalVault(rootDir);
const obsidianDir = join(vaultPath, ".obsidian");

const manifest = JSON.parse(readFileSync(join(rootDir, "manifest.json"), "utf8"));
const pluginDir = join(obsidianDir, "plugins", manifest.id);
mkdirSync(pluginDir, { recursive: true });
const stylesSource = existsSync(join(rootDir, "styles.css"))
	? join(rootDir, "styles.css")
	: join(rootDir, "dist", "styles.css");
for (const file of ["main.js", "manifest.json", "styles.css"]) {
	const source = file === "styles.css" ? stylesSource : join(rootDir, file);
	if (existsSync(source)) copyFileSync(source, join(pluginDir, file));
	else if (file !== "styles.css") throw new Error(`Required build artifact is missing: ${source}`);
}
const hotreload = join(pluginDir, ".hotreload");
if (!existsSync(hotreload)) writeFileSync(hotreload, "");
console.log(`Copied ${manifest.id} to ${pluginDir}`);
