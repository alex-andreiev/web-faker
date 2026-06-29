# Web Faker

Chrome extension for filling inputs and textareas with random fake data by short commands.

## Features

- Fill active fields with names, emails, text snippets, descriptions, chat messages, movie titles, movie descriptions, or a random Wikipedia summary.
- Trigger replacements by command character, command key, or double key press.
- Configure key-to-dictionary mappings from the popup.
- Configure generated text length range per dictionary. The extension prefers text inside the range and trims by sentence first, then by word when possible.
- Configure Double Key timing globally so normal typing is less likely to trigger replacements.
- Restrict the extension to a configured website list.
- Movie title and movie description dictionaries are linked: after inserting a movie title, the next movie description uses the same movie.
- Wikipedia data is fetched lazily only when the `wikipedia` dictionary is used.

## Install Locally

1. Open `chrome://extensions/` in Chrome.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this project folder.
5. Pin `Web Faker` if you want quick popup access.

After code changes, click `Reload` on the extension card in `chrome://extensions/`.

## Usage

Default mappings:

| Key | Dictionary |
| --- | --- |
| `n` | `names` |
| `e` | `emails` |
| `t` | `texts` |

With the default command character `/`, type a command into an input or textarea:

- `/n` inserts a random name.
- `/e` inserts a random email.
- `/t` inserts a random text snippet.

To use Wikipedia, add or keep a mapping such as `w -> wikipedia`, then type `/w`.

To use linked movie data, map one key to `movie_titles` and another to `movie_descriptions`. Insert a title first, then insert a description; the description will match the last generated title.

## Settings

Open the extension popup and use:

- `Mappings`: configure command keys and dictionaries.
- `Controls`: configure command character, command key, Double Key mode, Double Key delay, and per-dictionary min/max character counts.
- `Websites`: optionally enable the extension only on listed hostnames.

Per-dictionary `Min` or `Max` set to `0` means no limit for that side of the range. `Double key delay` is used only when `Double Key` is enabled.

## IMDb Movie Dataset

The `movie_titles` dictionary is generated from IMDb non-commercial datasets: `title.basics.tsv.gz` and `title.ratings.tsv.gz`. The extension keeps the generated top 1000 locally, so movie commands do not make network requests.

IMDb public datasets do not include plot summaries. For real movie descriptions, use TMDb overviews matched by IMDb ID. TMDb requires an API read access token and attribution according to their terms. Do not commit the token.

To refresh the IMDb top list:

```bash
curl -L --fail --silent --show-error -o /tmp/title.basics.tsv.gz https://datasets.imdbws.com/title.basics.tsv.gz
curl -L --fail --silent --show-error -o /tmp/title.ratings.tsv.gz https://datasets.imdbws.com/title.ratings.tsv.gz
scripts/build_imdb_movies.py
```

To enrich descriptions from TMDb:

```bash
export TMDB_API_KEY=your_tmdb_v4_read_access_token
scripts/enrich_movie_descriptions_tmdb.py --limit 10 --dry-run
scripts/enrich_movie_descriptions_tmdb.py
```

Use `--language en-US`, `--language uk-UA`, or another TMDb language code to choose overview language.

## GitHub Pages

A static landing page is available in `docs/index.html`. In GitHub repository settings, enable Pages from the `main` branch and `/docs` folder.

## Testing

1. Load or reload the unpacked extension.
2. Open a page with an input or textarea.
3. Type `/t`; it should fill immediately from local data.
4. Type `/w`; only this command should call Wikipedia.
5. To verify network behavior, inspect the extension service worker from `chrome://extensions/`, open the `Network` tab, and filter by `wikipedia`.
6. Set dictionary `Min` and `Max` values like `80` and `120`, save settings, and confirm only that dictionary uses that range.
7. Enable `Double Key`, set `Double key delay` to a short value like `200`, and confirm normal words such as `http` do not trigger unless the repeated key is pressed within that interval.

## Project Structure

- `manifest.json`: Chrome extension manifest.
- `src/content.js`: command detection and field replacement logic.
- `src/background.js`: background service worker, including Wikipedia fetch handling.
- `src/data/`: built-in data dictionaries, including generated IMDb movie records.
- `src/popup/`: popup UI, settings, and styles.

## License

MIT. See `LICENSE`.
