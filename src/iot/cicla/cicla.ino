// ==============================================================================
// ESP32 + Firebase + Ultrasonic Sensor + LED + Distance upload
// ==============================================================================

#include <WiFi.h>
#include "Firebase_ESP_Client.h"
#include "addons/TokenHelper.h" 
#include "addons/RTDBHelper.h"
#include <ESP32Servo.h>

//fill these in with the keys
#define WIFI_SSID "Henrik"  
#define WIFI_PASSWORD "abcabcabc"
#define API_KEY "AIzaSyAYJwO4MKFSCfM4iHUTuJTzTzGRkBKrtTI"
#define DATABASE_URL "https://cicla-project-default-rtdb.europe-west1.firebasedatabase.app/"

//ULTRA SONIC SENSOR
const int trigPin = 32;
const int echoPin = 33;
float duration, distance; 

//LED
const int LED = 27;
int ledState = 0;          // will store LED state (0 or 1)

//MAGNETIC REED SWITCH!
const int reedSwitch = 13;
int closed;

//SERVO
Servo servo;

// ---------------- GATE CONTROL ----------------
int openRequest = 0;

enum GateState {
  GATE_CLOSED,
  GATE_OPENING,
  GATE_OPEN,
  GATE_CLOSING
};

GateState gateState = GATE_CLOSED;
unsigned long gateTimer = 0;

const int CLOSED_ANGLE = 90;
const int OPEN_ANGLE   = 10;

//FIREBASE CONFIG
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long sendDataPrevMillis = 0;
bool signupOK = false;

void setup() {
  Serial.begin(9600);
 
  // ---------------- Wi-Fi ----------------
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nWi-Fi connected!");

  // ---------------- Firebase config ----------------
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Anonymous sign-up
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase signUp OK");
    signupOK = true;
  } else {
    Serial.printf("SignUp Error: %s\n", config.signer.signupError.message.c_str());
  }

  config.token_status_callback = tokenStatusCallback; 
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // ---------------- Pins ----------------
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(LED, OUTPUT);
  pinMode(reedSwitch, INPUT_PULLUP);
  servo.attach(26);
  servo.write(CLOSED_ANGLE);
}

void moveServoSmooth(int from, int to) {
  int step = (from < to) ? 1 : -1;

  for (int a = from; a != to; a += step) {
    servo.write(a);
    delay(10);
  }
  servo.write(to);
}

void readGateRequest() {
  if (Firebase.RTDB.getInt(&fbdo, "GateControl/open_request")) {
    openRequest = fbdo.intData();
  }
}

void handleGate() {

  // New request from website
  if (openRequest == 1 && gateState == GATE_CLOSED) {
    Serial.println("Gate opening...");
    gateState = GATE_OPENING;
  }

  switch (gateState) {

    case GATE_OPENING:
      moveServoSmooth(CLOSED_ANGLE, OPEN_ANGLE);
      gateTimer = millis();
      gateState = GATE_OPEN;

      // Reset request so it doesn't repeat
      Firebase.RTDB.setInt(&fbdo, "GateControl/open_request", 0);
      break;

    case GATE_OPEN:
      if (millis() - gateTimer > 3000) { // wait 3 seconds
        gateState = GATE_CLOSING;
      }
      break;

    case GATE_CLOSING:
      Serial.println("Gate closing...");
      moveServoSmooth(OPEN_ANGLE, CLOSED_ANGLE);
      gateState = GATE_CLOSED;
      break;

    case GATE_CLOSED:
      // idle
      break;
  }
}

void loop() {

  readGateRequest();
  handleGate();
  
  // ---------------- Measure distance ----------------
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  duration = pulseIn(echoPin, HIGH);
  distance = (duration * 0.0343) / 2;          // distance in cm [web:7][web:13]

  // 0 when magnet present (closed), 1 when open
  closed = digitalRead(reedSwitch);

  Serial.print("closed: ");
  Serial.println(closed);

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");
  
  if (distance <= 50 && closed == 1) {
    digitalWrite(LED, HIGH);
    ledState = 1;
  } else {
    digitalWrite(LED, LOW);
    ledState = 0;
  }

  if (!signupOK) {
    Serial.println("DEBUG: signupOK is FALSE");
  }

  if (!Firebase.ready()) {
    Serial.println("DEBUG: Firebase not ready");
  }

  // ---------------- Send to Firebase every 5s ----------------
  if (Firebase.ready() && signupOK &&
      (millis() - sendDataPrevMillis > 5000 || sendDataPrevMillis == 0)) {

    sendDataPrevMillis = millis();

    // 1) Upload LED state as int
    if (Firebase.RTDB.setInt(&fbdo, "Sensor/led_state", ledState)) {  // uses setInt for integer data [web:12]
      Serial.print("LED state sent: ");
      Serial.println(ledState);
    } else {
      Serial.println("FAILED (led_state): " + fbdo.errorReason());
    }

    // 2) Upload distance as float
    if (Firebase.RTDB.setFloat(&fbdo, "Sensor/distance_cm", distance)) { // uses setFloat for float data [web:6][web:9]
      Serial.print("Distance sent: ");
      Serial.println(distance);
    } else {
      Serial.println("FAILED (distance_cm): " + fbdo.errorReason());
    }

    if (Firebase.RTDB.setFloat(&fbdo, "Sensor/closed", closed)) { // uses setFloat for float data [web:6][web:9]
      Serial.print("close sent: ");
      Serial.println(closed);
    } else {
      Serial.println("FAILED (close): " + fbdo.errorReason());
    }
  }   

  delay(1000);
}
