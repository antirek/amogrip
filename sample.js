import { AmoWidgetPacker } from './index.js';


const options = {
  buildWidgetPath: './build',
  bundleType: 'production',
  widgetDir: './widget',
  version: '0.0.1',
  outputDir: './output',
}

const packer = new AmoWidgetPacker(options);
(packer.pack)()
