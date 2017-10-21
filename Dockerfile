FROM resin/raspberrypi3-node

RUN apt-get update && apt-get install -yq libraspberrypi-bin network-manager

WORKDIR usr/src/app

RUN apt-get install -yq --no-install-recommends bluez bluez-firmware libusb-1.0-0-dev libudev-dev

COPY package.json ./
RUN JOBS=MAX npm i --production

COPY . ./

CMD ["bash", "start.sh"]
