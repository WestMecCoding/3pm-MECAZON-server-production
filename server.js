const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({
  path: path.join(__dirname, ".devcontainer", "devcontainer.env"),
});
console.log("Current working directory:", process.cwd());
console.log(
  "Attempting to load env from:",
  `${process.cwd()}/.devcontainer/devcontainer.env`
);
console.log(
  "Env loading result:",
  dotenv.config({
    path: "./.devcontainer/devcontainer.env",
  })
);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON bodies

// Import Schemas
const productSchema = require("./models/Products");
const userSchema = require("./models/Users");
const employeeSchema = require("./models/Employees");

// Mapping of database names to their respective URIs
const uriMap = {
  "3pm-client-MECAZON": process.env.MONGO_CLIENT_URI, // For Products collection
  "3pm-server-MECAZON": process.env.MONGO_SERVER_URI, // For Users and Employees collections
};

// Store connections and models
const connections = {};
const models = {};

// Function to get or create a connection based on the database name
const getConnection = async (dbName) => {
  console.log("getConnection called with dbName:", dbName);

  if (!uriMap[dbName]) {
    throw new Error(`No URI mapped for database: ${dbName}`);
  }

  if (!connections[dbName]) {
    const DB_URI = uriMap[dbName];
    console.log(`Creating new connection for ${dbName}.`);

    connections[dbName] = await mongoose.createConnection(DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`New connection established for database: ${dbName}`);
  } else {
    console.log(`Reusing existing connection for database: ${dbName}`);
  }

  return connections[dbName];
};

// Function to get or create a model based on the database and collection name
const getModel = async (dbName, collectionName) => {
  console.log("getModel called with:", { dbName, collectionName });

  const modelKey = `${dbName}-${collectionName}`;
  console.log("Generated modelKey:", modelKey);

  if (!models[modelKey]) {
    console.log("Model not found in cache, creating new model");
    const connection = await getConnection(dbName);

    // Assign the appropriate schema based on the collection name
    let schema;
    switch (collectionName) {
      case "products":
        schema = productSchema;
        break;
      case "users":
        schema = userSchema;
        break;
      case "employees":
        schema = employeeSchema;
        break;
      default:
        throw new Error(`No schema defined for collection: ${collectionName}`);
    }

    models[modelKey] = connection.model(collectionName, schema, collectionName);
    console.log(`Created new model for collection: ${collectionName}`);
  } else {
    console.log(`Reusing cached model for: ${modelKey}`);
  }

  return models[modelKey];
};

// Routes

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to serve the employee hub HTML file
app.get('/employee-hub', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'employee-hub.html'));
});


// used for testing
// GET route to find documents in a collection
app.get("/find/:database/:collection", async (req, res) => {
  try {
    const { database, collection } = req.params;
    console.log("GET request received for:", { database, collection });

    const Model = await getModel(database, collection);
    console.log("Model retrieved, executing find query");

    const documents = await Model.find({}).lean();
    console.log("Query executed, document count:", documents.length);

    res.status(200).json(documents);
  } catch (err) {
    console.error("Error in GET route:", err);
    res.status(500).json({ error: err.message });
  }
});

