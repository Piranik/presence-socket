# Presence Socket

Checks for the presence of devices wifi.


## Todo
- Given the arp-scan results return before the tick time amount, wait until
- Remove some bloat from container

## Options

| Option Name | default | Description                      |
|-------------|---------|----------------------------------|
| tick        | 1000ms  | The period between apr scans     |
| port        | 3000    | Port for the socket to listen on |
| interface   | en1     | The active network interface     |


## Events
| Event name  | data payload                                                                                                               |
|-------------|-------------------------------------------------------------------------------------------------------------------------|
| presenceAll | `{` `   mac: 'AA:AA:AA:AA:AA:AA',` `  ip: '192.168.1.231',` `  vendor: 'Apple inc',` `  timestamp: 1538085785500, ` `}` |


## Usage

Given the defaults are correct, simply

```
node /path/to/repository/index.js
```

If you would like to configure the options:

```
// yourFile.js
const PresenceSocket = require('./src/PresenceSocket');
const options = { port: 324234, interface: 'en0'};
PresenceSocket.run(options);
```

You can also use a .env.json file

```cp ./env.example.json env.json```

And configure how you would like

In your client, given it is a website

```
//somehtml.html

<script src="/socket.io/socket.io.js"></script>
<script>
  var socket = io('localhost:3000');

  io.on('connection', function(socket){
  	socket.on('presenceAll', function() {
  		// do stuff
  	});
  });
});
</script>
```

#### Use Programmatically
To use without exposing a socket, create a instance of it and listen for events.

```
const PresenceSocket = require('./src/PresenceSocket');
const presenceSocket = PresenceSocket.create();
presenceSocket.on('presenceAll', function(arpHostRecords) {
  // stuff
});
presenceSocket.run(options);
```

#### Using docker daemon

> Note: 
> Steps provided below work on linux only

##### Steps

- Configure the .env.json 
- Default port exposed by the image is `3001\tcp`
- Configure any other setup
- Build image: `docker build -t dksnowdon/presence-socket .`
- Run as daemon `docker run -dit --network="host" dksnowdon/presence-socket`