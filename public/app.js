const queryInput = document.getElementById("queryInput");
const searchForm = document.getElementById("searchForm");
const searchBtn = document.getElementById("searchBtn");

if (searchForm && queryInput) {
    searchForm.addEventListener("submit", () => {
        if (searchBtn) {
            searchBtn.disabled = true;
            searchBtn.textContent = "Searching...";
        }
    });
}

const chooseForm = document.getElementById("chooseForm");
const chooseBtn = document.getElementById("chooseBtn");
if (chooseForm) {
    chooseForm.addEventListener("submit", () => {
        if (chooseBtn) {
            chooseBtn.disabled = true;
            chooseBtn.textContent = "Loading...";
        }
    });
}