// used for testing
// GET route to find a specific user using id
app.get("/retrieve-user/:database/:collection/:userId", async (req, res) => {
  try {
    const { database, collection, userId } = req.params;
    console.log("GET request received for:", { database, collection, userId });

    const Model = await getModel(database, collection);
    console.log("Model retrieved, executing find query");

    let user = await Model.findOne({ _id: userId }).lean();
    if (!user) {
      console.log(`User not found in ${collection}, searching in the other collection`);
      const otherCollection = collection === 'users' ? 'employees' : 'users';
      const OtherModel = await getModel(database, otherCollection);
      user = await OtherModel.findOne({ _id: userId }).lean();
    }

    if (user) {
      console.log(`Successfully retrieved user: ${user} with ID: ${userId}`);
      res.status(200).json(user);
    } else {
      throw new Error(`User with ID ${userId} not found in both collections`);
    }
  } catch (err) {
    console.error("Error in GET route:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET route to find a user using email and password
app.get("/log-in/:database/:collection/:email/:password", async (req, res) => {
  try {
    const { database, collection, email, password } = req.params;
    console.log("GET request received for:", {
      database,
      collection,
      email,
      password,
    });

    const Model = await getModel(database, collection);
    console.log("Model retrieved, executing find query");

    const user = await Model.findOne({
      "contact_info.email": email,
      password: password,
    }).lean();
    if (user) {
      console.log(`Successfully retrieved user: ${user} with email: ${email}`);
      res.status(200).json(user._id);
    } else {
      throw new Error(
        `User with email ${email} not found or password is incorrect`
      );
    }
  } catch (err) {
    console.error("Error in GET route:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST route to sign up a new user
app.post("/sign-up/:database/:collection", async (req, res) => {
  try {
    const { database, collection } = req.params;
    const { username, email, password } = req.body;

    // console.log("POST request received for:", { database, collection, email });

    const Model = await getModel(database, collection);
    console.log("Model retrieved, executing save query");

    // Check if a user with the same email already exists
    const existingUser = await Model.findOne({
      "contact_info.email": email,
    }).lean();
    if (existingUser) {
      throw new Error(`User with email ${email} already exists`);
    }

    const newUser = new Model({
      username,
      name: {
        first_name: null,
        last_name: null,
      },
      location: {
        country: null,
        city: null,
        address: null,
        zip_code: null,
      },
      contact_info: {
        email: email,
        phone_number: null,
      },
      password,
      orders: [],
      payment_type: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await newUser.save();

    console.log(`Successfully created user: ${newUser} with email: ${email}`);
    res.status(201).json(newUser);
  } catch (err) {
    console.error("Error in POST route:", err);
    res.status(500).json({ error: err.message });
  }
});

// used for testing
// GET route to find a specific product
app.get(
  "/retrieve-product/:database/:collection/:productId",
  async (req, res) => {
    try {
      const { database, collection, productId } = req.params;
      console.log("GET request received for:", { database, collection });

      const Model = await getModel(database, collection);
      console.log("Model retrieved, executing find query");

      const product = await Model.findOne({ _id: productId }).lean();
      if (product) {
        console.log(
          `Successfully retrieved product: ${product} with ID: ${productId}`
        );
      } else {
        throw new Error(`Product with ID ${productId} not found`);
      }

      res.status(200).json(product);
    } catch (err) {
      console.error("Error in GET route:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

//used for testing
// POST route to insert documents
app.post("/add-user/:database/:collection", async (req, res) => {
  try {
    const { database, collection } = req.params;
    const Model = await getModel(database, collection);

    // Check if single or multiple documents
    if (req.body.document) {
      // Single document insert
      const newDocument = await Model.create(req.body.document);
      res.status(201).json({
        message: "Document inserted successfully",
        insertedId: newDocument._id,
      });
    } else if (req.body.documents && Array.isArray(req.body.documents)) {
      // Multiple documents insert
      const newDocuments = await Model.insertMany(req.body.documents);
      res.status(201).json({
        message: `${newDocuments.length} documents inserted`,
        insertedIds: newDocuments.map((doc) => doc._id),
      });
    } else {
      res.status(400).json({
        error:
          "Request body must contain either 'document' or 'documents' as array",
      });
    }
  } catch (err) {
    console.error("Error in POST route:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST route to insert documents
app.post("/add-employee/:database/:collection", async (req, res) => {
  try {
    const { database, collection } = req.params;
    const Model = await getModel(database, collection);

    // Check if single or multiple documents
    if (req.body.document) {
      // Single document insert
      const newDocument = await Model.create(req.body.document);
      res.status(201).json({
        message: "Document inserted successfully",
        insertedId: newDocument._id,
      });
    } else if (req.body.documents && Array.isArray(req.body.documents)) {
      // Multiple documents insert
      const newDocuments = await Model.insertMany(req.body.documents);
      res.status(201).json({
        message: `${newDocuments.length} documents inserted`,
        insertedIds: newDocuments.map((doc) => doc._id),
      });
    } else {
      res.status(400).json({
        error:
          "Request body must contain either 'document' or 'documents' as array",
      });
    }
  } catch (err) {
    console.error("Error in POST route:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST route to add a product to the user's cart
// app.post(
//   "/add-to-cart/:database/:collection/:userId/:productId",
//   async (req, res) => {
//     try {
//       const { database, collection, userId, productId } = req.params;
//       console.log("POST request received for:", {
//         database,
//         collection,
//         userId,
//         productId,
//       });

//       const UserModel = await getModel(database, collection);
//       const ProductModel = await getModel("3pm-client-MECAZON", "products");

//       // Retrieve the user and product documents
//       const user = await UserModel.findOne({ _id: userId }).lean();
//       const product = await ProductModel.findOne({ _id: productId }).lean();

//       if (!user) {
//         return res
//           .status(404)
//           .json({ message: `User with ID ${userId} not found` });
//       }

//       if (!product) {
//         return res
//           .status(404)
//           .json({ message: `Product with ID ${productId} not found` });
//       }

//       // Add the product to the user's cart
//       const updatedCart = user.cart || [];
//       updatedCart.push(product);

//       // Update the user document in the database
//       await UserModel.updateOne(
//         { _id: userId },
//         { $set: { cart: updatedCart } }
//       );

//       res.status(200).json({ message: "Product added to cart successfully" });
//     } catch (err) {
//       console.error("Error in POST route:", err);
//       res.status(500).json({ error: err.message });
//     }
//   }
// );

// POST route to ada an order to the users profile
app.post("/checkout-order/:database/:collection/:userId/", async (req, res) => {
  try {
    const { database, collection, userId } = req.params;
    const { order } = req.body;
    console.log("POST request received for:", {
      database,
      collection,
      userId,
    });

    const UserModel = await getModel(database, collection);

    // Retrieve the user
    const user = await UserModel.findOne({ _id: userId }).lean();

    if (!user) {
      return res
        .status(404)
        .json({ message: `User with ID ${userId} not found` });
    }

    // Add the order to the user's profile
    const updatedOrders = user.orders || [];
    updatedOrders.push(order);

    // Update the user document in the database
    await UserModel.updateOne(
      { _id: userId },
      { $set: { orders: updatedOrders } }
    );

    res
      .status(200)
      .json({ message: "Order added to user profile successfully" });
  } catch (err) {
    console.error("Error in POST route:", err);
    res.status(500).json({ error: err.message });
  }
});

// used for testing
// DELETE route to remove a document by ID
app.delete("/delete/:database/:collection/:id", async (req, res) => {
  try {
    const { database, collection, id } = req.params;

    const Model = await getModel(database, collection);
    const result = await Model.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).send(`Document with ID ${id} not found.`);
    }
    res.status(200).send(`Document with ID ${id} deleted successfully.`);
  } catch (err) {
    console.error("Error in DELETE route:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT route to update a document by ID
app.put("/update/:database/:collection/:id", async (req, res) => {
  try {
    const { database, collection, id } = req.params;
    const updateData = req.body.update;

    if (!updateData) {
      return res.status(400).json({ error: "Update data not provided" });
    }

    const Model = await getModel(database, collection);
    const result = await Model.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!result) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.status(200).json({
      message: "Document updated successfully",
      modifiedDocument: result,
    });
  } catch (err) {
    console.error("Error in PUT route:", err);
    res.status(500).json({ error: err.message });
  }
});




// Test connections before starting server
async function startServer() {
  try {
    console.log("Starting server with environment variables:", {
      MONGO_CLIENT_URI: process.env.MONGO_CLIENT_URI ? "Present" : "Missing",
      MONGO_SERVER_URI: process.env.MONGO_SERVER_URI ? "Present" : "Missing",
      PORT: process.env.PORT || 3000,
    });
    console.log("Raw URIs:", {
      client: process.env.MONGO_CLIENT_URI,
      server: process.env.MONGO_SERVER_URI,
    });

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
}
startServer();
