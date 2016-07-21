var TelegramACK = require("tele_ack");

function load(data) {
    if(!data) {
        throw "empty frame";
    }

    if(typeof data == 'string') {
        data = data.split('').map(function(item) {
            return item.charCodeAt(); 
        });
    }

    var t = TelegramACK.parse(data);
    console.log(t);
}

load("\xE5")