/**
 * set-version-env.js
 *
 * Reads version and releaseDate from package.json and writes them into
 * .env.production and .env.development so that react-scripts picks them up
 * as REACT_APP_VERSION and REACT_APP_RELEASE_DATE in both build and dev modes.
 *
 * Also writes/updates public/version.json so the deployed server file
 * always matches the build that was just produced.
 *
 * Run automatically as part of "npm run build" and "npm start" via pre* hooks.
 */

const fs   = require('fs');
const path = require('path');

const pkg         = require('../package.json');
const version     = pkg.version     || '0.0.0';
const releaseDate = pkg.releaseDate || new Date().toISOString().slice(0, 10);

const envContent = `REACT_APP_VERSION=${version}\nREACT_APP_RELEASE_DATE=${releaseDate}\n`;

// Write both env files so the vars are available in dev and production builds.
const envFiles = ['.env.production', '.env.development'];
envFiles.forEach((name) => {
    const envPath = path.resolve(__dirname, '..', name);
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`[set-version-env] Wrote ${envPath}`);
});

console.log(`  REACT_APP_VERSION=${version}`);
console.log(`  REACT_APP_RELEASE_DATE=${releaseDate}`);

// ── Write public/version.json ────────────────────────────────────────────────
const versionJsonPath = path.resolve(__dirname, '../public/version.json');
const existing        = fs.existsSync(versionJsonPath)
    ? JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'))
    : {};

const updated = {
    ...existing,
    version,
    releaseDate,
};
fs.writeFileSync(versionJsonPath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
console.log(`[set-version-env] Updated ${versionJsonPath}`);
