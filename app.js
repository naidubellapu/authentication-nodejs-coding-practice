const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

// for password encryption
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

// API 1
// user registration

// scenarios
// 1. if the username already exists
// 2. if the password less than 5 characters
// 3. successful registration

const validatePassword = (password) => {
  return password.length > 5;
};

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
        SELECT * FROM user
        WHERE username = '${username}'
    `;
  const userResponse = await db.get(selectUserQuery);

  if (userResponse === undefined) {
    const createUserQuery = `
            INSERT INTO user(username,name,password,gender,location)
            VALUES('${username}','${name}','${hashedPassword}','${gender}','${location}')
        `;
    if (validatePassword(password)) {
      const createUser = await db.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// API 2
// user login

// scenarios
// 1. if an unregistered user tries to login
// 2. if user provides incorrect password
// 3. successful login

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
        SELECT * FROM user
        WHERE username = '${username}'
    `;
  const userNameResponse = await db.get(selectUserQuery);
  if (userNameResponse === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      userNameResponse.password
    );
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// API 3
// change password

// scenarios
// 1. if user provides incorrect password
// 2. if password is too short
// 3. successful password update

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `
        SELECT * FROM user
        WHERE username = '${username}'
    `;
  const userDetails = await db.get(selectUserQuery);

  if (userDetails === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      userDetails.password
    );
    if (isPasswordMatched === true) {
      if (validatePassword(newPassword)) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
                UPDATE user SET password = '${hashedPassword}'
                WHERE username = '${username}'
              `;
        const updatePasswordQueryResponse = await db.run(updatePasswordQuery);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
