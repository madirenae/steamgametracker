const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const passport = require("passport");
const SteamStrategy = require("passport-steam").Strategy;
const session = require("express-session");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

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

// ================= SERVE FRONTEND =================
// serves index.html, styles.css, script.js, etc.
app.use(express.static(path.join(__dirname, ".")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

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

        // send Steam ID to frontend
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

app.get("/api/steam/profile/:id", async (req, res) => {
    const steamId = req.params.id;

    const response = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`
    );

    const data = await response.json();
    res.json(data);
});


app.get("/api/steam/games/:id", async (req, res) => {
    const steamId = req.params.id;

    const response = await fetch(
        `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_API_KEY}&steamid=${steamId}&include_appinfo=true&format=json`
    );

    const data = await response.json();
    res.json(data);
});

app.get("/api/steam/achievements/:steamId/:appId", async (req, res) => {
    const { steamId, appId } = req.params;

    const response = await fetch(
        `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${process.env.STEAM_API_KEY}&steamid=${steamId}&appid=${appId}`
    );

    const data = await response.json();
    res.json(data);
});

app.get("/api/steam/achievements/:steamId/:appId", async (req, res) => {
    const { steamId, appId } = req.params;

    try {
        const response = await fetch(
            `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${process.env.STEAM_API_KEY}&steamid=${steamId}&appid=${appId}`
        );

        const data = await response.json();
        res.json(data);

    } catch (err) {
        res.json({ playerstats: { achievements: [] } });
    }
});

app.post("/api/favorites", async (req, res) => {
    const { steamId, name, image } = req.body;

    const { error } = await supabase
        .from("favorites")
        .insert([{ steam_id: steamId, name, image }]);

    if (error) {
        return res.status(400).json({ message: "Failed to save favorite" });
    }

    res.json({ message: "Saved" });
});

app.get("/api/favorites/:steamId", async (req, res) => {
    const { steamId } = req.params;

    const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("steam_id", steamId);

    res.json(data || []);
});