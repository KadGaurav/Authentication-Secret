// https://www.passportjs.org/packages/passport-google-oauth20/  ---> refer doc for gmail Authentication 

require("dotenv").config();  //For using .env(environment Varialbe) 
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");    ---> Encrption 
// const md5 = require("md5");                      //for  hashing password
// const bcrypt = require("bcrypt");     -->bcrypt
// const saltRounds = 10;               -->bcrypt
const session = require("express-session");        //session and cookiew automatically do salting and hasing of password
const passport = require("passport");           // No need to declare as passport local mongoose will use it 
const passportLocalMongoose =require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app =express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret:"My secret",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");


const userSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//This is Encryption KEY is takken from .env file
// userSchema.plugin(encrypt,{secret:process.env.SECRET_KEY , encryptedFields:["password"] });      --> for encrpting password
//this will encrypt when we call Save() and decrypt when we call Find

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());


passport.serializeUser(function(user, done) {
    done(null, user.id); 
});
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRETS,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
        console.log(profile);
      return cb(err, user);
    });
  }
))

app.get("/",function(req,res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }
  ));

  app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login",function(req,res){
    res.render("login");
});
app.get("/register",function(req,res){
    res.render("register");
});
app.get("/secrets",function(req,res){
    User.find({"secret": {$ne:null}},function(err,foundUsers){
        if(err){
            console.log(err);
        }else{
            if(foundUsers){
                res.render("secrets", {usersWithSecrets : foundUsers});
            }
        }
    }); 
});
app.get("/logout", function(req,res){
    req.logout(function(err) {
        if (err) { 
            console.log(err);
        }
        res.redirect('/');
    });
});

app.get("/submit",function(req,res){
    if(req.isAuthenticated){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
    User.findById()
    
});
app.post("/submit",function(req,res){
    const submittedSecret = req.body.secret;

    User.findById(req.user.id,function(err,foundUser){
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
    })
})

//for bcrypting and salting ===>>

// app.post("/register",function(req,res){

//     bcrypt.hash(req.body.password, saltRounds , function(err,hash){
//             const newUser = new User({
//                 email:req.body.username,
//                 // password:req.body.password   --> for encryption
//                 // password: md5(req.body.password)       //for hash function
//                 password:hash
//             });
        
//             newUser.save(function(err){
//                 if(err){
//                     res.send(err);
//                 }else{
//                     res.render("secrets");
//                 }
//             });
//         })
// });


// app.post("/login",function(req,res){
//     const username = req.body.username;
//     // const password = md5(req.body.password);   
//     const password = req.body.password;             // add md5 for hashing password
//     User.findOne({email:username},function(err,foundUser){
//         if(err){
//             res.send(err);
//         }else{
//             if(foundUser){
//                 bcrypt.compare(password,foundUser.password,function(err,result){
//                     if(result===true){
//                         res.render("secrets");
//                     }

//                 });
//             }
//         }
//     })
// })


app.post("/register",function(req,res){
    User.register({username: req.body.username}, req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res , function(){
                res.redirect("/secrets");
            })
        }
    })
});

app.post("/login",function(req,res){

    const user = new User({
        username : req.body.username,
        password: req.body.password
    });

    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res, function(){
                res.redirect("/secrets");
            });
        }
    })

});




app.listen(3000 , function(){
    console.log("Server Started on Port 3000");
})