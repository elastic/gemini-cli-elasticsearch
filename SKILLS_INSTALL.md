# Installing skills

This extension includes an install script that fetches skills directly from GitHub -- no Git installation needed.

From inside a **Gemini CLI session**, activate shell mode with the `!` prefix:

```sh
! node ~/.gemini/extensions/elasticsearch/skills.js --list
! node ~/.gemini/extensions/elasticsearch/skills.js --install elasticsearch-esql cloud-setup
! node ~/.gemini/extensions/elasticsearch/skills.js --install 1 5 9
! node ~/.gemini/extensions/elasticsearch/skills.js --install --interactive
! node ~/.gemini/extensions/elasticsearch/skills.js --install-all
! node ~/.gemini/extensions/elasticsearch/skills.js --uninstall elasticsearch-esql
```

Or from **any terminal**:

```sh
node <extension-path>/skills.js --list
node <extension-path>/skills.js --install elasticsearch-esql
node <extension-path>/skills.js --install --interactive
node <extension-path>/skills.js --install-all
node <extension-path>/skills.js --uninstall elasticsearch-esql
```

Run `gemini extensions list` to find your extension path (typically `~/.gemini/extensions/elasticsearch`).

The `--list` command shows all available skills numbered by domain. You can install by name (`--install elasticsearch-esql`) or by number (`--install 9`), and mix both (`--install 1 elasticsearch-esql 12`).

You can also use interactive multi-selection with checkboxes (`[ ]` for unselected, `[*]` for selected). Use arrow keys to move, Space to toggle, and Enter to start installation:

```sh
node <extension-path>/skills.js --install --interactive
```

## Install location

Skills are always installed to the `skills/` directory at the root of the extension folder, next to `skills.js`. The folder is created automatically if it does not exist.

## Caching

The skill list is cached locally for 24 hours to avoid repeated GitHub API calls. To force a fresh fetch:

```sh
! node ~/.gemini/extensions/elasticsearch/skills.js --list --refresh
```

## Verify installed skills

After installing, reload skills in your current session or restart Gemini CLI:

```sh
/skills reload
gemini skills list
```

> **Note:** Requires Node.js 18+ and an internet connection. Files are fetched directly from the GitHub API.