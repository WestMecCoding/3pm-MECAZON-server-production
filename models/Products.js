// ./models/Products.js

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // id: {
    //   type: Number,
    //   required: [true, "ID is required"],
    //   min: [0, "ID must not be below 0"],
    // },
    item: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    price_in_usd: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    details: {
      type: String,
      required: [true, "Description is required"],
    },
    product_img: {
      type: String,
    },
    colorArr: {
      type: Array,
    },
    // Add other fields as necessary
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = productSchema;
