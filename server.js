import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;
const PORT = process.env.PORT || 3000;

if (!API_KEY) {
    console.error("Missing TMDB_API_KEY in .env");
    process.exit(1);
}

app.use(express.urlencoded({ extended: true}));
app.use(express.json());

function escapeHTML(str = "") {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("'", "&#39;");
}

function page({ title, heading, subtext = "", body = "" }) {
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

function selectionForm(results, originalQuery) {
    const options = results.slice(0, 10).map(m => {
        const year = m.release_date ? ` (${m.release_date.slice(0, 4)})` : "";
        const label = `${m.title}${year}`;
        const poster = m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : "";
        return `
            <label class="option">
                <input type="radio" name="id" value="${m.id}" required>
                ${poster ? `<img src="${poster}" alt="${escapeHTML(m.title)}">` : ""}
                <span>${escapeHTML(label)}</span>
            </label>
        `;
    });

    const enhanced = [];
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

function similarGrid(chosenTitle, movies) {
    if (!movies || movies.length === 0) {
        return `<p class="muted">No similar movies found.</p>`;
    }

    const cards = movies.map(m => {
        const poster = m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : "";
        const rating = typeof m.vote_average === "number" ? ` - Rating: ${m.vote_average.toFixed(1)}` : "";
        return `
            <div class="card">
                ${poster ? `<img src="${poster}" alt="${escapeHTML(m.title)}">` : `<div class="no poster"></div>`}
                <h3>${escapeHTML(m.title)}</h3>
                <p class="small">${m.release_date ? escapeHTML(m.release_date) : "Release date N/A"} ${rating}</p>
                </div>
                `;
    });

    const enhanced = [];
    cards.forEach(html => enhanced.push(html));

    return `
        <h2 class="section-title">Movies similar to <em>${escapeHTML(chosenTitle)}</em>:</h2>
        <div class="grid">${enhanced.join("")}</div>
    `;
}

async function tmdbSearchMovie(q) {
    const r = await fetch(`${TMDB_BASE}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error(`TMDb search failed: ${r.status}`);
    return r.json();
}
async function tmdbSimilar(id) {
    const r = await fetch(`${TMDB_BASE}/movie/${id}/similar?api_key=${API_KEY}`);
    if (!r.ok) throw new Error(`TMDb similar failed: ${r.status}`);
    return r.json();
}

app.post("/search", async (req, res) => {
    const query = (req.body.query || "").trim();
    if (!query) {
        return res.send(page({ title: "Similar Movies", heading: "Find Similar Movies", subtext: "Please enter a movie title." }));
    }

    try {
        const search = await tmdbSearchMovie(query);
        const results = search.results || [];
        if (results.length ===0) {
            return res.send(page({
                title: "Similar Movies",
                heading: "Find Similar Movies",
                subtext: `No results found for "${escapeHTML(query)}". Try another title.`
            }));
        }

        const body = selectionForm(results, query);
        res.send(page({
            title: "Similar Movies",
            heading: "Find Similar Movies",
            subtext: `Showing results for "${escapeHTML(query)}". Choose one below.`,
            body
        }));
    } catch (err) {
        res.send(page({
            title: "Similar Movies",
            heading: "Find Similar Movies",
            subtext: `Error: ${escapeHTML(err.message)}`
        }));
    }
});

app.post("/choose", async (req, res) => {
    const id = (req.body.id || "").trim();
    const chosenTitle = req.body[`t_${id}`] || "Selected Movie";
    const originalQuery = (req.body.originalQuery || "");

    if (!id) return res.redirect("/");

    try {
        const similar = await tmdbSimilar(id);
        const body = similarGrid(chosenTitle, similar.results || []);
        res.send(page({
            title: `Similar to ${chosenTitle}`,
            heading: "Find Similar Movies",
            subtext: `You selected "${escapeHTML(chosenTitle)}" (searched: "${escapeHTML(originalQuery)}").`,
            body
        }));
    } catch (err) {
        res.send(page({
            title: "Similar Movies",
            heading: "Find Similar Movies",
            subtext: `Error: ${escapeHTML(err.message)}`
        }));
    }
});

app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));