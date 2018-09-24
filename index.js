const arpScanner = require('arpscan');

function onResult(err, data){
  data = data.sort(function(a, b) {
    const num1 = Number(a.ip.split(".")
      .map((num) => (`000${num}`)
      .slice(-3) ).join(""));

    const num2 = Number(b.ip.split(".")
      .map((num) => (`000${num}`)
      .slice(-3) ).join(""));

    return num1-num2;
  });

  console.log(data);
}


function run(optionsIn) {
  const defaults = {
    tick: 1000,
    interface: 'en0',
  };

  const options = Object.assign({}, defaults, optionsIn);

  // @todo strip this modules options from the options passed
  // into the aprScanner module

  setInterval(arpScanner.bind(undefined, onResult, options), options.tick);
}

run();
