# gSnap development

### Installation from Source

Even an everyday user may wish to install the latest version from GitHub. It's
easy:

1. Clone the repository to a folder of your choice.

```shell
git clone https://github.com/Yan-Solo/gSnap.git
```

2. Build and install

You will need to [install
Bazel](https://docs.bazel.build/versions/master/install-ubuntu.html) on your
system to run the build tool. Then, you can run the installation script to
install to `$HOME/.local/share/gnome-shell/extensions/gSnap@Yan-Solo`.

```shell
bazel run :install-extension
```

### Development cycle

Generally, 

1. Code
2. Run `glib-compile-schemas schemas` (if you modified [the schema](/schemas/org.gnome.shell.extensions.gsnap.gschema.xml))
3. Run the `install-extension` command above
4. If 2 succeeded, hit `Alt`+`F2`, type `r`, and hit enter.

#### Dependency management

For the most part, look at `WORKSPACE` and `BUILD.bazel` to inspect the
dependencies within the project.

It may not be necessary for you to run yarn, but it may help your editor with
code completion. Historically, bazel gave errors if you did not run this command
first, but not anymore:

```shell
bazel run @nodejs//:yarn
```

To add a new "dev" dependency:

```shell
bazel run @nodejs//:yarn -- add --dev "@bazel/karma"
```
To view the logs
```shell
journalctl /usr/bin/gnome-shell -f -o cat
```