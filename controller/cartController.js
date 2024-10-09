const User = require("../model/userdb");
const Category = require("../model/categoryDB");
const Brand = require("../model/brandDB");
const Product = require("../model/productDB");
const Cart = require("../model/cartDb");
const Address = require("../model/AddressDB");
const Coupon = require('../model/couponDB')

const cart = async (req, res) => {
  try {
    if (req.session.email) {
      const user = await User.findOne({ email: req.session.email });
      
      const cart = await Cart.findOne({ user: user._id }).populate(
        "items.product"
      );
      

    let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }

    

      

      if (cart && cart.items.length > 0) {
        for (let item of cart.items) {
          const variant = item.product.variants.find(
            (v) => v._id.toString() === item.variantId
          );

          if (variant) {
            item.variantImage = variant.images[0];
            item.price = variant.price;
          }
        }
      }

      res.render("user/cart", { cart,cartCount });
    } else {
      res.redirect("/user/login");
    }
  } catch (error) {
    console.log("error while loading cart page", error);
    res.status(500).send("error occur while loading this cart page");
  }
};

const add_to_cart = async (req, res) => {
  if (req.session.email) {
    try {
      const productId = req.body.product_id;
      const variantId = req.body.variant_id;
      const quantity = parseInt(req.body.quantity);
      
    
      if (quantity > 5) {
        return res.status(404).json({ success: false, message: "Can't add more than 5 quantity" });
      }

      const user = await User.findOne({ email: req.session.email });
      if (!user) {
        console.log("User not found");
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const product = await Product.findById(productId);
      if (!product) {
        console.log("Product not found");
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      const variant = product.variants.find(v => v._id.toString() === variantId);
      if (!variant) {
        console.log("Variant not found");
        return res.status(404).json({ success: false, message: "Variant not found" });
      }

      if (variant.stock < quantity) {
        console.log("Variant out of stock");
        return res.status(400).json({ success: false, message: "Variant is out of stock" });
      }

      let cart = await Cart.findOne({ user: user._id });
      if (!cart) {
        cart = new Cart({ user: user._id, items: [], total_price: 0 });
        console.log("New cart created");
      }

      const existItemIndex = cart.items.findIndex(item => item.product.toString() === productId && item.variantId.toString() === variantId);

      let price = variant.offer ? variant.discount_price : variant.price; 

      if (existItemIndex > -1) {
       
        if (cart.items[existItemIndex].quantity + quantity > variant.stock) {
          console.log("Not enough stock available");
          return res.status(400).json({ success: false, message: "Not enough stock available" });
        }

        if (cart.items[existItemIndex].quantity >= 5) {
          return res.status(400).json({ success: false, message: "Maximum quantity reached" });
        }

        cart.items[existItemIndex].quantity += quantity; 
        cart.items[existItemIndex].price += price * quantity; 
      } else {
        
        cart.items.push({
          product: productId,
          variantId,
          quantity: quantity,
          price: price * quantity,
        });
      }

      
      cart.total_price = cart.items.reduce((total, item) => total + item.price, 0);

      await cart.save();

      res.json({ success: true, message: "Product variant added to cart" });
    } catch (error) {
      console.log("Error occurred while adding product to cart:", error);
      res.status(500).json({ success: false, message: "An error occurred" });
    }
  } else {
    res.redirect("/user/login");
  }
};


const updateCart = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { id } = req.query;

    const cart = await Cart.findOne({ "items._id": id });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
    }

    const item = cart.items.id(id);

    const product = await Product.findById(item.product._id);

    const variant = product.variants.find(
      (z) => z._id.toString() === item.variantId
    );

    if (!variant) {
      return res
        .status(404)
        .json({ success: false, message: "variant not found" });
    }

    if (variant.stock < quantity) {
      return res
        .status(400)
        .json({
          success: false,
          message: `There are only ${variant.stock} in stock`,
        });
    }
    if (item) {
      const oldPrice = item.price;
      item.quantity = quantity;
      
      const price = variant.offer ? variant.discount_price : variant.price;
      
      item.price = price * quantity;
     
      cart.total_price += item.price - oldPrice; 
      await cart.save();
      return res
        .status(200)
        .json({ success: true, message: "cart updated successfuly" });
    } else {
      return res
        .status(404)
        .json({ success: false, message: `item is not found in cart ` });
    }
  } catch (error) {
    console.error("error while updating cart", error);
    return res
      .status(500)
      .json({ success: false, message: "an error occur while updating cart" });
  }
};

