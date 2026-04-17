const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
app.use(express.json());
app.use(cors());

const db = new Database("database.db");
const SECRET = process.env.SECRET || "supersecretkey";

// Create table
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )
`).run();


// REGISTER
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashed = await bcrypt.hash(password, 10);

        db.prepare(`
            INSERT INTO users (username, password)
            VALUES (?, ?)
        `).run(username, hashed);

        res.json({ message: "User created" });

    } catch (err) {
        res.status(400).json({ message: "Username already exists" });
    }
});


// LOGIN
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    const user = db.prepare(`
        SELECT * FROM users WHERE username = ?
    `).get(username);

    if (!user) {
        return res.status(400).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
        return res.status(401).json({ message: "Wrong password" });
    }

    const token = jwt.sign({ id: user.id, username }, SECRET, {
        expiresIn: "1h"
    });

    res.json({ token });
});


// PROTECTED ROUTE
app.get("/api/profile", (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.sendStatus(401);

    try {
        const token = auth.split(" ")[1];
        const user = jwt.verify(token, SECRET);
        res.json(user);
    } catch {
        res.sendStatus(403);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));