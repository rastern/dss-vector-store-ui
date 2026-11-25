# Vector Store UI Plugin

## Intended effects

In the built-in **Embed Dataset** creation dialog, this plugin:

- Hides local vector stores: ChromaDB, FAISS, Milvus local, and Qdrant local.
- Retains remote vector stores while preserving DSS’s existing exclusions.
- Clears local default selections and requires a remote store and connection before creating the recipe.

The customization applies only to this creation dialog. Existing Knowledge Banks and API access are unaffected.

## Installation

Package the contents of `source/` with `plugin.json` at the ZIP root. From the project directory:

```sh
cd source
zip -r ../vector-store-ui-0.1.0.zip plugin.json js -x '*.DS_Store'
```

As a DSS administrator, upload the ZIP through **Plugins → Add plugin → Upload**. Reload the plugin if prompted, then fully refresh all open DSS browser tabs.

Inside a project, open a dataset and choose **Embed Dataset**. Select a remote vector store and its connection. All local vector stores should be removed from the list.

No Python code environment or additional packages are required.
>>>>>>> 5094acb (Add initial plugin version)
