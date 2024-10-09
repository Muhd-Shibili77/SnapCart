const express = require('express')
const app=express()
const path=require('path')
const mongoose = require('mongoose')
const passport = require ('passport')
const session = require('express-session')
const nocache = require ('nocache')
const cropper = require ('cropperjs')
const Product = require('./model/productDB')
const Category = require('./model/categoryDB')
const Brand = require('./model/brandDB')
app.set('view engine','ejs')

app.use(express.json());
app.use(express.urlencoded({extended:true}))


require('dotenv').config();
const port=process.env.PORT || 3000
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));
const userrouter=require('./routes/user-router')
const adminrouter=require('./routes/admin-router')
const googleAuth= require('./routes/google-router')
const cartrouter = require('./routes/cart-router')
const orderrouter = require('./routes/order-router')
const wishlistrouter = require('./routes/wishlist-router')
const walletrouter = require('./routes/wallet-router')
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
app.use('/cart',cartrouter)
app.use('/order',orderrouter)
app.use('/wishlist',wishlistrouter)
app.use('/wallet',walletrouter)






app.get('/',async(req,res)=>{
    if(req.session.user){
        res.redirect('/user/home')
    }else if(req.session.isAdmin){
        res.redirect('/admin')
    }else{
        const mensProduct = await Product.find({category_id:'66e01b1fb148f23cc19fa331'}).populate('category_id')
        const womensProduct = await Product.find({category_id:'66e18d806bf28e92c6d2e0ea'}).populate('category_id')
        const kidsProduct = await Product.find({category_id:'66e18d856bf28e92c6d2e0f2'}).populate('category_id')
        const accessoris = await Product.find({category_id:'66e2970551da17d55eb8ba49'}).populate('category_id')
        res.render("user/LoginHome",{mensProduct,womensProduct,kidsProduct,accessoris});
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