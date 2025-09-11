import express from "express"; // npm install express
import dotenv from "dotenv"; // npm install dotenv
import path from "path"; // Built-in with Node.js
import { fileURLToPath } from "url"; // Built-in with Node.js

dotenv.config(); // Load .env file

const __filename = fileURLToPath(import.meta.url); // Get current file path
const __dirname = path.dirname(__filename); // Get current directory path

const app = express(); // Create Express app
const TMDB_BASE = "https://api.themoviedb.org/3"; // TMDb API base URL
const API_KEY = process.env.TMDB_API_KEY; // TMDb API key from .env
const PORT = process.env.PORT || 3000; // Server port

// Ensure API key is set

if (!API_KEY) { // If no API key, exit with error
    console.error("Missing TMDB_API_KEY in .env"); // Log error
    process.exit(1); // Exit program
}

app.use(express.static(path.join(__dirname, "public"))); // Serve static files from "public" directory
app.use(express.urlencoded({ extended: true})); // Parse URL-encoded form data
app.use(express.json()); // Parse JSON request bodies

function escapeHTML(str = "") { // Escape HTML special characters
    return String(str) 
        .replaceAll("&", "&amp;") // Escape &
        .replaceAll("<", "&lt;") // Escape <
        .replaceAll(">", "&gt;") // Escape >
        .replaceAll("'", "&#39;"); // Escape '
}

function page({ title, heading, subtext = "", body = "" }) { // Generate full HTML page
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="stylesheet" href="/style.css" />
        </head>
        <body>
        <main>
            <h1>${heading}</h1>
            <form id="searchForm" method="POST" action="/search" class="searchbar">
                <input id="queryInput" name="query" placeholder="Enter a movie title" aria-label="Movie title" />
                <button id="searchBtn" type="submit">Search</button>
                </form>
                ${subtext ? `<p class="muted">${subtext}</p>` : ""}
                ${body}
                </main>
                <script src="/app.js"></script>
                </body>
                </html>`;
}

function selectionForm(results, originalQuery) { // Generate movie selection form
    const options = results.slice(0, 10).map(m => { // Limit to first 10 results
        const year = m.release_date ? ` (${m.release_date.slice(0, 4)})` : ""; // Extract year from release date
        const label = `${m.title}${year}`; // Movie title with year
        const poster = m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : ""; // Poster image URL
        return ` 
            <label class="option">
                <input type="radio" name="id" value="${m.id}" required>
                ${poster ? `<img src="${poster}" alt="${escapeHTML(m.title)}">` : ""}
                <span>${escapeHTML(label)}</span>
            </label>
        `;
    });

    const enhanced = []; // Enhance each option with a class
    options.forEach(html => enhanced.push(html.replace(`<label class="option">`, `<label class="option from-backend">`)));

    return `
        <h2 class="section-title">Select the correct movie</h2>
        <form id="chooseForm" method="POST" action="/choose" class="options">
            ${enhanced.join("")}
            <input type="hidden" name="originalQuery" value="${escapeHTML(originalQuery)}">
            <button id="chooseBtn" type="submit">Show Similar</button>
            </form>
    `;
}

function similarGrid(chosenTitle, movies) { // Generate grid of similar movies
    if (!movies || movies.length === 0) { // If no similar movies
        return `<p class="muted">No similar movies found.</p>`; // Return message
    }

    const cards = movies.map(m => { // Create a card for each movie
        const poster = m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : ""; // Poster image URL
        const rating = typeof m.vote_average === "number" ? ` - Rating: ${m.vote_average.toFixed(1)}` : ""; // Format rating
        return `
            <div class="card">
                ${poster ? `<img src="${poster}" alt="${escapeHTML(m.title)}">` : `<div class="no poster"></div>`}
                <h3>${escapeHTML(m.title)}</h3>
                <p class="small">${m.release_date ? escapeHTML(m.release_date) : "Release date N/A"} ${rating}</p>
                </div>
                `;
    });

    const enhanced = []; // Enhance each card with a class
    cards.forEach(html => enhanced.push(html));

    return `
        <h2 class="section-title">Movies similar to <em>${escapeHTML(chosenTitle)}</em>:</h2>
        <div class="grid">${enhanced.join("")}</div>
    `;
}

async function tmdbSearchMovie(q) { // Search for movies on TMDb
    const r = await fetch(`${TMDB_BASE}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}`); // Fetch search results
    if (!r.ok) throw new Error(`TMDb search failed: ${r.status}`); // Throw error if request failed
    return r.json(); // Return JSON response
}
async function tmdbSimilar(id) { // Fetch similar movies from TMDb
    const r = await fetch(`${TMDB_BASE}/movie/${id}/similar?api_key=${API_KEY}`); // Fetch similar movies
    if (!r.ok) throw new Error(`TMDb similar failed: ${r.status}`); // Throw error if request failed
    return r.json(); // Return JSON response
}

app.get("/search", (req, res) => { // Redirect GET /search to home
    res.redirect("/"); // Redirect to home
});

app.post("/search", async (req, res) => { // Handle movie search
    const query = (req.body.query || "").trim(); // Get and trim query
    if (!query) { // If query is empty
        return res.send(page({ title: "Similar Movies", heading: "Find Similar Movies", subtext: "Please enter a movie title." })); // Prompt for input
    }

    try { // Try to search for movies
        const search = await tmdbSearchMovie(query); // Perform search
        const results = search.results || []; // Get results array
        if (results.length ===0) { // If no results found
            return res.send(page({ // Show no results message
                title: "Similar Movies", // Page title
                heading: "Find Similar Movies", // Page heading
                subtext: `No results found for "${escapeHTML(query)}". Try another title.` // No results message
            }));
        }

        const body = selectionForm(results, query); // Generate selection form
        res.send(page({ // Send response with selection form
            title: "Similar Movies", // Page title
            heading: "Find Similar Movies", // Page heading
            subtext: `Showing results for "${escapeHTML(query)}". Choose one below.`, 
            body
        }));
    } catch (err) { // Catch and handle errors
        res.send(page({ // Send error page
            title: "Similar Movies", // Page title
            heading: "Find Similar Movies", // Page heading
            subtext: `Error: ${escapeHTML(err.message)}` // Error message
        }));
    }
});

app.post("/choose", async (req, res) => { // Handle movie selection and show similar movies
    const id = (req.body.id || "").trim(); // Get selected movie ID
    const chosenTitle = req.body[`t_${id}`] || "Selected Movie"; // Get chosen movie title
    const originalQuery = (req.body.originalQuery || ""); // Get original search query

    if (!id) return res.redirect("/"); // Redirect if no ID

    try { // Try to fetch similar movies
        const similar = await tmdbSimilar(id); // Fetch similar movies
        const body = similarGrid(chosenTitle, similar.results || []); // Generate similar movies grid
        res.send(page({ // Send response with similar movies
            title: `Similar to ${chosenTitle}`, // Page title
            heading: "Find Similar Movies", // Page heading
            subtext: `You selected "${escapeHTML(chosenTitle)}" (searched: "${escapeHTML(originalQuery)}").`, // Subtext with chosen movie
            body // Body with similar movies grid
        }));
    } catch (err) { // Catch and handle errors
        res.send(page({ // Send error page
            title: "Similar Movies", // Page title
            heading: "Find Similar Movies", // Page heading
            subtext: `Error: ${escapeHTML(err.message)}` // Error message
        }));
    }
});
 
app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`)); // Start server and log URL