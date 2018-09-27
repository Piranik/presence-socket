const arpScanner = require('arpscan');
const os = require('os');

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
   * @typedef {Object} ArpOptions
   * @property {String} interface the network interface in use
   */

  /**
   * @typedef {Object} PresenceTickerOptions
   * @property {Integer} tick number of mili seconds between ticks
   * @extends {ArpOptions} the options for the arp-module
   */

  /**
   * @member {Object} options the options for the program.
   */

  /**
   * @typedef {Object} ArpHostRecord
   * @property {String}   mac         Host mac address
   * @property {String}   ip          Host ip address
   * @property {Integer}  timestamp   Timestamp on generation
   * @property {String}   vendor      Hosts vendor 
   */
  
  /**
   * Construct a instance of PresenceTicker.
   *
   * @return {void}
   */
  constructor() {
    this.registeredClients = [];
    this.options = {};
  }
  
  /**
   * Generate a Arp record for this host. The current device.
   *
   * @return {ArpHostRecord}
   */
  generateSelfHostRecord()
  {
    const interfaceName = this.options.interface;
    const activeInterface = os.networkInterfaces()[interfaceName]
      .filter(adds => adds.family === 'IPv4')[0];

    const ipAddress = activeInterface.address;
    const macAddress = activeInterface.mac;
    const now = Date.now();
    const vendorName = os.hostname(); // best I can do atm
    
    const record = {
      ip:         ipAddress,
      mac:        macAddress,
      vendor:     vendorName,
      timestamp:  now,
    };
    
    return record;
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
  
  /**
   * On the result of a arp-scan.
   *
   * @param {String}        err    the err message from arp-scan module
   * @param {Array.Object}  data   the arp records
   * @return {void}
   */
  onResult(err, data = [])
  {
    const found = [];

    data = data.filter(function(item) {
      const mac = item.mac;
      if (found[mac]) return false;
      if(found[mac] == undefined) found[mac] = item;
      return true;
    });

    // add a host record for this device
    data.push(this.generateSelfHostRecord());

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
  
  /**
   * Start the class running.
   *
   * @param {Object} optionsIn options for this module and arp-scan
   */
  run(optionsIn) {
    const defaults = {
      tick: 1000,
      interface: 'en1',
    };

    const options = Object.assign({}, defaults, optionsIn);

    this.options = options;

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

