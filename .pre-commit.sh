#!/bin/sh
jsfiles=$(git diff --staged --diff-filter=dx --name-only HEAD | grep ".*\.js$")
[ -z "$jsfiles" ] && exit 0

# js-beautify all the .js files
echo "$jsfiles" | xargs -n 1 js-beautify -r

# Add the files back to staging in Git
echo "$jsfiles" | xargs git add

exit 0
