const User = require("../../model/userdb");

const admin_users = async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    const searchCriteria = {
      isAdmin: false,
      name: { $regex: `^${searchQuery}`, $options: 'i' } 
    };

    const totalUsers = await User.countDocuments(searchCriteria);
    const totalPage = Math.ceil(totalUsers / limit);
   
    const users = await User.find(searchCriteria)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin/adminUsers", { users, totalPage, currentPage: page });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).render("error", { message: "Failed to load users" });
  }
};

const block_users = async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, { isBlock: true });
    res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ error: "Something went wrong in blocking the user" });
  }
};

const unblock_users = async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, { isBlock: false });
    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ error: "Something went wrong in unblocking user" });
  }
};

module.exports = {
  admin_users,
  block_users,
  unblock_users
};