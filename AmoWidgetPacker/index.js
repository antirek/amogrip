import * as path from 'path'
import * as fse from 'fs-extra'
import * as fsp from 'fs/promises'
import JSZip from 'jszip'
import {globby} from 'globby';
import uniqid from 'uniqid'
import decomment from 'decomment';


export class AmoWidgetPacker {
  bundlePath;
  widgetDir;
  bundleType;
  debugKey = 'rsDebugUrl_' + uniqid();
  version;
  buildFile;
  devEntryPoint;
  outputDir;

  constructor(options) {
    this.bundleDir = options.bundleDir || './bundle';
    this.distDir = options.distDir || './dist';
    this.widgetDir = options.widgetDir || './widget';
    this.version = options.version || 'latest';
    this.bundleType = options.bundleType || 'dev';
    this.buildFile = options.buildFile || 'build.js';
    this.devEntryPoint = options.devEntryPoint || 'http://localhost:3000/';
    this.outputDir = options.outputDir || './output';
  }

  async getArchivePath() {
    await this.createDir(this.outputDir);
    return path.join(this.outputDir, 'widget.zip');
  }

  async createBundleDir() {
    return this.createDir(this.bundleDir)
  }

  async createDir(path) {
    const exists = await fse.pathExists(path);
    if (!exists) await fsp.mkdir(path);
  }

  async pack() {
    await this.cleanBundleDir();
    await this.createBundleDir();
    await this.copyWidgetDir();
    await this.copyDistDir();
    await this.prepareScript();
    await this.updateManifest();
    //await this.removeComments();
    await this.removeConsoleLog();
    await this.zip();
  }

  async cleanBundleDir() {
    const exists = await fse.pathExists(path);
    if(exists) await fse.remove(this.bundlePath)
    console.log('build dir removed');
  }

  async copyWidgetDir () {
    const exists = await fse.pathExists(this.widgetDir);
    if (exists) {
      await fse.copy(this.widgetDir, path.resolve(this.bundleDir))
    }
  }

  async copyDistDir () {
    const exists = await fse.pathExists(this.distDir);
    if (exists) {
      await fse.copy(this.distDir, path.resolve(this.bundleDir))
    }
  }

  async prepareScript () {
    const localStoragePlace = `localStorage['${this.debugKey}']`;

    const scriptFile = (await fsp.readFile(path.resolve(this.widgetDir, 'script.js'), 'utf8')).toString();
    let modifiedScriptFile;
    if (this.bundleType === 'dev') {
      modifiedScriptFile = scriptFile.replace('@entrypoint@', `\${${localStoragePlace} || '${this.devEntryPoint}'}`);
    } else {
      modifiedScriptFile = scriptFile.replace('@entrypoint@', `./js/app.js?version=${this.version}`);
    }

    await fsp.writeFile(path.resolve(this.bundleDir, 'script.js'), modifiedScriptFile);
  }

  async zip() {
    const zip = new JSZip();
    const filePaths = await globby(['**', '!*.zip'], { cwd: this.bundleDir })

    filePaths.forEach(filePath => {
      zip.file(filePath, fsp.readFile(path.resolve(this.bundleDir, filePath)), {
        compression: "DEFLATE",
        compressionOptions: {
          level: 9
        },
      });
    });

    const archive = (await zip.generateAsync({ type: 'nodebuffer' }));
    const archivePath = await this.getArchivePath()
    await fsp.writeFile(archivePath, archive);
    const stats = await fsp.stat(archivePath)
    console.log('archive path', archivePath);
    console.log('archive size', `${Math.round(stats.size / 1024)} KB`);
    console.log('archive ready');

    return archivePath
  }

  async removeComments () {
    const buildFilePath = path.resolve(this.bundleDir, this.buildFile);
    const exist = await fse.pathExists(buildFilePath);
    if(!exist) return;

    const buildFile = (await fsp.readFile(buildFilePath, 'utf8')).toString();
    const modifiedBuildFile = decomment(buildFile);
    await fsp.writeFile(buildFilePath, modifiedBuildFile);
  }

  async updateManifest () {
    const manifestFile = (await fsp.readFile(path.resolve(this.widgetDir, 'manifest.json'), 'utf8')).toString();
    
    const manifestObject = JSON.parse(manifestFile);
    manifestObject.widget.version = this.version;
    const modifiedManifestFile = JSON.stringify(manifestObject, null, 2);

    await fsp.writeFile(path.resolve(this.bundleDir, 'manifest.json'), modifiedManifestFile);
  }
  
  async removeConsoleLog() {
    const filePaths = await globby(['**/**.js'], { cwd: this.bundleDir })
    console.log('files for check', filePaths.length);

    for (const filePath of filePaths) {
      const p = path.resolve(this.bundleDir, filePath);
      const fileContent = await fsp.readFile(p, "utf8");
      // const regex = new RegExp(/console\.log\(([^)]+)\);?/g);
      // const regexLog = new RegExp(/console\.log\((.|\n)*?\);?/g);
      // const result = fileContent.replace(regexLog, "");

      const namespaces = ['console', 'window.console'];
      const methods = [
        "log",
        "warn",
        "error",
        "info",
        "debug",
        "trace",
        "dir",
        "dirxml",
        "table",
        "time",
        "timeLog",
        "timeEnd",
        "assert",
        "clear",
        "count",
        "countReset",
        "group",
        "groupCollapsed",
        "groupEnd",
        "profile",
        "profileEnd",
        "timeStamp",
        "timeOrigin",
      ];;

      var regex_console = new RegExp(
        ("(" + namespaces.join("|") + ")" +
            ".(?:" + methods.join("|") +
            ")\\s{0,}\\([^;]*\\)(?!\\s*[;,]?\\s*\\/\\*\\s*" +
            "RemoveLogging:skip\\s*\\*\\/)\\s{0,};?"),
        "gi"
      );
      let result = fileContent.replace(regex_console, "void 0;");

      const regex = new RegExp(("(" + namespaces.join("|") + ").("+ methods.join("|") + ")"), "gi");
      result = result.replace(regex, 'true');

      const regex2 = /console/gi;
      result = result.replace(regex2, 'true');
      // console.log('result', result);

      await fsp.writeFile(p, result, "utf8");
      console.log(`console.log was removed from file: ${filePath}`);
    };
  }


}
