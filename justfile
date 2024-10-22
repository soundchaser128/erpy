set shell := ["nu", "-c"]

default:
  @just --list

format:
    npm run format
    cd src-tauri; cargo fmt
    cd erpy-ai; cargo fmt
    cd erpy-sync-server; cargo fmt

lint:
    npm run lint
    cd src-tauri; cargo clippy
