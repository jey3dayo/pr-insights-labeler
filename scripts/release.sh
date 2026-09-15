#!/usr/bin/env bash
set -euo pipefail

# Temp files are registered here so a single trap removes them on every exit
# path, including `set -e` aborts and interrupts, not just the happy path.
TEMP_FILES=()
TEMP_FILE_RESULT=
cleanup_temp_files() {
  if [ ${#TEMP_FILES[@]} -gt 0 ]; then
    rm -f "${TEMP_FILES[@]}"
  fi
}
# Only EXIT cleans up: a bare INT/TERM handler would run and then let the
# script carry on to commit, tag, push and publish the release.
trap cleanup_temp_files EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Sets TEMP_FILE_RESULT instead of echoing: a command substitution would run
# this in a subshell, so the TEMP_FILES registration would never reach the trap.
new_temp_file() {
  local file
  file=$(mktemp)
  TEMP_FILES+=("$file")
  TEMP_FILE_RESULT=$file
}

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

  while IFS= read -r commit; do
    local msg
    msg=$(git log -1 --format=%s "$commit")

    # Extract PR number if exists
    local pr_num
    pr_num=$(echo "$msg" | sed -n 's/.*(#\([0-9][0-9]*\)).*/\(#\1\)/p')

    case $msg in
      feat:*|feat\(*|feat!:*)
        local clean_msg="${msg#feat*: }"
        # Ensure PR number is present
        if [[ -n $pr_num ]] && [[ ! $clean_msg =~ \(#[0-9]+\) ]]; then
          clean_msg="${clean_msg} ${pr_num}"
        fi
        added+=("- ${clean_msg}")
        ;;
      fix:*|fix\(*|fix!:*)
        local clean_msg="${msg#fix*: }"
        if [[ -n $pr_num ]] && [[ ! $clean_msg =~ \(#[0-9]+\) ]]; then
          clean_msg="${clean_msg} ${pr_num}"
        fi
        fixed+=("- ${clean_msg}")
        ;;
      chore:*|chore\(*|docs:*|docs\(*|style:*|style\(*|refactor:*|refactor\(*|perf:*|perf\(*|test:*|test\(*|build:*|build\(*|ci:*|ci\(*)
        local clean_msg="${msg#*: }"
        if [[ -n $pr_num ]] && [[ ! $clean_msg =~ \(#[0-9]+\) ]]; then
          clean_msg="${clean_msg} ${pr_num}"
        fi
        changed+=("- ${clean_msg}")
        ;;
      *)
        local clean_msg="$msg"
        # Only strip a leading Conventional Commits prefix (type, optional
        # (scope), optional !, then ": ") -- a bare colon elsewhere in the
        # message (e.g. `Revert "fix: ..."`, `Update docs: ...`) must survive.
        if [[ $clean_msg =~ ^[a-z]+(\([^\)]*\))?!?:\  ]]; then
          clean_msg="${clean_msg#*: }"
        fi
        if [[ -n $pr_num ]] && [[ ! $clean_msg =~ \(#[0-9]+\) ]]; then
          clean_msg="${clean_msg} ${pr_num}"
        fi
        changed+=("- ${clean_msg}")
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
  }
}

# Detect breaking changes from git commits
detect_breaking_changes() {
  local from_tag=$1
  local to_ref=${2:-HEAD}
  local breaking_changes=()

  while IFS= read -r commit; do
    local subject body
    subject=$(git log -1 --format=%s "$commit")
    body=$(git log -1 --format=%B "$commit")

    # At most one entry per commit: the BREAKING CHANGE: footer wins when it
    # has a body, and the `!` subject marker is only a fallback for commits
    # where the footer line exists but carries no inline description -- never
    # both, or the same commit would be listed twice.
    local footer_entry_added=0

    # Check for BREAKING CHANGE: footer (Conventional Commits)
    if echo "$body" | grep -q "BREAKING CHANGE:"; then
      local breaking_msg
      breaking_msg=$(echo "$body" | sed -n 's/^BREAKING CHANGE: //p')
      if [[ -n $breaking_msg ]]; then
        breaking_changes+=("- $breaking_msg")
        footer_entry_added=1
      fi
    fi

    # Check for ! notation (feat!:, fix(scope)!:, etc.) on the subject line
    # only -- the body can be many lines long and must never leak into the
    # release notes. Conventional Commits places the scope before the !, not
    # after.
    if [[ $footer_entry_added -eq 0 ]] && echo "$subject" | grep -qE '^[a-z]+(\([^)]+\))?!:'; then
      local clean_msg
      clean_msg=$(echo "$subject" | sed -E 's/^[a-z]+(\([^)]+\))?!: //')
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
# Strip leading and trailing blank lines from stdin.
trim_blank_lines() {
  awk '
    { lines[NR] = $0 }
    END {
      start = 1;  while (start <= NR && lines[start] ~ /^[[:space:]]*$/) start++
      end   = NR; while (end >= start && lines[end] ~ /^[[:space:]]*$/) end--
      for (i = start; i <= end; i++) print lines[i]
    }
  '
}

# Print the body of the `## [Unreleased]` section with surrounding blank lines
# trimmed. Empty output means there is no hand-written pending content.
extract_unreleased() {
  awk '
    /^## \[Unreleased\]/ { grab = 1; next }
    grab && /^## \[/     { exit }
    grab                 { print }
  ' CHANGELOG.md | trim_blank_lines
}

# Merge a hand-written [Unreleased] body (file $1) with the commit-derived
# changelog (file $2), section by section. Generated entries already covered by
# the hand-written text are dropped; everything else is kept, so commits that
# nobody wrote up by hand still reach the release notes.
merge_changelog() {
  awk '
    function bullet_key(line,   t) {
      t = line
      sub(/^[[:space:]]*-[[:space:]]*/, "", t)
      return t
    }
    # Collect every PR reference inside a parenthesised group, so "(#1, #2)" and
    # "(#1) (#2)" both register fully. Bare mentions in prose ("see issue #3")
    # are ignored on purpose: treating those as references would suppress a real
    # entry for that number and lose the change.
    function collect_prs(line, out,   rest, group) {
      rest = line
      while (match(rest, /\([^)]*#[0-9]+[^)]*\)/)) {
        group = substr(rest, RSTART, RLENGTH)
        rest = substr(rest, RSTART + RLENGTH)
        while (match(group, /#[0-9]+/)) {
          out[substr(group, RSTART, RLENGTH)] = 1
          group = substr(group, RSTART + RLENGTH)
        }
      }
    }
    # heading == "" holds content written before the first "###" subheading.
    function emit(heading, is_preamble,   body, n, lines, j, line, pr, covered, line_prs, is_bullet, prev_is_bullet) {
      body = hand[heading]
      n = split(gen[heading], lines, "\n")
      for (j = 1; j <= n; j++) {
        line = lines[j]
        if (line == "") continue
        delete line_prs
        collect_prs(line, line_prs)
        covered = 0
        for (pr in line_prs) if (pr in hand_pr) covered = 1
        if (covered) continue
        # Exact key match only: a substring test would drop a generated entry
        # merely quoted inside a longer hand-written line.
        if (bullet_key(line) in hand_key) continue
        body = body line "\n"
      }
      if (body == "") return
      if (!is_preamble) {
        print heading
        print ""
      }
      # Blank lines were stripped while parsing, so restore the one markdown
      # requires between prose and an adjacent list.
      n = split(body, lines, "\n")
      prev_is_bullet = -1
      for (j = 1; j <= n; j++) {
        line = lines[j]
        if (line == "") continue
        is_bullet = (line ~ /^[[:space:]]*-[[:space:]]/)
        if (prev_is_bullet != -1 && is_bullet != prev_is_bullet) print ""
        print line
        prev_is_bullet = is_bullet
      }
      print ""
    }
    FNR == 1 { file_index++; heading = "" }
    /^###/ {
      heading = $0
      if (!(heading in seen_heading)) {
        seen_heading[heading] = 1
        order[++heading_count] = heading
      }
      next
    }
    /^[[:space:]]*$/ { next }
    {
      if (file_index == 1) {
        hand[heading] = hand[heading] $0 "\n"
        hand_key[bullet_key($0)] = 1
        collect_prs($0, hand_pr)
      } else {
        gen[heading] = gen[heading] $0 "\n"
      }
    }
    END {
      emit("", 1)
      for (i = 1; i <= heading_count; i++) emit(order[i], 0)
    }
  ' "$1" "$2"
}

update_changelog() {
  local new_version=$1
  local changelog_content=$2
  local date
  date=$(date +%Y-%m-%d)

  local temp_file stripped
  new_temp_file; temp_file=$TEMP_FILE_RESULT
  new_temp_file; stripped=$TEMP_FILE_RESULT

  # Consume the `## [Unreleased]` section. Its content is folded into the new
  # version section by the caller, so leaving the heading here would strand it
  # below released versions and duplicate the entries.
  awk '
    /^## \[Unreleased\]/ { skip = 1; next }
    /^## \[/             { skip = 0 }
    !skip
  ' CHANGELOG.md > "$stripped"

  {
    # Keep header
    sed -n '1,/^## \[/p' "$stripped" | sed '$d'

    # Add new version. The body is normalized so exactly one blank line
    # separates it from the next version heading, whether it came from the
    # commit log or from a hand-written [Unreleased] section.
    echo "## [${new_version}] - ${date}"
    echo ""
    echo "$changelog_content" | trim_blank_lines
    echo ""

    # Keep rest of changelog
    sed -n '/^## \[/,$p' "$stripped"
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

  # A hand-written [Unreleased] section is curated by a human, so its wording
  # wins, but the commit-derived entries it does not cover are merged in rather
  # than discarded -- otherwise commits nobody wrote up by hand would silently
  # vanish from the release notes.
  local unreleased_content
  unreleased_content=$(extract_unreleased)
  if [[ -n $unreleased_content ]]; then
    info "Merging the hand-written [Unreleased] section with the generated changelog..."
    local hand_file gen_file
    new_temp_file; hand_file=$TEMP_FILE_RESULT
    new_temp_file; gen_file=$TEMP_FILE_RESULT
    printf '%s\n' "$unreleased_content" > "$hand_file"
    printf '%s\n' "$changelog_content" > "$gen_file"
    changelog_content=$(merge_changelog "$hand_file" "$gen_file")
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

# Executed directly, this runs the interactive release flow; sourced (e.g.
# from a test), it only defines the functions above so they can be called
# and asserted on individually.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
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
fi
