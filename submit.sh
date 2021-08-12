set -e # exit on error

BASEDIR=$(dirname "$0")
cd $BASEDIR/bazel-bin/dist
zip -r "$BASEDIR/dist.zip" .
cd ../../

echo "Zip File Created."