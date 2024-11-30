set shell := ["nu", "-c"]

default:
  @just --list

format:
  npm run format
  cargo fmt --all  

lint:
  npm run lint
  cd src-tauri; cargo clippy
