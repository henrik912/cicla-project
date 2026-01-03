import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAYJwO4MKFSCfM4iHUTuJTzTzGRkBKrtTI",
  authDomain: "cicla-project.firebaseapp.com",
  projectId: "cicla-project",
  storageBucket: "cicla-project.firebasestorage.app",
  messagingSenderId: "943033387656",
  appId: "1:943033387656:web:c08795f4eed3a73279ad3d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let termsText = [];

// instance mode
const sketch = (p) => {
  let userNameBox, passwordBox, loginButton, signupButton, title, subtitle, card;
  let registrationPopup, closePopupButton, regNameInput, regLastNameInput, regEmailInput, regPasswordInput, createAccountBtn;

  p.preload = () => {
    termsText = p.loadStrings("assets/toa.txt");
  };

  p.setup = () => {
    console.log("setup running");
    p.noCanvas();

    card = p.createDiv();
    card.addClass("login-card");

    const logo = p.createImg('assets/logo_podlock.png', 'Cicla Logo');
    logo.parent(card);
    logo.addClass('login-logo');

    title = p.createElement("h2", "Welcome!");
    title.parent(card);

    subtitle = p.createP("Log in to continue");
    subtitle.parent(card);

    userNameBox = p.createInput();
    userNameBox.attribute("placeholder", "Enter your email");
    userNameBox.parent(card);

    passwordBox = p.createInput("", "password");
    passwordBox.attribute("placeholder", "Enter your password");
    passwordBox.parent(card);

    loginButton = p.createButton("Log in");
    loginButton.parent(card);
    loginButton.addClass("login-btn");
    loginButton.mousePressed(login);

    signupButton = p.createButton("Sign up");
    signupButton.parent(card);
    signupButton.addClass("signup-btn");
    signupButton.mousePressed(showRegistrationPopup);
    

    const terms = p.createP('By continuing, you agree to our <a href="#" class="terms-link">Terms and Conditions</a>');
    terms.parent(card);
    terms.addClass("terms");

    // Terms popup
    const popupOverlay = p.createDiv();
    popupOverlay.addClass("popup-overlay");
    popupOverlay.hide();

    const popupCard = p.createDiv();
    popupCard.addClass("registration-card");
    popupCard.parent(popupOverlay);

    const popupTitle = p.createElement("h2", "Terms of Agreement");
    popupTitle.parent(popupCard);

    // Scrollable box
    const scrollBox = p.createDiv();
    scrollBox.addClass("terms-scroll");
    scrollBox.parent(popupCard);

    // Insert text loaded from txt file
    const popupText = p.createP(termsText.join("<br>"));
    popupText.parent(scrollBox);

    const closeTermsBtn = p.createButton("Close");
    closeTermsBtn.parent(popupCard);
    closeTermsBtn.addClass("login-btn");

    closeTermsBtn.mousePressed(() => popupOverlay.hide());

    // Open popup
    terms.elt.querySelector(".terms-link").addEventListener("click", (e) => {
      e.preventDefault();
      popupOverlay.show();
    });
  };

  const login = async () => {
    const email = userNameBox.value();
    const password = passwordBox.value();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      localStorage.setItem("userEmail", user.email);
      window.open("/home", "_self");
    } catch (err) {
      console.error(err);
      alert("Login failed: " + err.message);
    }
  };

  const showRegistrationPopup = () => {
    registrationPopup = p.createDiv();
    registrationPopup.addClass("popup-overlay");

    const popupCard = p.createDiv();
    popupCard.addClass("registration-card");
    popupCard.parent(registrationPopup);

    const popupTitle = p.createElement("h2", "Register Account");
    popupTitle.parent(popupCard);

    regNameInput = p.createInput();
    regNameInput.attribute("placeholder", "First name");
    regNameInput.parent(popupCard);

    regLastNameInput = p.createInput();
    regLastNameInput.attribute("placeholder", "Last name");
    regLastNameInput.parent(popupCard);

    regEmailInput = p.createInput();
    regEmailInput.attribute("placeholder", "Email");
    regEmailInput.parent(popupCard);

    regPasswordInput = p.createInput("", "password");
    regPasswordInput.attribute("placeholder", "Password");
    regPasswordInput.parent(popupCard);

    createAccountBtn = p.createButton("Create Account");
    createAccountBtn.parent(popupCard);
    createAccountBtn.addClass("login-btn");
    createAccountBtn.mousePressed(registerAccount);

    closePopupButton = p.createButton("×");
    closePopupButton.parent(popupCard);
    closePopupButton.addClass("close-btn");
    closePopupButton.mousePressed(closePopup);
  
  };

  const closePopup = () => {
    registrationPopup.remove();
  };

  const registerAccount = async () => {
    const email = regEmailInput.value();
    const password = regPasswordInput.value();
    const firstName = regNameInput.value();
    const lastName = regLastNameInput.value();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userName", `${firstName} ${lastName}`);
      alert(`Account created successfully for ${firstName} ${lastName}`);
      closePopup();
    } catch (err) {
      console.error(err);
      alert("Registration failed: " + err.message);
    }
  };
};

new p5(sketch); 