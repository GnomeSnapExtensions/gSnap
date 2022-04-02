# gSnap development

### Installation from Source

Even an everyday user may wish to install the latest version from GitHub. It's
easy:

1. Clone the repository to a folder of your choice.

```shell
git clone https://github.com/micahosborne/gSnap.git
```

2. Build and install

You will need to [install NodeJS](https://nodejs.org) on your
system to run the build tool. Then, you can run the installation script to
install to `$HOME/.local/share/gnome-shell/extensions/gSnap@micahosborne`.

```shell
npm run install-extension
```

The build process involves two steps:
1. The Typescript compiler transpiles .ts files into .js files
2. Rollup bundles the compiled js files into "**extension.js**" and "**prefs.js**", which are the main required files for a Gnome Shell extension.

Both can be configured by editing **tsconfig.json** and **rollup.config.js**

### Development cycle

Generally, 

1. Code
2. Run `glib-compile-schemas src/schemas` (if you modified [the schema](/src/schemas/org.gnome.shell.extensions.gsnap.gschema.xml))
3. Run the `install-extension` command above
4. If 2 succeeded, hit `Alt`+`F2`, type `r`, and hit enter.

#### Dependency management

Every dependency is handled by npm. To add a new "dev" dependency:

```shell
npm add -D "<dependency>"
```
To view the logs
```shell
journalctl /usr/bin/gnome-shell -f -o cat
```


#### Submitting to review
To obtain the ZIP archive for review, simply run;

```shell
npm run pack
```