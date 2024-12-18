// ./models/Products.js

const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
    },
    name: {
      first_name: {
        type: String,
        // required: [true, 'First name is required'],
        trim: true,
      },
      last_name: {
        type: String,
        // required: [true, 'Last name is required'],
        trim: true,
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      trim: true,
    },
    department: {
      type: String,
    },
    employment_type: {
      type: String,
      enum: ["part-time", "full-time"],
    },
    date_hired: {
      type: Date,
    },
    isAdmin: {
      type: Boolean,
      required: [true, "Adminstrator info is required"],
    },
    contact_info: {
      email: {
        type: String,
        required: [true, "Email is required"],
        lowercase: true,
        trim: true,
      },
      phone_number: {
        type: String,
        required: [true, "Phone number is required"],
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    orders: {
      type: Array,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = employeeSchema;
