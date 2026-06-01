# Gmail Resizable Sidebar

Firefox extension: drag the right edge of Gmail’s left sidebar to make it wider. Useful when long label names get cut off.

## Install

**From source:** `about:debugging` → This Firefox → Load Temporary Add-on → pick `extension/manifest.json`. Gone after a browser restart unless you sign or publish it.

**From CI:** download the `.zip` from Actions → *Build extension ZIP* → Artifacts, unzip, load `manifest.json` the same way.

## Use

Open Gmail, drag the right edge of the sidebar (cursor changes to ↔). Width is remembered.

## Caveats

- `mail.google.com` only
- May break if Gmail changes their layout
- Icon-only collapsed sidebar isn’t affected
