const bcrypt = require("bcrypt");
const User = require("../model/userdb");
const Category = require("../model/categoryDB");
const Brand = require("../model/brandDB");
const Product = require('../model/productDB')

const admin_login = (req, res) => {
  if (req.session.isAdmin) {
    res.redirect("/admin/dashboard");
  } else {
    res.render("admin/admin-login");
  }
};

const post_admin_login = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const adminexist = await User.findOne({ email: email });

    if (adminexist) {
      if (adminexist.isAdmin) {
        const passwordmatch = await bcrypt.compare(
          password,
          adminexist.password
        );
        if (passwordmatch) {
          req.session.isAdmin = true;
          res.redirect("/admin/dashboard");
        } else {
          res.render("admin/admin-login", { passNo: "incorrect password" });
        }
      } else {
        res.render("admin/admin-login", { notadmin: "You are not admin" });
      }
    } else {
      res.render("admin/admin-login", { notexist: "Email not found" });
    }
  } catch (err) {
    console.log("error in login ", err);
  }
};

const admin_dashboard = (req, res) => {
  if (req.session.user) {
    res.redirect("/user/home");
  }
  if (req.session.isAdmin) {
    res.render("admin/admin-dashboard");
  } else {
    res.redirect("/admin/login");
  }
};

const admin_users = async (req, res) => {
  if (req.session.isAdmin) {
    const users = await User.find({ isAdmin: false });
    res.render("admin/admin-users", { users });
  } else {
    res.redirect("/admin/login");
  }
};

//blocking the user

