const metawear = require('node-metawear');
const ws281x = require('rpi-ws281x-native');
const _ = require('lodash');

function scanForControllers() {
  return new Promise((resolve, reject) => {
    metawear.discover((device) => {
      console.log('Found', device.id);

      device.connectAndSetup((error) => {
        if (error) {
          console.log('Connection error!');
          return scanForControllers();
        } else {
          resolve(device);
        }
      });
    });
  });
}

ws281x.init(32);

const zeros = [
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0
];

ws281x.render(zeros);

console.log('Scanning for controllers');
let connectingInterval = showConnecting();
scanForControllers().then((device) => {
  console.log('Controller connected!');

  let button = new device.Switch(device);
  button.register();

  button.onChange((pressed) => {
    if (pressed === 0) {
      console.log('Button pressed');
      onButtonPress();
    }
  });

  device.on('disconnect', () => {
    console.log('Controller disconnected');
    ws281x.render(zeros);
    process.exit(0);
  });

  clearInterval(connectingInterval);
  startGame();
});

const Position = {
  TOP: 0,
  BOTTOM: 1
}

// Woooo, global stateeeeee
let background, birdPosition, flashState, buttonPressed, tick, walls, stepDuration;

function startGame() {
  background = zeros;
  birdPosition = 2;
  flashState = false;
  buttonPressed = false;
  tick = 0;
  walls = [
    [Position.TOP, 7]
  ];

  let intervalStep = 0;
  stepFrequency = 25;
  interval = setInterval(() => {
    // Only tick every 10ms * stepFreq, but steadily decrease stepFreq to 1...
    if (intervalStep % stepFrequency !== 0) return;
    if (intervalStep % 500 === 0) stepFrequency = Math.max(stepFrequency - 1, 1);

    intervalStep += 1;

    updateState();
    renderState();

    if (flashState === 4) {
      clearInterval(interval);
      showGameOver();
    }
  }, 10);
}

const onButtonPress = () => {
  buttonPressed = true;
}

const updateState = () => {
  tick += 1;

  if (buttonPressed && birdPosition > 0) {
    birdPosition -= 1;
    buttonPressed = false;
  } else {
    birdPosition = Math.min(birdPosition + 1, 3);
  }

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

function showConnecting() {
  const W = 0x888888;

  const connectingText = [
    0,0,0,0,0,0,0,0,0,0,W,W,0,0,W,0,0,W,0,0,W,0,W,0,0,W,0,0,W,0,0,0,W,W,0,W,W,W,0,W,0,W,0,0,W,0,0,W,W,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,W,0,0,0,W,0,W,0,W,W,W,W,0,W,W,0,W,0,W,0,W,0,W,0,0,0,0,W,0,0,W,0,W,W,0,W,0,W,0,0,,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,W,0,0,0,W,0,W,0,W,0,W,W,0,W,0,W,W,0,W,W,0,0,W,0,0,0,0,W,0,0,W,0,W,0,W,W,0,W,0,W,W,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,W,W,0,0,W,0,0,W,0,0,W,0,W,0,0,W,0,0,W,W,0,0,W,W,0,0,W,0,0,W,0,W,0,0,W,0,0,W,W,0,W,0,W,0,W,0,0,0,0,0,0,0,0
  ];

  const lineLength = connectingText.length / 4;

  let columnIndex = 0;

  return setInterval(() => {
    let pixels = [
      ...connectingText.slice(columnIndex, columnIndex + 8),
      ...connectingText.slice(columnIndex + lineLength, columnIndex + lineLength + 8),
      ...connectingText.slice(columnIndex + lineLength*2, columnIndex + lineLength*2 + 8),
      ...connectingText.slice(columnIndex + lineLength*3, columnIndex + lineLength*3 + 8)
    ];

    ws281x.render(pixels);

    columnIndex = (columnIndex + 1) % (lineLength - 8);
  }, 100);
}

function showGameOver() {
  const W = 0x888888;

  const gameOverText = [
    0,0,0,0,0,0,0,0,0,W,W,0,0,0,W,0,0,0,W,0,W,0,0,0,W,0,0,0,0,0,0,W,0,0,W,0,W,0,0,W,0,0,0,W,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,W,0,0,0,0,W,0,W,0,W,0,W,0,W,0,W,0,W,0,0,0,0,W,0,W,0,W,0,W,0,W,0,W,0,W,0,W,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,W,0,W,W,0,W,W,W,0,W,0,W,0,W,0,W,W,0,0,0,0,0,W,0,W,0,W,0,W,0,W,W,0,0,W,W,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,W,W,0,0,W,0,W,0,W,0,0,0,W,0,0,W,W,0,0,0,0,0,W,0,0,0,W,0,0,0,W,W,0,W,0,W,0,0,0,0,0,0,0,0,0
  ];

  const lineLength = gameOverText.length / 4;

  let columnIndex = 0;
  let interval = setInterval(() => {
    let pixels = [
      ...gameOverText.slice(columnIndex, columnIndex + 8),
      ...gameOverText.slice(columnIndex + lineLength, columnIndex + lineLength + 8),
      ...gameOverText.slice(columnIndex + lineLength*2, columnIndex + lineLength*2 + 8),
      ...gameOverText.slice(columnIndex + lineLength*3, columnIndex + lineLength*3 + 8)
    ];
    ws281x.render(pixels);

    columnIndex += 1;

    if (columnIndex > lineLength - 8) {
      clearInterval(interval);
      startGame();
    }
  }, 100);
}