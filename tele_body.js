var TelegramField = require("tele_field");
var senums = require("static_enums");
var MeasureUnit = senums.MeasureUnit;
var FunctionType = senums.FunctionType;
var DataEncoding = senums.DataEncoding;
var VIFUnit = senums.VIFUnit;
var VIFTable = senums.VIFTable;


function getKeyByValue(obj, value) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop)) {
             if(obj[prop] === value)
                 return prop;
        }
    }
}


function TelegramBodyHeader() {
    this.BYTE_ORDER_MASK = 0x04 // 0000 0100

    this.ci_field = new TelegramField();              // control information field
    this.id_nr_field = new TelegramField();           // identification number field
    this.manufacturer_field = new TelegramField();    // manufacturer
    this.version_field = new TelegramField();         // version
    this.measure_medium_field = new TelegramField();  // measured medium
    this.acc_nr_field = new TelegramField();          // access number
    this.status_field = new TelegramField();          // status
    this.sig_field = new TelegramField();             // signature field
}
TelegramBodyHeader.prototype.load = function(data) {
    if(data.length === 1) {
        this.ci_field.setParts(data[0]);
    } else {
        this.ci_field.setParts(data[0]);
        this.id_nr_field.setParts(data.slice(1, 5));
        this.manufacturer_field.setParts(data.slice(5, 7));
        this.version_field.setParts(data[7]);
        this.measure_medium_field.setParts(data[8]);
        this.acc_nr_field.setParts(data[9]);
        this.status_field.setParts(data[10]);
        this.sig_field.setParts(data.slice(11, 13));
        if(!this.isLSBOrder()) {
            this.id_nr_field.setParts(this.id_nr_field.parts.reverse());
            this.manufacturer_field.setParts(this.manufacturer_field.parts.reverse());
            this.sig_field.setParts(this.sig_field.parts.reverse());
        }
    }
};
TelegramBodyHeader.prototype.getIdNr = function() {
    return this.id_nr_field.parts.reverse();
};
TelegramBodyHeader.prototype.isLSBOrder = function() {
    return ! (this.ci_field.parts[0] & this.BYTE_ORDER_MASK);
};
TelegramBodyHeader.prototype.get = function() {
    return {
        type: this.ci_field.parts[0],
        identification: this.getIdNr(),
        manufactorer: this.manufacturer_field.decodeManufacturer(),
        version: this.version_field.parts[0],
        medium: this.measure_medium_field.parts[0],
        access_no: this.acc_nr_field.parts[0],
        sign: this.sig_field.parts
    };
};

function TelegramBodyPayload(payload, parent) {
    if(payload !== null && payload != undefined) {
        this.body = new TelegramField(payload);
    } else {
        this.body = new TelegramField();
    }
    this.records = [];
    this.parent = parent;
};
TelegramBodyPayload.prototype.get = function() {
    var trec = this.records;

    return {
        records: (function() {
            if(!trec) {
                return [];
            }
            var r = [];
            var i;
            for(i = 0; i < trec.length; i++) {
                r.push(trec[i].get());
            }
            return r;
        })()
    }
}
TelegramBodyPayload.prototype.load = function(data) {
    this.body = new TelegramField(data);
};
TelegramBodyPayload.prototype.parse = function() {
    this.records = [];
    var recordPos = 0;

    try {
        while(recordPos < this.body.parts.length) {
            recordPos = this.parseVariableDataRec(recordPos);
        }
    } catch(err) {
        throw err;
    }
};
TelegramBodyPayload.prototype.parseVariableDataRec = function(startPos) {
    var lowerBound = 0;
    var upperBound = 0;
    var i = 0;

    var rec = new TelegramVariableDataRecord();

    rec.dib.parts.push(this.body.parts[startPos]);

    if(rec.dib.isEOUD()) { // End of User Data
        return this.body.parts.length;
    } else if(rec.dib.functionType() == FunctionType.SPECIAL_FUNCTION_FILL_BYTE) {
        return startPos + 1;
    }

    if(rec.dib.hasExtensionBit()) {
        var slice = this.body.parts.slice(startPos+1);
        for(i=0; i < slice.length; i++) {
            rec.dib.parts.push(slice[i]);

            if(! rec.dib.hasExtensionBit()) {
                break;
            }
        }
    }

    try {
        rec.vib.parts.push(this.body.parts[startPos + rec.dib.parts.length]);
    } catch(err) {
        // Hmmm....
    }

    if(rec.vib.withoutExtensionBit()) {
        var lvext_p = startPos + rec.dib.parts.length + rec.vib.parts.length;
        var vife_len = this.body.parts[lvext_p];

        rec.vib.customVIF.parts = this.body.parts.slice(lvext_p + 1, lvext_p +1 + vife_len);
    }

    if(rec.vib.hasExtensionBit()) {
        var slice = this.body.parts.slice(startPos + 1 + rec.vib.withoutExtensionBit() + rec.dib.parts.length + rec.vib.customVIF.parts.length);
        for(i=0; i < slice.length; i++) {
            rec.vib.parts.push(slice[i]);

            if(! rec.vib.hasExtensionBit()) {
                break;
            }
        }
    }

    lowerBound = startPos + rec.vib.withoutExtensionBit() + rec.dib.parts.length + rec.vib.customVIF.parts.length + rec.vib.parts.length;
    var lobj = rec.dib.lengthEncoding();
    var length = lobj.length;
    var encoding = lobj.encoding;

    if(encoding == DataEncoding.ENCODING_VARIABLE_LENGTH) {
        length = this.body.parts[lowerBound];
        lowerBound++;
    }

    upperBound = lowerBound + length;

    if(length == 0) {
        return upperBound;
    }

    if(this.body.parts.length >= upperBound) {
        var dataField = new TelegramField();
        dataField.parts = dataField.parts.concat(this.body.parts.slice(lowerBound, upperBound));

        if(! this.parent.header.isLSBOrder()) {
            dataField.parts = dataField.parts.reverse();
        }

        rec.dataField = dataField;
    }

    this.records.push(rec);

    return upperBound;
};

