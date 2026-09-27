# Hydrant for Cursor

Bring the ticket into the conversation. This package contains Hydrant's remote MCP configuration and the base `hydrant` skill. It adds no hooks, local server or workflow-pack skills.

**Verification status:** local discovery of the logo, version, one MCP server and one skill was observed in Cursor 3.21.16 on macOS. Cursor preserved an existing manual Hydrant server and left the plugin source disabled. A local version-change probe appeared in Cursor, and moving the test package out removed its plugin and skill while the manual server remained. The real desktop OAuth attempt currently fails during client registration: Hydrant rejects Cursor’s `cursor://anysphere.cursor-mcp/oauth/callback` redirect before sign-in. Callback compatibility is being addressed in Hydrant issue #385; synthetic writes and plugin-source disable/reconnect remain unverified. The package has not been submitted to Cursor Marketplace or cursor.directory.

## Install from a reviewed checkout

Use a reviewed release or commit of [hydrant-skills](https://github.com/Background-Craft/hydrant-skills). Run these commands from its repository root. Node 20+ is needed only for the package checks.

```sh
node scripts/validate-frontmatter.mjs &&
node scripts/check-plugin.mjs &&
mkdir -p "$HOME/.cursor/plugins/local" &&
test ! -e "$HOME/.cursor/plugins/local/hydrant" &&
test ! -L "$HOME/.cursor/plugins/local/hydrant" &&
cp -R plugins/hydrant "$HOME/.cursor/plugins/local/hydrant"
```

If the last command refuses to copy, inspect the existing install first; do not overwrite it. Copy the directory, not a symlink to this checkout. The copied package includes hidden manifest files and the shared skill. It does not edit your MCP configuration or instructions files.

Open **Customize** in Cursor and search for **Hydrant**. If it has not appeared, use **Developer: Reload Window**. Confirm the version and the one bundled skill and MCP server. Local imports may be restricted by your team policy; ask the administrator rather than changing that policy. A marketplace install with the same name can take precedence over a local copy. See [Cursor's local-plugin instructions](https://cursor.com/docs/plugins#test-plugins-locally).

## Connect deliberately

Open **Configure Hydrant**. If you already configured the server manually, Cursor can show both **User** and **Plugin hydrant** sources. In the observed test, User remained on and Plugin remained off. A Connected badge in that state proves the existing connection, not a fresh plugin sign-in. Keep your existing configuration unless you deliberately choose to replace it.

For a fresh connection, use Cursor's authentication control. Sign in to Hydrant with GitHub and approve only the intended workspace and access. No API key belongs in this package. Ask Cursor to call `get_workspace` and report the name and UUID before requesting writes. Keep client approval prompts enabled.

OAuth's full return journey for this package still needs verification. If authentication fails, retain the error and use [Hydrant's troubleshooting guide](https://hydrant.dev/help/agents/troubleshooting); do not disable redirect checks or paste a secret into the plugin. Revoke a wrong-workspace connection in **Hydrant → Settings → Agents → Access**, then reconnect to the correct workspace.

## Update, disable and remove

- **Update:** validate the new checkout, move the old `~/.cursor/plugins/local/hydrant` directory to a backup outside `~/.cursor/plugins/local`, then copy the new `plugins/hydrant` directory using the guarded command above. Reload Cursor and confirm the version and components. Keep local edits in the backup; do not overlay old and new files. Restore the backup if the new package fails.
- **Disable MCP:** in Configure Hydrant, turn off the Plugin source. This does not disable a separate User source or revoke its grant. The skill can still be present while its server is disabled.
- **Remove the local package:** move its directory outside `~/.cursor/plugins/local` and reload. Confirm the plugin and its skill disappear while unrelated plugins and manual servers remain. Keep the moved directory if you want a reversible removal.
- **Revoke access separately:** removing files does not itself revoke a Hydrant OAuth grant. Revoke only the connection you intend to retire under **Settings → Agents → Access**. Do not log out or revoke a shared manual connection merely to remove the package.

If you already have a standalone `hydrant` skill, preserve it and check which copy Cursor loads before using the package. Same-name skill precedence still needs verification. Do not overwrite your own skill to make the package load.

## Publisher checklist

Publisher: **Background Craft LLC**. Listing name: **Hydrant**. License: **MIT**. Contact: **bots@hydrant.dev**.

Suggested description: “Bring Hydrant issues into Cursor. Read the work, make the changes you were asked for, and leave receipts.”

Use the repository's `.cursor-plugin/marketplace.json` to locate this package and its `.cursor-plugin/plugin.json`. The logo is `assets/logo.png`; the base skill and `.mcp.json` are shared with Codex. Do not fork their contents for a listing. Links: [setup](https://hydrant.dev/help/agents/connect), [support](https://hydrant.dev/help/agents/troubleshooting), [privacy](https://hydrant.dev/privacy), [terms](https://hydrant.dev/terms).

| Surface | Submission route | Current state |
| --- | --- | --- |
| Official Cursor Marketplace | [Publisher application](https://cursor.com/marketplace/publish) | Not submitted; sign-in is required to see the application |
| Community cursor.directory | [Submit a plugin](https://cursor.directory/plugins/new) | Not submitted; redirects to sign-in before showing its fields and review terms |

Before requesting submission approval, finish real-client OAuth and synthetic write/read-back checks, canceled consent, grant denial, expiry/reconnect, revocation and package lifecycle checks in an isolated test environment. Record the tested commit and client version, review the rendered instructions and assets for design and voice, and resolve findings. Use only authorized synthetic data in screenshots. Confirm authenticated form fields, required image dimensions and the publisher account; do not guess from another directory's form.

Submit only with explicit approval. Keep each submission's ID or receipt, URL, revision, date and review feedback on the delivery issue. A submitted form is not an accepted listing. Do not claim endorsement or a public install path until it has been verified.