const deleteCart = async (req, res) => {
  try {
    const { id } = req.query;
    const user = await User.findOne({ email: req.session.email });
    const cart = await Cart.findOneAndUpdate(
      { user: user._id },
      { $pull: { items: { _id: id } } },
      { new: true }
    );
    if (cart) {
      return res.status(200).json({ success: true, cart });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "cart not found" });
    }
  } catch (error) {
    console.log("Error occurred while deleting cart items:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const cartCheckout = async (req, res) => {
  if (req.session.email) {
    
    const user = await User.findOne({ email: req.session.email });
 
    
   
    const cart = await Cart.findOne({ user: user._id })
    .populate("items.product");
  
    if (cart && cart.items.length > 0) {
      for (let item of cart.items) {
        const variant = item.product.variants.find((a) => a._id.toString() === item.variantId);
        if (variant) {
          item.price = variant.price;
        }
        if(item.product.isDelete){
          return res.json({
            success: false,
            message: "This product is currently unavailable",
          });
        }
        if (variant.stock < item.quantity) {
          return res.json({
            success: false,
            message: "Not enough stock available for one or more items.",
          });
        }
      }
    } else {
      return res.json({
        success: false,
        message: "Your cart is empty.",
      });
    }

    
    return res.json({success: true,});
  } else {
    res.redirect("/user/login");
  }
};

const cartCheckoutorder = async (req,res)=>{
  if(req.session.email){
    const user = await User.findOne({ email: req.session.email });
    const address = await Address.find({ userId: user._id });
    const cart = await Cart.findOne({ user: user._id })
    .populate("items.product");
    

    let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }

    

    if(!cart){
      res.redirect('/user/home')
    }else{
      res.render('user/cartCheckout',{address,cart,cartCount})
    }
  }else{
    res.redirect('/user/login')
  }
}



const applyCoupon = async (req, res) => {
  try {
    if (req.session.email) {
      const { couponCode } = req.body;
      const user = await User.findOne({ email: req.session.email });
      const coupon = await Coupon.findOne({ coupon_code: couponCode });
      
      if (!coupon) {
        return res.json({ success: false, error: 'Coupon not found' });
      }

      // Check if the user has already used the coupon
      const userHasUsedCoupon = coupon.users.some(
        (couponUser) => couponUser.userId.toString() === user._id.toString() && couponUser.isBought === true
      );

      if (userHasUsedCoupon) {
        return res.json({ success: false, error: 'You have already used this coupon' });
      }

      const now = new Date();
      if (now < coupon.start_date || coupon.expiry_date < now) {
        return res.json({ success: false, error: 'Coupon is expired' });
      }

      const cart = await Cart.findOne({ user: user._id }).populate('items.product');
      if (!cart || cart.items.length === 0) {
        return res.json({ success: false, error: 'Cart is empty' });
      }

      let cartTotal = 0;
      for (let item of cart.items) {
        const variant = item.product.variants.find(x => x._id.toString() === item.variantId);

        if (!variant) {
          return res.json({ success: false, error: 'Variant not found' });
        }

        const price = variant.offer ? variant.discount_price : variant.price;
        if (variant) {
          cartTotal += price * item.quantity;
        }
      }

      if (cartTotal < coupon.min_purchase_amount) {
        return res.json({
          success: false,
          error: `Minimum purchase amount for this coupon is ${coupon.min_purchase_amount}`
        });
      }
      
      
      let discount = (cartTotal * coupon.discount) / 100;
      discount = Math.min(discount, coupon.max_coupon_amount);
      const subTotal = cartTotal - discount;
     

      res.json({ success: true, discount: discount, price: subTotal });
      
    } else {
      res.redirect('/user/login');
    }
  } catch (error) {
    console.log('Error occurred while applying coupon:', error);
    return res.json({ success: false, error: 'An error occurred while applying the coupon' });
  }
};




const applyCouponToUser = async (req, res) => {
  try {
    if (req.session.email) {
      const { couponCode } = req.body;
      const user = await User.findOne({ email: req.session.email });

    
      const coupon = await Coupon.findOne({ coupon_code: couponCode });

      if (!coupon) {
        return res.json({ success: false, error: 'Coupon not found' });
      }

        await Coupon.findOneAndUpdate(
        { coupon_code: couponCode },
        { $addToSet: { users: { userId: user._id } } },
        { new: true, upsert: false }
    );


        return res.json({ success: true, message: 'Coupon applied successfully' });
      
    } else {
      res.redirect('/user/login');
    }
  } catch (error) {
    console.log('An error occurred while applying the coupon', error);
    return res.json({ success: false, error: 'An error occurred while applying the coupon' });
  }
};





const applyCouponFromUser = async (req, res) => {
  try {
    if (req.session.email) {
      const { couponCode } = req.body;
      const user = await User.findOne({ email: req.session.email });

      // Check if the coupon exists and if the user has used it
      const coupon = await Coupon.findOne({ coupon_code: couponCode });

      if (!coupon) {
        return res.json({ success: false, error: 'Coupon not found' });
      }

      

      

      
      const result = await Coupon.findOneAndUpdate(
        { coupon_code: couponCode, "users.userId": user._id },
        {
          $pull: { users: { userId: user._id } },
        },
        { new: true }
      );

      if (!result) {
        return res.json({ success: false, error: 'Failed to remove coupon' });
      }

      return res.json({ success: true, message: 'Coupon removed successfully' });
    } else {
      res.redirect('/user/login');
    }
  } catch (error) {
    console.error('An error occurred while removing the coupon:', error);
    return res.json({ success: false, error: 'An error occurred while removing the coupon' });
  }
};


module.exports = {
   cart,
   add_to_cart, 
   updateCart, 
   deleteCart, 
   cartCheckout, 
   cartCheckoutorder,
   applyCoupon,
   applyCouponToUser,
   applyCouponFromUser
  };
