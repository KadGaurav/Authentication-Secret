require("dotenv").config();  //For using .env(environment Varialbe) 
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app =express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
    email:String,
    password:String
});

//This is Encryption KEY is takken from .env file
userSchema.plugin(encrypt,{secret:process.env.SECRET_KEY , encryptedFields:["password"] });
//this will encrypt when we call Save() and decrypt when we call Find

const User = new mongoose.model("User",userSchema);

app.get("/",function(req,res){
    res.render("home");
});
app.get("/login",function(req,res){
    res.render("login");
});
app.get("/register",function(req,res){
    res.render("register");
});

app.post("/register",function(req,res){
    const newUser = new User({
        email:req.body.username,
        password:req.body.password
    });
    newUser.save(function(err){
        if(err){
            res.send(err);
        }else{
            res.render("secrets");
        }
    });
});

app.post("/login",function(req,res){
    const username = req.body.username;
    const password = req.body.password;
    User.findOne({email:username},function(err,foundUser){
        if(err){
            res.send(err);
        }else{
            if(foundUser){
                if(password===foundUser.password){
                    res.render("secrets")
                }
            }
        }
    })
})





app.listen(3000 , function(){
    console.log("Server Started on Port 3000");
})