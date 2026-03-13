const rawgApiKey = "f1bd90ccfc614510a63efb93f4b4d404";

document.addEventListener("DOMContentLoaded", () => {
    loadFavoritesRawg();
});

async function fetchRawgGameData(gameName) {
    const response = await fetch(
        `https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(gameName)}&page_size=1`
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
        return data.results[0];
    }
    return null;
}

async function addToFavoritesRawg(gameName) {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const gameData = await fetchRawgGameData(gameName);
    if (gameData && !favorites.some(game => game.id === gameData.id)) {
        favorites.push({
            id: gameData.id,
            name: gameData.name,
            cover: gameData.background_image
        });
        localStorage.setItem("favorites", JSON.stringify(favorites));
        loadFavoritesRawg();
    }
}

function removeFavorite(id) {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    favorites = favorites.filter(game => game.id !== id);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    loadFavoritesRawg();
}

function loadFavoritesRawg() {
    const container = document.getElementById("favoritesContainer");
    container.innerHTML = "";
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    favorites.forEach(game => {
        const gameCard = document.createElement("div");
        gameCard.classList.add("favorite-card");
        gameCard.innerHTML = `
            <img src="${game.cover}" />
            <p>${game.name}</p>
            <button class="remove-btn" onclick="removeFavorite(${game.id})">Remove</button>
        `;
        container.appendChild(gameCard);
    });
}