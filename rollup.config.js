import { defineConfig } from 'rollup';
import copy from 'rollup-plugin-copy'

export default defineConfig([
    {
        input: "build/app.js",
        output: {
            file: "dist/extension.js",
            format: "cjs",
            esModule: false,
        },
        plugins: [
            stripExports(),
        ]
    },
    {
        input: "build/prefs/prefs.js",
        output: {
            file: "dist/prefs.js",
            format: "cjs",
            esModule: false,
        },
        plugins: [
            stripExports(),
            copy({
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
        ]
    }
]);

// Cleans up the generated bundle from lines like exports.XXXX
// This trick is a compromise between using the tree-shaker and
// still have functions that must not be cleaned up (such as
// the extension's enable/disable entrypoints). To let those
// functions live in the tree-shaken bundle, simply declare them
// as exported.
function stripExports() {
    return {
        name: 'strip-exports',
        renderChunk(code) {
            const re = /^exports\.\w+.*(\n|\r\n|)/gm;
            return code.replace(re, '');
        }
    };
}