function TelegramVariableDataRecord() {
    this.UNIT_MULTIPLIER_MASK = 0x7F;    // 0111 1111
    this.EXTENSION_BIT_MASK   = 0x80     // 1000 0000

    this.dib = new DataInformationBlock();
    this.vib = new ValueInformationBlock();

    this.dataField = new TelegramField();
}
TelegramVariableDataRecord.prototype.parseVifx = function() {
    var robj = {
        factor: null,
        unit: null,
        type: null
    };

    if(this.vib.parts.length === 0) {
        return robj;
    }

    var code = null;
    var vif = this.vib.parts[0];
    var vife = this.vib.parts.slice(1);
    var vtf_ebm = this.EXTENSION_BIT_MASK;

    if(vif == VIFUnit.FIRST_EXT_VIF_CODES) {
        code = (vife[0] & this.UNIT_MULTIPLIER_MASK) | 0x200;

    } else if(vif == VIFUnit.SECOND_EXT_VIF_CODES) {
        code = (vife[0] & this.UNIT_MULTIPLIER_MASK) | 0x100;

    } else if([VIFUnit.VIF_FOLLOWING, 0xFC].indexOf(vif) !== -1) {
        if(vif & vtf_ebm) {
            code = vife[0] & this.UNIT_MULTIPLIER_MASK;
            robj.factor = 1;

            if (0x70 <= code && code <= 0x77) {
                rob.factor = Math.pow(10.0, (vife[0] & 0x07) - 6);
            } else if(0x78 <= code && code <= 0x7B) {
                robj.factor = Math.pow(10.0, (vife[0] & 0x03) - 3);
            } else if(code == 0x7D) {
                robj.factor = 1;
            }

            robj.unit = this.vib.customVIF.decodeASCII();
            robj.type = VIFUnit.VARIABLE_VIF;

            return robj;
        }
    } else if(vif == VIFUnit.VIF_FOLLOWING) {
        return {
            factor: 1,
            unit: "FixMe",
            type: "FixMe"
        }
    } else {
        code = (vif & this.UNIT_MULTIPLIER_MASK);
    }

    var vtl = VIFTable.lut[code];

    if(vtl === undefined) {
        return {
            factor: 0,
            unit: "FixMe",
            type: "FixMe"
        };
    }

    return {
        factor: vtl[0],
        unit: vtl[1],
        type: vtl[2]
    };
};
TelegramVariableDataRecord.prototype.unit = function() {
    var r = this.parseVifx();
    return r.unit;
};
TelegramVariableDataRecord.prototype.parsedValue = function() {
    var robj = this.parseVifx();
    var lobj = this.dib.lengthEncoding();
    var retval = null;

    if(lobj.length !== this.dataField.parts.length) {
        return null;
    }

    switch(robj.unit) {
        case MeasureUnit.Data:
            // Type G: Day.Month.Year
            retval = this.dataField.decodeDate();
        break;
        case MeasureUnit.DATE_TIME:
            // Type F: Day.Month.Year Hour:Minute    
            retval = this.dataField.decodeDateTime();
        break;
        case MeasureUnit.TIME:
            retval = this.dataField.decodeTimeWithSeconds();
        break;
        case MeasureUnit.DATE_TIME_S:
            retval = this.dataField.decodeDateTimeWithSeconds();
        break;
        case MeasureUnit.DBM: 
            retval = (parseInt(this.dataField.decodeInt()) * 2) - 130;
        break;
    }

    if(retval === null) {
        switch(lobj.encoding) {
            case DataEncoding.ENCODING_INTEGER:
                retval = robj.factor > 1.0 ? parseInt(this.dataField.decodeInt() * robj.factor) : this.dataField.decodeInt() * robj.factor;
            break;

            case DataEncoding.ENCODING_BCD:
                retval = parseFloat(this.dataField.decodeBCD() * robj.factor);
            break;

            case DataEncoding.ENCODING_REAL:
                retval = parseFloat(this.dataField.decodeReal() * robj.factor);
            break;

            case DataEncoding.ENCODING_VARIABLE_LENGTH:
                retval = this.dataField.decodeASCII();
            break;

            case DataEncoding.ENCODING_NULL:
                retval = null;
            break;
        }
    }
    
    return retval;
};
TelegramVariableDataRecord.prototype.get = function() {
    var robj = this.parseVifx();
    return {
        value: this.parsedValue(),
        unit: robj.unit,
        type: robj.type,
        function: this.dib.functionType(),
        functionstring: this.dib.functionType(true)
    };
};


