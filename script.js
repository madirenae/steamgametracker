const rawgApiKey = "f1bd90ccfc614510a63efb93f4b4d404";
const steamApiKey = "AD6EE8C9113AD95F0D932536F11DAD67";

// ✅ Load page
document.addEventListener("DOMContentLoaded", () => {
    createSparks();

    const token = localStorage.getItem("token");

    if (token) {
        document.getElementById("loginPage").style.display = "none";
        document.getElementById("app").style.display = "block";
        showProfile();
    } else {
        document.getElementById("loginPage").style.display = "block";
        document.getElementById("app").style.display = "none";
        showHome();
    }
});


// ================= LOGIN =================
async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        alert("Please enter username and password");
        return;
    }

    try {
        const res = await fetch("https://steamgametracker.onrender.com/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "Login failed");
            return;
        }

        // ✅ Save token
        localStorage.setItem("token", data.token);

        // ✅ Ask for Steam ID (temporary solution)
        let steamId = localStorage.getItem("steamId");

        if (!steamId) {
            steamId = prompt("Enter your Steam ID (64-bit):");
            if (steamId) {
                localStorage.setItem("steamId", steamId);
            }
        }

        document.getElementById("loginPage").style.display = "none";
        document.getElementById("app").style.display = "block";

        showProfile();

    } catch (err) {
        console.error("Login error:", err);
        alert("Server error");
    }
}


// ================= REGISTER =================
async function register() {
    console.log("REGISTER CLICKED");

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        alert("Please enter username and password");
        return;
    }

    try {
        const res = await fetch("https://steamgametracker.onrender.com/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message);
            return;
        }

        alert("User created! Now login.");

    } catch (err) {
        console.error("Register error:", err);
        alert("Server error");
    }
}


// ================= LOGOUT =================
function logout() {
    localStorage.clear();
    location.reload();
}


// ================= PROFILE =================
async function showProfile() {
    document.getElementById("homePage").style.display = "none";
    document.getElementById("profilePage").style.display = "block";

    await loadSteamHours();
    await loadTotalAchievements();
    await loadTopSteamGames();

    updateDisplayedStats();
    calculateTopPlatform();
    loadFavoritesRawg();
    calculateTopGenre();
    setupNotesInput();
    loadNotesList();
}

function showHome() {
    document.getElementById("homePage").style.display = "block";
    document.getElementById("profilePage").style.display = "none";
}


// ================= STEAM =================
function getSteamId() {
    return localStorage.getItem("steamId");
}

async function loadSteamHours() {
    const steamId = getSteamId();
    if (!steamId) return 0;

    try {
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=true&format=json`;

        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        const data = await res.json();

        if (!data.response || !data.response.games) return 0;

        let total = 0;
        data.response.games.forEach(g => total += g.playtime_forever);

        const hours = Math.floor(total / 60);
        localStorage.setItem("steamHours", hours);

        return hours;

    } catch {
        return 0;
    }
}

async function loadTotalAchievements() {
    const steamId = getSteamId();
    if (!steamId) return 0;

    try {
        let total = 0;

        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=true&format=json`;

        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        const data = await res.json();

        if (!data.response || !data.response.games) return 0;

        const games = data.response.games.slice(0, 20);

        for (let game of games) {
            try {
                const aUrl = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${steamApiKey}&steamid=${steamId}&appid=${game.appid}`;
                const aRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(aUrl)}`);

                if (!aRes.ok) continue;

                const aData = await aRes.json();

                if (!aData.playerstats?.achievements) continue;

                aData.playerstats.achievements.forEach(a => {
                    if (a.achieved === 1) total++;
                });

            } catch {}
        }

        localStorage.setItem("steamAchievements", total);
        return total;

    } catch {
        return 0;
    }
}

async function loadTopSteamGames() {
    const steamId = getSteamId();
    if (!steamId) return;

    try {
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=true&format=json`;

        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        const data = await res.json();

        if (!data.response || !data.response.games) return;

        const container = document.getElementById("topGamesContainer");
        container.innerHTML = "";

        const top = data.response.games
            .sort((a, b) => b.playtime_forever - a.playtime_forever)
            .slice(0, 5);

        for (let g of top) {
            try {
                const searchRes = await fetch(
                    `https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(g.name)}&page_size=1`
                );

                const searchData = await searchRes.json();
                const image = searchData.results?.[0]?.background_image || "";

                container.innerHTML += `
                    <div class="favorite-card">
                        <img src="${image}">
                        <p>${g.name}</p>
                        <p>${Math.floor(g.playtime_forever / 60)} hrs</p>
                    </div>
                `;

            } catch {}
        }

    } catch {}
}


// ================= OTHER =================
function updateDisplayedStats() {
    const steamHours = parseInt(localStorage.getItem("steamHours")) || 0;
    const steamAchievements = parseInt(localStorage.getItem("steamAchievements")) || 0;

    document.getElementById("totalHours").textContent = steamHours;
    document.getElementById("totalAchievements").textContent = steamAchievements;
}

function calculateTopPlatform() {
    document.getElementById("topPlatform").textContent = "PC";
}


// ================= NOTES =================
function getUserNotesKey() {
    const token = localStorage.getItem("token") || "guest";
    return "notes_" + token;
}

function loadNotesList() {
    const notes = JSON.parse(localStorage.getItem(getUserNotesKey())) || [];
    const container = document.getElementById("notesList");
    container.innerHTML = "";

    notes.forEach((note, i) => {
        container.innerHTML += `
            <div>
                <p>${note.text}</p>
                <button onclick="deleteNote(${i})">Delete</button>
            </div>
        `;
    });
}

function saveNote(text) {
    let notes = JSON.parse(localStorage.getItem(getUserNotesKey())) || [];
    notes.push({ text });
    localStorage.setItem(getUserNotesKey(), JSON.stringify(notes));
}

function deleteNote(i) {
    let notes = JSON.parse(localStorage.getItem(getUserNotesKey())) || [];
    notes.splice(i, 1);
    localStorage.setItem(getUserNotesKey(), JSON.stringify(notes));
    loadNotesList();
}

function setupNotesInput() {
    const input = document.getElementById("notesInput");

    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            saveNote(input.value.trim());
            input.value = "";
            loadNotesList();
        }
    });
}


// ================= UI =================
function createSparks() {
    for (let i = 0; i < 30; i++) {
        let s = document.createElement("span");
        s.style.left = Math.random() * 100 + "%";
        document.body.appendChild(s);
    }
}