# Datenschutz

Die Erweiterung liest die URL des aktuellen Tabs, um AniWorld-Episoden und geschützte Popup-Quellen zu erkennen. Auf AniWorld werden Serientitel, alternative Titel und Episodentitel aus der Seite gelesen. Die Laufzeit des Videos wird zur lokalen Zuordnung verwendet.

Für passende Skip-Zeitmarken werden Serientitel/alternative Titel sowie ausgewählte Serien- und Episoden-IDs an `https://api.anime-skip.com/graphql` übertragen. Daraus kann der Dienst auf betrachtete Inhalte schließen. Der Anbieter erhält technisch auch die IP-Adresse. Die vollständige AniWorld-URL, Episodentitel und Videolaufzeit werden für die lokale Zuordnung verwendet, nicht als eigene API-Parameter übertragen.

API-Anfragen verwenden ausdrücklich `credentials: omit` und `referrerPolicy: no-referrer`: Es werden keine Browser-Cookies oder Referrer mitgesendet. Keine eigenen Analyse-, Werbe- oder Telemetriedienste. Ergebnisse werden nur im Arbeitsspeicher des Hintergrundprozesses gepuffert, nicht dauerhaft gespeichert. Die Verarbeitung beim externen Anbieter liegt außerhalb der Erweiterung.

## Berechtigungen

- `tabs`: Tab-URL prüfen, Popup-Ursprung erkennen und neu geöffnete Tabs geschützter Quellen schließen.
- `https://api.anime-skip.com/*`: Zeitmarken über die externe API abrufen.
- Content-Skripte auf HTTP-/HTTPS-Seiten und allen Frames: Player können auf wechselnden fremden Domains eingebettet sein. Der Code prüft den Kontext, bevor er Schutz-/Skip-Funktionen aktiviert. Deshalb ist die angezeigte Websiteberechtigung breit.
- Firefox deklariert `browsingActivity` und `websiteContent`, weil Titel betrachteter Inhalte extern verarbeitet werden.

Wer diese Übertragung nicht möchte, kann die Erweiterung deaktivieren oder entfernen; eine separate Abschaltung der API-Funktion ist derzeit nicht enthalten.
