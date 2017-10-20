const Blinkt = require('node-blinkt');

const leds = new Blinkt();
leds.clearAll();
leds.sendUpdate();

console.log('Starting');

let currentLed = 0;
setInterval(() => {
    console.log('Set pixel', currentLed);
    leds.clearAll();
    leds.setPixel(currentLed, 255, 255, 255, 1);
    leds.sendUpdate();

    currentLed = (currentLed + 1) % 8;
}, 1000);