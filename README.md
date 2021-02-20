# obsidian-sagecell

Obsidian plugin for embedding Sage computations into notes.

## Installation and Configuration

1. Grab the latest release and copy the obsidian-sagecell directory into `your_obsidian_vault_path/.obsidian/plugins/`.
2. Open your Obsidian settings and enable the plugin in the "Community plugins" page.
3. If necessary, change the plugin's settings by clicking on "SageCell" under "Plugin Options". By default, the SageMathCell server https://sagecell.sagemath.org is used. If you would like to use a different one such as your own locally running server, change the Server URL setting.

## Usage

Include a sage code snippet in a note. When the note gets rendered, the Sage code within it will be executed and the results will be inserted into the preview.