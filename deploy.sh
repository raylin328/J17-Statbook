#!/bin/bash
VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./deploy.sh <version> (e.g., ./deploy.sh 4.5)"
  exit 1
fi
FILE="j17-statbook-v${VERSION}.html"
[ ! -f "$FILE" ] && echo "Error: $FILE not found" && exit 1
mkdir -p versions/v${VERSION}
cp "$FILE" versions/v${VERSION}/index.html
cp "$FILE" versions/latest/index.html
git add versions/
git commit -m "Deploy v${VERSION}"
git push
echo "✓ v${VERSION} live at: https://raylin328.github.io/J17-Statbook/v${VERSION}/"
