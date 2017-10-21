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
let background = zeros;

const Position = {
  TOP: 0,
  BOTTOM: 1
}

let birdPosition = 2;
let flashState = false;
let tick = 0;
let walls = [
  [Position.TOP, 7]
];

setInterval(() => {
  updateState();
  renderState();
}, 250);

const updateState = () => {
  tick += 1;

  // Add a wall every 4 ticks
  if (tick % 4 === 0) {
    let lastWall = walls[walls.length - 1];
    walls.push([1 - lastWall[0], 8]);
  }

  // Shift all walls one left
  walls = walls.map((wall) => {
    return [wall[0], wall[1] - 1];
  }).filter((wall) => {
    return wall[1] >= 0;
  });

  if (walls[0][1] === 0) {
    if ((walls[0][0] === Position.TOP && birdPosition <= 1) ||
      (walls[0][0] === Position.BOTTOM && birdPosition >= 2)) {
      flashState = 0;
    }
  }

  if (flashState !== false) {
    flashState += 1;
    if (flashState === 1) {
      background = _.range(32).map(() => 0x555555);
    } else if (flashState === 2) {
      background = _.range(32).map(() => 0x000000);
    } else if (flashState === 3) {
      background = _.range(32).map(() => 0x555555);
    } else if (flashState === 4) {
      background = _.range(32).map(() => 0x000000);
      flashState = false;
    }
  }
};

const renderState = () => {
  let pixels = _.clone(background);
  pixels[birdPosition * 8] = 0x00ff00;

  walls.forEach((wall) => {
    if (wall[0] === Position.TOP) {
      pixels[wall[1]] = 0xff0000;
      pixels[wall[1] + 8] = 0xff0000;
    } else {
      pixels[wall[1] + 16] = 0xff0000;
      pixels[wall[1] + 24] = 0xff0000;
    }
  });

  ws281x.render(pixels);
}