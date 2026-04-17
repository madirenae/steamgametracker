const rawgApiKey = "f1bd90ccfc614510a63efb93f4b4d404";
const steamApiKey = "AD6EE8C9113AD95F0D932536F11DAD67";
const steamId = "76561199072391001";


document.addEventListener("DOMContentLoaded", () => {
    createSparks();
    showHome();
});


async function showProfile() {
    document.getElementById("homePage").style.display = "none";
    document.getElementById("profilePage").style.display = "block";

    const hours = await loadSteamHours();
    const achievements = await loadTotalAchievements();

    console.log("Steam Loaded:", hours, achievements);

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


function addStats() {
    let hours = parseInt(document.getElementById("hoursInput").value) || 0;
    let achievements = parseInt(document.getElementById("achievementsInput").value) || 0;
    let platform = document.getElementById("platformInput").value;

    let manualHours = parseInt(localStorage.getItem("manualHours")) || 0;
    let manualAchievements = parseInt(localStorage.getItem("manualAchievements")) || 0;

    manualHours += hours;
    manualAchievements += achievements;

    localStorage.setItem("manualHours", manualHours);
    localStorage.setItem("manualAchievements", manualAchievements);

    let platformData = JSON.parse(localStorage.getItem("platforms")) || {};
    platformData[platform] = (platformData[platform] || 0) + hours;
    localStorage.setItem("platforms", JSON.stringify(platformData));

    updateDisplayedStats();
    calculateTopPlatform();

    document.getElementById("hoursInput").value = "";
    document.getElementById("achievementsInput").value = "";
}


function updateDisplayedStats() {
    const steamHours = parseInt(localStorage.getItem("steamHours")) || 0;
    const steamAchievements = parseInt(localStorage.getItem("steamAchievements")) || 0;

    const manualHours = parseInt(localStorage.getItem("manualHours")) || 0;
    const manualAchievements = parseInt(localStorage.getItem("manualAchievements")) || 0;

    document.getElementById("totalHours").textContent =
        steamHours + manualHours;

    document.getElementById("totalAchievements").textContent =
        steamAchievements + manualAchievements;
}


async function loadSteamHours() {
    try {
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=true&format=json`;

        const res = await fetch(
            `https://corsproxy.io/?${encodeURIComponent(url)}`
        );

        const data = await res.json();

        if (!data.response || !data.response.games) {
            console.error("Steam profile private or no data");
            return 0;
        }

        let total = 0;
        data.response.games.forEach(g => total += g.playtime_forever);

        const hours = Math.floor(total / 60);

        localStorage.setItem("steamHours", hours);

        return hours;

    } catch (err) {
        console.error("Steam hours failed:", err);
        return 0;
    }
}

async function loadTotalAchievements() {
    try {
        let total = 0;

        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=true&format=json`;

        const res = await fetch(
            `https://corsproxy.io/?${encodeURIComponent(url)}`
        );

        const data = await res.json();

        if (!data.response || !data.response.games) {
            console.log("Steam profile private");
            return 0;
        }

        const games = data.response.games.slice(0, 50); // 🔥 LIMIT TO 50

        for (let i = 0; i < games.length; i++) {
            const game = games[i];

            try {
                const controller = new AbortController();

                const timeout = setTimeout(() => controller.abort(), 3000);

                const aUrl = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${steamApiKey}&steamid=${steamId}&appid=${game.appid}`;

                const aRes = await fetch(
                    `https://corsproxy.io/?${encodeURIComponent(aUrl)}`,
                    { signal: controller.signal }
                );

                clearTimeout(timeout);

                if (!aRes.ok) continue;

                const aData = await aRes.json();

                if (!aData.playerstats || !aData.playerstats.achievements) continue;

                aData.playerstats.achievements.forEach(a => {
                    if (a.achieved === 1) total++;
                });

                localStorage.setItem("steamAchievements", total);
                updateDisplayedStats();

            } catch (err) {
                continue;
            }
        }

        console.log("Finished achievements:", total);
        return total;

    } catch (err) {
        console.error("Achievements failed:", err);
        return 0;
    }
}


async function loadTopSteamGames() {
    console.log("Loading top games...");

    try {
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=true&format=json`;

        const res = await fetch(
            `https://corsproxy.io/?${encodeURIComponent(url)}`
        );

        const data = await res.json();
        console.log("Steam data:", data);

        if (!data.response || !data.response.games) {
            console.error("No games found");
            return;
        }

        const container = document.getElementById("topGamesContainer");

        if (!container) {
            console.error("Container missing");
            return;
        }

        const top = data.response.games
            .sort((a, b) => b.playtime_forever - a.playtime_forever)
            .slice(0, 5);

        container.innerHTML = "<p>Loaded!</p>";

  for (let g of top) {
    try {
        const searchRes = await fetch(
            `https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(g.name)}&page_size=1`
        );

        const searchData = await searchRes.json();

        let image = "";

        if (searchData.results && searchData.results[0]) {
            image = searchData.results[0].background_image;
        }

        container.innerHTML += `
            <div class="favorite-card">
                <img src="${image || 'fallback.jpg'}">
                <p>${g.name}</p>
                <p>${Math.floor(g.playtime_forever / 60)} hrs</p>
            </div>
        `;

    } catch (err) {
        console.error("RAWG fetch failed for:", g.name);
    }
}

    } catch (err) {
        console.error("Top games failed:", err);
    }
}

