var DateCalculator = require("static_enums").DateCalculator;

function TelegramField(parts) {
    this.parts = [];
    this.setParts(parts);
}

TelegramField.prototype.setParts = function(parts) {
    if(parts !== null && parts !== undefined) {
        if(Array.isArray(parts)) {
            this.parts = parts;
        } else {
            this.parts = [parts];
        }
    }
};

TelegramField.prototype.decodeInt = function() {
    var int_data = this.parts;
    var value = 0;
    var neg = int_data[-1] & 0x80;
    var i = int_data.length;

    while(i > 0) {
        if(neg) {
            value = (value << 8) + (int_data[i - 1] ^ 0xFF);
        } else {
            value = (value << 8) + int_data[i - 1];
        }

        i--;
    }

    if(neg) {
        value = (value * -1) - 1;
    }

    return value;
};

TelegramField.prototype.decodeBCD = function() {
    var bcd_data = this.parts;
    var val = 0;
    var i = bcd_data.length;
    while(i > 0) {
        val = (val * 10) + ((bcd_data[i-1] >> 4) & 0xF);
        val = (val * 10) + (bcd_data[i-1] & 0xF);
        i--;
    }

    return val;
};

TelegramField.prototype.decodeReal = function() {
    console.log(this);
    var De754 = function (a, p) {
        var s, e, m, i, d, nBits, mLen, eLen, eBias, eMax;
        var bBE = false;
        var el = {len: 4, mLen: 23, rt: Math.pow(2, -24) - Math.pow(2, -77)};
        mLen = el.mLen, eLen = el.len*8-el.mLen-1, eMax = (1<<eLen)-1, eBias = eMax>>1;

        i = bBE?0:(el.len-1); d = bBE?1:-1; s = a[p+i]; i+=d; nBits = -7;
        for (e = s&((1<<(-nBits))-1), s>>=(-nBits), nBits += eLen; nBits > 0; e=e*256+a[p+i], i+=d, nBits-=8);
        for (m = e&((1<<(-nBits))-1), e>>=(-nBits), nBits += mLen; nBits > 0; m=m*256+a[p+i], i+=d, nBits-=8);

        switch (e) {
        case 0:
          // Zero, or denormalized number
          e = 1-eBias;
          break;
        case eMax:
          // NaN, or +/-Infinity
          return m?NaN:((s?-1:1)*Infinity);
        default:
          // Normalized number
          m = m + Math.pow(2, mLen);
          e = e - eBias;
          break;
        }
        return (s?-1:1) * m * Math.pow(2, e-mLen);
  };

  return De754(this.parts, 0);
};

TelegramField.prototype.decodeManufacturer = function() {
    var m_id = this.decodeInt();
    return String.fromCharCode(((m_id >> 10) & 0x001F) + 64) + 
        String.fromCharCode(((m_id >> 5) & 0x001F) + 64) + 
        String.fromCharCode(((m_id) & 0x001F) + 64);
};

TelegramField.prototype.decodeASCII = function() {
    return this.parts.reverse().map(function(item) {
        return String.fromCharCode(item);
    }).join("");
};

TelegramField.prototype.decodeDate = function() {
    var dc = new DateCalculator();
    return dc.getDate(this.parts[0], this.parts[1], false);
};

TelegramField.prototype.decodeDateTime = function() {
    var dc = new DateCalculator();
    return dc.getDateTime(this.parts[0], this.parts[1], this.parts[2], this.parts[3], false);
};

TelegramField.prototype.decodeTimeWithSeconds = function() {
    var dc = new DateCalculator();
    return dc.getTimeWithSeconds(this.parts[0], this.parts[1], this.parts[2]);
};

TelegramField.prototype.decodeDateTimeWithSeconds = function() {
    var dc = new DateCalculator();
    return dc.getDateTimeWithSeconds(this.parts[0], this.parts[1], this.parts[2], this.parts[3], this.parts[4], false);
};


module.exports = TelegramField;
