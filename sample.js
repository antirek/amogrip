import { AmoWidgetPacker } from './index.js';


const options = {
  tempWidgetPath: './tmp',
  bundleType: 'production',
  widgetDir: './widget',
  version: '0.0.1',
}

const packer = new AmoWidgetPacker(options);
(packer.pack)()
