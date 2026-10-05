import { readFileSync, writeFileSync } from 'node:fs';

const readJson = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const writeJson = (name, value) => writeFileSync(new URL(name, import.meta.url), JSON.stringify(value, null, 2) + '\n');
const { version } = readJson('./package.json');
if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) throw new Error('Invalid package version');
const manifest = readJson('./manifest.json');
const versions = readJson('./versions.json');
if (versions[version] && versions[version] !== manifest.minAppVersion) throw new Error('Cannot change published version compatibility');
manifest.version = version;
versions[version] = manifest.minAppVersion;
writeJson('./manifest.json', manifest);
writeJson('./versions.json', versions);
