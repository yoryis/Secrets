//jshint esversion:6
require('dotenv').config();//Now all lines below can access to dotenv
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
//Mongoose Encryption
const encrypt = require("mongoose-encryption");

const app = express();

//console.log(process.env.API_KEY);

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

//Mongoose connection to database blogDB
mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});

//User Schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

//const secret = "Esteseriamipequenosecretico.";//Now in .env
userSchema.plugin(encrypt, { secret:process.env.SECRET, encryptedFields: ["password"] });

//Creating User model using specified schema
const User = mongoose.model("User", userSchema); //This will create a collection posts


//******START Building the SERVER******//
//Home Page Route
app.route("/")
  .get(function (req, res) {
    res.render("home");
  })
  .post(function (req, res) {

  })
  .delete(function (req, res) {
 });
//Login Page Route
app.route("/login")
  .get(function (req, res) {
    res.render("login");
  })
  .post(function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        if(foundUser){//If found a record
          if(foundUser.password === password){
            res.render("secrets");
          }else res.render("error");
        }
      }
    });
  })
  .delete(function (req, res) {
 });
//Register Page Route
app.route("/register")
  .get(function (req, res) {
    res.render("register");
  })
  .post(function (req, res) {
    const newUser = new User({
      email: req.body.username,
      password: req.body.password
    });
    newUser.save(function(err){
      if(!err){
        res.render("secrets");
      }else {
        console.log(err);
      }
    });
  });
  //Error Page Route
  app.route("/error")
    .get(function (req, res) {
      res.render("error");
    });
//******END Building the SERVER******//

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
