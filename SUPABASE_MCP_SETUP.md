# Supabase MCP Setup

## Bereits eingerichtet

In diesem Projekt wurde die MCP-Konfiguration für Cursor angelegt:

- `.cursor/mcp.json`
- Server: `https://mcp.supabase.com/mcp`
- Scope: `project_ref=bvnjhvrgvebrjbizbssv`
- Sicherheitsmodus: `read_only=true`

## Nächste Schritte (einmalig)

1. Cursor neu starten.
2. In Cursor zu **Settings → Tools & MCP** gehen.
3. Beim `supabase`-Server auf **Connect / Sign in** klicken.
4. Browser-Login bei Supabase abschließen und Zugriff auf deine Organisation bestätigen.

## Test

Frage den Assistenten z. B.:

- `List all tables in my Supabase project via MCP.`
- `Show installed extensions in my Supabase database.`

## Optional: Schreibzugriff aktivieren

Wenn du später nicht nur lesen, sondern auch Änderungen erlauben möchtest:

- In `.cursor/mcp.json` den Parameter `read_only=true` entfernen oder auf `false` ändern.
- Cursor neu starten.

⚠️ Empfehlung: Für produktive Daten read-only aktiv lassen und Schreibzugriff nur bewusst aktivieren.
