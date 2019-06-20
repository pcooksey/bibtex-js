#!/bin/bash
jsfiles=$(git diff --cached --diff-filter=dx --name-only HEAD | grep ".*\.js$")
[ -z "$jsfiles" ] && exit 0

if ! [ -x "$(command -v js-beautify)" ]; then
    echo 'Error: js-beautify is not installed.' >&2
    exit 1
fi

# temp commit of your staged changes:
git commit --no-verify --message "WIP"

# Stash unstaged changes
STASH_NAME="pre-commit-$(date +%s)"
git stash save -q --keep-index $STASH_NAME

# now un-commit WIP commit:
git reset --soft HEAD^

# js-beautify all the .js files
for f in ${jsfiles[@]}; do
    js-beautify -r $f
    echo $f
done

# Stage updated files
git add -u

# Re-apply original unstaged changes
if [[ $(git stash list -n 1 --grep $STASH_NAME) ]]; then
    git stash pop -q
fi

exit 0
