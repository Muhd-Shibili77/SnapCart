const express = require('express');
const router = express.Router();
const passport = require('passport');


// Initiate Google OAuth with account selection prompt
router.get('/', passport.authenticate('google', { 
    scope: ['email', 'profile'],
    prompt: 'select_account' // This forces Google to show the account selection screen
}));

// Google OAuth Callback with Manual Handling
router.get('/callback', 
    passport.authenticate('google', { failureRedirect: '/auth/google/failure' }),
    (req, res) => {
        req.session.email= req.session.passport.user.email;
        res.redirect('/auth/google/protected'); // Or any route you prefer
    }
);

// Protected Route (only accessible if authenticated)
router.get('/protected',(req, res) => {

    res.redirect('/user/home')
});

// Failure Route
router.get('/failure',(req,res) => {
    res.send('Failed to authanticate with google')
});

module.exports = router;