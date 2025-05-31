const Category = require("../../model/categoryDB");
const Product = require("../../model/productDB");

const admin_category = async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    
    const searchCriteria = {  
      category_name: { $regex: searchQuery, $options: 'i' } 
    };

    const totalCategories = await Category.countDocuments(searchCriteria);
    const totalPage = Math.ceil(totalCategories / limit);

    const categories = await Category.find(searchCriteria)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin/adminCategries", { 
      cat: categories, 
      totalPage, 
      currentPage: page 
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).render("error", { message: "Failed to load categories" });
  }
};

const add_category = async (req, res) => {
  try {
    const { categoryName } = req.body;
    
    const existCat = await Category.findOne({ 
      category_name: { $regex: new RegExp(`^${categoryName}$`, 'i') } 
    });

    if (existCat) {
      return res.json({
        success: false,
        error: "This category already exists",
      });
    }

    const newCategory = new Category({
      category_name: categoryName,
    });

    await newCategory.save();
    res.json({ success: true, message: "Category added successfully" });
  } catch (error) {
    console.error("Error adding category:", error);
    res.json({
      success: false,
      error: "Something went wrong while adding new category",
    });
  }
};

const edit_category = async (req, res) => {
  try {
    const { categoryId, categoryName } = req.body;
    
    const existingCategory = await Category.findOne({ 
      category_name: { $regex: new RegExp(`^${categoryName}$`, 'i') },
      _id: { $ne: categoryId }
    });
    
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }
    
    await Category.findByIdAndUpdate(categoryId, {
      category_name: categoryName,
    });
    
    res.status(200).json({ message: "Category updated successfully" });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Something went wrong while updating the category" });
  }
};

const delete_category = async (req, res) => {
  try {
    const { catId } = req.body;
    
    await Category.findByIdAndUpdate(catId, { isDeleted: true });
    await Product.updateMany(
      { category_id: catId },
      { $set: { isDelete: true } }
    );

    res.status(200).json({
      message: "Category and related products deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ 
      error: "Something went wrong while deleting the category" 
    });
  }
};

const restore_category = async (req, res) => {
  try {
    const { catId } = req.body;
    
    await Category.findByIdAndUpdate(catId, { isDeleted: false });
    await Product.updateMany(
      { category_id: catId },
      { $set: { isDelete: false } }
    );

    res.status(200).json({
      message: "Category and related products restored successfully",
    });
  } catch (error) {
    console.error("Error restoring category:", error);
    res.status(500).json({ 
      error: "Something went wrong while restoring the category" 
    });
  }
};

module.exports = {
  admin_category,
  add_category,
  edit_category,
  delete_category,
  restore_category
};