import { AmoWidgetPacker } from './index.js';


const options = {
  bundleDir: './bundle',
  bundleType: 'production',
  widgetDir: './widget',
  version: '0.0.1',
  outputDir: './output',
}

const packer = new AmoWidgetPacker(options);
(packer.pack)()
