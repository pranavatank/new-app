const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

function prepareSQLite() {
  const root = resolve(__dirname, '..');
  const gradleFile = join(root, 'node_modules', 'expo-sqlite', 'android', 'build.gradle');
  const gradle = readFileSync(gradleFile, 'utf8').replace(/\r\n/g, '\n');
  const version = gradle.match(/def SQLITE_VERSION = '(\d+)'/)?.[1];
  if (version !== '3450300') {
    throw new Error('Update the vendored SQLite archive and Gradle patch after changing expo-sqlite.');
  }

  const archiveName = 'sqlite-amalgamation-' + version + '.zip';
  const archive = join(root, 'vendor', 'sqlite', archiveName);
  const expectedHash = 'ea170e73e447703e8359308ca2e4366a3ae0c4304a8665896f068c736781c651';
  if (createHash('sha256').update(readFileSync(archive)).digest('hex') !== expectedHash) {
    throw new Error('The vendored SQLite source archive failed its checksum.');
  }

  // Read the bundled archive directly so Gradle's download directory and cache are irrelevant.
  const localSource = 'from(zipTree(file("../../../vendor/sqlite/sqlite-amalgamation-${SQLITE_VERSION}.zip")))';
  if (!gradle.includes(localSource)) {
    const downloadTask = /def createNativeDepsDirectories = tasks\.register\('createNativeDepsDirectories'\) \{[\s\S]*?\n  from\(zipTree\(downloadSQLite\.get\(\)\.dest\)\)/;
    const downloadPlugin = "apply plugin: 'de.undercouch.download'\n";
    const downloadClasspath = /buildscript \{\n  repositories \{\n    mavenCentral\(\)\n  \}\n  dependencies \{\n    classpath\("de\.undercouch:gradle-download-task:5\.5\.0"\)\n  \}\n\}\n\n/;
    const downloadsDir = 'def customDownloadsDir = System.getenv("REACT_NATIVE_DOWNLOADS_DIR")\ndef downloadsDir = customDownloadsDir ? new File(customDownloadsDir) : new File("$buildDir/downloads")\n';
    if (!downloadTask.test(gradle) || !gradle.includes(downloadPlugin) || !downloadClasspath.test(gradle) || !gradle.includes(downloadsDir)) {
      throw new Error('The expo-sqlite Gradle download setup changed. Review the local SQLite patch.');
    }
    const patched = gradle
      .replace(downloadTask, 'def prepareSQLite = tasks.register("prepareSQLite", Copy) {\n  ' + localSource)
      .replace(downloadPlugin, '')
      .replace(downloadClasspath, '')
      .replace(downloadsDir, '');
    writeFileSync(gradleFile, patched);
  }
  console.log('Android Gradle will extract the verified SQLite 3.45.3 archive from vendor/sqlite.');
}

if (!process.env.EAS_BUILD_PLATFORM || process.env.EAS_BUILD_PLATFORM === 'android') {
  prepareSQLite();
}
