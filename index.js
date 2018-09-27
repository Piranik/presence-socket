const arpScanner = require('arpscan');


var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

server.listen(3000);

class PresenceTicker 
{
  
  /**
   * @typedef {Object} RegisteredClients 
   * @property {Integer}  id        Id number 
   * @property {Function} callback  callback function to emit socket event 
   */
  
  /**
   * @member {Array.RegisteredClients} registeredClients 
   */
  
  /**
   * Construct a instance of PresenceTicker.
   *
   * @return {void}
   */
  constructor() {
    this.registeredClients = [];
  }

  /**
   * Callback function to be executed on presence tick. 
   *
   * @param {Socket}    idIn  The incomming id  
   * @param {Function}  func  Callback function to emit a socket event
   * @return {void}
   */
  registerListener(idIn, func) {
    this.registeredClients[idIn] = {id: idIn, callback: func}; 
  }
  
  /**
   * Remove a callback function from the registed list.
   *
   * @param {Integer} id The id in the registered list to remove
   */
  unregisterListener(id) {
    delete this.registeredClients[id];
  }

  onResult(err, data = [])
  {
    const found = [];

    data = data.filter(function(item) {
      const mac = item.mac;
      if (found[mac]) return false;
      if(found[mac] == undefined) found[mac] = item;
      return true;
    });

    // sort by ip address
    data = data.sort(function(a, b) {
      const num1 = Number(a.ip.split(".")
        .map((num) => (`000${num}`)
        .slice(-3) ).join(""));

      const num2 = Number(b.ip.split(".")
        .map((num) => (`000${num}`)
        .slice(-3) ).join(""));


      return num1-num2;
    });

    console.log('presence ticked: ' + new Date()); 

    for(const key in this.registeredClients) {
      const i = this.registeredClients[key];
      i.callback(data);
    };
  }

  run(optionsIn) {
    const defaults = {
      tick: 1000,
      interface: 'en1',
    };

    const options = Object.assign({}, defaults, optionsIn);

    // @todo strip this modules options from the options passed
    // into the aprScanner module

    setInterval(arpScanner.bind(
      undefined, 
      this.onResult.bind(this), 
      options
    ), options.tick);
  }
}

const presenceTicker = new PresenceTicker();
presenceTicker.run();


io.on('connection', function(client){
  presenceTicker.registerListener(client.id, function(payload) {
    client.emit('presenceAll', payload); 
  });
});

