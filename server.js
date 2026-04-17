const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const users = []; // ⚠️ replace with DB later
const SECRET = "supersecretkey";


// REGISTER
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    const existing = users.find(u => u.username === username);
    if (existing) {
        return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    users.push({ username, password: hashed });

    res.json({ message: "User created" });
});


// LOGIN
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(400).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return res.status(401).json({ message: "Wrong password" });
    }

    const token = jwt.sign({ username }, SECRET, { expiresIn: "1h" });

    res.json({ token });
});


// PROTECTED ROUTE (example)
app.get("/api/profile", (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.sendStatus(401);

    try {
        const token = auth.split(" ")[1];
        const user = jwt.verify(token, SECRET);
        res.json({ message: "Protected data", user });
    } catch {
        res.sendStatus(403);
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));