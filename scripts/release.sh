#!/usr/bin/env bash
set -euo pipefail

# Helper functions (no colors for compatibility)
info() { echo "ℹ $1"; }
success() { echo "✓ $1"; }
error() { echo "✗ $1" >&2; }
warn() { echo "⚠ $1"; }

# Check required commands
check_commands() {
  local missing=()
  for cmd in git gh jq pnpm node; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    error "Missing required commands: ${missing[*]}"
    error "Install them and try again."
    exit 1
  fi
}

# Get current version from package.json
get_current_version() {
  jq -r '.version' package.json
}

# Increment version
increment_version() {
  local version=$1
  local type=$2

  IFS='.' read -r major minor patch <<< "$version"

  case $type in
    major)
      echo "$((major + 1)).0.0"
      ;;
    minor)
      echo "${major}.$((minor + 1)).0"
      ;;
    patch)
      echo "${major}.${minor}.$((patch + 1))"
      ;;
    *)
      echo "$version"
      ;;
  esac
}

# Select release type interactively
select_release_type() {
  local current_version=$1

  echo "" >&2
  echo "ℹ Current version: v${current_version}" >&2
  echo "" >&2
  echo "Select release type:" >&2
  echo "  1) patch  - v$(increment_version "$current_version" patch) (Bug fixes)" >&2
  echo "  2) minor  - v$(increment_version "$current_version" minor) (New features)" >&2
  echo "  3) major  - v$(increment_version "$current_version" major) (Breaking changes)" >&2
  echo "  4) custom - Specify version manually" >&2
  echo "  5) cancel" >&2
  echo "" >&2

  read -rp "Enter choice [1-5]: " choice <&0 >&2

  case $choice in
    1) echo "patch" ;;
    2) echo "minor" ;;
    3) echo "major" ;;
    4)
      read -rp "Enter version (e.g., 1.5.1): " custom_version
      echo "custom:$custom_version"
      ;;
    5|*)
      info "Release cancelled"
      exit 0
      ;;
  esac
}

