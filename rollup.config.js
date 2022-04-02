import { defineConfig } from 'rollup';
import copy from 'rollup-plugin-copy'

export default defineConfig([
    {
        input: "build/app.js",
        output: {
            file: "dist/extension.js",
            format: "cjs"
        },
    },
    {
        input: "build/prefs_builder.js",
        output: {
            file: "dist/prefs.js",
            format: "cjs"
        },
        plugins: copy({
            targets: [
                { src: 'LICENSE', dest: 'dist/' },
                { src: 'src/metadata.json', dest: 'dist/' },
                { src: 'src/layouts-default.json', dest: 'dist/' },
                { src: 'src/stylesheet.css', dest: 'dist/' },
                { src: 'src/images', dest: 'dist/' },
                { src: 'src/schemas/gschemas.compiled', dest: 'dist/schemas' },
                { src: 'src/schemas/org.gnome.shell.extensions.gsnap.gschema.xml', dest: 'dist/schemas' },
            ]
        })
    }
]);