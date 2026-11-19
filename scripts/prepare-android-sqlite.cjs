const { createHash } = require('node:crypto');
const { copyFileSync, mkdirSync, readFileSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');

function prepareSQLite() {
  const root = resolve(__dirname, '..');
  const sqliteModule = join(root, 'node_modules', 'expo-sqlite');
  const gradle = readFileSync(join(sqliteModule, 'android', 'build.gradle'), 'utf8');
  const version = gradle.match(/def SQLITE_VERSION = '(\d+)'/)?.[1];
  if (version !== '3450300' || !gradle.includes('overwrite(false)')) {
    throw new Error('Check the vendored SQLite archive and download task after changing expo-sqlite.');
  }

  const archiveName = 'sqlite-amalgamation-' + version + '.zip';
  const archive = join(root, 'vendor', 'sqlite', archiveName);
  const expectedHash = 'ea170e73e447703e8359308ca2e4366a3ae0c4304a8665896f068c736781c651';
  if (createHash('sha256').update(readFileSync(archive)).digest('hex') !== expectedHash) {
    throw new Error('The vendored SQLite source archive failed its checksum.');
  }

  // The Expo Gradle task skips an existing archive because overwrite is false.
  const customDownloadsDir = process.env.REACT_NATIVE_DOWNLOADS_DIR;
  const downloadsDir = customDownloadsDir
    ? resolve(root, 'android', customDownloadsDir)
    : join(sqliteModule, 'android', 'build', 'downloads');
  const destination = join(downloadsDir, archiveName);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(archive, destination);
  console.log('Staged SQLite 3.45.3 for the Android native build.');
}

if (!process.env.EAS_BUILD_PLATFORM || process.env.EAS_BUILD_PLATFORM === 'android') {
  prepareSQLite();
}
