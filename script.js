const steamApiKey = "AD6EE8C9113AD95F0D932536F11DAD67";

// ================= LOAD =================
document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    let steamId = params.get("steamId");

    // ✅ If coming back from Steam login
    if (steamId) {
        localStorage.setItem("steamId", steamId);

        // clean URL
        window.history.replaceState({}, document.title, "/");

        showProfile();
        return;
    }

    // ✅ If already logged in
    steamId = localStorage.getItem("steamId");

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
    document.getElementById("homePage").style.display = "block";
    document.getElementById("profilePage").style.display = "none";
}

function logout() {
    localStorage.clear();
    showLogin();
}


// ================= PROFILE =================
function showProfile() {
    document.getElementById("homePage").style.display = "none";
    document.getElementById("profilePage").style.display = "block";

    const steamId = localStorage.getItem("steamId");

    if (!steamId) {
        console.error("No Steam ID found");
        return;
    }

    loadSteamProfile(steamId);
    loadTopGames(steamId);
}


// ================= LOAD PROFILE =================
async function loadSteamProfile(steamId) {
    try {
        const res = await fetch(
            `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamId}`
        );

        const data = await res.json();

        const user = data.response.players[0];

        if (!user) return;

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