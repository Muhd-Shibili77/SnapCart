const bcrypt = require("bcrypt");
const User = require("../../model/userdb");

const admin_login = (req, res) => {
  if (req.session.isAdmin) {
    res.redirect("/admin/dashboard");
  } else {
    res.render("admin/adminLogin");
  }
};

const post_admin_login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const adminexist = await User.findOne({ email });
   
    if (!adminexist) {
      return res.json({ success: false, error: "Email not found" });
    }

    if (!adminexist.isAdmin) {
      return res.json({ success: false, error: "You are not admin" });
    }

    const passwordmatch = await bcrypt.compare(password, adminexist.password);
    if (!passwordmatch) {
      return res.json({ success: false, error: "incorrect password" });
    }

    req.session.isAdmin = true;
    return res.json({ success: true, message: "Login successful" });
  } catch (err) {
    console.log("Error in login:", err);
    return res.json({ success: false, error: "Internal server error" });
  }
};

const admin_logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.redirect("/admin/login");
  });
};

module.exports = {
  admin_login,
  post_admin_login,
  admin_logout
};