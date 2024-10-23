const User = require("../model/userdb");
const Category = require("../model/categoryDB");
const Brand = require("../model/brandDB");
const Product = require("../model/productDB");

const admin_products = async (req, res) => {
  
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1 
    const limit = 10
    const skip = (page - 1) * limit;

    const searchCriteria = {  
      product_name: { $regex:searchQuery, $options: 'i' } 
     };

    const totalProducts = await Product.find(searchCriteria).countDocuments();
    const totalPage = Math.ceil(totalProducts/limit)


    const product = await Product.find(searchCriteria)
      .sort({createdAt:1})
      .populate("category_id")
      .populate("brand_id")
      .skip(skip)
      .limit(limit);
      

    res.render("admin/adminProducts", { product,totalPage,currentPage:page });
 
};

const add_products = async (req, res) => {
  
    const category = await Category.find();
    const brand = await Brand.find();
    res.render("admin/adminAddProduct", { category, brand });
 
};

const post_add_products = async (req, res) => {
  try {
    
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
    
  } catch (error) {
    console.error("Something went wrong while adding the product:", error);
    res
      .status(500)
      .json({ error: "Something went wrong while adding product" });
  }
};

const delete_products = async (req, res) => {
  
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
  
};
const restore_products = async (req, res) => {
  
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
  
};

const get_edit_products = async (req, res) => {
 
    const category = await Category.find();
    const brand = await Brand.find();
    const id = req.query.id;
    const product = await Product.findOne({ _id: id })
      .populate("category_id")
      .populate("brand_id");

    res.render("admin/adminEditProduct", { product, category, brand });
 
};
const post_edit_products = async (req, res) => {
  try {
    const {
      productId,
      productName,
      productHighlights,
      productCategory,
      productBrand,
      productDescription,
      variant_count,
    } = req.body;

    if(!productName){
      req.flash('errorMessage', `product name is empty`);
      return res.redirect(`/admin/edit_product?id=${productId}`); // Redirect with flash message
    }
    if(!productHighlights){
      req.flash('errorMessage', `productHighlights is empty`);
      return res.redirect(`/admin/edit_product?id=${productId}`); // Redirect with flash message
    }
    if(!productCategory){
      req.flash('errorMessage', `productCategory is empty`);
      return res.redirect(`/admin/edit_product?id=${productId}`); // Redirect with flash message
    }
    if(!productBrand){
      req.flash('errorMessage', `productBrand is empty`);
      return res.redirect(`/admin/edit_product?id=${productId}`); // Redirect with flash message
    }
    if(!productDescription){
      req.flash('errorMessage', `productDescription is empty`);
      return res.redirect(`/admin/edit_product?id=${productId}`); // Redirect with flash message
    }


    // Fetch product by its ID
    const product = await Product.findById(productId);
    if (!product) {
      req.flash('errorMessage', "Product not found");
      return res.redirect("/admin/products");
    }

    const images = req.files; // Uploaded images
    const variantDetails = [];

    for (let i = 0; i < variant_count; i++) {
      const priceArray = req.body.productPrice;
      const colorArray = req.body.productColor;
      const sizeArray = req.body.productSize;
      const stockArray = req.body.productStock;

      const price = parseInt(priceArray[i]);
      const color = colorArray[i];
      const size = sizeArray[i];
      const stock = parseInt(stockArray[i]); 


      if(!price){
        req.flash('errorMessage', `Variant ${i + 1}: price is empty`);
        return res.redirect(`/admin/edit_product?id=${productId}`); 
      }
      if(!stock){
        req.flash('errorMessage', `Variant ${i + 1}: stock is empty`);
        return res.redirect(`/admin/edit_product?id=${productId}`); 
      }
      if(!color){
        req.flash('errorMessage', `Variant ${i + 1}: color is empty`);
        return res.redirect(`/admin/edit_product?id=${productId}`); 
      }
      if(!size){
        req.flash('errorMessage', `Variant ${i + 1}: size is empty`);
        return res.redirect(`/admin/edit_product?id=${productId}`); 
      }


      
      if (stock < 0) {
        req.flash('errorMessage', `Variant ${i + 1}: Stock cannot be negative.`);
        return res.redirect(`/admin/edit_product?id=${productId}`); 
      }
      
   
      if (price < 0) {
        req.flash('errorMessage', `Variant ${i + 1}: Price cannot be negative.`);
        return res.redirect(`/admin/edit_product?id=${productId}`); 
      }

      let existingVariant = product.variants[i] || {}; 
      let variantImages = existingVariant.images ? [...existingVariant.images] : [];

      
      if (images && images.length > 0) {
        images.forEach((image) => {
          if (image.fieldname.startsWith(`productImage${i + 1}`)) {
            const imageIndex = parseInt(image.fieldname.replace(`productImage${i + 1}-`, ''), 10) - 1;
            if (variantImages[imageIndex]) {
              variantImages[imageIndex] = image.path; 
            } else {
              variantImages.push(image.path); 
            }
          }
        });
      }

     
      variantDetails.push({
        _id: existingVariant._id,
        price: price,
        size: size,
        stock: stock,
        color: color,
        images: variantImages,
        offer: existingVariant.offer || null,
        discount_price: existingVariant.discount_price || null,
      });
    }

    
    product.product_name = productName;
    product.product_highlights = productHighlights;
    product.category_id = productCategory;
    product.brand_id = productBrand;
    product.product_description = productDescription;
    product.variants = variantDetails; 

    await product.save(); 

    
    req.flash('successMessage', 'Product updated successfully');
    res.redirect("/admin/products");

  } catch (error) {

    console.error("Error updating product:", error);
    req.flash('errorMessage', 'Internal server error');
    res.redirect(`/admin/edit_product?id=${req.body.productId}`);
  }
};




const product_detail=async(req,res)=>{
    
        const id = req.query.id
        const product = await Product.findById(id).populate('category_id').populate('brand_id')
        
        res.render('admin/adminProductDetails',{product})
   
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
