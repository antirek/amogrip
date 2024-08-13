import { AmoWidgetPacker } from './index.js';


const options = {
  buildWidgetPath: './tmp',
  bundleType: 'production',
  widgetDir: './widget',
  version: '0.0.1',
}

const packer = new AmoWidgetPacker(options);
(packer.pack)()
