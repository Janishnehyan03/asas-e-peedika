const Product = require("../models/productModel");
const User = require("../models/userModel");
const ObjectId = require("mongoose").Types.ObjectId;
const Category = require("../models/categoryModel");

exports.getAllProducts = async (req, res) => {
  try {
    const { query } = req;
    const filter = {};

    if (query.category && query.category !== "All") {
      filter.category = query.category;
    }

    if (query.popular) {
      filter.popular = true;
    }

    // Add other query parameters as needed

    let products = await Product.find(filter).sort({ createdAt: -1 });

    // If your products have a reference to category ID, associate them with categories
    products = await Promise.all(
      products.map(async (product) => {
        const category = await Category.findById(product.category);
        return {
          ...product.toObject(),
          category,
        };
      })
    );

    // Ensure the price field is parsed as a number for sorting
    products = products.map((product) => ({
      ...product,
      price: parseFloat(product.price),
    }));

    // Sort by price if lowtoHigh or hightoLow query parameters are provided
    if (query.lowtoHigh) {
      products = products.sort((a, b) => a.price - b.price);
    } else if (query.hightoLow) {
      products = products.sort((a, b) => b.price - a.price);
    }

    // Limit the number of results if query.limit is provided
    if (query.limit) {
      products = products.slice(0, parseInt(query.limit, 10));
    }
    if (query.discount) {
      products = products.filter((product) => product.discount > 0);
    }
    
    res.status(200).json({
      message: "Products fetched successfully",
      results: products.length,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error,
    });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }
    res.status(200).json({
      message: "Product fetched successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({
      error,
    });
  }
};

exports.createNewProduct = async (req, res) => {
  const { title, description, price, category, img, stock } = req.body;
  if (!title || !description || !price || !category || !img || !stock) {
    return res.status(400).json({
      message: "Please enter all fields",
    });
  }
  try {
    let product = await Product.create(req.body);
    res.status(200).json({
      message: "Product created successfully",
      product,
      status: "success",
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error,
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({
      error,
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    let product = await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: "Product deleted successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({
      error,
    });
  }
};

exports.searchProduct = async (req, res) => {
  try {
    let userData = JSON.parse(req.body.user);
    // add search to searchHistory of user
    if (userData) {
      const user = await User.findOne({ email: userData.email });

      user.searchHistory.push({
        search: req.body.search,
      });
      await user.save();
    }
    let products = await Product.find({
      title: { $regex: req.query.search, $options: "i" },
      deleted: false,
    });
    res.status(200).json({
      message: "Products fetched successfully",
      results: products.length,
      products,
      success: true,
      search: req.query.search,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error,
    });
  }
};
