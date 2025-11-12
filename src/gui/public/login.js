let userNameBox, passwordBox, loginButton, signupButton, title, subtitle, card, img;

function setup() {
  noCanvas();

  // Create card container
  card = createDiv();
  card.addClass("login-card");

  // Add logo
  let logo = createImg('assets/cicla_logo.png', 'Cicla Logo');
  logo.parent(card);
  logo.addClass('login-logo');

  // Title
  title = createElement("h2", "Welcome!");
  title.parent(card);

  // Subtitle
  subtitle = createP("Log in to continue");
  subtitle.parent(card);
  
  // Username input
  userNameBox = createInput();
  userNameBox.attribute("placeholder", "Enter your username");
  userNameBox.parent(card);

  // Password input
  passwordBox = createInput("", "password");
  passwordBox.attribute("placeholder", "Enter your password");
  passwordBox.parent(card);

  // Log in button
  loginButton = createButton("Log in");
  loginButton.parent(card);
  loginButton.addClass("login-btn");
  loginButton.mousePressed(login);

  // Sign up button
  signupButton = createButton("Sign up");
  signupButton.parent(card);
  signupButton.addClass("signup-btn");

  // Terms text
  let terms = createP(
    'By continuing, you agree to our <a href="#" style="color:#ff4b4b; text-decoration:none;">Terms and Conditions</a>'
  );
  terms.parent(card);
  terms.addClass("terms");
}

function login() {
  let userName = userNameBox.value();
  let password = passwordBox.value();

  if (userName === "user" && password === "pass") {
    localStorage.setItem("username", userName);
    localStorage.setItem("password", password);
    window.open("page2.html", "_self");
  } else {
    alert("Incorrect username or password");
  }
}
