// ./models/Products.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        trim: true
    },
    name: {
        first_name: {
            type: String,
            // required: [true, 'First name is required'],
            trim: true
        },
        last_name: {
            type: String,
            // required: [true, 'Last name is required'],
            trim: true
        },
    },
    location: {
        country: {
            type: String,
            trim: true
        },
        city: {
            type: String,
            trim: true
        },
        address: {
            type: String,
            trim: true
        },
        zip_code: {
            type: Number,
            trim: true
        },
    },
    contact_info: {
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true
        },
        phone_number: {
            type: String,
            trim: true
        },
    },
    password: {
        type: String,
        required: [true, 'password is required'],
        trim: true
    },
    orders: {
        type: Array,
        trim: true
    },
    payment_type: {
        type: String,
    }

    // Add other fields as necessary, no clue what to add now. Add Payment (String)(Edit this when we find a better alternative)
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

module.exports = userSchema;