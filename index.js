const ws281x = require('rpi-ws281x-native');
const _ = require('lodash');

ws281x.init(32);

const zeros = [
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0
];

ws281x.render(zeros);

let pixelIndex = 0;
setInterval(() => {
  console.log('Still alive');

  let pixels = _.clone(zeros);
  pixels[pixelIndex] = 0xaa0000;
  pixelIndex = (pixelIndex + 1) % 32;
  ws281x.render(pixels);
}, 100);