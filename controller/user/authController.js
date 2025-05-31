const bcrypt = require("bcrypt");
const User = require("../../model/userdb");
const validator = require("validator");
const nodemailer = require("nodemailer");
const OTP = require("../../model/otpdb");
const Wallet = require("../../model/walletDB");

const genarateOTP = function generatotp() {
  return Math.floor(1000 + Math.random() * 9000);
};

const get_login = (req, res) => {
  if (req.session.email) {
    res.redirect("/user/home");
  } else {
    res.render("user/login", { success: false });
  }
};

const post_login = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const userexist = await User.findOne({ email: email, isAdmin: false });

    if (!userexist) {
      return res.json({ success: false, error: "User does not exist" });
    }

    if (userexist.isBlock) {
      return res.json({ success: false, error: "You are blocked" });
    }

    const passwordmatch = await bcrypt.compare(password, userexist.password);
    if (passwordmatch) {
      req.session.email = userexist.email;
      return res
        .status(200)
        .json({ success: true, message: "Successfully logged in" });
    } else {
      return res.json({ success: false, error: "Incorrect password" });
    }
  } catch (err) {
    console.log("Error in login: ", err);
    return res.json({
      success: false,
      error: "Server error. Please try again later.",
    });
  }
};

const get_signup = (req, res) => {
  if (req.session.email) {
    res.redirect("/user/home");
  } else {
    res.render("user/signup");
  }
};

function generateReferralCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  let letterPart = "";
  for (let i = 0; i < 3; i++) {
    letterPart += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  let numberPart = "";
  for (let i = 0; i < 4; i++) {
    numberPart += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  return letterPart + numberPart;
}

const sendOtp = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // This is for development only
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "OTP from SnapCart",
      text: `Your Signup OTP is ${otp}, it will expire after 60 seconds`,
    };

    await transporter.sendMail(mailOptions);
    console.log("OTP sent successfully to:", email);
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

const post_signup = async (req, res) => {
  if (req.session.email) {
    return res.json({ success: false, message: "Already logged in." });
  }

  const referalCode = req.body.referalCode;

  if (referalCode) {
    const user = await User.findOne({ referalCode: referalCode });

    if (!user) {
      return res.json({ success: false, message: "Invalid user name" });
    }
    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = new Wallet({
        user: user._id,
        balance: 0,
        wallet_history: [],
      });
      await wallet.save();
    }

    req.session.referalCode = referalCode;
  }

  const data = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    password: req.body.password,
    referalCode: generateReferralCode(),
  };

  const otp = genarateOTP();

  try {
    // Checking if phone or email already exists
    const existPhone = await User.findOne({ phone: data.phone });
    const existEmail = await User.findOne({ email: data.email });

    // Trim and validate fields
    const trimmedName = validator.trim(data.name);
    const trimmedPhone = validator.trim(data.phone);

    if (validator.isEmpty(trimmedName)) {
      return res.json({ success: false, message: "Name cannot be empty." });
    }

    if (validator.isEmpty(trimmedPhone)) {
      return res.json({
        success: false,
        message: "Phone number cannot be empty.",
      });
    }

    if (existEmail) {
      return res.json({
        success: false,
        message: "This email already exists.",
      });
    }

    if (existPhone) {
      return res.json({
        success: false,
        message: "This phone number already exists.",
      });
    }

    // Hashing password
    const salt = 10;
    const hashedPassword = await bcrypt.hash(data.password, salt);
    data.password = hashedPassword;

    req.session.data = data;

    // Creating OTP model
    const otpModel = new OTP({
      email: data.email,
      otp: otp,
    });
    req.session.tempEmail = data.email;

    await sendOtp(data.email, otp);
    await otpModel.save();

    return res.json({ success: true, message: "OTP sent successfully." });
  } catch (err) {
    console.error("Error during signup:", err);
    return res.json({
      success: false,
      message: "An error occurred. Please try again.",
    });
  }
};

const get_otp_verification = async (req, res) => {
  if (!req.session.email) {
    res.render("user/otp");
  } else {
    res.redirect("/user/signup");
  }
};

const post_otp_verification = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.session.tempEmail;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "OTP expired. Please try again." });
    }

    // Find the OTP in the database
    const otpDoc = await OTP.findOne({ email });

    if (otpDoc) {
      // Check if OTP is correct
      if (otpDoc.otp === otp) {
        // Check if the user already exists
        const userExists = await User.findOne({ email });

        if (userExists) {
          return res.status(400).json({
            success: false,
            error: "Email already verified. Please signup again.",
          });
        }

        const referalCode = req.session.referalCode;
        if (referalCode) {
          const user = await User.findOne({ referalCode: referalCode });
          if (!user) {
            return res.json({
              success: false,
              message: "Invalid referal code",
            });
          }
          let wallet = await Wallet.findOne({ user: user._id });
          if (wallet) {
            wallet.balanceAmount += 200;
            wallet.wallet_history.push({
              amount: 200,
              description: "Referral Reward",
              transactionType: "credited",
            });
            await wallet.save();
          }
        }

        const data = req.session.data;
        await User.insertMany([data]);
        await OTP.deleteOne({ email });

        // Clear session data
        delete req.session.data;
        delete req.session.tempEmail;

        return res.status(200).json({
          success: true,
          message: "OTP verified successfully. Signup completed!",
        });
      } else {
        return res
          .status(400)
          .json({ success: false, error: "OTP is not correct" });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: "OTP not found or expired. Please resend OTP.",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

const resend_otp = async (req, res) => {
  if (!req.session.tempEmail) {
    return res.redirect("/user/signup");
  }

  const email = req.session.tempEmail;
  console.log(req.session.tempEmail + " this is from resend OTP");
  console.log("Starting OTP resend process for:", email);

  try {
    const userOtpRecord = await OTP.findOne({ email });

    if (!userOtpRecord) {
      return res.render("user/forgetOtp", {
        success: false,
        err: "email not found",
      });
    }

    const otp = genarateOTP();

    await OTP.findOneAndDelete({ email });

    const newOtpRecord = new OTP({
      email: email,
      otp: otp,
    });

    await newOtpRecord.save();

    await sendOtp(email, otp);

    res.status(200).json({ success: true, message: "otp sented successfuly" });
  } catch (error) {
    console.error("Error resending OTP:", error);

    res.status(500).send("Server error. Please try again later.");
  }
};

const user_logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
};

module.exports = {
    get_login,
    post_login,
    get_signup,
    post_signup,
    get_otp_verification,
    post_otp_verification,
    resend_otp,
    user_logout
}