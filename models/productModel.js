// create a product model and export it as a mongoose model
// Language: javascript
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    img: {
      type: String,
      required: true,
    },
    size: {
      type: String,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    stock: {
      type: Number,
      required: true,
    },
    oldPrice: {
      type: Number,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    popular: {
      type: Boolean,
      default: false,
    },
    discount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

productSchema.methods.calculateDiscountedPrice = function () {
  if (this.discount && this.discount.expiresAt >= new Date()) {
    const discountPrice = (this.price * (100 - this.discount.percentage)) / 100;
    return discountPrice;
  }
  return this.price;
};
const Product = mongoose.model("Product", productSchema);
module.exports = Product;
