#!/bin/bash
set -euo pipefail

# create-test-tag.sh - Create @test tag for testing unreleased features
# Usage: ./scripts/create-test-tag.sh [commit-hash]

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Get commit hash (default to HEAD)
COMMIT_HASH="${1:-HEAD}"

# Get actual commit hash if HEAD or branch name was provided
COMMIT_HASH=$(git rev-parse "$COMMIT_HASH")
SHORT_HASH=$(git rev-parse --short "$COMMIT_HASH")

print_info "Creating @test tag for commit ${SHORT_HASH}"

# Check if commit exists
if ! git cat-file -e "$COMMIT_HASH" 2>/dev/null; then
    print_error "Commit ${COMMIT_HASH} does not exist"
    exit 1
fi

# Get commit message
COMMIT_MSG=$(git log -1 --pretty=%B "$COMMIT_HASH")
print_info "Commit message: ${COMMIT_MSG}"

# Ask for confirmation
echo ""
print_warning "This will:"
echo "  1. Delete existing 'test' tag (if exists)"
echo "  2. Create new 'test' tag pointing to ${SHORT_HASH}"
echo "  3. Force push to origin (will update @test reference)"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Aborted"
    exit 0
fi

# Delete local tag if exists
if git tag -l | grep -q "^test$"; then
    print_info "Deleting existing local 'test' tag"
    git tag -d test
fi

# Create new tag
print_info "Creating new 'test' tag"
git tag -a test "$COMMIT_HASH" -m "Test tag for unreleased features

Commit: ${COMMIT_HASH}
${COMMIT_MSG}

This tag is used for testing unreleased features in .github/workflows/test-pr-labeler.yml
"

# Push tag (force to overwrite remote)
print_info "Pushing 'test' tag to origin (force)"
git push origin test --force

print_info "✅ Successfully created @test tag"
echo ""
print_info "Usage in workflows:"
echo "  uses: jey3dayo/pr-insights-labeler@test"
echo ""
print_info "To verify:"
echo "  git show test"
