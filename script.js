const steamApiKey = "AD6EE8C9113AD95F0D932536F11DAD67";
const rawgApiKey = "f1bd90ccfc614510a63efb93f4b4d404";
const API_BASE = "https://steamgametracker.onrender.com";

window.addStats = addStats;
window.addToFavoritesRawg = addToFavoritesRawg;

// ================= LOAD =================
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  let steamId = params.get("steamId");

  // If coming from URL
  if (steamId) {
    localStorage.setItem("steamId", steamId);
    window.history.replaceState({}, document.title, "/");
  }

  // Fallback (for testing)
  if (!localStorage.getItem("steamId")) {
    localStorage.setItem("steamId", "76561199072391001");
  }

  steamId = localStorage.getItem("steamId");

  if (steamId) {
    showProfile();
    loadFavorites(); // ✅ THIS is what you were missing
  } else {
    showLogin();
  }
});

// ================= LOGIN =================
function connectSteam() {
    window.location.href = `${API_BASE}/auth/steam`;
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

        loadFavorites();

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

        } catch (err) {
            console.error("Genre fetch failed:", err);
        }
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
        const res = await fetch(`${API_BASE}/api/steam/games/${steamId}`);
        const data = await res.json();

        const container = document.getElementById("topGamesContainer");
        container.innerHTML = "";

        if (!data.response.games) return;

        const allGames = data.response.games;

        // ✅ TOTAL HOURS (ALL games)
        let totalHours = 0;
        allGames.forEach(g => {
            totalHours += g.playtime_forever;
        });

        document.getElementById("totalHours").textContent =
            Math.floor(totalHours / 60);

        // ✅ TOP 5 (for display only)
        const top = [...allGames]
            .sort((a, b) => b.playtime_forever - a.playtime_forever)
            .slice(0, 5);

        let totalAchievements = 0;

        for (const g of top) {
            const image = await getGameImage(g.name);
            const achievements = await getAchievementsCount(steamId, g.appid);

            totalAchievements += achievements;

            container.innerHTML += `
                <div style="margin-bottom:10px;">
                    ${image ? `<img src="${image}" width="150"/>` : ""}
                    <p>${g.name}</p>
                    <p>${Math.floor(g.playtime_forever / 60)} hrs</p>
                    <p>🏆 ${achievements} achievements</p>
                </div>
            `;
        }

        document.getElementById("totalAchievements").textContent = totalAchievements;

        await calculateTopGenre(top);

    } catch (err) {
        console.error("Games failed:", err);
    }
}

//===============Achievments==========================

async function getAchievementsCount(steamId, appId) {
    try {
        const res = await fetch(
            `https://steamgametracker.onrender.com/api/steam/achievements/${steamId}/${appId}`
        );

        const data = await res.json();

        if (!data.playerstats || !data.playerstats.achievements) return 0;

        return data.playerstats.achievements.filter(a => a.achieved === 1).length;

    } catch {
        return 0;
    }
}

//===============Add Stats======================

function addStats() {
    const hours = Number(document.getElementById("hoursInput").value) || 0;
    const achievements = Number(document.getElementById("achievementsInput").value) || 0;

    let savedHours = Number(localStorage.getItem("totalHours")) || 0;
    let savedAchievements = Number(localStorage.getItem("totalAchievements")) || 0;

    savedHours += hours;
    savedAchievements += achievements;

    localStorage.setItem("totalHours", savedHours);
    localStorage.setItem("totalAchievements", savedAchievements);

    document.getElementById("totalHours").textContent = savedHours;
    document.getElementById("totalAchievements").textContent = savedAchievements;
}

//=======================Notes=========================

function loadNotes() {
    const notes = JSON.parse(localStorage.getItem("notes")) || [];
    const container = document.getElementById("notesList");
    container.innerHTML = "";

    notes.forEach(n => {
        container.innerHTML += `<p>${n}</p>`;
    });
}

document.getElementById("notesInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const note = e.target.value.trim();
        if (!note) return;

        let notes = JSON.parse(localStorage.getItem("notes")) || [];
        notes.push(note);

        localStorage.setItem("notes", JSON.stringify(notes));
        e.target.value = "";

        loadNotes();
    }
});

//======================Fav Games===============

async function addToFavoritesRawg(name) {
    if (!name) return;

    const steamId = localStorage.getItem("steamId");

    const res = await fetch(
        `https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(name)}`
    );

    const data = await res.json();
    if (!data.results.length) return;

    const game = data.results[0];

    console.log({
        steamId,
        name: game.name,
        image: game.background_image
    });

    await fetch(`${API_BASE}/api/favorites`, { // ✅ FIXED
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            steamId,
            name: game.name,
            image: game.background_image
        })
    });

    loadFavorites();
}

async function loadFavorites() {
    const steamId = localStorage.getItem("steamId");

    const res = await fetch(`${API_BASE}/api/favorites/${steamId}`); // ✅ FIXED
    const favorites = await res.json();

    console.log("FETCHED:", favorites);

    const container = document.getElementById("favoritesContainer");
    container.innerHTML = "";

    favorites.forEach(g => {
        container.innerHTML += `
            <div>
                <img src="${g.image}" width="120"/>
                <p>${g.name}</p>
            </div>
        `;
    });
}