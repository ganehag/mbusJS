var TelegramField = require("tele_field");
var TelegramHeader = require("tele_header");
var TelegramBody = require("tele_body");


var telegrams = [
    require("tele_ack"),
    require("tele_short"),
    require("tele_long")
];

function load(data) {
    if(!data) {
        throw "empty frame";
    }

    if(typeof data == 'string') {
        data = data.split('').map(function(item) {
            return item.charCodeAt(); 
        });
    }

    for (var i = telegrams.length - 1; i >= 0; i--) {
        try {
            var t = telegrams[i].parse(data);
            console.log(t.get().body.records);
        } catch(err) {
            if(err != 'Frame Mismatch') {
                throw(err);
            }
        }
    }
}

if(process.env.hasOwnProperty('BOARD')) {
    try {
        load(require("fs").readFile("example/kamstrup_multical_601.blob"));    
    } catch(e) {
        trace(e);
    }
    
} else {
    Buffer.prototype.toByteArray = function () {
        return Array.prototype.slice.call(this, 0)
    }
    require("fs").readFile('example/Elster-F2.blob', function read(err, data) {
        load(data.toByteArray());
    });
}

setTimeout(function() {

}, 100);