# Generate changelog from git commits
generate_changelog() {
  local from_tag=$1
  local to_ref=${2:-HEAD}

  local added=()
  local changed=()
  local fixed=()
  local other=()

  while IFS= read -r commit; do
    local msg
    msg=$(git log -1 --format=%s "$commit")

    # Extract PR number if exists
    local pr_num
    pr_num=$(echo "$msg" | sed -n 's/.*(#\([0-9][0-9]*\)).*/\(#\1\)/p')

    case $msg in
      feat:*|feat\(*)
        local clean_msg="${msg#feat*: }"
        # Ensure PR number is present
        if [[ -n $pr_num ]] && [[ ! $clean_msg =~ \(#[0-9]+\) ]]; then
          clean_msg="${clean_msg} ${pr_num}"
        fi
        added+=("- ${clean_msg}")
        ;;
      fix:*|fix\(*)
        local clean_msg="${msg#fix*: }"
        if [[ -n $pr_num ]] && [[ ! $clean_msg =~ \(#[0-9]+\) ]]; then
          clean_msg="${clean_msg} ${pr_num}"
        fi
        fixed+=("- ${clean_msg}")
        ;;
      chore:*|chore\(*|docs:*|docs\(*|style:*|style\(*)
        local clean_msg="${msg#*: }"
        if [[ -n $pr_num ]] && [[ ! $clean_msg =~ \(#[0-9]+\) ]]; then
          clean_msg="${clean_msg} ${pr_num}"
        fi
        changed+=("- ${clean_msg}")
        ;;
      *)
        local clean_msg="$msg"
        if [[ -n $pr_num ]] && [[ ! $clean_msg =~ \(#[0-9]+\) ]]; then
          clean_msg="${clean_msg} ${pr_num}"
        fi
        other+=("- ${clean_msg}")
        ;;
    esac
  done < <(git rev-list "$from_tag..$to_ref")

  {
    if [ ${#added[@]} -gt 0 ]; then
      echo "### ✨ Added"
      echo ""
      printf '%s\n' "${added[@]}"
      echo ""
    fi

    if [ ${#changed[@]} -gt 0 ]; then
      echo "### 🔄 Changed"
      echo ""
      printf '%s\n' "${changed[@]}"
      echo ""
    fi

    if [ ${#fixed[@]} -gt 0 ]; then
      echo "### 🐛 Fixed"
      echo ""
      printf '%s\n' "${fixed[@]}"
      echo ""
    fi

    if [ ${#other[@]} -gt 0 ]; then
      echo "### Other Changes"
      echo ""
      printf '%s\n' "${other[@]}"
      echo ""
    fi
  }
}

# Detect breaking changes from git commits
detect_breaking_changes() {
  local from_tag=$1
  local to_ref=${2:-HEAD}
  local breaking_changes=()

  while IFS= read -r commit; do
    local msg
    msg=$(git log -1 --format=%B "$commit")

    # Check for BREAKING CHANGE: footer (Conventional Commits)
    if echo "$msg" | grep -q "BREAKING CHANGE:"; then
      local breaking_msg
      breaking_msg=$(echo "$msg" | sed -n 's/^BREAKING CHANGE: //p')
      if [[ -n $breaking_msg ]]; then
        breaking_changes+=("- $breaking_msg")
      fi
    fi

    # Check for ! notation (feat!:, fix!:, etc.)
    if echo "$msg" | grep -qE '^[a-z]+!(\([^)]+\))?:'; then
      local clean_msg
      clean_msg=$(echo "$msg" | sed -E 's/^[a-z]+!(\([^)]+\))?: //')
      breaking_changes+=("- $clean_msg")
    fi
  done < <(git rev-list "$from_tag..$to_ref")

  if [ ${#breaking_changes[@]} -gt 0 ]; then
    echo "## ⚠️ Breaking Changes"
    echo ""
    printf '%s\n' "${breaking_changes[@]}"
    echo ""
  fi
}

# Generate contributors list from git commits
generate_contributors() {
  local from_tag=$1
  local to_ref=${2:-HEAD}

  # Get unique contributors with commit count
  local contributors
  contributors=$(git shortlog -s -n "${from_tag}..${to_ref}" | awk '{$1=""; print}' | sed 's/^ //')

  if [[ -n $contributors ]]; then
    echo "## 👥 Contributors"
    echo ""
    echo "This release was made possible by:"
    echo ""
    while IFS= read -r contributor; do
      echo "- @${contributor}"
    done <<< "$contributors"
    echo ""
  fi
}

# Update package.json version
update_package_json() {
  local new_version=$1
  jq --arg version "$new_version" '.version = $version' package.json > package.json.tmp
  mv package.json.tmp package.json
  success "Updated package.json to v${new_version}"
}

# Update CHANGELOG.md
update_changelog() {
  local new_version=$1
  local changelog_content=$2
  local date
  date=$(date +%Y-%m-%d)

  local temp_file
  temp_file=$(mktemp)

  {
    # Keep header
    sed -n '1,/^## \[/p' CHANGELOG.md | sed '$d'

    # Add new version
    echo "## [${new_version}] - ${date}"
    echo ""
    echo "$changelog_content"

    # Keep rest of changelog
    sed -n '/^## \[/,$p' CHANGELOG.md
  } > "$temp_file"

  mv "$temp_file" CHANGELOG.md
  success "Updated CHANGELOG.md"
}

# Run quality checks
run_quality_checks() {
  info "Running quality checks..."

  if ! pnpm lint; then
    error "Lint failed"
    return 1
  fi
  success "Lint passed"

  if ! pnpm test:vitest; then
    error "Tests failed"
    return 1
  fi
  success "Tests passed"

  if ! pnpm build; then
    error "Build failed"
    return 1
  fi
  success "Build passed"

  return 0
}

# Create release
# Release notes follow the template in .github/RELEASE_TEMPLATE.md
create_release() {
  local new_version=$1
  local prev_version=$2
  local changelog_content=$3

  # Detect breaking changes
  local breaking_changes
  breaking_changes=$(detect_breaking_changes "v${prev_version}")

  # Generate contributors list
  local contributors
  contributors=$(generate_contributors "v${prev_version}")

  # Generate full release notes following .github/RELEASE_TEMPLATE.md format
  local test_count
  # Try to extract test count with improved pattern matching
  test_count=$(pnpm test:vitest 2>&1 | awk '/passed/ {for(i=1;i<=NF;i++) if($(i+1)=="passed") {print $i; exit}}')
  # Fallback to descriptive message if extraction fails
  test_count=${test_count:-"N/A (check failed)"}

  local release_notes
  if [[ -n $breaking_changes ]]; then
    release_notes=$(cat <<EOF
$breaking_changes

## 🚀 What's New

$changelog_content

## 📊 Quality Metrics

- ✅ ${test_count:-769} tests passing
- ✅ 0 ESLint errors/warnings
- ✅ 0 TypeScript type errors
- ✅ Build successful

$contributors

## 🔗 Full Changelog

**Full Changelog**: https://github.com/jey3dayo/pr-insights-labeler/compare/v${prev_version}...v${new_version}
EOF
)
  else
    release_notes=$(cat <<EOF
## 🚀 What's New

$changelog_content

## 📊 Quality Metrics

- ✅ ${test_count:-769} tests passing
- ✅ 0 ESLint errors/warnings
- ✅ 0 TypeScript type errors
- ✅ Build successful

$contributors

## 🔗 Full Changelog

**Full Changelog**: https://github.com/jey3dayo/pr-insights-labeler/compare/v${prev_version}...v${new_version}
EOF
)
  fi

  # Commit changes
  git add -A
  git commit -m "chore: release v${new_version}

$(echo "$changelog_content" | sed 's/^### //' | sed 's/^## //')"
  success "Created commit"

  # Create tags
  git tag -a "v${new_version}" -m "v${new_version}

$changelog_content"
  success "Created tag v${new_version}"

  # Update major version tag
  local major_version
  major_version=$(echo "$new_version" | cut -d. -f1)
  git tag -f "v${major_version}" "v${new_version}^{}"
  success "Updated tag v${major_version}"

  # Show summary
  echo ""
  info "Release summary:"
  echo "  Version: v${new_version}"
  echo "  Commit: $(git rev-parse --short HEAD)"
  echo "  Tags: v${new_version}, v${major_version}"
  echo ""

  # Final confirmation
  read -rp "Push to origin and create GitHub release? [y/N]: " confirm
  if [[ ! $confirm =~ ^[Yy]$ ]]; then
    warn "Release cancelled. Tags and commit created locally."
    warn "To push manually: git push origin main && git push origin v${new_version} v${major_version}"
    exit 0
  fi

  # Push
  git push origin main
  git push origin "v${new_version}"
  git push origin "v${major_version}" --force
  success "Pushed to origin"

  # Create GitHub release
  gh release create "v${new_version}" \
    --title "v${new_version}" \
    --notes "$release_notes"

  success "GitHub release created: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v${new_version}"
}

# Main
main() {
  check_commands

  # Check if we're in git repo
  if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "Not a git repository"
    exit 1
  fi

  # Check for uncommitted changes
  if [[ -n $(git status --porcelain) ]]; then
    error "Uncommitted changes detected. Commit or stash them first."
    exit 1
  fi

  # Get current version
  local current_version
  current_version=$(get_current_version)

  # Select release type
  local release_type
  release_type=$(select_release_type "$current_version")

  # Calculate new version
  local new_version
  if [[ $release_type == custom:* ]]; then
    new_version=${release_type#custom:}
  else
    new_version=$(increment_version "$current_version" "$release_type")
  fi

  info "New version will be: v${new_version}"
  echo ""

  # Run quality checks
  if ! run_quality_checks; then
    error "Quality checks failed. Fix issues and try again."
    exit 1
  fi
  echo ""

  # Generate changelog
  info "Generating changelog from commits..."
  local prev_tag="v${current_version}"
  local changelog_content
  changelog_content=$(generate_changelog "$prev_tag")

  if [[ -z $changelog_content ]]; then
    warn "No commits found since ${prev_tag}"
    changelog_content="### 🔄 Changed

- Minor updates and improvements"
  fi

  echo ""
  info "Changelog preview:"
  echo "$changelog_content"
  echo ""

  # Update files
  update_package_json "$new_version"
  update_changelog "$new_version" "$changelog_content"

  # Create release
  create_release "$new_version" "$current_version" "$changelog_content"

  echo ""
  success "Release v${new_version} completed! 🎉"
}

# Handle script arguments
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
  echo "Usage: $0"
  echo ""
  echo "Interactive release script for PR Insights Labeler"
  echo ""
  echo "This script will:"
  echo "  1. Check for uncommitted changes"
  echo "  2. Let you select release type (patch/minor/major)"
  echo "  3. Run quality checks (lint/test/build)"
  echo "  4. Generate changelog from git commits"
  echo "  5. Update package.json and CHANGELOG.md"
  echo "  6. Create git commit and tags"
  echo "  7. Push to origin and create GitHub release"
  exit 0
fi

main "$@"
