const User = require("../model/userdb");
const Category = require("../model/categoryDB");
const Brand = require("../model/brandDB");
const Product = require("../model/productDB");

const admin_products = async (req, res) => {
  if (req.session.isAdmin) {
    const page = parseInt(req.query.page) || 1 
    const limit = 10
    const skip = (page - 1) * limit;

    const totalProducts = await Product.countDocuments();
    const totalPage = Math.ceil(totalProducts/limit)


    const product = await Product.find()
      .populate("category_id")
      .populate("brand_id")
      .skip(skip)
      .limit(limit);
      

    res.render("admin/adminProducts", { product,totalPage,currentPage:page });
  } else {
    res.redirect("/admin/login");
  }
};

const add_products = async (req, res) => {
  if (req.session.isAdmin) {
    const category = await Category.find();
    const brand = await Brand.find();
    res.render("admin/adminAddProduct", { category, brand });
  } else {
    res.redirect("/admin/login");
  }
};

const post_add_products = async (req, res) => {
  try {
    if (req.session.isAdmin) {
      const {
        productName,
        productHighlights,
        productCategory,
        productBrand,
        productDescription,
        variant_count,
      } = req.body;
      const images = req.files;

      const existProduct = await Product.findOne({ product_name: productName });

      if (existProduct) {
        return res.render("admin/adminAddProduct", {
          exist: "Product already exists",
        });
      }

      const varientDetials = [];

      for (let i = 0; i < variant_count; i++) {
        console.log("Variant", i);
        
        
        const priceArray = req.body.productPrice
        const colorArray = req.body.productColor
        const sizeArray = req.body.productSize 
        const stockArray = req.body.productStock 

        const price = priceArray[i];
        const color = colorArray[i];
        const size = sizeArray[i];
        const stock = stockArray[i];
       

        

          const varientImages = [];

          if (images) {
            images.forEach((image) => {
              if (image.fieldname.startsWith(`productImage${i + 1}`)) {
                varientImages.push(image.path); // Ensure this is the correct property
              }
            });
          }

          varientDetials.push({
            price: price,
            size: size,
            stock: stock,
            color: color,
            images: varientImages,
          });
        
      }

      const product = new Product({
        product_name: productName,
        product_highlights: productHighlights,
        category_id: productCategory,
        brand_id: productBrand,
        product_description: productDescription,
        variants: varientDetials,
      });

      await product.save();
      console.log("Product saved successfully");
      res.redirect("/admin/products");
    } else {
      res.redirect("/admin/login");
    }
  } catch (error) {
    console.error("Something went wrong while adding the product:", error);
    res
      .status(500)
      .json({ error: "Something went wrong while adding product" });
  }
};

const delete_products = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { proId } = req.body;
      await Product.findByIdAndUpdate(proId, { isDelete: true });
      console.log("product deleted successfully");
      res.status(200).json({ message: "product deleted successfully" });
    } catch (err) {
      console.log("something went wrong while deleting the product");
      res
        .status(500)
        .json({ err: "something went wrong while deleting the product" });
    }
  } else {
    res.redirect("/admin/login");
  }
};
const restore_products = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { proId } = req.body;
      const product = await Product.findById(proId)
        .populate("category_id")
        .populate("brand_id");

      const category = await Category.findById(product.category_id._id);
      const brand = await Brand.findById(product.brand_id._id);

      if (category.isDeleted || brand.isDeleted) {
        return res
          .status(400)
          .json({
            message: "The brand or category of this product is deleted",
          });
      } else {
        await Product.findByIdAndUpdate(proId, { isDelete: false });
      }

      res.status(200).json({ message: "product restored successfully" });
    } catch (err) {
      res
        .status(500)
        .json({ err: "something went wrong while restoring the product" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const get_edit_products = async (req, res) => {
  if (req.session.isAdmin) {
    const category = await Category.find();
    const brand = await Brand.find();
    const id = req.query.id;
    const product = await Product.findOne({ _id: id })
      .populate("category_id")
      .populate("brand_id");

    res.render("admin/adminEditProduct", { product, category, brand });
  } else {
    res.redirect("/admin/login");
  }
};
const post_edit_products = async (req, res) => {
  try {
    if (req.session.isAdmin) {
      const {
        productId,
        productName,
        productHighlights,
        productCategory,
        productBrand,
        productDescription,
        variant_count,
      } = req.body;

      const images = req.files;
      

      // Find the product by ID
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const variantDetails = [];

      for (let i = 0; i < variant_count; i++) {
        const priceArray = req.body.productPrice;
        const colorArray = req.body.productColor;
        const sizeArray = req.body.productSize;
        const stockArray = req.body.productStock;

        const price = priceArray[i];
        const color = colorArray[i];
        const size = sizeArray[i];
        const stock = stockArray[i];

        // Get existing variant details
        let existingVariant = product.variants[i] || {};

        // Keep the existing variant's _id
        let variantImages = existingVariant.images ? [...existingVariant.images] : [];

        // Handle new image uploads for this variant
        if (images && images.length > 0) {
          images.forEach((image) => {
            if (image.fieldname.startsWith(`productImage${i + 1}`)) {
              const imageIndex = parseInt(image.fieldname.replace(`productImage${i + 1}-`, ''), 10) - 1;
              if (variantImages[imageIndex]) {
                variantImages[imageIndex] = image.path;  // Update existing image
              } else {
                variantImages.push(image.path);  // Add new image
              }
            }
          });
        }

        // Push updated variant details while keeping the _id intact
        variantDetails.push({
          _id: existingVariant._id,  // Keep the existing _id
          price: price,
          size: size,
          stock: stock,
          color: color,
          images: variantImages,
          offer: existingVariant.offer || null, 
          discount_price: existingVariant.discount_price || null, 
        });
      }

      // Update product details
      product.product_name = productName;
      product.product_highlights = productHighlights;
      product.category_id = productCategory;
      product.brand_id = productBrand;
      product.product_description = productDescription;
      product.variants = variantDetails;  // Keep updated variants

      // Save the updated product
      await product.save();

      console.log("Product updated successfully");
      res.redirect("/admin/products");
    } else {
      res.redirect("/admin/login");
    }
  } catch (error) {
    console.error("Something went wrong while updating the product:", error);
    res.status(500).json({ error: "Something went wrong while updating the product" });
  }
};


const product_detail=async(req,res)=>{
    if(req.session.isAdmin){
        const id = req.query.id
        const product = await Product.findById(id).populate('category_id').populate('brand_id')
        
        res.render('admin/adminProductDetails',{product})
    }else{
        res.redirect('/admin/login')
    }
}


module.exports = {
    admin_products,
    add_products,
    post_add_products,
    delete_products,
    restore_products,
    get_edit_products,
    post_edit_products,
    product_detail,
};