function DataInformationBlock() {
    TelegramField.call(this);
    this.EXTENSION_BIT_MASK = 0x80;      // 1000 0000
    this.FUNCTION_MASK      = 0x30;      // 0011 0000
    this.DATA_FIELD_MASK    = 0x0F;      // 0000 1111
}
DataInformationBlock.prototype = Object.create(TelegramField.prototype);

DataInformationBlock.prototype.hasExtensionBit = function() {
    // Check for extension bit on last byte
    return this.parts.length ? (this.parts[this.parts.length-1] & this.EXTENSION_BIT_MASK) > 0 : false;
};
DataInformationBlock.prototype.hasLVarBit = function() {
    // returns true if first VIFE has LVAR active
    return this.parts.length > 1 ? (this.parts[1] & this.EXTENSION_BIT_MASK) > 0 : false;
};
DataInformationBlock.prototype.isEOUD= function() {
    // Check for end of user data bit VIF byte
    return this.parts.length ? ([0x0F, 0x1F]).indexOf(this.parts[0]) !== -1 : false;
};
DataInformationBlock.prototype.functionType = function(returnKey) {
    var rval = null;

    if(this.parts[0] == 0x0F) {
        rval = FunctionType.SPECIAL_FUNCTION;

    } else if(this.parts[0] == 0x2F) {
        rval = FunctionType.SPECIAL_FUNCTION_FILL_BYTE;
    }

    rval = (this.parts[0] & this.FUNCTION_MASK) >> 4;

    if(returnKey === true) {
        return getKeyByValue(FunctionType, rval);
    }

    return rval;
};
DataInformationBlock.prototype.lengthEncoding = function() {
    var len_enc = this.parts[0] & this.DATA_FIELD_MASK;
    var len_enc_arr = ({
        0: [0, DataEncoding.ENCODING_NULL],
        1: [len_enc, DataEncoding.ENCODING_INTEGER],
        2: [len_enc, DataEncoding.ENCODING_INTEGER],
        3: [len_enc, DataEncoding.ENCODING_INTEGER],
        4: [len_enc, DataEncoding.ENCODING_INTEGER],
        5: [4, DataEncoding.ENCODING_REAL],
        6: [6, DataEncoding.ENCODING_INTEGER],
        7: [8, DataEncoding.ENCODING_INTEGER],
        8: [0, DataEncoding.ENCODING_NULL],
        9: [len_enc - 8, DataEncoding.ENCODING_BCD],
        10: [len_enc - 8, DataEncoding.ENCODING_BCD],
        11: [len_enc - 8, DataEncoding.ENCODING_BCD],
        12: [len_enc - 8, DataEncoding.ENCODING_BCD],
        13: [6, DataEncoding.ENCODING_VARIABLE_LENGTH],
        14: [6, DataEncoding.ENCODING_BCD],
        15: [0, DataEncoding.ENCODING_NULL]  // Not right FIXME
    })[this.parts[0] & this.DATA_FIELD_MASK];

    return {
        length: len_enc_arr[0],
        encoding: len_enc_arr[1]
    };
};

function ValueInformationBlock() {
    TelegramField.call(this);

    this.EXTENSION_BIT_MASK = 0x80;           // 1000 0000
    this.WITHOUT_EXTENSION_BIT_MASK = 0x7F;   // 0111 1111

    this.customVIF = new TelegramField();
}
ValueInformationBlock.prototype = Object.create(TelegramField.prototype);

ValueInformationBlock.prototype.hasExtensionBit = function() {
    return this.parts.length ? (this.parts[this.parts.length-1] & this.EXTENSION_BIT_MASK) > 0 : false;
};
ValueInformationBlock.prototype.withoutExtensionBit = function() {
    return this.parts.length ? (this.parts[0] & this.WITHOUT_EXTENSION_BIT_MASK) === 0x7C : false;
};
ValueInformationBlock.prototype.hasLVarBit = function() {
    return this.parts.length > 1 ? (this.parts[1] & this.EXTENSION_BIT_MASK) > 0 : false;
};


function TelegramBody(dbuf) {
    this.header = new TelegramBodyHeader();
    this.payload = new TelegramBodyPayload(null, this);
    this.headerLength = 13;
}
TelegramBody.prototype.get = function() {
    return {
        header: this.header.get(),
        records: this.payload.get()
    };
};
TelegramBody.prototype.load = function(data) {
    this.header.load(data.slice(0, this.headerLength));
    this.payload.load(data.slice(this.headerLength));

    this.payload.parse();
};


module.exports = function() { return new TelegramBody(); };
