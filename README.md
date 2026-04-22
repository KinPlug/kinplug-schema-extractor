# KinPlug Schema Extractor

Export your Kintone app schema to CSV with a single click. Includes fields, process management, actions, and assignees.

![KinPlug](https://img.shields.io/badge/KinPlug-Schema%20Extractor-4F46E5?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.1-10B981?style=for-the-badge)
![Kintone](https://img.shields.io/badge/kintone-plugin-ED1C24?style=for-the-badge)

## Features

- **App Information** — App ID and Name
- **Field Details** — Label, Code, Type, Required, Unique (Prohibit Duplicate), Options, Defaults
- **Subtable Fields** — Nested fields with parent reference
- **Process Management** — All statuses with index
- **Actions** — From/To status with assignees
- **Status Assignees** — Assignee type and entities per status
- **CSV Export** — Excel-compatible with UTF-8 BOM

## Installation

1. Download the latest release (`kinplug-schema-extractor-v*.zip`)
2. Go to **Kintone Administration** → **Plugins**
3. Click **Import** and upload the zip file
4. Add the plugin to your app
5. Configure (no settings required) and deploy

## Usage

1. Open your app's record list view
2. Click the **📊 Export App Schema** button in the header
3. CSV file downloads automatically

## CSV Output Structure

```
=== APP INFORMATION ===
App ID, App Name

=== FIELD INFORMATION ===
Field Label, Field Code, Field Type, Required, Unique, Options/Settings, Default Value

=== PROCESS MANAGEMENT ===
Status, Index

=== ACTIONS ===
Action Name, From Status, To Status, Assignees

=== STATUS ASSIGNEES ===
Status, Assignee Type, Assignees
```

## Development

```bash
# Install dependencies
npm install

# Build plugin
npx @kintone/plugin-packer src --out plugin.zip

# Build with existing PPK (for updates)
npx @kintone/plugin-packer src --ppk kinplug-schema-extractor.ppk --out plugin.zip
```

## Plugin ID

`mdjpgdgfaobljgfphpjafejalmklbjhf`

## License

Proprietary — © 2026 KinPlug / Edamame Inc.

## Support

- Website: [kinplug.com](https://kinplug.com)
- Email: support@kinplug.com
