import { AmoWidgetPacker } from './index.js';


const options = {
  tempWidgetPath: './tmp',
  bundleType: 'production',
}

const packer = new AmoWidgetPacker(options);
(packer.pack)()