function loadFavoritesRawg() {
    const container = document.getElementById("favoritesContainer");
    if (!container) return;

    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];

    container.innerHTML = "";

    favorites.forEach(game => {
        container.innerHTML += `
            <div class="favorite-card">
                <img src="${game.cover}">
                <p>${game.name}</p>
            </div>
        `;
    });
}


function calculateTopPlatform() {
    let platforms = JSON.parse(localStorage.getItem("platforms")) || {};

    const steamHours = parseInt(localStorage.getItem("steamHours")) || 0;
    platforms["PC"] = (platforms["PC"] || 0) + steamHours;

    let top = "None";
    let max = 0;

    for (let p in platforms) {
        if (platforms[p] > max) {
            max = platforms[p];
            top = p;
        }
    }

    document.getElementById("topPlatform").textContent = top;
}


console.log("GENRE FUNCTION STARTED");
async function calculateTopGenre() {
    const genreEl = document.getElementById("topGenre");

    try {
        genreEl.textContent = "Loading...";

        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=true&format=json`;

        const res = await fetch(
            `https://corsproxy.io/?${encodeURIComponent(url)}`
        );

        const data = await res.json();

        if (!data.response || !data.response.games) {
            genreEl.textContent = "None";
            return;
        }

        const games = data.response.games
            .sort((a, b) => b.playtime_forever - a.playtime_forever)
            .slice(0, 10);

        let genreCount = {};

        const startTime = Date.now();
        const MAX_TIME = 8000; 

        for (let game of games) {
            if (Date.now() - startTime > MAX_TIME) break;

            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 2000);

                const searchRes = await fetch(
                    `https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(game.name)}&page_size=1`,
                    { signal: controller.signal }
                );

                clearTimeout(timeout);

                const searchData = await searchRes.json();

                if (!searchData.results || !searchData.results[0]) continue;

                const rawgGame = searchData.results[0];

                rawgGame.genres.forEach(g => {
                    genreCount[g.name] =
                        (genreCount[g.name] || 0) + game.playtime_forever;
                });

            } catch {
                continue;
            }
        }

        const sortedGenres = Object.entries(genreCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        if (sortedGenres.length === 0) {
            genreEl.textContent = "None";
            return;
        }

        genreEl.textContent = sortedGenres
            .map(g => g[0])
            .join(", ");

    } catch (err) {
        console.error("Genre failed:", err);
        genreEl.textContent = "Error";
    }
}


function getUserNotesKey() {
    return "notes_guest";
}

function loadNotesList() {
    const notes = JSON.parse(localStorage.getItem(getUserNotesKey())) || [];
    const container = document.getElementById("notesList");

    container.innerHTML = "";

    notes.forEach((note, index) => {
        container.innerHTML += `
            <div class="note-item">
                <div>
                    <p>${note.text}</p>
                    <small>${note.time}</small>
                </div>
                <div>
                    <button onclick="editNote(${index})">Edit</button>
                    <button onclick="deleteNote(${index})">Delete</button>
                </div>
            </div>
        `;
    });
}

function saveNote(text) {
    let notes = JSON.parse(localStorage.getItem(getUserNotesKey())) || [];

    notes.push({
        text,
        time: new Date().toLocaleString()
    });

    localStorage.setItem(getUserNotesKey(), JSON.stringify(notes));
}

function deleteNote(index) {
    let notes = JSON.parse(localStorage.getItem(getUserNotesKey())) || [];
    notes.splice(index, 1);
    localStorage.setItem(getUserNotesKey(), JSON.stringify(notes));
    loadNotesList();
}

function editNote(index) {
    let notes = JSON.parse(localStorage.getItem(getUserNotesKey())) || [];

    let newText = prompt("Edit note:", notes[index].text);

    if (newText) {
        notes[index].text = newText;
        notes[index].time = "Edited: " + new Date().toLocaleString();

        localStorage.setItem(getUserNotesKey(), JSON.stringify(notes));
        loadNotesList();
    }
}

function setupNotesInput() {
    const input = document.getElementById("notesInput");

    if (!input.dataset.listener) {
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (input.value.trim()) {
                    saveNote(input.value.trim());
                    input.value = "";
                    loadNotesList();
                }
            }
        });

        input.dataset.listener = "true";
    }
}

function createSparks() {
    for (let i = 0; i < 30; i++) {
        let s = document.createElement("span");
        s.style.left = Math.random() * 100 + "%";
        document.body.appendChild(s);
    }
}