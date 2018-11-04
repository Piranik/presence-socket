const arpScanner = require('arpscan/promise');
const os = require('os');

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const EventEmitter = require('events');
const axios = require('axios');

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
   * @property {Integer}  tick            number of mili seconds between ticks
   * @property {String}   [postEndpoint]  url of api to post to
   * @extends {ArpOptions} the options for the arp-module
   */

  /**
   * @member {Object} options the options for the program
   */

  /**
   * @typedef {Object} ArpHostRecord
   * @property {String}   mac         Host mac address
   * @property {String}   ip          Host ip address
   * @property {Integer}  timestamp   Timestamp on generation
   * @property {String}   vendor      Hosts vendor
   */

  /**
   * @member {Boolean} running  Should the program be running
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

    this._log('Starting server with the following options: ');
    this._log(options);

    // @todo strip this modules options from the options passed
    // into the aprScanner module
  }

  /**
   * Generate a Arp record for this host, the current device.
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
   * Is there a need to run the arp-scan.
   *
   * @return {Boolean}
   */
  _shouldRunArpScan()
  {
    const shouldRunBools = [];

    // has listening events
    const activeEvents = this.eventNames();
    const eventsToRemove = [PresenceTicker.EVENTS.FAILED];
    // remove non user attached events, IE. system life cycle events
    eventsToRemove.forEach(e => {
      const index = activeEvents.indexOf(e);
      if (index >= 0 && index < activeEvents.length) 
        activeEvents.splice(index, 1)
    });
    shouldRunBools.push(Boolean(activeEvents.length));

    // has a POST endpoint to send information to
    shouldRunBools.push(Boolean(this.options.postEndpoint));

    return shouldRunBools.indexOf(true) != -1;
  }

  /**
   * On the result of a arp-scan.
   *
   * @param {Array.ArpHostRecord}  data   the arp records
   * @return {void}
   */
  onResult(data = [])
  {
    const found = [];

    data = data.filter(function(item) {
      const mac = item.mac;
      if (found[mac]) return false;
      if (found[mac] == undefined) found[mac] = item;
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

    this._log('presence ticked: ' + new Date());
    
    this.emit('presenceAll', data);
  }

  /**
   * Async generator yielding a sequence of arpscan results.
   *
   * @return {Array.ArpHostRecord|false} returns false given voided run
   */
  *Ticker()
  {
    const tick = this.options.tick || 1000;
    let lastStart;
    let lastEnd;

    while(this.running) {
      // wait ticker time if theres no need to run main program 
      if (!this._shouldRunArpScan()) {
        yield new Promise(r => setTimeout(() => r(), tick));
        continue;
      }

      // do the main program
      // calculate the wait miliseconds, if any (arpscanned in last the a tick)
      lastStart = Date.now();
      let waitMiliSecs;
      if (lastEnd && lastStart) {
        const tickDiff = lastEnd - lastStart;
        if (tickDiff < tick) waitMiliSecs = tick - tickDiff;
      }
      
      // create a buffer of wait time or 0
      const wait = new Promise(r => setTimeout(() => r(), waitMiliSecs || 0));
      
      const that = this;

      /**
       * POST proxy to send the data to a endpoint, if any
       * @param {Array.ArpHostRecord} data      data to send
       * @param {String|undefined}    endpoint  endpoint to send to
       * @return {Array.ArpHostRecord}
       */
      function createPostPromise(data, endpoint) {
        if (endpoint) {
          return axios.post(endpoint, {json: data})
            .then(() => data)
            .catch(e => {
              // don't end the tick given the endpoint is only temporally down
              // that.endTick();
              
              that._log('Error: postEndpoint failed');
            });
        }
        return Promise.resolve(data);
      }

      // run wait buffer before the arpscan and arp postback
      yield wait
        .then(() => arpScanner(this.options)
            .then(data => createPostPromise(data, this.options.postEndpoint))
            // proxy to update internal variable(s) for calculations
            .then(r => (lastStart = null, lastEnd = Date.now(), r)));
    }
  }

  /**
   * Handle the arp presence tick.
   *
   * @return {void}
   */
  async startTick()
  {
    this.running = true;
    const sequence = this.Ticker();
    for(const result of sequence) {
      let value;
      try {
        value = await result;
        value && this.onResult(value);
      } catch(err) {
        this._log(err.message);
      }
    }
    
  }
  
  /**
   * Stop the tick from running, ending the program.
   *
   * @return {void}
   */
  endTick()
  {
    this.running = false;
  }

  /**
   * Start the class running.
   *
   * @return {void}
   */
  run()
  {
    const promise = arpScanner(this.options)
      .catch(() => {throw new Error('Inital arp scan failed')})
      .then(function(data) {
        if (data === null)
          throw new Error('Unknown error - null data return');
      }).catch((err) => {
        this._log(err.message);
        return Promise.reject();
      })

    // could return promise, to enable consuming script to run shutdown
    promise
      /* @todo resolve a device list from a endpoint */
      .then(() => this._log('Program started, starting to tick...'))
      .then(() => this.startTick())
      .catch(() => {
        this._log('Boot failed')
        this.emit(PresenceTicker.EVENTS.FAILED);
      });
  }
  
  
  /**
   * Logging proxy function.
   *
   * @private
   */
  _log()
  {
    console.log(...[...arguments].map(i=> {
      if (typeof i === 'object') i = JSON.stringify(i, undefined, 2);
      return this.constructor.name+': '  + i;
    }));
  }


  /**
   * Key pair of events mapping to their correct string.
   *
   * @typedef {PresenceTicker~EVENTS}
   * @return {PresenceTicker~EVENTS}
   */
  static get EVENTS()
  {
    return {
      PRESENCE_ALL: 'presenceAll',
      FAILED:       'failed',
    };
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

    let socketList = [];

    const presenceTicker = new PresenceTicker(options);
    presenceTicker.run();
    
    // close the serve on boot failure of presenceTicket instance
    presenceTicker.on(PresenceTicker.EVENTS.FAILED, function() {
      socketList.forEach(function(socket) {
        socket.destroy();
      });
      server.close();
    });

    io.on('connection', function(client) {
      socketList.push(client);

      function socketEmit(payload) {
        client.emit(PresenceTicker.EVENTS.PRESENCE_ALL, payload);
      }

      presenceTicker.on(PresenceTicker.EVENTS.PRESENCE_ALL, socketEmit);

      client.on('disconnect', function(clinet) {
        presenceTicker.removeListener(PresenceTicker.EVENTS.PRESENCE_ALL, socketEmit);

        // clean the socketList when client disconnets
        socketList.splice(socketList.indexOf(client), 1);
      });
    });
  }
};

module.exports = Socket;
