const fs = require('fs');

const newQuestions = [
  // TEIL 1: Customer Journey
  {
    "question": "In einem Strategiemeeting fällt häufig der Begriff \"Customer Journey\". Wie ist dieser Begriff im Kontext des E-Commerce fachlich korrekt definiert?",
    "answerOptions": [
      { "text": "Er beschreibt ausschließlich den logistischen Transportweg eines Pakets vom Lager bis zur Haustür des Kunden.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Er beschreibt den kompletten Weg und alle Kontaktpunkte (Touchpoints) eines Kunden von der ersten Aufmerksamkeit für ein Produkt bis zum Kauf und darüber hinaus.", "isCorrect": true, "rationale": "Richtig ist B. Die Customer Journey (Kundenreise) umfasst alle Interaktionen und Kontaktpunkte zwischen Kunde und Marke, angefangen bei der ersten Wahrnehmung bis hin zur Phase nach dem Kauf." },
      { "text": "Er definiert die vertragliche Mindestlaufzeit, die ein Kunde an ein Abonnement gebunden ist.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Er bezeichnet die technische Weiterleitung eines Nutzers von einer Suchmaschine auf eine Landingpage.", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Definition der Customer Journey"
  },
  {
    "question": "Warum investieren E-Commerce-Unternehmen viel Zeit und Geld in die Analyse und das Verständnis der eigenen Customer Journey?",
    "answerOptions": [
      { "text": "Um die Kundenerfahrung zu optimieren, die Conversion-Rate zu erhöhen und langfristige Kundenbeziehungen aufzubauen.", "isCorrect": true, "rationale": "Richtig ist A. Das primäre Ziel der Customer-Journey-Analyse im E-Commerce ist es, das Kundenerlebnis (UX) zu verbessern, mehr Käufe abzuschließen (Conversion-Rate) und den Kunden langfristig an die Marke zu binden." },
      { "text": "Weil es gesetzlich durch die DSGVO vorgeschrieben ist, jede Kundenreise dem Finanzamt zu melden.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Um die Kosten für das Webhosting und die Serverinfrastruktur drastisch zu senken.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Um das Retourenrecht für den Kunden rechtlich wirksam auszuschließen.", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Bedeutung der Customer Journey"
  },
  {
    "question": "Ein Nutzer scrollt durch seinen Instagram-Feed und sieht zum allerersten Mal eine gesponserte Werbeanzeige für ein innovatives Outdoor-Zelt der „Outdoor-Fun GmbH“. In welcher Phase der Customer Journey befindet sich der Nutzer in diesem exakten Moment?",
    "answerOptions": [
      { "text": "Consideration", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Decision", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Retention / Advocacy", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Awareness", "isCorrect": true, "rationale": "Richtig ist D. In der Phase \"Awareness\" (Aufmerksamkeit) wird der Kunde zum ersten Mal auf ein Produkt, eine Dienstleistung oder eine Marke aufmerksam." }
    ],
    "topic": "Customer Journey Phase 1 (Awareness)"
  },
  {
    "question": "Ein potenzieller Kunde hat ein neues Navigationsgerät entdeckt. Er beginnt nun aktiv, verschiedene Testberichte zu lesen, vergleicht das Gerät mit Konkurrenzprodukten und sucht nach detaillierten technischen Informationen im Shop. Welcher Phase der Customer Journey ist dieses Verhalten zuzuordnen?",
    "answerOptions": [
      { "text": "Awareness", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Consideration", "isCorrect": true, "rationale": "Richtig ist B. In der \"Consideration\"-Phase (Abwägung) erwägt der Kunde aktiv den Kauf, sucht nach weiterführenden Informationen und vergleicht Alternativen, bevor er eine Entscheidung trifft." },
      { "text": "Purchase", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Advocacy", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Customer Journey Phase 2 (Consideration)"
  },
  {
    "question": "Nach langem Vergleichen legt sich der Kunde innerlich fest: Er will exakt das Zelt der Marke „Outdoor-Fun GmbH“ haben, weil ihn das Preis-Leistungs-Verhältnis überzeugt hat. Er legt das Produkt in den virtuellen Warenkorb, um den Kauf einzuleiten. Welche Phase der Customer Journey wird hier beschrieben?",
    "answerOptions": [
      { "text": "Decision", "isCorrect": true, "rationale": "Richtig ist A. Die \"Decision\"-Phase (Entscheidung) ist der Moment, in dem der Kunde die endgültige Entscheidung trifft, genau dieses Produkt bei diesem Anbieter kaufen zu wollen." },
      { "text": "Awareness", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Retention", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Consideration", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Customer Journey Phase 3 (Decision)"
  },
  {
    "question": "Der Kunde hat seine Zahlungsdaten (z. B. PayPal) eingegeben und klickt auf den Button \"Zahlungspflichtig bestellen\". Der Shop bestätigt die Transaktion. Wie wird dieser konkrete, physische Transaktionsschritt in der Customer Journey genannt?",
    "answerOptions": [
      { "text": "Awareness", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Consideration", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Decision", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Purchase", "isCorrect": true, "rationale": "Richtig ist D. Die \"Purchase\"-Phase bezeichnet den eigentlichen, finalen Kaufvorgang und die erfolgreiche finanzielle Transaktion an der Kasse (Checkout)." }
    ],
    "topic": "Customer Journey Phase 4 (Purchase)"
  },
  {
    "question": "Der Kunde hat sein gekauftes Zelt auf einem Campingausflug genutzt und ist begeistert. Er schreibt daraufhin eine positive 5-Sterne-Bewertung im Online-Shop und empfiehlt das Zelt auf seinem privaten Social-Media-Profil weiter. Welcher Phase der Customer Journey entspricht dies?",
    "answerOptions": [
      { "text": "Purchase", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Retention / Advocacy", "isCorrect": true, "rationale": "Richtig ist B. Die Phase \"Retention/Advocacy\" (Kundenbindung/Fürsprache) findet nach dem Kauf statt. Sie umfasst die Nutzung des Produkts, den Wiederkauf und vor allem die aktive Weiterempfehlung an andere." },
      { "text": "Decision", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Consideration", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Customer Journey Phase 5 (Retention/Advocacy)"
  },
  // TEIL 2: Datenanalyse & UX-Optimierung
  {
    "question": "Das Controlling der Outdoor-Fun GmbH nutzt Web-Analytics, um die Customer Journey auszuwerten. Welchen primären Zweck erfüllen diese Datenanalyse-Tools im Hinblick auf das Nutzerverhalten?",
    "answerOptions": [
      { "text": "Sie generieren automatisch neue, lizenzfreie Produktbilder für den Shop.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Sie helfen, das Verhalten und die Präferenzen der Kunden zu verfolgen, um Drop-off-Punkte (Abbrüche) und Engpässe auf der Website zu identifizieren.", "isCorrect": true, "rationale": "Richtig ist B. Datenanalyse-Tools zeigen auf, wie Kunden auf den Shop gelangen, wo sie verweilen und an welchen Stellen (Drop-off-Punkten) sie den Shop abbrechen, um diese Engpässe beheben zu können." },
      { "text": "Sie übernehmen die rechtliche Prüfung des Impressums.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Sie löschen automatisch Kundenkonten, die länger als 3 Monate inaktiv waren.", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Rolle von Datenanalyse-Tools"
  },
  {
    "question": "Die Auswertung der Customer Journey zeigt einen klaren Engpass: Die Kunden suchen oft nach \"Schlafsäcken\", brechen den Besuch aber frustriert ab, weil sie die entsprechende Kategorie nicht finden. Welche konkrete Maßnahme leitet sich direkt aus dieser Erkenntnis ab?",
    "answerOptions": [
      { "text": "Die Erhöhung der Preise für Schlafsäcke.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Die Optimierung der Website-Navigation und der Suchfunktion, um das Finden der Produkte zu erleichtern.", "isCorrect": true, "rationale": "Richtig ist B. Wenn die Analyse zeigt, dass Nutzer Schwierigkeiten haben, Produkte zu finden, ist die Optimierung der Menüführung (Navigation) und der internen Suche die effektivste Maßnahme." },
      { "text": "Der komplette Verzicht auf den Verkauf von Schlafsäcken.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Das Versenden einer Entschuldigungs-E-Mail an alle Kunden.", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Maßnahmen aus der Datenanalyse (Navigation)"
  },
  {
    "question": "Die Customer-Journey-Analyse eines Nutzers zeigt, dass er sich in den letzten Wochen mehrfach teure Bergsteiger-Ausrüstung angesehen, aber noch nicht gekauft hat. Wie kann der Shop dieses Wissen nutzen, um die Conversion-Rate zu steigern?",
    "answerOptions": [
      { "text": "Durch personalisierte Marketingmaßnahmen (z. B. Retargeting), die dem Kunden basierend auf seinem bisherigen Verhalten gezielt Angebote für diese Bergsteiger-Ausrüstung ausspielen.", "isCorrect": true, "rationale": "Richtig ist A. Auf Basis der Customer Journey können personalisierte Marketingaktionen erstellt werden, die dem Kunden relevante Produkte präsentieren, die exakt seinen Vorlieben und seinem bisherigen Verhalten entsprechen." },
      { "text": "Durch das Sperren des Nutzerkontos wegen Inaktivität.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Durch die Ausspielung von Werbung für komplett fachfremde Artikel (z. B. Strandliegen), um ihn zu überraschen.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Durch die Anhebung der Versandkosten für diesen speziellen Nutzer.", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Maßnahmen aus der Datenanalyse (Personalisierung)"
  },
  // TEIL 3: Urheberrecht & Bildnutzung
  {
    "question": "Was versteht man im Kontext des Online-Marketings grundlegend unter dem Begriff \"Urheberrecht\"?",
    "answerOptions": [
      { "text": "Es ist das Recht des Käufers, ein fehlerhaftes Produkt innerhalb von 14 Tagen zurückzugeben.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Es schützt die Rechte von Schöpfern (z.B. Fotografen, Textern) an ihren kreativen Werken (Bilder, Videos, Texte); diese dürfen ohne Zustimmung oder Lizenz nicht von Dritten genutzt werden.", "isCorrect": true, "rationale": "Richtig ist B. Das Urheberrecht schützt geistiges Eigentum (Texte, Bilder, Videos, Musik). Andere Unternehmen dürfen diese Werke niemals ohne die ausdrückliche Zustimmung (Lizenz) des Urhebers für ihr Marketing verwenden." },
      { "text": "Es ist die Pflicht des Unternehmens, auf der Website ein fehlerfreies Impressum anzugeben.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Es ist ein Gesetz, das vorgibt, wie hoch der Rabatt bei einer Marketingkampagne maximal sein darf.", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Definition Urheberrecht im Online-Marketing"
  },
  {
    "question": "Ein Marketing-Mitarbeiter kopiert einfach ein schönes Foto aus der Google-Bildersuche und nutzt es für eine große Werbekampagne. Welche potenziellen Konsequenzen drohen dem Unternehmen durch diese Urheberrechtsverletzung?",
    "answerOptions": [
      { "text": "Keine, da Bilder aus der Google-Suche automatisch als \"Gemeingut\" (Public Domain) gelten.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Das Unternehmen erhält eine kleine Geldstrafe vom Finanzamt.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Der Rechteinhaber kann rechtliche Schritte einleiten, was zu teuren Unterlassungsansprüchen, Schadensersatzforderungen und Reputationsverlust führt.", "isCorrect": true, "rationale": "Richtig ist C. Die ungeklärte Nutzung von Bildern ist eine Urheberrechtsverletzung. Diese wird in der Regel durch teure anwaltliche Abmahnungen (Unterlassungsansprüche) und hohe Schadensersatzforderungen des Urhebers geahndet." },
      { "text": "Der Mitarbeiter muss zwingend einen Fotografie-Kurs bei der IHK belegen.", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Rechtliche Risiken bei Bildklau"
  },
  {
    "question": "Das Team findet auf einem öffentlichen Upload-Portal ein Foto mit dem Hinweis \"kostenlos\", möchte es aber für eine kommerzielle Shop-Kampagne nutzen. Was ist der absolut erste, zwingende Schritt vor der Verwendung dieses Bildes?",
    "answerOptions": [
      { "text": "Die exakten Lizenzbedingungen des Portals klären oder direkt beim Urheber nachfragen, ob eine kommerzielle Werbenutzung wirklich erlaubt ist.", "isCorrect": true, "rationale": "Richtig ist A. \"Kostenlos\" bedeutet im Internet nicht automatisch \"frei für kommerzielle Werbezwecke\". Es müssen zwingend die genauen Lizenzbedingungen geprüft oder eine Genehmigung beim Urheber eingeholt werden." },
      { "text": "Das Bild einfach minimal zuschneiden, da dadurch automatisch ein neues, eigenes Urheberrecht entsteht.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Das Bild herunterladen und dem Portal-Betreiber eine Dankes-E-Mail schreiben.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Das Bild mit einem Wasserzeichen des eigenen Unternehmens versehen.", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Nutzung von \"kostenlosen\" Bildportalen (Schritt 1)"
  },
  {
    "question": "Die Überprüfung der Lizenzbedingungen eines \"kostenlosen\" Fotos ergibt, dass die kommerzielle Nutzung unklar ist und der Fotograf nicht kontaktiert werden kann. Wie muss das Unternehmen reagieren, um rechtlich sicher zu handeln?",
    "answerOptions": [
      { "text": "Das Foto darf genutzt werden, solange der Hinweis \"Quelle unbekannt\" daruntersteht.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Wenn keine klare Lizenzierung möglich ist, muss auf das Bild verzichtet und nach alternativen, eindeutig lizenzfreien oder käuflichen Bildquellen gesucht werden.", "isCorrect": true, "rationale": "Richtig ist B. Ist die Rechtslage unklar oder keine Lizenz vorhanden, darf das Bild unter keinen Umständen genutzt werden. Es müssen alternative Quellen (lizenzfreie Datenbanken oder Stockfotos gegen Bezahlung) genutzt werden." },
      { "text": "Das Foto darf genutzt werden, wenn es nur für maximal 24 Stunden online ist.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Das Unternehmen darf das Foto nutzen, muss aber den doppelten Verkaufspreis des eigenen Produkts an einen guten Zweck spenden.", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Handlungsalternative bei unklaren Lizenzen"
  },
  // TEIL 4: Weitere rechtliche Rahmenbedingungen
  {
    "question": "Das Marketing-Team möchte Kundendaten aus vergangenen Käufen nutzen, um personalisierte Newsletter (Retargeting) zu versenden. Welcher rechtliche Aspekt muss hierbei zwingend beachtet werden, um illegale Praktiken zu vermeiden?",
    "answerOptions": [
      { "text": "Das Markenrecht, um sicherzustellen, dass keine Konkurrenz-Logos in der Mail auftauchen.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Das Jugendarbeitsschutzgesetz, falls die Kunden minderjährig sind.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Der Datenschutz (gemäß DSGVO), um sicherzustellen, dass Kundendaten korrekt, sicher und nur mit entsprechender Einwilligung für Marketingaktionen verarbeitet werden.", "isCorrect": true, "rationale": "Richtig ist C. Im E-Commerce regelt die Datenschutz-Grundverordnung (DSGVO) strikt, wie persönliche Kundendaten erhoben, geschützt und für Marketingzwecke (wie Newsletter oder Retargeting) genutzt werden dürfen." },
      { "text": "Die Preisangabenverordnung (PAngV).", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Datenschutz (DSGVO) im Marketing"
  },
  {
    "question": "Um die Verkäufe anzukurbeln, bewirbt die Outdoor-Fun GmbH einen Rucksack mit der Behauptung \"100% wasserdicht\", obwohl interne Tests gezeigt haben, dass er bereits bei leichtem Nieselregen undicht wird. Welcher rechtliche Aspekt des Online-Marketings wird hier massiv verletzt?",
    "answerOptions": [
      { "text": "Das Urheberrecht", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Das Wettbewerbsrecht (UWG), da die Werbeaussage falsch und für den Kunden irreführend ist.", "isCorrect": true, "rationale": "Richtig ist B. Das Wettbewerbsrecht verlangt, dass Werbeaussagen wahr, klar und nicht irreführend sein müssen. Falsche Werbeversprechen (wie eine erfundene Wasserdichtigkeit) verstoßen gegen das Gesetz gegen den unlauteren Wettbewerb (UWG)." },
      { "text": "Das Fernabsatzgesetz", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Das Telemediengesetz (TMG)", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Wettbewerbsrecht (UWG)"
  },
  {
    "question": "Das Unternehmen hat wissentlich mit irreführenden und falschen Rabattaktionen geworben und damit gegen das Wettbewerbsrecht verstoßen. Von wem drohen dem Unternehmen nun in erster Linie rechtliche Schritte?",
    "answerOptions": [
      { "text": "Vom Bundesnachrichtendienst (BND).", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Von Konkurrenten (Mitbewerbern) oder Verbraucherschutzverbänden in Form von Abmahnungen und Unterlassungsklagen.", "isCorrect": true, "rationale": "Richtig ist B. Falsche oder irreführende Werbung verschafft dem Unternehmen einen unfairen Vorteil. Daher sind es im Wettbewerbsrecht in der Regel die direkten Konkurrenten oder Verbraucherschutzverbände, die das Unternehmen abmahnen und auf Unterlassung verklagen." },
      { "text": "Von den Administratoren der Social-Media-Plattformen, die das Firmen-Netzwerk hacken.", "isCorrect": false, "rationale": "Falsch." },
      { "text": "Von der örtlichen Polizei durch eine sofortige Geschäftsschließung.", "isCorrect": false, "rationale": "Falsch." }
    ],
    "topic": "Konsequenzen aus irreführender Werbung"
  }
];

const filePath = 'src/data/quiz_3.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
data.questions.push(...newQuestions);
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Added ${newQuestions.length} questions.`);
