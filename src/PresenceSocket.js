const arpScanner = require('arpscan/promise');
const os = require('os');

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const EventEmitter = require('events');

/**
 * Create a ticker for emiting results of arp-scans.
 *
 * @author Dale Snowdon <dksnowdon@gmail.com>
 * @since 0.1.0
 */
class PresenceTicker extends EventEmitter
{

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
   * @param {Object} optionsIn options for this module and arp-scan
   * @return {void}
   */
  constructor(optionsIn)
  {
    super();
    const defaults = {
      tick: 1000,
      interface: 'en1',
    };

    const options = Object.assign({}, defaults, optionsIn);

    this.options = options;

    console.log('Starting server with the following options: ');
    console.log(options);

    // @todo strip this modules options from the options passed
    // into the aprScanner module
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
   * On the result of a arp-scan.
   *
   * @param {String}        err    the err message from arp-scan module
   * @param {Array.Object}  data   the arp records
   * @return {void}
   */
  onResult(data = [])
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

    // make sure the mac address is capitilized
    data.forEach(i => i.mac = i.mac.toUpperCase());

    console.log('presence ticked: ' + new Date());

    this.emit('presenceAll', data);
  }

  /**
   * Async generator yielding a sequence of arpscan results.
   *
   * @return {Array.ArpHostRecord|false} returns false given voided run
   */
  *Ticker()
  {
    const tick = this.options.tick;
    while(true) {
      // don't run given nobody is listening
      if (this.listenerCount('presenceAll') === 0)
        // wait the tick ammount before trying again
        yield new Promise((res) => setTimeout(() => res(false), tick));
      else
        yield arpScanner(this.options);
    }
  }

  /**
   * Handle the arp presence tick.
   *
   * @return {void}
   */
  async startTick()
  {
    const sequence = this.Ticker();
    for(const result of sequence) {
      let value;
      try {
        value = await result;
        value && this.onResult(value);
      } catch(err) {
        throw new Error(err);
      }
    }
  }

  /**
   * Start the class running.
   *
   * @return {void}
   */
  run()
  {
    const promise = arpScanner(this.options)
      .then(function(data) {
        if (data === null)
          throw new Error('Unknown error - null data return');
      }).catch(function(err) {
        if (err)
          throw new Error(err);
      })

    // could return promise, to enable consuming script to run shutdown
    promise.then(() => this.startTick());
  }
}


/**
 * Socket object handles the creation of the socket.
 *
 * @author Dale Snowdon <dksnowdon@gmail.com>
 * @since 0.1.0
 */
const Socket = {

  /**
   * Create a instance programmatically.
   *
   * @param {Object} options The module options
   * @return {void}
   */
  create: function(options)
  {
    return new PresenceTicker(options);
  },

  /**
   * Run a new socket.
   *
   * @param {Object} options The module options
   * @return {void}
   */
  run: function(options)
  {
    const app = express();
    const server = http.createServer(app);
    const io = socketio(server);
    server.listen(options.port || 3000);

    const presenceTicker = new PresenceTicker(options);
    presenceTicker.run();

    io.on('connection', function(client) {

      function socketEmit(payload) {
        client.emit('presenceAll', payload);
      }

      presenceTicker.on('presenceAll', socketEmit);

      client.on('disconnect', function(clinet) {
        presenceTicker.removeListener('presenceAll', socketEmit);
      });
    });
  }
};

module.exports = Socket;
