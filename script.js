const steamApiKey = "AD6EE8C9113AD95F0D932536F11DAD67";
const rawgApiKey = "f1bd90ccfc614510a63efb93f4b4d404";

// ================= LOAD =================
document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    let steamId = params.get("steamId");

    if (steamId) {
        localStorage.setItem("steamId", steamId);
        window.history.replaceState({}, document.title, "/");
        showProfile();
        return;
    }

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
async function showProfile() {
    document.getElementById("homePage").style.display = "none";
    document.getElementById("profilePage").style.display = "block";

    const steamId = localStorage.getItem("steamId");
    if (!steamId) return;

    await loadSteamProfile(steamId);
    await loadTopGames(steamId);
}

// ================= LOAD PROFILE =================
async function loadSteamProfile(steamId) {
    try {
        const res = await fetch(
            `https://steamgametracker.onrender.com/api/steam/profile/${steamId}`
        );

        const data = await res.json();
        const user = data.response.players[0];

        if (!user) return;

        document.getElementById("usernameDisplay").textContent = user.personaname;

    } catch (err) {
        console.error("Profile failed:", err);
    }
}

// ================= RAWG IMAGE =================
async function getGameImage(gameName) {
    try {
        const res = await fetch(
            `https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(gameName)}`
        );

        const data = await res.json();

        if (!data.results.length) return null;

        return data.results[0].background_image;

    } catch {
        return null;
    }
}

// ================= CALCULATE GENRE =================
async function calculateTopGenre(games) {
    const genreCount = {};

    for (const g of games) {
        try {
            const res = await fetch(
                `https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(g.name)}`
            );

            const data = await res.json();
            if (!data.results.length) continue;

            const genres = data.results[0].genres;

            genres.forEach(genre => {
                genreCount[genre.name] = (genreCount[genre.name] || 0) + 1;
            });

        } catch {}
    }

    let topGenre = "Unknown";
    let max = 0;

    for (const g in genreCount) {
        if (genreCount[g] > max) {
            max = genreCount[g];
            topGenre = g;
        }
    }

    document.getElementById("topGenre").textContent = topGenre;
}

// ================= LOAD GAMES =================
async function loadTopGames(steamId) {
    try {
        const res = await fetch(
            `https://steamgametracker.onrender.com/api/steam/games/${steamId}`
        );

        const data = await res.json();
        const container = document.getElementById("topGamesContainer");
        container.innerHTML = "";

        if (!data.response.games) return;

        const top = data.response.games
            .sort((a, b) => b.playtime_forever - a.playtime_forever)
            .slice(0, 5);

        let totalHours = 0;

        for (const g of top) {
            totalHours += g.playtime_forever;

            const image = await getGameImage(g.name);

            container.innerHTML += `
                <div style="margin-bottom:10px;">
                    ${image ? `<img src="${image}" width="150"/>` : ""}
                    <p>${g.name}</p>
                    <p>${Math.floor(g.playtime_forever / 60)} hrs</p>
                </div>
            `;
        }

        document.getElementById("totalHours").textContent = Math.floor(totalHours / 60);

        // ✅ Achievements (placeholder)
        document.getElementById("totalAchievements").textContent = "N/A";

        // ✅ Top genre
        await calculateTopGenre(top);

    } catch (err) {
        console.error("Games failed:", err);
    }
}