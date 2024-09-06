const express = require('express')
const app=express()
const path=require('path')
const mongoose = require('mongoose')
const passport = require ('passport')
const session = require('express-session')
const nocache = require ('nocache')
app.set('view engine','ejs')

app.use(express.json());
app.use(express.urlencoded({extended:true}))


require('dotenv').config();
const port=process.env.PORT || 3000
app.use(express.static(path.join(__dirname, 'public')));
const userrouter=require('./routes/user-router')
const adminrouter=require('./routes/admin-router')
const googleAuth= require('./routes/google-router')
const User = require('./model/userdb')
const OTP= require("./model/otpdb")
require('./config/auth')
app.use(session({
    secret:process.env.SESSION_SECRET || 'secert',
    resave:false,
    saveUninitialized:false
}))

app.use(nocache())

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/SnapCart")
.then(()=>{
    console.log('connected to mongodb');
})
.catch((err)=>{
    console.log('mongodb connection error:',err);
})


app.use('/auth/google',googleAuth)
app.use('/user',userrouter)
app.use('/admin',adminrouter)






app.get('/',(req,res)=>{
    if(req.session.user){
        res.redirect('/user/home')
    }else if(req.session.isAdmin){
        res.redirect('/admin')
    }else{
        res.render('user/LoginHome')
    }
})


app.use((req, res, next) => {
    res.render('partial/404')
    // res.status(404).send('404 Not Found: The page you are looking for does not exist.');
  });




app.get('/fetch-data', async (req, res) => {
    try {
        const response = await axios.get('https://api.example.com/data');
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
});



app.listen(port,()=>{
    console.log(`server is started at http://localhost:${port}`)
})