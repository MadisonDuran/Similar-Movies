const queryInput = document.getElementById("queryInput"); // Search input field
const searchForm = document.getElementById("searchForm"); // Search form
const searchBtn = document.getElementById("searchBtn"); // Search button

if (searchForm && queryInput) { // If the search form exists
    // Focus the input field on page load
    queryInput.focus();

    // Handle form submission
    searchForm.addEventListener("submit", () => { // On form submit
        if (searchBtn) { // If the search button exists
            searchBtn.disabled = true; // Disable the button to prevent multiple submissions
            searchBtn.textContent = "Searching..."; // Change button text to indicate loading
        }
    });
}

const chooseForm = document.getElementById("chooseForm"); // Movie selection form
const chooseBtn = document.getElementById("chooseBtn"); // Button to show similar movies
if (chooseForm) { // If the selection form exists
    chooseForm.addEventListener("submit", () => { // On form submit
        if (chooseBtn) { // If the choose button exists
            chooseBtn.disabled = true; // Disable the button to prevent multiple submissions
            chooseBtn.textContent = "Loading..."; // Change button text to indicate loading
        }
    });
}