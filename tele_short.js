function TelegramShort(dbuf) {
    this._header = new TelegramHeader()
    this._header.load(dbuf)

    if(!this.check_crc()) {
        throw "crc error";
    }
}

TelegramShort.prototype.header = function(value) {
    if(value != undefined) {
        return undefined;
    }
    return self._header;
};

TelegramShort.prototype.compute_crc = function(first_argument) {
    // return this.header().cField.
};

TelegramShort.prototype.check_crc = function(first_argument) {
    return this.compute_crc() === this.header().crcField.parts[0];
};

exports = {
    parse: function(data) {
        if(data && data.length < 5) {
            throw "Invalid M-Bus length";
        }

        if(data[0] !== 0x10) {
            throw "Frame Mismatch"
        }

        return new TelegramShort(data);
    }
};