var TelegramField = require("tele_field");

function TelegramHeader(data) {
    this.startField = new TelegramField();
    this.lField = new TelegramField();
    this.cField = new TelegramField();
    this.aField = new TelegramField();
    this.crcField = new TelegramField();
    this.stopField = new TelegramField();

    this.headerLength = 6;
    this.headerLengthCRCStop = 8;

    if(data) {
        this.load(data);
    }
}

TelegramHeader.prototype.load = function(data) {
    if(data.length == 8) {
        this.startField.setParts(data[0]);
        this.lField.setParts(data[1]);
        // this.lField.setParts(data[2]); // Skip
        // this.startField.setParts(data[3]); // Skip
        this.cField.setParts(data[4]);
        this.aField.setParts(data[5]);
        this.crcField.setParts(data[data.length - 2]);
        this.stopField.setParts(data[data.length - 1]);
    } else if(data.length == 5) {
        this.startField.setParts(data[0]);
        this.cField.setParts(data[1]);
        this.aField.setParts(data[2]);
        this.crcField.setParts(data[data.length - 2]);
        this.stopField.setParts(data[data.length - 1]);
    }
}

TelegramHeader.prototype.get = function() {
    return {
        start: this.startField.parts,
        length: this.lField.parts,
        c: this.cField.parts,
        a: this.aField.parts,
        crc: this.crcField.parts,
        stop: this.stopField.parts
    }
};

module.exports = {
    parse: function(data) {
        return new TelegramHeader(data);
    }
};
