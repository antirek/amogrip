import * as path from 'path'
import * as fse from 'fs-extra'
import * as fsp from 'fs/promises'
import JSZip from 'jszip'
import {globby} from 'globby';
import uniqid from 'uniqid'


export class AmoWidgetPacker {
  tempWidgetPath = './tmp';
  widgetDir = './widget';
  bundleType;
  debugKey = 'rsDebugUrl_' + uniqid();
  version;

  constructor(options) {
    this.version = options.version || 'latest';
    this.bundleType = options.bundleType || 'dev';
  }

  get archivePath() {
    return path.resolve(this.tempWidgetPath, '..'), 'widget.zip';
  }

  async createTempFolder() {
    return this.createFolder(this.tempWidgetPath)
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
    await this.zip();
  }

  async clean() {
    await fse.remove(this.tempWidgetPath)
    console.log('Временная папка удалена')
  }

  async copyDir () {
    await fse.copy(this.widgetDir, path.resolve(this.tempWidgetPath))
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

    await fsp.writeFile(path.resolve(this.tempWidgetPath, 'script.js'), modifiedScriptFile);
  }

  async zip() {
    const zip = new JSZip()
    const filePaths = await globby(['**', '!*.zip'], { cwd: this.tempWidgetPath })

    filePaths.forEach(filePath => {
      zip.file(filePath, fsp.readFile(path.resolve(this.tempWidgetPath, filePath)))
    })

    const archive = (await zip.generateAsync({ type: 'nodebuffer' }));
    await fsp.writeFile(this.archivePath, archive)
    const stats = await fsp.stat(this.archivePath)
    console.log('Путь до архива', this.archivePath)
    console.log('Размер архива', `${Math.round(stats.size / 1024)} KB`)
    console.log('Архив готов')

    return this.archivePath
  }

}
