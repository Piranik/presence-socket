
const PresenceSocket = require('./src/PresenceSocket');

let envOptions;
try {
  envOptions = require('./.env');
} catch(e) {
  envOptions = {};
}

const options = Object.assign({}, envOptions);

PresenceSocket.run(options)
