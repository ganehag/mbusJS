var SerialPort = require('serialport');
var MBus = require('../mbus.js');

String.prototype.hexEncode = function(){
    var hex, i;

    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("000"+hex).slice(-4);
    }

    return result
}

var ab2str = function(buf) {
  var bufView = new Uint8Array(buf);
  var unis = [];
  for (var i=0; i<bufView.length; i++) {
    unis.push(bufView[i]);
  }
  return String.fromCharCode.apply(null, unis);
};

var Application = function() {
    this.buffer = "";
};
var MBusProtocol = function(app, serialPort) {
    var self = this;
    this.app = app;
    this.serialPort = serialPort;
    this.buffer = "";

    serialPort.on('data', function(data) {
      self.buffer += ab2str(data);
    });
};
MBusProtocol.prototype.performPing = function(address, callback) {
    var self = this;
    var mbus = new MBus();
    var frame = mbus.pingFrame(address);
    var sp = self.serialPort;

    // Empty input buffer
    self.buffer = "";
    sp.write(frame, function () {
        sp.drain(function() {
            // Wait for data
            setTimeout(function() {
                var retval = false;
                if(self.buffer == "\xE5") {
                    retval = true;
                }

                if(callback) {
                    callback(retval);
                }
            }, 500);
        });
    });
};

MBusProtocol.prototype.performReadout = function(address, callback) {
    var self = this;
    var mbus = new MBus();
    var frame = mbus.requestFrame(address);
    var sp = self.serialPort;

    // Empty input buffer
    self.buffer = "";
    sp.write(frame, function () {
        sp.drain(function() {
            // Wait for data
            setTimeout(function() {
                var frame = null;
                try {
                    frame = mbus.load(self.buffer);
                } catch(err) {
                    console.log(err);
                }

                if(callback) {
                    callback(frame);
                }

            }, 1000);
        });
    });
};

(function(exports, require, module, __filename, __dirname) {
  var address = 2;  // MBus address to read from

  var app = new Application();
  var port = new SerialPort('/dev/ttyACM0', {
    baudRate: 2400,
    parity: 'even',
    dataBits: 8,
    stopBits: 1
  }, function() {
    var proto = new MBusProtocol(app, this);

    // Ping the address
    proto.performPing(address, function(found) {
      if(found) {
          // Perform a read request (does not support multiple frames)
          proto.performReadout(address, function(frame) {
              if(frame) {

                  var hdr = frame.body.get().header;
                  var mbus = new MBus();

                  var hdrInfo = {
                      'manufacturer': frame.body.get().header.manufacturer,
                  };

                  // Output the HDRinfo
                  console.log(hdrInfo);

                  var records = frame.body.get().records;
                  for(var i=0; i<records.length;i++) {
                      records[i].type = records[i].type.replace("VIFUnit.", "").replace("VIFUnitExt.", "").replace("VIFUnitSecExt.", "");
                      records[i].function = records[i].function.replace("FunctionType.", "");

                      // Output record
                      console.log(records[i]);
                  }
              }

              // Close serial port
              port.close();
          });
      } else {
          console.log("WARN", "unable to ping address");
          // Close serial port
          port.close();
      }
    });
  });

})();
