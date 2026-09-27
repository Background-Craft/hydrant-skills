# Hydrant

Your agent has confidence. Give it a paper trail.

Hydrant tracks issues, projects and the decisions that otherwise disappear into chat history. This plugin connects Claude Code to one Hydrant workspace and gives it the `hydrant` skill: read the context, do the requested work, check the result, and bring receipts. “Done” is a claim. We'd like some evidence.

Using Cursor? See [Hydrant for Cursor](./CURSOR.md) for its installation and connection steps.

## Two commands. Then permission.

You need a [Hydrant account](https://hydrant.dev) and a workspace you can access. Install from this repository's marketplace:

```sh
claude plugin marketplace add Background-Craft/hydrant-skills
claude plugin install hydrant@hydrant
```

In Claude Code, run `/mcp`, select `plugin:hydrant:hydrant`, and choose Authenticate. Sign in to Hydrant in your browser, check the workspace name, and choose **Read only** or **Read and write** before approving. No API key to fish out of a dashboard and paste into a file.

Ask the agent to show the connected workspace first. Then try:

- “Summarize my open issues.”
- “Read this issue and its history. Tell me what's still undecided.”
- “Create an issue for this bug.”

The skill tells the agent to read before writing, use request IDs and versions, and read back its changes. If a write is unconfirmed, it should say so. Optimism is not a database query.

## One workspace. Not the keys to the building.

The plugin connects to `https://hydrant.dev/api/mcp`. **Read only** lets it inspect the approved workspace. **Read and write** also allows issue creation, edits and comments within your role. Other workspaces are outside that connection's grant.

Keep client approvals enabled. The skill supplies instructions; Hydrant enforces workspace and access limits. Installing a skill is not permission to do whatever it suggests.

## Your repo still makes the rules.

This plugin includes the base `hydrant` skill. Want capture, refinement, implementation and release procedures too? Install the workflow pack separately with `hydrant-setup`. It uses your repository's build, review and release rules. We haven't met your deploy process. We won't pretend we have.

## Leaving? No exit interview.

```sh
claude plugin uninstall hydrant@hydrant
```

That removes the plugin from Claude Code. To revoke its Hydrant access, also revoke the connection under **Settings → Agents → Access**. Uninstalling and revoking are separate actions.

Install from this repository's marketplace. Not yet listed in Anthropic's plugin directory.

[Setup and troubleshooting](https://hydrant.dev/help/agents/connect) · [Privacy](https://hydrant.dev/privacy) · [Terms](https://hydrant.dev/terms) · [Support](mailto:bots@hydrant.dev)

Background Craft LLC. MIT licensed.
