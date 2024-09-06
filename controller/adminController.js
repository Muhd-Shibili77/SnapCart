const bcrypt = require("bcrypt");
const User = require("../model/userdb");
const Category = require('../model/categoryDB');
const Brand = require('../model/brandDB')



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

const admin_products = (req, res) => {
  if (req.session.isAdmin) {
    res.render("admin/admin-products");
  } else {
    res.redirect("/admin/login");
  }
};

const add_products = (req, res) => {
  if (req.session.isAdmin) {
    res.render("admin/admin-add_product");
  } else {
    res.redirect("/admin/login");
  }
};

const admin_category=async(req,res)=>{
  if(req.session.isAdmin){
    const cat = await Category.find();
    res.render('admin/admin-catogries',{cat})
  }else{
    res.redirect('/admin/login')
  }
}

const add_category= async(req,res)=>{
  try{
    const categoryName = req.body.categoryName;
    const existCat = await Category.findOne({category_name:categoryName})
    const cat = await Category.find();
    
    if(existCat){
     return  res.render('admin/admin-catogries',{existCat:'This category is already exist',cat})
    }
    const newCategory = new Category({
      category_name:categoryName,
    });
  
    await newCategory.save()
    console.log("category added successfully")
    res.redirect('/admin/category')
  }catch(error){
    console.log("something went wrong while adding new category");
    res.status(500).json({ err: "something went wrong while adding new category" });
  }

}

const delete_category=async(req,res)=>{
  if (req.session.isAdmin) {
    try {
      
      const { catId } = req.body;
      await Category.findByIdAndUpdate(catId, { isDeleted: true });
      console.log("category deleted successfully");
      res.status(200).json({ message: "category deleted successfully" });
    } catch (err) {
      console.log("something went wrong while deleting the category");
      res.status(500).json({ err: "something went wrong while deleting the category"});
    }
  } else {
    res.redirect("/admin/login");
  }
}

const restore_category=async(req,res)=>{
  if (req.session.isAdmin) {
    try {
      
      const { catId } = req.body;
      await Category.findByIdAndUpdate(catId, { isDeleted: false });
      
      res.status(200).json({ message: "category restored successfully" });
    } catch (err) {
      
      res.status(500).json({ err: "something went wrong while restoring the category"});
    }
  } else {
    res.redirect("/admin/login");
  }
}

const edit_category=async(req,res)=>{
  if(req.session.isAdmin){
    try{
      const { categoryId , categoryName } = req.body;
      const catExit = await Category.findOne({category_name:categoryName})
      if(catExit){
        return res.status(400).json({error:'Category already exists'})
      }
      await Category.findByIdAndUpdate(categoryId, { category_name: categoryName });
      res.status(200).json({ message: "category updated successfully" });
    }catch(error){
      res.status(500).json({ err: "something went wrong while updating the category"});
    }
  }else{
    res.redirect("/admin/login");
  }
}

const admin_brand=async(req,res)=>{
  if(req.session.isAdmin){
    const brand = await Brand.find();
    res.render('admin/admin-brand',{brand})
  }else{
    res.redirect('/admin/login')
  }
}




const add_brand=async(req,res)=>{
  try{

  const brandName = req.body.brandName;
    const existbrand = await Brand.findOne({brand_name:brandName})
    const brand = await Brand.find();
    
    if(existbrand){
     return  res.render('admin/admin-brand',{existbrand:'This category is already exist',brand})
    }
    const newbrand = new Brand({
      brand_name:brandName,
    });
  
    await newbrand.save()
    console.log("brand added successfully")
    res.redirect('/admin/brand')
  }catch(error){
    console.log("something went wrong while adding new brand");
    res.status(500).json({ err: "something went wrong while adding new brand" });
  }
}






const delete_brand=async(req,res)=>{
  if (req.session.isAdmin) {
    try {
      
      const { brandId } = req.body;
      await Brand.findByIdAndUpdate(brandId, { isDeleted: true });
      res.status(200).json({ message: "brand deleted successfully" });
    } catch (err) {
      console.log("something went wrong while deleting the brand");
      res.status(500).json({ err: "something went wrong while deleting the brand"});
    }
  } else {
    res.redirect("/admin/login");
  }
}



const restore_brand=async (req,res)=>{
  if (req.session.isAdmin) {
    try {
      
      const { brandId } = req.body;
      await Brand.findByIdAndUpdate(brandId, { isDeleted: false });
      
      res.status(200).json({ message: "brand restored successfully" });
    } catch (err) {
      
      res.status(500).json({ err: "something went wrong while restoring the brand"});
    }
  } else {
    res.redirect("/admin/login");
  }
}




const edit_brand=async(req,res)=>{
  if(req.session.isAdmin){
    try{
      console.log("333333");
      
      const { brandId , brandName } = req.body;
      console.log("77")
      console.log(req.body);
      
      const brandExit = await Brand.findOne({brand_name:brandName})
      console.log("999");
      
      console.log(brandId);
      console.log(brandName);
      
      if(brandExit){
        return res.status(400).json({error:'brand already exists'})
      }
      await Brand.findByIdAndUpdate(brandId, { brand_name: brandName });
      res.status(200).json({ message: "brand updated successfully" });
    }catch(err){
      res.status(500).json({ err: "something went wrong while updating the brand"});
    }
  }else{
    res.redirect("/admin/login");
  }
}

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
};
