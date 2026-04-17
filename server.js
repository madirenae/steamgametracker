const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const session = require("express-session");
const { createClient } = require("@supabase/supabase-js");

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

// ================= SUPABASE =================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const SECRET = process.env.SECRET || "supersecretkey";

// ================= REGISTER =================
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const { error } = await supabase
        .from("users")
        .insert([{ username, password: hashed }]);

    if (error) {
        return res.status(400).json({ message: "Username already exists" });
    }

    res.json({ message: "User created" });
});

// ================= LOGIN =================
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

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
        res.redirect(`/?steamId=${steamId}`);
    }
);

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});