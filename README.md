# Presence Socket

Checks for the presence of known devices on the local wifi.


## Options

| Option Name | default | Description                      |
|-------------|---------|----------------------------------|
| tick        | 1000ms  | The period between apr scans     |
| port        | 3000    | Port for the socket to listen on |
| interface   | en1     | The active network interface     |


## Events
| Event name  | data payload                                                                                                               |
|-------------|-------------------------------------------------------------------------------------------------------------------------|
| presenceAll | `{` `   mac: 'aa:aa:aa:aa:aa:aa',` `  ip: '192.168.1.231',` `  vendor: 'Apple inc',` `  timestamp: 1538085785500, ` `}` |


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

In your clinet, given it is a website

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