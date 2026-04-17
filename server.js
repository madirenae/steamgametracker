const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const session = require("express-session");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(cors());

app.use(session({
    secret: "steam",
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// ================= DATABASE =================
const db = new sqlite3.Database("database.db");

db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )
`);

const SECRET = process.env.SECRET || "supersecretkey";

// ================= AUTH (REGISTER) =================
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    db.run(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, hashed],
        function (err) {
            if (err) {
                return res.status(400).json({ message: "Username already exists" });
            }

            res.json({ message: "User created" });
        }
    );
});

// ================= AUTH (LOGIN) =================
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        async (err, user) => {
            if (!user) {
                return res.status(400).json({ message: "User not found" });
            }

            const valid = await bcrypt.compare(password, user.password);

            if (!valid) {
                return res.status(401).json({ message: "Wrong password" });
            }

            const token = jwt.sign(
                { id: user.id, username },
                SECRET,
                { expiresIn: "1h" }
            );

            res.json({ token });
        }
    );
});

// ================= PROTECTED ROUTE =================
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

// ================= STEAM AUTH =================
passport.use(new SteamStrategy({
    returnURL: "https://steamgametracker.onrender.com/auth/steam/return",
    realm: "https://steamgametracker.onrender.com/",
    apiKey: process.env.STEAM_API_KEY
},
(identifier, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// ================= STEAM ROUTES =================
app.get("/auth/steam",
    passport.authenticate("steam")
);

app.get("/auth/steam/return",
    passport.authenticate("steam", { failureRedirect: "/" }),
    (req, res) => {
        const steamId = req.user.id;

        // send Steam ID back to frontend
        res.redirect(`/?steamId=${steamId}`);
    }
);

// ================= GET STEAM USER =================
app.get("/api/steam-user", (req, res) => {
    if (!req.user) {
        return res.json({});
    }

    res.json({
        steamId: req.user.id
    });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});