var TelegramHeader = require("tele_header");
var TelegramBody = require("tele_body");

function TelegramLong(dbuf) {
    this.header = TelegramHeader.parse();
    this.body = TelegramBody();

    var tgr = dbuf
    var hLen = this.header.headerLength;
    var firstHeader = tgr.slice(0, hLen);

    var resultHeader = firstHeader.concat(tgr.slice(-2));
    this.header.load(resultHeader);

    if(this.header.lField.parts[0] < 3) {
        throw "Invalid M-Bus length value";
    }

    this.body.load(tgr.slice(hLen,-2))
/*
        if not self.check_crc():
            raise MBusFrameCRCError(self.compute_crc(),
                                    self.header.crcField.parts[0])
*/
    
}

TelegramLong.prototype.get = function() {
    return {
        header: this.header.get(),
        body: this.body.get()
    };
};

module.exports = {
    parse: function(data) {
        if(data && data.length < 9) {
            throw "Invalid M-Bus length";
        }

        if(data[0] !== 0x68) {
            throw "Frame Mismatch"
        }

        return new TelegramLong(data);
    }
};
