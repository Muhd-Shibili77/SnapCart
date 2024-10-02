const User = require("../model/userdb");
const Product = require("../model/productDB");
const Category = require("../model/categoryDB");
const Brand = require("../model/brandDB");
const Cart = require("../model/wishlistDB");
const Wishlist = require("../model/wishlistDB");

const wishlistGet = async (req, res) => {
  if (req.session.email) {
    const user = await User.findOne({ email: req.session.email });
    const wishlist = await Wishlist.findOne({ user_id: user._id })
    .populate({
      path: 'items.product',
      populate: {
        path: 'variants.offer', // Populate the 'offer' field inside each product
        model: 'Offer' // Use the correct model name for the 'offer' field
      }
    });
    
    
    if (wishlist && wishlist.items) {
      const products = wishlist.items.filter(item => !item.product.isDelete);
      res.render("user/wishlist", { products });
    } else {
      res.render("user/wishlist", { products: [] });
    }
  } else {
    res.redirect("/user/login");
  }
};

const addToWishlist = async (req, res) => {
  try {
    if (req.session.email) {
    
      const { productId, variantId } = req.body;
       
      const user = await User.findOne({ email: req.session.email });
      if (!user) {
        return res.json({ success: false, error: "User not found" });
      }
      const product = await Product.findById(productId);
      if (!product) {
        return res.json({ success: false, error: "Product Not Found" });
      }
      const variant = product.variants.find(
        (x) => x._id.toString() == variantId
      );

      if (!variant) {
        return res.json({ success: false, error: "variant Not Found" });
      }
      
      let wishlist = await Wishlist.findOne({ user_id: user._id });
      
      if (!wishlist) {
        wishlist = new Wishlist({
          user_id: user._id,
          items: [
            {
              product: productId,
              variantId: variantId,
            },
          ],
        });
      } else {

        const existingItems = wishlist.items.find((x) =>x.product.toString() === productId && x.variantId.toString() === variantId);

        if (existingItems) {
          return res.json({success: false,error: "product already in  wishlist",});
        }
        
        wishlist.items.push({
          product: productId,
          variantId: variantId,
        });
      }
      await wishlist.save()

      res.status(200).json({ success: true, message: "Product  added to wishlist" });
    } else {
      res.redirect("/user/login");
    }
  } catch (error) {
    console.error("Error in add to wishlist:", error);
    res.status(500).json({ success: false, message: "Something went wrong on the server" });


  }
};


const removeFromWishlist =async (req,res)=>{
  try{
    if(req.session.email){
      const {productId}=req.body
          const user = await User.findOne({email:req.session.email})
          if(!user){
            return res.json({success:false,error:'user not found'})
          }
          console.log(productId)
          const result = await Wishlist.updateOne({user_id:user._id},{ $pull :{ items: { _id:productId }}})

          console.log(result)
          
          res.json({success:true , message:' item removed from wishlist '})

    }else{
      res.redirect('/user/login')
    }








  }catch(error){
    console.error("Error in remove from wishlist:", error);
    res.status(500).json({ success: false, message: "Something went wrong on the server" });
  }
}



module.exports = {
  wishlistGet,
  addToWishlist,
  removeFromWishlist
};
