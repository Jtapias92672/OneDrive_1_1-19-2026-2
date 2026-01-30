# FORGE Generation Dashboard

**Route:** `/dashboard/generation`

## Purpose

This dashboard is for **end-users** who use FORGE to generate React code from Figma designs.

## Features

- **Generation Progress Card** - Real-time tracking of code generation stages
  - Figma file parsing
  - Component extraction
  - React code generation
  - Test creation
  - File counts per stage

- **Evidence Packs** - Generated artifacts and documentation
- **CARS Framework** - Risk assessment for generated code
- **Supply Chain** - Dependency and security status
- **Agent Memory** - AI generation context
- **Verification** - Code quality checks

## How It Works

1. User provides Figma URL
2. FORGE Orchestrator starts generation pipeline
3. Progress tracked in real-time via SSE
4. Final React components, tests, and documentation generated

## Differentiation

- `/dashboard` - Internal FORGE development (JT working with Claude on FORGE itself)
- `/dashboard/generation` - End-user code generation interface (customers using FORGE)
