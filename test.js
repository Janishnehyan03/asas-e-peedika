const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
});
const http = require("http");
const app=require('express')()
const { Server } = require("socket.io");
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });
const Item = mongoose.model("Item", itemSchema);

// routes/items.js
const express = require("express");
const router = express.Router();

// Get all items
router.get("/", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create an item
router.post("/", async (req, res) => {
  const item = new Item({
    name: req.body.name,
    description: req.body.description,
    price: req.body.price,
  });

  try {
    const newItem = await item.save();
    // Emit the new item data to the socket
    // You can modify this part to emit specific data as needed
    io.emit("newItem", newItem);
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update an item
router.put("/:id", async (req, res) => {
  try {
    const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    // Emit the updated item data to the socket
    // You can modify this part to emit specific data as needed
    io.emit("updatedItem", updatedItem);
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete an item
router.delete("/:id", async (req, res) => {
  try {
    const deletedItem = await Item.findByIdAndRemove(req.params.id);
    // Emit the deleted item data to the socket
    // You can modify this part to emit specific data as needed
    io.emit("deletedItem", deletedItem);
    res.json(deletedItem);
  } catch (err) {   
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
