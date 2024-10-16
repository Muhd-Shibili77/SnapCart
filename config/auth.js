const passport = require('passport');
const User = require("../model/userdb");
require('dotenv').config();

const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECERT,
    callbackURL: "https://snapcart.click/auth/google/callback",
    passReqToCallback   : true
  },
  async function(request, accessToken, refreshToken, profile, done) {
    try {
        
        // Find the user by email instead of googleId
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // If the user exists, update the googleId if it's not set
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        } else {
          // If the user doesn't exist, create a new Google user
          user = new User({
            googleId: profile.id,
            name:profile.displayName,
            email: profile.emails[0].value,
            
            // No need for phone_number and password for Google users
          });
          await user.save();
  
          return done(null, user);
        }
      } catch (err) {
        return done(err, null);
      }
  }
));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports=passport