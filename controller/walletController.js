const User = require("../model/userdb");
const Product = require("../model/productDB");
const order = require('../model/orderDB')
const Wallet = require('../model/walletDB')
const Razorpay = require('../config/razorPay')
const crypto = require("crypto");
const Cart = require('../model/cartDb')

const userWallet = async (req,res)=>{
   
    const user = await User.findOne({email:req.session.email})
        
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );
   

    let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }

    
        let wallet = await Wallet.findOne({user: user._id})
        if (wallet && wallet.wallet_history) {
          wallet.wallet_history.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
       
        if (!wallet) {
          wallet = new Wallet({
            user: user._id,
            balance: 0,
            wallet_history: [],
          });
          await wallet.save();
        }

        res.render("user/wallet",{wallet,cartCount});
   
}



  const addFund = async (req, res) => {
  
      const amount = req.body.amount;
      if (!amount) {
        return res.json({ success: false, error: 'Amount is empty' });
      }
      if (isNaN(amount)) {
        return res.json({ success: false, error: 'Invalid amount. Please enter a number' });
      }
      if (parseFloat(amount) <= 0) {
        return res.json({ success: false, error: 'Amount must be greater than zero.' });
      }
      const maxAmount = 100000;
      if (parseFloat(amount) > maxAmount) {
        return res.json({ success: false, error: `Amount cannot exceed ${maxAmount}.` });
      }
      try {
       
        const options = {
          amount: parseInt(amount) * 100, 
          currency: "INR",
          receipt: `receipt_order_${Date.now()}`,
        };
      
        
        const order = await Razorpay.orders.create(options);
        

        if (!order) {
          return res.json({ success: false, error: 'Failed to create Razorpay order.' });
        }
       
  
        return res.json({ success: true, id:order.id,currency:order.currency,amount:order.amount });
  
      } catch (error) {
        console.error('Error creating Razorpay order:', error);
        return res.json({ success: false, error: 'Failed to create Razorpay order.' });
      }
  
   
  };


  const verifyPayment = async (req,res)=>{
    
     
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

      


    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZOR_PAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

        if (expectedSignature === razorpay_signature) {
          try {
              const user = await User.findOne({email:req.session.email}) 
              const wallet = await Wallet.findOne({ user: user._id });
  
              if (wallet) {
              
                  wallet.balanceAmount += parseFloat(amount) / 100;
                  wallet.wallet_history.push({
                      date: new Date(),
                      amount: parseFloat(amount) / 100, 
                      description: "Funds added to wallet",
                      transactionType: "credited",
                  });
  
                  await wallet.save();
              }
  
              return res.json({
                  success:true,
                  message: "Payment verified successfully",
              });
          } catch (error) {
              console.error("Error updating wallet:", error);
              return res.status(500).json({
                  message: "An error occurred while processing your payment. Please try again later."
              });
          }
      } else {
          return res.json({
              message: "Payment verification failed. Please check your payment details."
          });
      }

   
  }

  
  module.exports = {
    userWallet,
    addFund,
    verifyPayment,
  };
  

