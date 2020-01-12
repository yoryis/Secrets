//jshint esversion:6
require('dotenv').config();//Now all lines below can access to dotenv
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
//Mongoose Encryption
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
//const bcrypt = require("bcrypt");
//const saltRounds = 10;//For 2019 and 2020
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook").Strategy;

const app = express();

//Start Session and Passport Setup
app.use(session({
  secret: 'keyboard cat',//String that we will keep on our .env file
  resave: false,
  saveUninitialized: false//Choosing false is useful for implementing login sessions
}));
//Use passport to initialize it and session
app.use(passport.initialize());
app.use(passport.session());
//End Session and Passport Setup

//console.log(process.env.API_KEY);

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

//Mongoose connection to database blogDB
mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});
//Line below to get rid of this : (node:7300) DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead.
mongoose.set('useCreateIndex', true);

//User Schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  googleFamilyName: String,
  googleGivenName: String,
  secret: String
});
//Plugin Passport-Local-Mongoose into your User schema
//This line is used to hash and salt the password
userSchema.plugin(passportLocalMongoose);
//Simple plugin for Mongoose which adds a findOrCreate method to models. This is useful for libraries like Passport which require it.
userSchema.plugin(findOrCreate);
//const secret = "Esteseriamipequenosecretico.";//Now in .env
//userSchema.plugin(encrypt, { secret:process.env.SECRET, encryptedFields: ["password"] });

//Creating User model using specified schema
const User = mongoose.model("User", userSchema); //This will create a collection posts

//Start Passport-Local configuration
passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
//End Passport-Local configuration

//Start Google authentication strategy authenticates users using a Google account and OAuth 2.0 tokens.
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    //console.log(profile);
    User.findOrCreate({ googleId: profile.id, googleFamilyName: profile.name.familyName, googleGivenName: profile.name.givenName }, function (err, user) {
      return cb(err, user);
    });
  }
));
//End Google authentication strategy authenticates users using a Google account and OAuth 2.0 tokens.

//Start Facebook authentication strategy authenticates users using a Facebook account and OAuth 2.0 tokens.
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
//End Facebook authentication strategy authenticates users using a Google account and OAuth 2.0 tokens.

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

 //Google Auth Page Route
 app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] })//Profile includes email and userId
  );

//Google Route specified on Google
app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect("/secrets");
  });

 //Facebook Auth Page Route
  app.get("/auth/facebook",
    passport.authenticate("facebook", { scope: ["profile", "user_friends", "manage_pages"] }));

 //Facebook Route specified on Facebook
  app.get("/auth/facebook/secrets",
    passport.authenticate("facebook", { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/secrets");
    });

//Login Page Route
app.route("/login")
  .get(function (req, res) {
    res.render("login");
  })
  .post(function (req, res) {
      const user = new User({
        username: req.body.username,
        password: req.body.password,
      });
      //Use passport to login this user and authenticate them
      //Using a login function that password gives us
      req.login(user, function(err) {
        if (err) {
          console.log(err);
        }else {
          passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
          });
        }
      });
  });

 //Secrets Page Route
 app.route("/secrets")
   .get(function (req, res) {
     if(req.isAuthenticated()){//Privilege page secrets
       //Find all user having secrets has a value
       User.find({"secret": {$ne: null}}, function(err, foundUsers){
         if(err){
           console.log(err);
         }else {
           if(foundUsers){
             res.render("secrets", {usersWithSecrets: foundUsers});
           }
         }
       });
     }else {
       res.redirect("/login");
     }
   });

//Register Page Route
app.route("/register")
  .get(function (req, res) {
    res.render("register");
  })
  .post(function (req, res) {
    User.register({username: req.body.username}, req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      }else {
        passport.authenticate("local")(req, res, function(){
          //Since we are authenticating the user now we can create a route for /secrets
          res.redirect("/secrets");
        });
      }
  });
});

//Submit page route
app.route("/submit")
  .get(function (req, res) {
    //Check if user has been Authenticated
    if(req.isAuthenticated()){
      res.render("submit");
    }else {
      res.redirect("/login");
    }
}).post(function (req, res) {
  const submittedSecret = req.body.secret;
  //Find user in database and save the secret on their file
  //console.log(req.user);
  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

//Logout Page Route
//Here, the user will be unauthenticated and end that user's session
app.route("/logout")
  .get(function (req, res) {
    req.logout();
    res.redirect("/");
});
//******END Building the SERVER******//

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
