const express = require("express");
const dotenv = require("dotenv");
const pgp = require("pg-promise")();
const app = express();

dotenv.config();

const connectToDatabase = async (retries = 5, delay = 5000) => {
  while (retries) {
    try {
      const db = pgp(process.env.DATABASE_URL);
      await db.connect();
      console.log("Connected to the database");

      // Create the posts table if it doesn't exist
      await db.none(`
        CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("Table 'posts' created successfully");

      return db;
    } catch (error) {
      console.error("Failed to connect to the database, retrying...", error);
      retries -= 1;
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error("Could not connect to the database after multiple attempts");
};

connectToDatabase().then(db => {
  app.use(express.json());

  app.get("/", (req, res) => {
    res.json("post service");
  });

  // Create a new post
  app.post("/create", (req, res) => {
    const { title, content } = req.body;
    db.none("INSERT INTO posts(title, content) VALUES($1, $2)", [title, content])
      .then(() => {
        res.status(201).json({ message: "Post created successfully" });
      })
      .catch((error) => {
        res.status(500).json({ error: error.message });
      });
  });

  // Read all posts
  app.get("/all", (req, res) => {
    db.any("SELECT * FROM posts")
      .then((data) => {
        res.status(200).json(data);
      })
      .catch((error) => {
        res.status(500).json({ error: error.message });
      });
  });

  // Update a post
  app.put("/post/:id", (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    db.none("UPDATE posts SET title=$1, content=$2 WHERE id=$3", [title, content, id])
      .then(() => {
        res.status(200).json({ message: "Post updated successfully" });
      })
      .catch((error) => {
        res.status(500).json({ error: error.message });
      });
  });

  // Delete a post
  app.delete("/post/:id", (req, res) => {
    const { id } = req.params;
    db.none("DELETE FROM posts WHERE id=$1", [id])
      .then(() => {
        res.status(204).json({ message: "Post deleted successfully" });
      })
      .catch((error) => {
        res.status(500).json({ error: error.message });
      });
  });

  app.listen(process.env.PORT, () => {
    console.log(
      `Example app listening at ${process.env.APP_URL}:${process.env.PORT}`
    );
  });
}).catch(error => {
  console.error("Failed to start the server:", error);
});