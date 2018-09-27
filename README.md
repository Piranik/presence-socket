# Presence Socket

Checks for the presence of known devices on the local wifi.


## Options

| Option Name | default | Description                      |
|-------------|---------|----------------------------------|
| tick        | 1000ms  | The period between apr scans     |
| port        | 3000    | Port for the socket to listen on |
| interface   | en1     | The active network interface     |

## Usage

Given the defaults are correct, simply

```
node /path/to/repository/index.js
```

If you would like to configure the options:

```
// yourFile.js
const PresenceSocket = require('./PresenceSocket');
const options = { port: 324234, interface: 'en0'};
PresenceSocket.run(options);
```