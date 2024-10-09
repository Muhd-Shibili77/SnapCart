const User = require("../model/userdb");
const Category = require("../model/categoryDB");
const Brand = require("../model/brandDB");
const Product = require("../model/productDB");
const Order = require("../model/orderDB");
const Offer = require("../model/offerDB");

const offers = async (req, res) => {
  if (req.session.isAdmin) {
    const offer = await Offer.find();
    const offerSelect = await Offer.find({isDelete:false});
    const products = await Product.find({ isDelete: false }).populate(
      "variants.offer"
    );
    const category = await Category.find({ isDeleted: false }).populate(
      "offer"
    );
    res.render("admin/adminOffer", { offer, products, category ,offerSelect });
  } else {
    res.redirect("/admin/login");
  }
};

const addOffers = async (req, res) => {
  try {
    if (req.session.isAdmin) {
      const nameRegex = /^[a-zA-Z\s\-]+$/;
      const { offerName, offerPercentage, offerStartDate, offerEndDate } =
        req.body;
      const currentDate = new Date();

      if (!offerName) {
        return res.json({ success: false, error: "offer name is empty" });
      }

      if (offerName.length < 2) {
        return res.json({
          success: false,
          error: "Name must need minimum 2 characters.",
        });
      }

      if (!nameRegex.test(offerName)) {
        return res.json({
          success: false,
          error: "Name should not contain numbers or special characters.",
        });
      }

      if (!offerPercentage) {
        return res.json({ success: false, error: "offerPercentage is empty" });
      }

      if (isNaN(offerPercentage)) {
        return res.json({
          success: false,
          error: "Percentage must be a number.",
        });
      }

      if (offerPercentage < 1 || offerPercentage > 100) {
        return res.json({
          success: false,
          error: "Percentage not more than 100 and less than 0",
        });
      }

      if (offerPercentage !== Math.floor(offerPercentage)) {
        return res.json({
          success: false,
          error: "Percentage must be a whole number.",
        });
      }

      if (!offerStartDate) {
        return res.json({ success: false, error: "offerStartDate is empty" });
      }
      if (offerStartDate < currentDate) {
        return res.json({
          success: false,
          error: "Start date cannot be in the past.",
        });
      }

      if (!offerEndDate) {
        return res.json({ success: false, error: "offerEndDate is empty" });
      }

      if (offerEndDate <= offerStartDate) {
        return res.json({
          success: false,
          error: "End date must be after the start date",
        });
      }

      const newOffer = new Offer({
        offerName: offerName,
        offerPercentage: offerPercentage,
        offerStartDate: new Date(offerStartDate),
        offerEndDate: new Date(offerEndDate),
      });

      await newOffer.save();
      res.json({ success: true, message: "new offer addedd successfully" });
    } else {
      res.redirect("/admin/login");
    }
  } catch (error) {
    console.error("Error occurred while adding new offer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteOffer = async (req, res) => {
  try {
    if (req.session.isAdmin) {
      const offerId = req.body.offerId;
      const offer = await Offer.findById(offerId);

      if (!offer) {
        return res.json({ success: false, error: "This offer not found" });
      }

      await Offer.findByIdAndUpdate(offerId, { isDelete: true });
      const products = await Product.find({ "variants.offer": offerId });
      const categories = await Category.find({ offer: offerId });
      if (!products.length) {
        return res.json({
          success: false,
          error: "No products found with this offer",
        });
      }
      if (!categories.length) {
        return res.json({
          success: false,
          error: "No categories found with this offer",
        });
      }


      await Product.updateMany(
        { "variants.offer": offerId }, // Find products with variants having the offer
        {
          $set: {
            "variants.$[].offer": null, // Set the offer field to null
            "variants.$[].discount_price": null, // Set the discount_price to null
          },
        }
      );
      await Category.updateMany(
        { offer: offerId }, 
        {
          $set: {
            offer: null,
          }
        }
      );
   
    

      res.json({ success: true, messgae: "offer successfully deleted" });
    } else {
      res.redirect("/admin/login");
    }
  } catch (error) {
    console.log("error while deleting the offer", error);
    return res.status(500).json({ success: false, error: "server error" });
  }
};
const restoreOffer = async (req, res) => {
  try {
    if (req.session.isAdmin) {
      const offerId = req.body.offerId;
      const offer = await Offer.findById(offerId);

      if (!offer) {
        return res.json({ success: false, error: "This offer not found" });
      }

      await Offer.findByIdAndUpdate(offerId, { isDelete: false });
      res.json({ success: true, messgae: "offer successfully restored" });
    } else {
      res.redirect("/admin/login");
    }
  } catch (error) {
    console.log("error while restoring the offer", error);
    return res.status(500).json({ success: false, error: "server error" });
  }
};

const editOffers = async (req, res) => {
  try {
    if (req.session.isAdmin) {
      const nameRegex = /^[a-zA-Z\s\-]+$/;
      const {
        editOfferId,
        editOfferName,
        editOfferPercentage,
        editOfferStartDate,
        editOfferEndDate,
      } = req.body;
      const currentDate = new Date();

      if (!editOfferName) {
        
        return res.json({ success: false, error: "offer name is empty" });
      }

      if (editOfferName.length < 2) {
        return res.json({
          success: false,
          error: "Name must need minimum 2 characters.",
        });
      }

      if (!nameRegex.test(editOfferName)) {
        return res.json({
          success: false,
          error: "Name should not contain numbers or special characters.",
        });
      }

      if (!editOfferPercentage) {
        return res.json({ success: false, error: "offerPercentage is empty" });
      }

      if (isNaN(editOfferPercentage)) {
        return res.json({
          success: false,
          error: "Percentage must be a number.",
        });
      }

      if (editOfferPercentage < 1 || editOfferPercentage > 100) {
        return res.json({
          success: false,
          error: "Percentage not more than 100 and less than 0",
        });
      }

      if (editOfferPercentage !== Math.floor(editOfferPercentage)) {
        return res.json({
          success: false,
          error: "Percentage must be a whole number.",
        });
      }

      if (!editOfferStartDate) {
        return res.json({ success: false, error: "offerStartDate is empty" });
      }
      if (editOfferStartDate < currentDate) {
        return res.json({
          success: false,
          error: "Start date cannot be in the past.",
        });
      }

      if (!editOfferEndDate) {
        return res.json({ success: false, error: "offerEndDate is empty" });
      }

      if (editOfferEndDate <= editOfferStartDate) {
        return res.json({
          success: false,
          error: "End date must be after the start date",
        });
      }

      await Offer.findByIdAndUpdate(editOfferId, {
        offerName: editOfferName,
        offerPercentage: editOfferPercentage,
        offerStartDate: new Date(editOfferStartDate),
        offerEndDate: new Date(editOfferEndDate),
      });

      res.json({ success: true, message: "offer successfully edited" });
    } else {
      res.redirect("/admin/login");
    }
  } catch (error) {
    console.error("Error occurred while adding new offer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateProductOffer = async (req, res) => {
  try {
    const { productId, offerId, variantId } = req.body;
    const product = await Product.findOne({
      _id: productId,
      "variants._id": variantId,
    });

    const offer = await Offer.findById(offerId);

    const variant = product.variants.find(
      (item) => item._id.toString() === variantId
    );

    if (!product) {
      return res.json({ success: false, error: "product not found" });
    }
    if (!offer) {
      return res.json({ success: false, error: "offer not found" });
    }

    if (!variant) {
      return res.json({ success: false, error: "variant not found" });
    }

    const discountPrice = Math.floor(
      variant.price - (variant.price * offer.offerPercentage) / 100
    );

    variant.discount_price = discountPrice;
    variant.offer = offerId;

    await product.save();
    res.json({ success: true, messgae: "product offer successfully updated" });
  } catch (error) {
    console.log("Error occurred while updating offer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const updateCategoryOffer = async (req, res) => {
  try {
    const { categoryId, offerId } = req.body;
    const category = await Category.findOne({ _id: categoryId });
    const offer = await Offer.findById(offerId);
    if (!category) {
      return res.json({ success: false, error: "category not found" });
    }
    if (!offer) {
      return res.json({ success: false, error: "offer not found" });
    }
    const product = await Product.find({ category_id: categoryId }).populate(
      "variants.offer"
    );

    if (product.length === 0) {
      return res.json({ success: false, error: "product not found" });
    }
    for (let products of product) {
      let productChanged = false;
      for (let variant of products.variants) {
        let bestOffer;
        if (offer && !offer.isDelete) {
          bestOffer = {
            percentage: offer.offerPercentage,
            type: "category",
          };
        }

        //checking product offer which is already applied

        if (variant.offer) {
          const productOffer = variant.offer;
          if (
            !productOffer.isDelete &&
            productOffer.offerPercentage >
              (bestOffer ? bestOffer.percentage : 0)
          ) {
            bestOffer = {
              percentage: productOffer.offerPercentage,
              type: "product",
            };
          }
        }

        if (bestOffer) {
          const discountPrice = Math.floor(
            variant.price - (variant.price * bestOffer.percentage) / 100
          );
          if (
            variant.discount_price !== discountPrice ||
            variant.offer !==
              (bestOffer.type === "category" ? offer._id : variant.offer)
          ) {
            variant.discount_price = discountPrice;
            variant.offer =
              bestOffer.type === "category" ? offer._id : variant.offer;

            productChanged = true;
          }
        } else {
          variant.offer = null;
          variant.discount_price = 0;
        }
      }
      if (productChanged) {
        await products.save();
      }
    }
    category.offer = offerId;
    await category.save();
    res.json({ success: true, messgae: "category offer successfully updated" });
  } catch (error) {
    console.log("Error occurred while updating offer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const removeProductOffer = async (req,res)=>{

    try {
        if (req.session.isAdmin) {
          const {productId,variantId} = req.body;
         
          const product = await Product.findById(productId)
          const variant = product.variants.find(x=>x._id.toString()===variantId)

          
          if (!product) {
            return res.json({ success: false, error: "This product not found" });
          }
          if (!variant) {
            return res.json({ success: false, error: "This variant not found" });
          }

          await Product.updateMany(
            { "variants._id": variantId }, 
            {
              $set: {
                "variants.$[].offer": null, 
                "variants.$[].discount_price": null, 
              },
            }
          );
          
    
          res.json({ success: true, message: "offer successfully deleted from the product" });
        } else {
          res.redirect("/admin/login");
        }
      } catch (error) {
        console.log("error while deleting the offer", error);
        return res.status(500).json({ success: false, error: "server error" });
      }
}

  
  const removeCategoryOffer =async (req,res)=>{
    const {categoryId,offerId}=req.body
    const category = await Category.findOne({ _id: categoryId });
    const offer = await Offer.findById(offerId)
    if (!category) {
      return res.json({ success: false, error: "Category not found" });
    }
    if (!offer) {
      return res.json({ success: false, error: "offer not found" });
    }
    category.offer = null;
    const products = await Product.find({ category_id: categoryId });

    for (let product of products) {
      for (let variant of product.variants) {
        
        variant.offer = null; 
        variant.discount_price = 0; 
      }
      await product.save(); 
    }

    await category.save(); 
    return res.json({ success: true, message: "Category offer successfully removed" });
  
  }


module.exports = {
  offers,
  addOffers,
  deleteOffer,
  restoreOffer,
  editOffers,
  updateProductOffer,
  updateCategoryOffer,
  removeProductOffer,
  removeCategoryOffer,
};
