# Hero Point Modifier

Ein Modul für [Foundry VTT](https://foundryvtt.com/) und das **Pathfinder 2e**-System.
Es erweitert den Gruppen-Actor (*Party*) um einen Reiter für gemeinsame **Gruppenressourcen** und kann eine davon als **Hero-Point-Ersatz** nutzen.

![Foundry v13](https://img.shields.io/badge/Foundry-v13-informational)
![System pf2e](https://img.shields.io/badge/System-pf2e-red)

## Funktionen

- **Reiter „Gruppenressourcen"** im Party-Sheet.
  - Spielleiter legt Ressourcen an (Name, Wert, Maximum, Icon), löscht sie und ändert das Icon.
  - Spieler mit Besitzrechten passen Name, Wert und Maximum an.
- **Hero-Point-Ersatz** (Häkchen pro Ressource, exklusiv – immer nur eine):
  - Die markierte Ressource ersetzt die individuellen Heldenpunkte aller Charaktere der Party.
  - Heldenpunkte ausgeben (Pip-Klick am Bogen **und** Reroll über das Chat-Kontextmenü) zieht aus dem gemeinsamen Pool.
  - Am Charakterbogen erscheint der Pool als Zahl „Wert / Max" mit dem Ressourcennamen statt der Pips.
- **„Freier Heldenpunkt"-Box** im Overview-Tab (bei aktivem Pool):
  - Pro Mitglied eine Checkbox statt der HP-Anzeige.
  - Hakt sich automatisch ab, sobald das Mitglied einen Heldenpunkt verbraucht (einmalig).
  - GM-Button **„Alle freigeben"** setzt alle Boxen zurück (z. B. zu Sitzungsbeginn).

## Installation

### Über die Manifest-URL (empfohlen)

1. In Foundry: **Add-on Modules → Install Module**.
2. Unten in das Feld **Manifest URL** einfügen:
   ```
   https://github.com/your-username/hero-point-modifier/releases/latest/download/module.json
   ```
   *(`your-username` durch deinen GitHub-Benutzernamen ersetzen.)*
3. **Install** klicken und das Modul in der Welt aktivieren.

### Manuell

Die `module.zip` aus dem [neuesten Release](https://github.com/your-username/hero-point-modifier/releases/latest)
herunterladen und in `Data/modules/hero-point-modifier/` entpacken.

## Hinweise

- Damit **Spieler** Werte (Ressourcen, Pool, freie-HP-Boxen) ändern können, brauchen sie **Besitzrechte (Owner)** am Party-Actor.
- Getestet mit **Foundry VTT v13** und dem **pf2e**-System.

## Lizenz

[MIT](LICENSE) © Meridianbot
