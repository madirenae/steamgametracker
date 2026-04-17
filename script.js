const steamApiKey = "YOUR_STEAM_API_KEY";

// ================= LOAD =================
document.addEventListener("DOMContentLoaded", async () => {
    const steamId = localStorage.getItem("steamId");

    if (steamId) {
        showProfile();
    } else {
        showLogin();
    }
});


// ================= LOGIN =================
function connectSteam() {
    window.location.href = "https://steamgametracker.onrender.com/auth/steam";
}

function showLogin() {
    document.getElementById("loginPage").style.display = "block";
    document.getElementById("profilePage").style.display = "none";
}

function logout() {
    localStorage.clear();
    showLogin();
}


// ================= PROFILE =================
async function showProfile() {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("profilePage").style.display = "block";

    const steamId = localStorage.getItem("steamId");

    await loadSteamProfile(steamId);
    await loadTopGames(steamId);
}


// ================= GET STEAM ID FROM BACKEND =================
async function fetchSteamId() {
    try {
        const res = await fetch("https://steamgametracker.onrender.com/api/steam-user");
        const data = await res.json();

        if (data.steamId) {
            localStorage.setItem("steamId", data.steamId);
            return data.steamId;
        }
    } catch (err) {
        console.error(err);
    }

    return null;
}


// ================= LOAD PROFILE =================
async function loadSteamProfile(steamId) {
    try {
        const res = await fetch(
            `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamId}`
        );

        const data = await res.json();

        const user = data.response.players[0];

        document.getElementById("usernameDisplay").textContent = user.personaname;

    } catch (err) {
        console.error("Profile failed:", err);
    }
}


// ================= LOAD GAMES =================
async function loadTopGames(steamId) {
    try {
        const res = await fetch(
            `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=true&format=json`
        );

        const data = await res.json();

        const container = document.getElementById("topGamesContainer");
        container.innerHTML = "";

        if (!data.response.games) return;

        const top = data.response.games
            .sort((a, b) => b.playtime_forever - a.playtime_forever)
            .slice(0, 5);

        let totalHours = 0;

        top.forEach(g => {
            totalHours += g.playtime_forever;

            container.innerHTML += `
                <div>
                    <p>${g.name}</p>
                    <p>${Math.floor(g.playtime_forever / 60)} hrs</p>
                </div>
            `;
        });

        document.getElementById("totalHours").textContent = Math.floor(totalHours / 60);

    } catch (err) {
        console.error("Games failed:", err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const steamId = params.get("steamId");

    if (steamId) {
        localStorage.setItem("steamId", steamId);
        window.history.replaceState({}, document.title, "/");
    }
});