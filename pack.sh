#!/bin/bash
# Pack extension for upload to EGO

sed -i '/^\/\/\# sourceMappingURL=/d' extension.js

gnome-extensions pack -f \
--extra-source hotkeys.js \
--extra-source logging.js \
--extra-source shellversion.js \
--extra-source images \
--extra-source LICENSE \
--extra-source README.md

unzip -l gSnap@Yan-Solo.shell-extension.zip

