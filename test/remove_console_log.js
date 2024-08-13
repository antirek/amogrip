import { AmoWidgetPacker } from '../index.js';

const options = {
  buildWidgetPath: './build',
  bundleType: 'production',
  widgetDir: './widget',
  version: '0.0.1',
}

const packer = new AmoWidgetPacker(options);
const files = await packer.checkForConsoleLogs();
await packer.removeConsoleLog(files);

