## Eigenstaendige Begleitapp

Dieser Ordner enthaelt die GitHub-taugliche Webapp fuer den eBay Marktoptimierer.

### Inhalt

- `index.html`: Einstiegspunkt
- `styles.css`: Layout und Styling
- `app.js`: Logik fuer Upload, Filter, KPIs, Tabellen und Aenderungsansicht

### Verwendung

1. Eine aktuelle `marktoptimierer-shared.json` aus der Desktop-App erzeugen.
2. `index.html` im Browser oeffnen oder den Ordner auf einen Webserver / GitHub Pages legen.
3. In der Webapp die JSON laden.

### Eigenschaften

- Keine API noetig
- Keine Datenbank noetig
- Keine Plenty- oder eBay-Zugangsdaten noetig
- Daten werden lokal im Browser gespeichert, bis eine neue Datei geladen oder entfernt wird

### Datenquelle

Die Datei `marktoptimierer-shared.json` wird in der Haupt-App per `JSON Export` oder automatisch
nach `FullSync` erzeugt, sobald in den Einstellungen ein Export-Ordner hinterlegt ist.
