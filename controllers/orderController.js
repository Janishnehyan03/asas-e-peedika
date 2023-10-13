const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const dotenv = require("dotenv");

dotenv.config();



exports.getAllOrders = async (req, res) => {
  try {
    let orders = await Order.find({ $ne: { status: "pending" } })
      .sort({
        createdAt: -1,
      })
      .populate("userId", "username email")
      .populate("products.productId");
    res.status(200).json({
      message: "orders fetched successfully",
      results: orders.length,
      orders,
    });
  } catch (error) {
    res.status(400).json({
      error,
    });
  }
};

exports.createOrder = async (req, res) => {
  try {
    //  create order from cart
    console.log(req.body);
    if (req.body.payMethod === "cod") {
      let order = await Order.create({
        ...req.body,
        status: req.body.payMethod === "cod" ? "cod" : "pending",
        userId: req.user._id,
      });
      //  update cart
      await Cart.deleteOne({ userId: req.user._id });
      // substract product stock after order is placed successfully
      const products = await Product.find({
        _id: { $in: order.products },
      });
      products.forEach(async (product) => {
        await Product.findByIdAndUpdate(product._id, {
          stock:
            product.stock -
            order.products.find(
              (p) => p.productId.toString() === product._id.toString()
            ).quantity,
        });
      });
      res.status(200).json({
        message: "Order created successfully",
        order,
        success: true,
      });
    } else {
      let order = await Order.create({
        ...req.body,
        status: "pending",
        userId: req.user._id,
        razorpayOrderId: req.body.response.razorpay_order_id,
        razorpayPaymentId: req.body.response.razorpay_payment_id,
        razorpaySignature: req.body.response.razorpay_signature,
      });
      res.status(200).json({
        message: "Order created successfully",
        order,
        success: true,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: "Order creation failed",
      error,
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    let body = req.body.razorpayOrderId + "|" + req.body.razorpayPaymentId;
    let key = process.env.RAZORPAY_SECRET;
    var crypto = require("crypto");
    var expectedSignature = crypto
      .createHmac("sha256", key)
      .update(body.toString())
      .digest("hex");
    var response = { signatureIsValid: "false" };
    if (expectedSignature === req.body.razorpaySignature) {
      response = { signatureIsValid: "true" };
      let order = await Order.findOne({
        razorpayOrderId: req.body.razorpayOrderId,
      });
      if (order.status === "pending") {
        order.status = "paid";
        order.save();
      }
      await Cart.deleteOne({ userId: req.user._id });
      // decrease product stock after order is placed successfully
      const products = await Product.find({
        _id: { $in: order.products },
      });
      products.forEach(async (product) => {
        await Product.findByIdAndUpdate(product._id, {
          stock:
            product.stock -
            order.products.find(
              (p) => p.productId.toString() === product._id.toString()
            ).quantity,
        });
      });
      res.status(200).json({
        message: "Payment verified successfully",
        response,
        success: true,
      });
    } else {
      res.status(400).json({
        message: "Payment verification failed",
        response,
        success: false,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error,
    });
  }
};
// get my orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.aggregate([
      { $match: { userId: req.user._id } },
      { $match: { status: { $ne: "pending" } } },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "product",
        },
      },
    ]).sort({ createdAt: -1 });
    res.status(200).json({
      message: "Orders fetched successfully",
      results: orders.length,
      orders,
    });
  } catch (error) {
    res.status(400).json({
      error,
    });
  }
};

