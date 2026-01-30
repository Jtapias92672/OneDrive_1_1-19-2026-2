# Downloads Folder - CC File Sharing

**Purpose:** This folder is the designated location for passing files between Joe and Claude Code (CC).

## Usage

### For Joe (Human):
- Place any files here that CC needs to process
- Figma exports, JSON files, images, documents
- CC will monitor this folder for new inputs

### For CC (Claude Code):
- Read inputs from this folder
- Process according to current directive
- Write outputs to appropriate locations (e.g., `vertical-slice-output/`)

## File Types Supported

| Type | Extension | Use Case |
|------|-----------|----------|
| Figma Export | `.json` | Design files for parsing |
| Images | `.png`, `.jpg`, `.svg` | Reference images |
| Configuration | `.yaml`, `.json` | Pipeline config |
| Documents | `.md`, `.txt` | Instructions, specs |

## Example Workflow

```
1. Joe places figma-export.json in downloads/
2. CC reads the file
3. CC runs vertical slice pipeline
4. CC outputs React/Mendix to vertical-slice-output/
5. CC reports completion
```

## Current State

- Created: 2026-01-27
- Status: Ready for use
- Monitored by: CC directives

---

*This folder is part of the FORGE B-D Platform development workflow.*
