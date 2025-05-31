const Brand = require("../../model/brandDB");
const Product = require("../../model/productDB");

const admin_brand = async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const searchCriteria = {  
      brand_name: { $regex: searchQuery, $options: 'i' } 
    };

    const totalBrands = await Brand.countDocuments(searchCriteria);
    const totalPage = Math.ceil(totalBrands / limit);

    const brands = await Brand.find(searchCriteria)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin/adminBrands", { 
      brand: brands, 
      totalPage, 
      currentPage: page 
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).render("error", { message: "Failed to load brands" });
  }
};

const add_brand = async (req, res) => {
  try {
    const { brandName } = req.body;

    const existBrand = await Brand.findOne({ 
      brand_name: { $regex: new RegExp(`^${brandName}$`, 'i') } 
    });

    if (existBrand) {
      return res.json({
        success: false,
        error: "This brand already exists",
      });
    }

    const newBrand = new Brand({
      brand_name: brandName,
    });

    await newBrand.save();
    res.json({ success: true, message: "Brand added successfully" });
  } catch (error) {
    console.error("Error adding brand:", error);
    res.json({
      success: false,
      error: "Something went wrong while adding new brand",
    });
  }
};

const edit_brand = async (req, res) => {
  try {
    const { brandId, brandName } = req.body;

    const existingBrand = await Brand.findOne({ 
      brand_name: { $regex: new RegExp(`^${brandName}$`, 'i') },
      _id: { $ne: brandId }
    });

    if (existingBrand) {
      return res.status(400).json({ error: "Brand already exists" });
    }

    await Brand.findByIdAndUpdate(brandId, { brand_name: brandName });
    res.status(200).json({ message: "Brand updated successfully" });
  } catch (error) {
    console.error("Error updating brand:", error);
    res.status(500).json({ 
      error: "Something went wrong while updating the brand" 
    });
  }
};

const delete_brand = async (req, res) => {
  try {
    const { brandId } = req.body;
    
    await Brand.findByIdAndUpdate(brandId, { isDeleted: true });
    await Product.updateMany(
      { brand_id: brandId },
      { $set: { isDelete: true } }
    );

    res.status(200).json({ message: "Brand deleted successfully" });
  } catch (error) {
    console.error("Error deleting brand:", error);
    res.status(500).json({ 
      error: "Something went wrong while deleting the brand" 
    });
  }
};

const restore_brand = async (req, res) => {
  try {
    const { brandId } = req.body;
    
    await Brand.findByIdAndUpdate(brandId, { isDeleted: false });
    await Product.updateMany(
      { brand_id: brandId },
      { $set: { isDelete: false } }
    );
    
    res.status(200).json({ message: "Brand restored successfully" });
  } catch (error) {
    console.error("Error restoring brand:", error);
    res.status(500).json({ 
      error: "Something went wrong while restoring the brand" 
    });
  }
};

module.exports = {
  admin_brand,
  add_brand,
  edit_brand,
  delete_brand,
  restore_brand
};