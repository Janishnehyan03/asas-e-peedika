const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const productRoutes = require("./routes/product.js");
const userRoutes = require("./routes/user.js");
const orderRoutes = require("./routes/order.js");
const cartRoutes = require("./routes/cart.js");
const authRoutes = require("./routes/auth.js");
const adminRoutes = require("./routes/admin.js");
const reviewRoutes = require("./routes/review.js");
const categoryRoutes = require("./routes/category.js");
const dotenv = require("dotenv");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

app.use(cors({ origin: true, credentials: true }));

dotenv.config();
app.use(morgan("dev"));
app.use(cookieParser());
// database connection
mongoose.connect(process.env.MONGO_URI, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("connected to database");
  }
});
// middlewares

app.use(bodyParser.json());
// console production or development
app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello" });
});

// routes
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/carts", cartRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/categories", categoryRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
