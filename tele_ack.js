function TelegramACK() {
    this.base_size = 1;
    this.type = 0xE5;
}

exports = {
    parse: function(data) {
        if(data && data.length < 1) {
            throw "Invalid M-Bus length";
        }

        if(data[0] !== 0xE5) {
            throw "Frame Mismatch"
        }

        return new TelegramACK();
    }
};