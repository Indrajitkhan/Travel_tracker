//

import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

// Database connection
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "Indrajit@123",
  port: 5432,
});

// Connect to the database with error handling
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    process.exit(1); // Exit if the database connection fails
  } else {
    console.log("Connected to the database.");
  }
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// Function to fetch visited countries
async function checkVisited() {
  try {
    const result = await db.query("SELECT country_code FROM visited_countries");
    return result.rows.map((row) => row.country_code); // Extract country codes
  } catch (err) {
    console.error("Error fetching visited countries:", err.message);
    return []; // Return an empty array on error
  }
}

// GET home page
app.get("/", async (req, res) => {
  try {
    const countries = await checkVisited();
    res.render("index", { countries, total: countries.length }); // Use shorthand object notation
  } catch (err) {
    console.error("Error rendering home page:", err.message);
    res.status(500).send("Internal Server Error");
  }
});

// INSERT new country
app.post("/add", async (req, res) => {
  const input = req.body["country"]?.trim(); // Trim whitespace and validate input
  if (!input) {
    return res.status(400).send("Invalid input");
  }

  try {
    // Check if the country exists in the countries table
    const result = await db.query(
      "SELECT country_code FROM countries WHERE country_name = $1",
      [input]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Country not found");
    }

    const countryCode = result.rows[0].country_code;

    // Check if the country is already visited
    const checkVisited = await db.query(
      "SELECT * FROM visited_countries WHERE country_code = $1",
      [countryCode]
    );

    if (checkVisited.rows.length > 0) {
      return res.status(409).send("Country already visited");
    }

    // Insert the country into the visited_countries table
    await db.query("INSERT INTO visited_countries (country_code) VALUES ($1)", [
      countryCode,
    ]);

    res.redirect("/");
  } catch (err) {
    console.error("Error inserting new country:", err.message);
    res.status(500).send("Internal Server Error");
  }
});

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    await db.end();
    console.log("Database connection closed.");
  } catch (err) {
    console.error("Error closing database connection:", err.message);
  }
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
