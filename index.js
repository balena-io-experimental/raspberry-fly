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

const Position = {
  TOP: 0,
  BOTTOM: 1
}

let birdPosition = 2;
let tick = 0;
let walls = [
  [Position.TOP, 7]
];

setInterval(() => {
  updateState();
  renderState();
}, 500);

const updateState = () => {
  tick += 1;

  // Add a wall every 4 ticks
  if (tick % 4 === 0) {
    let lastWall = walls[walls.length - 1];
    walls.push([1 - lastWall[0], 8]);
  }

  console.log(JSON.stringify(walls, null, 2));

  // Shift all walls one left
  walls = walls.map((wall) => {
    return [wall[0], wall[1] - 1];
  }).filter((wall) => {
    return wall[1] >= 0;
  });

  // TODO: Check for collisions
};

const renderState = () => {
  let pixels = _.clone(zeros);
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
}