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
let background, birdPosition, flashState, buttonPressed, tick, walls;

function startGame() {
  background = zeros;
  birdPosition = 2;
  flashState = false;
  buttonPressed = false;
  tick = 0;
  walls = [
    [Position.TOP, [0, 1], 7]
  ];

  let intervalStep = 0;
  let stepFrequency = 25;
  interval = setInterval(() => {
    intervalStep += 1;
    // Only tick every 10ms * stepFreq, but steadily decrease stepFreq to 1...
    if (intervalStep % 500 === 0) {
      stepFrequency = Math.max(stepFrequency - 1, 1);
    }
    if (intervalStep % stepFrequency !== 0) return;

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

  if (buttonPressed) {
    birdPosition = Math.max(birdPosition - 1, 0);
    buttonPressed = false;
  } else {
    birdPosition = Math.min(birdPosition + 1, 3);
  }

  // Add a wall every 4 ticks
  if (tick % 4 === 0) {
    let lastWall = walls[walls.length - 1];
    let position = 1 - lastWall[0];

    if (position === Position.TOP) {
      walls.push([position, _.sample([
        [0, 1, 2],
        [0, 1],
        [0, 1],
        [0]
      ]), 8]);
    } else {
      walls.push([position, _.sample([
        [1, 2, 3],
        [2, 3],
        [2, 3],
        [3]
      ]), 8]);
    }
  }

  // Shift all walls one left
  walls = walls.map((wall) => {
    return [wall[0], wall[1], wall[2] - 1];
  }).filter((wall) => {
    return wall[2] >= 0;
  });

  if (walls[0][2] === 0) {
    if (_.includes(walls[1], birdPosition)) {
      flashState = 0;
    }
  }

  if (flashState !== false) {
    flashState += 1;
    if (flashState === 1) {
      background = _.range(32).map(() => 0x888888);
    } else if (flashState === 2) {
      background = _.range(32).map(() => 0x000000);
    } else if (flashState === 3) {
      background = _.range(32).map(() => 0x888888);
    } else if (flashState === 4) {
      background = _.range(32).map(() => 0x000000);
    }
  }
};

const renderState = () => {
  let pixels = _.clone(background);

  if (flashState === false) {
    pixels[birdPosition * 8] = 0x00ff00;
  }

  walls.forEach((wall) => {
    wall[1].forEach((cell) => {
      pixels[wall[2] + cell*8] = 0xff0000;
    });
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