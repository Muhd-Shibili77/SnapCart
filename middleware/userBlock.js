const User = require('../model/userdb')

module.exports = async (req, res, next) => {
    if (req.session.email) {
      const email = req.session.email;
      const userExist = await User.findOne({ email: email });
      if (userExist.isBlock) {
        req.session.destroy((err) => {
          if (err) {
            console.log(err);
          }
          res.redirect("/user/login");
        });
      } else {
        next();
      }
    } else {
      next();
    }
  };