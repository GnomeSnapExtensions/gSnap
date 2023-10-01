import { defineConfig } from 'rollup';
import copy from 'rollup-plugin-copy'

// Let Rollup know that these libraries are known and it should not complain about them,
const externalImports = [
    'gi://St',
    'gi://GLib',
    'gi://Gio',
    'gi://Gtk',
    'gi://GObject',
    'gi://Clutter',
    'resource:///org/gnome/shell/ui/main.js',
    'resource:///org/gnome/shell/ui/panelMenu.js',
    'resource:///org/gnome/shell/ui/popupMenu.js',
    'resource:///org/gnome/shell/ui/modalDialog.js',
    'gi://Meta',
    'gi://Shell',
    'gi://Adw',
    'resource:///org/gnome/shell/extensions/extension.js',
    'resource:///org/gnome/shell/misc/config.js',
    'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'
]

export default defineConfig([
    {
        input: "build/app.js",
        output: {
            file: "dist/extension.js",
            esModule: true,
        },
        plugins: [
            stripExports(),
        ],
        external: externalImports
    },
    {
        input: "build/prefs_builder.js",
        output: {
            file: "dist/prefs.js",
            esModule: true,
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
        ],
        external: externalImports
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