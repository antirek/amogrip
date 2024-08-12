import * as path from 'path'
import * as fse from 'fs-extra'
import * as fsp from 'fs/promises'
import JSZip from 'jszip'
import {globby} from 'globby';
import uniqid from 'uniqid'
import decomment from 'decomment';

export class AmoWidgetPacker {
  buildWidgetPath;
  widgetDir;
  bundleType;
  debugKey = 'rsDebugUrl_' + uniqid();
  version;
  buildFile;

  constructor(options) {
    this.buildWidgetPath = options.buildWidgetPath || './build';
    this.widgetDir = options.widgetDir || './widget';
    this.version = options.version || 'latest';
    this.bundleType = options.bundleType || 'dev';
    this.buildFile = options.buildFile || 'build.js';
  }

  get archivePath() {
    return path.resolve(this.buildWidgetPath, '..'), 'widget.zip';
  }

  async createTempFolder() {
    return this.createFolder(this.buildWidgetPath)
  }

  async createFolder(path) {
    const exists = await fse.pathExists(path)
    if (!exists) await fsp.mkdir(path)
  }

  async pack() {
    await this.clean();
    await this.createTempFolder();
    await this.copyDir();
    await this.prepareScript();
    await this.updateManifest();
    await this.removeComments();
    await this.zip();
  }

  async clean() {
    await fse.remove(this.buildWidgetPath)
    console.log('build dir removed');
  }

  async copyDir () {
    await fse.copy(this.widgetDir, path.resolve(this.buildWidgetPath))
  }

  async prepareScript () {
    const localStoragePlace = `localStorage['${this.debugKey}']`;
    const entrypoint = 'https://localhost:3000/';

    const scriptFile = (await fsp.readFile(path.resolve(this.widgetDir, 'script.js'), 'utf8')).toString();
    let modifiedScriptFile;
    if (this.bundleType === 'dev') {
      modifiedScriptFile = scriptFile.replace('@entrypoint@', `\${${localStoragePlace} || '${entrypoint}'}`);
    } else {
      modifiedScriptFile = scriptFile.replace('@entrypoint@', `./build.js?version=${this.version}`);
    }

    await fsp.writeFile(path.resolve(this.buildWidgetPath, 'script.js'), modifiedScriptFile);
  }

  async zip() {
    const zip = new JSZip();
    const filePaths = await globby(['**', '!*.zip'], { cwd: this.buildWidgetPath })

    filePaths.forEach(filePath => {
      zip.file(filePath, fsp.readFile(path.resolve(this.buildWidgetPath, filePath)))
    })

    const archive = (await zip.generateAsync({ type: 'nodebuffer' }));
    await fsp.writeFile(this.archivePath, archive)
    const stats = await fsp.stat(this.archivePath)
    console.log('archive path', this.archivePath);
    console.log('archive size', `${Math.round(stats.size / 1024)} KB`);
    console.log('archive ready');

    return this.archivePath
  }

  async removeComments () {
    const buildFilePath = path.resolve(this.buildWidgetPath, this.buildFile);
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

    await fsp.writeFile(path.resolve(this.buildWidgetPath, 'manifest.json'), modifiedManifestFile);
  }
}
