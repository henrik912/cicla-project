#include "BluetoothSerial.h"
BluetoothSerial SerialBT;

void setup() {
  SerialBT.begin("ESP32_BikeLock");  // or any name
}
