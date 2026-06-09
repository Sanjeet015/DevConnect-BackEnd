const express = require("express");
try {
  require('dotenv').config();
} catch (err) {
  console.warn('dotenv not found; falling back to environment variables. Install with: npm install dotenv');
}
const connectDB = require("./config/database");
const User = require("./models/user");

const app = express();
const PORT = process.env.PORT || 8000;

app.post("/signup", async (req, res) => {
  const userObj = {
    firstName:"Anushka",
    lastName:"Sharma",
    emailId:"anushka123@gmail.com",
    password:"anushka@123"
  }

  const user = new User(userObj);
  try {
    await user.save();
    res.send("User added successfully..!");
  } catch (err) {
    res.status(400).send("Error saving the user");
  }
})



connectDB()
  .then(() => {
    console.log("Database connected successfully");
    app.listen(PORT, () => {
      console.log(`app is successfully listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database can not be connected", err);
  });
