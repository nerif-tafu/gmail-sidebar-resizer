# Gmail Resizable Sidebar

Firefox extension: drag the right edge of Gmail’s left sidebar to make it wider. Useful when long label names get cut off.

## Install

**From source:** `about:debugging` → This Firefox → Load Temporary Add-on → pick `extension/manifest.json`. Gone after a browser restart unless you sign or publish it.

**From CI:** download the `.zip` from [Releases](https://github.com/nerif-tafu/gmail-sidebar-resizer/releases), unzip, then load `manifest.json` via `about:debugging` (same as above). Installing the zip under `about:addons` in regular Firefox will fail — it isn’t signed by Mozilla.

### “Could not be installed because it has not been verified”

This add-on isn’t signed by Mozilla ([why](https://support.mozilla.org/kb/add-on-signing-in-firefox)).

**Normal Firefox (Release or Beta):** `xpinstall.signatures.required` → `false` in `about:config` does **nothing**. Mozilla ignores that pref on Release/Beta ([bug 1298806](https://bugzilla.mozilla.org/show_bug.cgi?id=1298806)). Installing the zip from `about:addons` will keep failing.

What works on any Firefox:

`about:debugging` → **This Firefox** → **Load Temporary Add-on** → `manifest.json` from the unzipped release. Reload after each browser restart.

**Permanent unsigned install:**

1. Use [Firefox Developer Edition](https://www.mozilla.org/firefox/developer/) or [Nightly](https://www.mozilla.org/firefox/channel/desktop/#nightly) — not regular Firefox.
2. `about:support` → **Update Channel** should be `aurora` or `nightly`, not `release`.
3. `about:config` → `xpinstall.signatures.required` = **false** → quit Firefox completely and reopen.
4. `about:addons` → gear → **Install Add-on From File…** → the release `.zip`.

ESR can disable signing the same way. Release cannot.

## Use

Open Gmail, drag the right edge of the sidebar (cursor changes to ↔). Width is remembered.
