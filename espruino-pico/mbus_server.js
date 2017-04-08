var useUSB = true;
var ledState = false;
var buff = "";
var resetState = 0;
var stateMachine = 0;
var ackFrame = [
  "\xE5"
 ];
var shortFrame = [
  "\x10",
  "\x00",
  "\x00",
  "\x00",
  "\x16"
 ];

var meters = {
  254: "aF5eaAgAcpCFcSYkIygEc1AAAAwFAAAAAAwSQgcAADwq3bTr3Ts63bTrCloEAgpeBAIKYgAABG0iEI0RTAUAAAAARG07F34URO1+OxeeFIwBBQAAAACEAW07F38cCyZTZQgEFg==",
  1: "aD09aAgLciEAAACwXAIbEgAAAAx4SQQAZAJ1CgAB/XEeLy8KZiACCvsaMQUC/ZcdAAAvLy8vLy8vLy8vLy8vLy/dFg==",
  2: "aD09aAgBcgBRIAKCTQIEAIgAAAQHAAAAAAwVAwAAAAsuAAAACzsAAAAKWogSCl4WBQthI3cAAmyMEQInNw0PYABnFg=="
};

function buttonEvent(e) {
  useUSB = !useUSB;
  LED2.write(useUSB);
  if(!useUSB) {
    USB.setConsole();
    USB.setup(115200, {
      bytesize:8,
      parity:'n',
      stopbits:1
    });
  } else {
    LoopbackA.setConsole(true);
    USB.setup(2400, {
      bytesize:8,
      parity:'even',
      stopbits:1
    });
  }
}

function manageInput(data) {
  buff += data;
  resetState = 5;
}

function everySecond() {
  if(resetState>0) {
    resetState--;
  }
  if(resetState === 0) {
    stateMachine = 0;
    buff = "";
    LED1.write(false);
  }
}

function stateM() {
  switch(stateMachine) {
    case 0:
      if(buff[0] === shortFrame[0] &&
         buff[1] === '\x40' &&
         // buff[2] === '\xFE' &&
         buff[4] === shortFrame[4] &&
         buff.length >= 5) {
        stateMachine = 1;
      }
    break;
    case 1:
      LED1.write(true);
      USB.write(ackFrame);
      buff = "";
      stateMachine = 2;
    break;
    case 2:
      if(buff[0] === shortFrame[0] &&
         buff[1] === '\x5B' &&
         // buff[2] === '\xFE' &&
         buff[4] === shortFrame[4] &&
         buff.length >= 5) {
        stateMachine = 3;
      }
    break;
    case 3:
      var addr = buff.charCodeAt(2);
      buff = "";
      USB.write(atob(meters[addr]));
      LED1.write(false);
      stateMachine = 0;
    break;
  }
}

function onInit() {
  setWatch(buttonEvent, BTN, { repeat: true, debounce : 50, edge: "rising" });
  buttonEvent();
  setInterval(everySecond, 1000);
  setInterval(stateM, 50);
  USB.on('data', function (data) {
    if(useUSB === true) {
      manageInput(data);
    }
  });
}
