# How to regenerate schemas

In the root directory of the project, simply run the script:
```shell
npm run gen-schemas
```

This will both:
- Recompile the schemas (aka `glib-compile-schemas`).
- Regenerate the Typescript typings, by running the `extract_settings_type_definition` script.