const block_users = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { userId } = req.body;
      await User.findByIdAndUpdate(userId, { isBlock: true });
      console.log("user blocked successfully");
      res.status(200).json({ message: "User blocked successfully" });
    } catch (error) {
      console.log("something went wrong while blocking the user");
      res
        .status(500)
        .json({ error: "Something went wrong in blocking the user" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

//unblocking the user

const unblock_users = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { userId } = req.body;
      await User.findByIdAndUpdate(userId, { isBlock: false });
      console.log("user unblocked successfully");
      res.status(200).json({ message: "User unblocked successfully" });
    } catch (err) {
      console.log("something went wrong while unblocking the user");
      res.status(500).json({ err: "something went wrong in unblocking user" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const admin_products = async (req, res) => {
  if (req.session.isAdmin) {
    const product = await Product.find().populate('category_id').populate('brand_id')
   
    
    res.render("admin/admin-products",{product});
  } else {
    res.redirect("/admin/login");
  }
};

const add_products = async (req, res) => {
  if (req.session.isAdmin) {
    const category = await Category.find();
    const brand = await Brand.find();
    res.render("admin/admin-add_product", { category, brand });
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
        return res.render('admin/admin-add_product', { exist: 'Product already exists' });
      }

      const varientDetials = [];

      for (let i = 0; i < variant_count; i++) {
        console.log('Variant', i);

        const priceArray = req.body.productPrice || [];
        const colorArray = req.body.productColor || [];
        const sizeArray = req.body.productSize || [];
        const stockArray = req.body.productStock || [];
        
        

        const price = priceArray;
        const color = colorArray[i];
        const size = sizeArray[i];
        const stock = stockArray;
       
        

        if (price !== undefined) {
          const numericPrice = Number(price.replace(/,/g, ''));

          const varientImages = [];
          
          if (images) {
            images.forEach(image => {
              if (image.fieldname.startsWith(`productImage${i + 1}`)) {
                varientImages.push(image.path); // Ensure this is the correct property
                
              }
            });
          }

          
          varientDetials.push({
            price: numericPrice,
            size:size,
            stock:stock,
            color:color,
            images: varientImages
          });
          
        } else {
          console.error(`Price of variant ${i} is undefined`);
        }
      }
      
      const product = new Product({
        product_name: productName,
        product_highlights:productHighlights,
        category_id:productCategory,
        brand_id:productBrand,
        product_description:productDescription,
        variants: varientDetials
      });
      
      await product.save();
      console.log('Product saved successfully');
      res.redirect("/admin/products");
    } else {
      res.redirect("/admin/login");
    }
  } catch (error) {
    console.error("Something went wrong while adding the product:", error);
    res.status(500).json({ error: "Something went wrong while adding product" });
  }
};



const delete_products =async(req,res)=>{
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

}
const restore_products =async(req,res)=>{
  if (req.session.isAdmin) {
    try {
      const { proId } = req.body;
      const product = await Product.findById(proId).populate('category_id').populate('brand_id')

      const category = await Category.findById(product.category_id._id)
      const brand = await Brand.findById(product.brand_id._id)

      if(category.isDeleted || brand.isDeleted ){
        return res.status(400).json({ message: 'The brand or category of this product is deleted' });
      }else{
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

}

const get_edit_products=async(req,res)=>{
  if(req.session.isAdmin){
    const category = await Category.find();
    const brand = await Brand.find();
    const id =req.query.id
    const product = await Product.findOne({_id:id}).populate('category_id').populate('brand_id')
    
    
    res.render('admin/admin-edit_product',{product,category,brand})
  }else{
    res.redirect('/admin/login')
  }
}


const post_edit_products = async (req, res) => {
  try {
    if (req.session.isAdmin) {
      const category = await Category.find();
    const brand = await Brand.find();
      const {
        productId, // Add productId to identify which product to update
        productName,
        productHighlights,
        productCategory,
        productBrand,
        productDescription,
        variant_count,
      } = req.body;
      console.log(req.body)
      const images = req.files;

      // Find the product by ID
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Check if the product name already exists for another product
      

      const varientDetails = [];

      for (let i = 0; i < variant_count; i++) {
        const priceArray = req.body.productPrice || [];
        const colorArray = req.body.productColor || [];
        const sizeArray = req.body.productSize || [];
        const stockArray = req.body.productStock || [];

        const price = priceArray;
        const color = colorArray[i];
        const size = sizeArray[i];
        const stock = stockArray;

        if (price !== undefined) {
          const numericPrice = Number(price.replace(/,/g, ''));

          const variantImages = [];

          if (images) {
            images.forEach(image => {
              if (image.fieldname.startsWith(`productImage${i + 1}`)) {
                variantImages.push(image.path); // Ensure this is the correct property
              }
            });
          }

          varientDetails.push({
            price: numericPrice,
            size: size,
            stock: stock,
            color: color,
            images: variantImages.length > 0 ? variantImages : product.variants[i]?.images || [] // Only update images if new ones are provided
          });
        } else {
          console.error(`Price of variant ${i} is undefined`);
        }
      }

      // Update product details
      product.product_name = productName;
      product.product_highlights = productHighlights;
      product.category_id = productCategory;
      product.brand_id = productBrand;
      product.product_description = productDescription;
      product.variants = varientDetails;

      // Save the updated product
      await product.save();

      console.log('Product updated successfully');
      res.redirect("/admin/products");
    } else {
      res.redirect("/admin/login");
    }
  } catch (error) {
    console.error("Something went wrong while updating the product:", error);
    res.status(500).json({ error: "Something went wrong while updating the product" });
  }
}







const admin_category = async (req, res) => {
  if (req.session.isAdmin) {
    const cat = await Category.find();
    res.render("admin/admin-catogries", { cat });
  } else {
    res.redirect("/admin/login");
  }
};

const add_category = async (req, res) => {
  try {
    const categoryName = req.body.categoryName;
    const existCat = await Category.findOne({ category_name: categoryName });
    const cat = await Category.find();

    if (existCat) {
      return res.render("admin/admin-catogries", {
        existCat: "This category is already exist",
        cat,
      });
    }
    const newCategory = new Category({
      category_name: categoryName,
    });

    await newCategory.save();
    console.log("category added successfully");
    res.redirect("/admin/category");
  } catch (error) {
    console.log("something went wrong while adding new category");
    res
      .status(500)
      .json({ err: "something went wrong while adding new category" });
  }
};

const delete_category = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { catId } = req.body;
      await Category.findByIdAndUpdate(catId, { isDeleted: true });

      await Product.updateMany({category_id:catId},{$set:{isDelete:true}})



      console.log("category deleted successfully");
      res.status(200).json({ message: "category and related products are deleted successfully" });
    } catch (err) {
      console.log("something went wrong while deleting the category");
      res
        .status(500)
        .json({ err: "something went wrong while deleting the category" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const restore_category = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { catId } = req.body;
      await Category.findByIdAndUpdate(catId, { isDeleted: false });

      await Product.updateMany({category_id:catId},{$set:{isDelete:false}})

      res.status(200).json({ message: "category and related products are restored successfully" });
    } catch (err) {
      res
        .status(500)
        .json({ err: "something went wrong while restoring the category" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const edit_category = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { categoryId, categoryName } = req.body;
      const catExit = await Category.findOne({ category_name: categoryName });
      if (catExit) {
        return res.status(400).json({ error: "Category already exists" });
      }
      await Category.findByIdAndUpdate(categoryId, {
        category_name: categoryName,
      });
      res.status(200).json({ message: "category updated successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ err: "something went wrong while updating the category" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const admin_brand = async (req, res) => {
  if (req.session.isAdmin) {
    const brand = await Brand.find();
    res.render("admin/admin-brand", { brand });
  } else {
    res.redirect("/admin/login");
  }
};

const add_brand = async (req, res) => {
  try {
    const brandName = req.body.brandName;
    const existbrand = await Brand.findOne({ brand_name: brandName });
    const brand = await Brand.find();

    if (existbrand) {
      return res.render("admin/admin-brand", {
        existbrand: "This category is already exist",
        brand,
      });
    }
    const newbrand = new Brand({
      brand_name: brandName,
    });

    await newbrand.save();
    console.log("brand added successfully");
    res.redirect("/admin/brand");
  } catch (error) {
    console.log("something went wrong while adding new brand");
    res
      .status(500)
      .json({ err: "something went wrong while adding new brand" });
  }
};

const delete_brand = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { brandId } = req.body;
      await Brand.findByIdAndUpdate(brandId, { isDeleted: true });
      await Product.updateMany({brand_id:brandId},{$set:{isDelete:true}})

      res.status(200).json({ message: "brand deleted successfully" });
    } catch (err) {
      console.log("something went wrong while deleting the brand");
      res
        .status(500)
        .json({ err: "something went wrong while deleting the brand" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const restore_brand = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { brandId } = req.body;
      await Brand.findByIdAndUpdate(brandId, { isDeleted: false });
      await Product.updateMany({brand_id:brandId},{$set:{isDelete:false}})
      res.status(200).json({ message: "brand restored successfully" });
    } catch (err) {
      res
        .status(500)
        .json({ err: "something went wrong while restoring the brand" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const edit_brand = async (req, res) => {
  if (req.session.isAdmin) {
    try {
     
      const { brandId, brandName } = req.body;
      console.log(req.body);

      const brandExit = await Brand.findOne({ brand_name: brandName });

      if (brandExit) {
        return res.status(400).json({ error: "brand already exists" });
      }
      await Brand.findByIdAndUpdate(brandId, { brand_name: brandName });
      res.status(200).json({ message: "brand updated successfully" });
    } catch (err) {
      res
        .status(500)
        .json({ err: "something went wrong while updating the brand" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const admin_logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/admin/login");
    }
  });
};
module.exports = {
  admin_login,
  post_admin_login,
  admin_dashboard,
  admin_users,
  admin_logout,
  block_users,
  unblock_users,
  admin_products,
  add_products,
  admin_category,
  add_category,
  restore_category,
  delete_category,
  edit_category,
  admin_brand,
  add_brand,
  delete_brand,
  restore_brand,
  edit_brand,
  post_add_products,
  delete_products,
  restore_products,
  post_edit_products,
  get_edit_products,
};
