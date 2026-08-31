# Spec: Bröllopssajt (fas 2 – med innehållsplan)

## Syfte med detta dokument
Teknisk spec + innehållsplan för bröllopssajten. Exakta texter (löpande text, brudparets namn, toastmasters-info) är fortfarande inte färdigskrivna – där används platshållare. Struktur, sektioner och OSA-formulärets fält är däremot definierade och ska byggas fullt fungerande.

---

## Övergripande

- **Typ:** Statisk webbsida (HTML/CSS/vanilla JS, ingen build-process, inget framework)
- **Hosting:** GitHub Pages
- **Domän:** Egen `.wedding`-domän, kopplad via CNAME-fil i repot + DNS hos domänleverantören
- **Design-tema:** Klassiskt elegant. Bröllopet hålls på Djursholms slott – designen ska kännas i linje med den miljön (symmetri, generöst med vitrymd, seriftypsnitt för rubriker, dämpad/"old money"-palett). Exakt färgschema är inte bestämt än – föreslå ett par alternativ i klassisk/elegant anda.
- **Plugins att använda i Claude Code:**
  - `frontend-design` (officiell Anthropic-plugin) – för att undvika generisk AI-design och säkerställa polerat, genomtänkt utseende
  - `claude-preview` (officiell Anthropic-plugin) – för att kunna se och verifiera resultatet live under byggandet

## Responsivitet
Sidan ska fungera bra på mobil (de flesta gäster öppnar länken från sms/mejl på telefonen) och på desktop.

---

## Sidstruktur och innehåll

Enkelsidig struktur (single-page), sektioner i denna ordning:

### 1. Hero / Välkomsttext
- Rubrik/titel: "Malin och Sebastians bröllop" (används även som sidans `<title>`-tagg/webbläsarflik)
- Kort text om att paret gifter sig
- Bild på paret (placeholder-bild tills riktig bild finns)
- Inbäddad ritad outline/illustration av Djursholms slott (se anteckning om denna nedan)

### 2. Inbjudan
- Kort text: gästen är bjuden, och att paret vill dela dagen med dem

### 3. Praktiska detaljer

**Klädkod**
- Rubrik: mörk kostym
- Kort beskrivande text under (platshållartext tills vidare)
- Ett collapse/expand-element ("Visa inspiration") som fäller ut ett par inspirationsbilder (placeholder-bilder)

**Schema**
- Datum: 6 februari 2027
- 15:30 – Vigsel, Danderyds kyrka (länk till Google Maps)
- 16:30 – Mingel, Djursholms slott (länk till Google Maps)
- Text: gäster kan ta sig mellan platserna själva, eller åka med bussen som paret bokar (se OSA-fältet för bussintresse)
- Text: gratis parkering finns vid slottet
- 18:00 – Middag
- 01:00 – Musiken stängs av
- 02:00 – Lokalen ska vara utrymd

**Toastmasters**
- Platshållare för porträttbild, namn, e-post och telefonnummer (fylls i senare, layouten byggs för 2 personer sida vid sida – justera om det blir fler/färre)
- Text: hör av dig till toastmasters om du vill hålla tal eller bidra med något under kvällen

### 4. OSA
- Tydlig knapp/CTA ("OSA här" eller liknande) som scrollar till eller öppnar formuläret
- Se detaljerad formulärspec nedan
- Formuläret ska vara visuellt integrerat i sidans design (inte se ut som ett inbäddat tredjepartsformulär)

### 5. Footer
- Enkel, diskret

Använd `[PLACEHOLDER: ...]`-kommentarer för texter/bilder som inte är klara än (t.ex. hero-bild, klädkodstext, toastmasters-info).

**Anteckning om slottsillustrationen:** Claude Code kan ta fram en enkel SVG-linjeillustration av Djursholms slott och använda webbsök efter referensbilder för att få proportioner och siluett ungefär rätt. Bra att veta: det blir en stiliserad tolkning, inte en exakt kopia av något specifikt foto (varken tekniskt önskvärt eller upphovsrättsligt lämpligt att kalkera ett foto rakt av). Om ni har ett eget foto av slottet (t.ex. taget vid ett besök) blir resultatet sannolikt träffsäkrare om det laddas upp direkt till Claude Code som referens, istället för att förlita sig på vad webbsökningen råkar hitta. Räkna med någon iterationsrunda för att få illustrationen att kännas rätt.

---

## OSA-formulär – detaljerad spec

### Fält, i visningsordning

1. **Kommer du?** – Ja / Nej (styr om resterande fält visas; väljs Nej visas bara ev. ett kort tack-meddelande, inga fler fält behövs)
2. **Namn** – text, obligatoriskt
3. **Tar du med partner?** – dropdown Ja/Nej
   - Om Ja, visa:
     - **Partnerns namn** – text, obligatoriskt
4. **E-post** – text, obligatoriskt (används för uppslag/uppdatering, se backend-logik)
5. **Telefonnummer** – text, obligatoriskt
6. **Allergier/specialkost** – kryssrutor, flerval (flera kan väljas samtidigt): gluten, laktos, nötter, skaldjur, citrus, vegetarisk, vegan – plus ett fritextfält för "övrigt" som alltid går att fylla i, oavsett vilka kryssrutor som är valda
7. **Allergier/specialkost för partner** – samma format som ovan (flerval + fritext), visas bara om partner är vald
8. **Alkohol eller alkoholfritt** – val (t.ex. radioknappar), en gång för huvudgästen
9. **Alkohol eller alkoholfritt för partner** – eget val, visas bara om partner är vald
10. **Vill du åka med bussen mellan kyrkan och slottet?** – Ja/Nej, en gång för huvudgästen
11. **Vill partner åka med bussen?** – Ja/Nej, visas bara om partner är vald
12. **Meddelande till brudparet** – fritext, valfritt

### Dold spam-skyddsfält
Ett osynligt honeypot-fält (dolt via CSS, inte `type="hidden"` eftersom vissa bottar kollar det) – ifyllt vid inskick = avvisa tyst, spara inget, skicka inget mejl.

---

## Backend: Google Sheets + Google Apps Script

Ingen egen server – all logik körs i ett Apps Script kopplat till ett Google Sheet. **En rad per OSA (per hushåll/token)**, inte en rad per person – enklare för editflödet och ger antal gäster via formel istället för att räkna manuellt.

### Föreslagen kolumnstruktur i Sheetet

| Kolumn | Innehåll |
|---|---|
| `token` | Unik identifierare, genereras vid första inskick |
| `tidsstämpel` | Senast uppdaterad |
| `kommer` | Ja/Nej |
| `namn` | Huvudgästens namn |
| `email` | Huvudgästens e-post |
| `telefon` | Huvudgästens telefonnummer |
| `tar_med_partner` | Ja/Nej |
| `partner_namn` | Tomt om ingen partner |
| `allergier` | Kryssade alternativ, kommaseparerat |
| `allergier_ovrigt` | Fritext |
| `allergier_partner` | Kryssade alternativ, kommaseparerat |
| `allergier_partner_ovrigt` | Fritext |
| `alkohol` | Huvudgästens val |
| `alkohol_partner` | Partnerns val |
| `buss` | Ja/Nej |
| `buss_partner` | Ja/Nej |
| `meddelande` | Fritext, valfritt |
| `antal_gäster` | Formel: `=IF(partner_namn<>"", 2, 1)` |

Formeln på `antal_gäster` gör att en enkel `SUM` av kolumnen ger totalt antal gäster som tackat ja, utan manuell räkning. Motsvarande `COUNTIF`/`SUMIF` kan användas för att räkna allergier, alkoholval och bussintresse per kategori.

### Vid inskick (`doPost`)
1. Slå upp om e-postadressen redan finns i sheetet.
   - **Finns den:** uppdatera den befintliga raden med nya svar (skriv inte en ny rad).
   - **Finns den inte:** skapa en ny rad och generera en unik token (t.ex. random UUID) som sparas i egen kolumn.
2. Skicka ett bekräftelsemejl (via `MailApp`/`GmailApp`) till gästens e-post som innehåller:
   - En läsbart formaterad sammanfattning av vad de just svarat (inklusive ev. partnerinfo)
   - En länk tillbaka till OSA-sidan med token som query-parameter, t.ex. `https://dinsida.wedding/osa.html?t=<token>`

### Vid besök med token (`doGet` + frontend-logik)
1. Sidan läser `?t=`-parametern ur URL:en om den finns.
2. Ett fetch-anrop görs mot Apps Script-endpointen för att slå upp raden kopplad till token.
3. Om en post hittas: förifyll formulärets fält (inklusive ev. partnerfält och tillhörande visning/dolda sektioner) med de sparade svaren, så gästen kan redigera och skicka in på nytt (vilket triggar samma uppdateringslogik som ovan).
4. Om ingen post hittas (t.ex. ogiltig/borttagen token): visa ett tomt formulär som vanligt, utan tekniskt felmeddelande.

### Felhantering
- Tydlig bekräftelse på sidan efter lyckat inskick ("Tack, vi har tagit emot din OSA!").
- Vänligt felmeddelande vid misslyckat inskick (t.ex. nätverksfel), utan tekniska detaljer.

---

## Driftsättning (görs när innehåll och kod är klart)

### Domän
När domänen är köpt skickas den till Claude Code, som guidar genom uppsättningen (CNAME-fil i repot + DNS-poster). Obs: Claude Code kan **inte** logga in på domänregistrarens kontrollpanel åt dig – det kräver inloggningsuppgifter Claude Code inte har tillgång till. Det Claude Code kan göra är att ge exakta DNS-poster att lägga in (värden, typer, TTL) samt verifiera efteråt (t.ex. med `dig`/`nslookup`) att de har slagit igenom korrekt.

### GitHub Actions – publicering till GitHub Pages
Bygg en pipeline (`.github/workflows/deploy.yml`) som triggas vid merge till main-grenen och publicerar den statiska sidan till GitHub Pages automatiskt (inget manuellt "ladda upp filer"-steg).

### Google Apps Script + Google Sheets – hantering i repot
Apps Script-koden ska ligga i repot som källkod (t.ex. `Code.gs`, `appsscript.json`) och hanteras med **clasp** (Googles officiella CLI-verktyg för Apps Script), inte kopieras in manuellt i Apps Script-editorn.

Så fungerar det i praktiken:
1. **Ett engångssteg krävs av dig:** kör `clasp login` lokalt en gång. Det öppnar en webbläsare där du loggar in med ditt Google-konto och godkänner åtkomst. Det här steget går inte att automatisera bort – det är en säkerhetsspärr från Googles sida, ingen kan logga in åt dig.
2. **Efter det kan Claude Code sköta resten via kommandon:**
   - Skapa själva Google Sheet + tillhörande Apps Script-projekt (`clasp create --type sheets`)
   - Pusha kod till scriptet (`clasp push`)
   - Deploya det som web app så att formuläret kan anropa det (`clasp deploy`)
3. **Kolumner i sheetet behöver du inte lägga upp manuellt.** Skriptet kan själv skriva ut header-raden (kolumnnamnen från tabellen ovan) första gången det körs, om den upptäcker att arket är tomt. Du behöver alltså inte förbereda något i Sheets innan – bara finnas tillgänglig för `clasp login`-steget.
4. Om ni vill att pipeline:n (GitHub Actions) även ska pusha/deploya Apps Script-ändringar automatiskt vid merge, går det, men då behöver clasp:s autentiseringsfil (`.clasprc.json`) sparas som en krypterad GitHub Secret. Värt att känna till: den filen ger full åtkomst till ditt Google-konto för Apps Script-ändamål, så den ska aldrig committas till repot i klartext.

---
- Inga slutgiltiga bilder (par-foto, slottsillustration, klädkodsinspo) – använd platshållare.
- Ingen slutgiltig löpande text – använd platshållartext där den riktiga texten inte är angiven ovan.
- Inget slutgiltigt färgschema – föreslå förslag, men lås inte fast något som "sanning" än.
- Ingen inloggning eller kontohantering för gäster – tokenlänken i mejlet är den enda "nyckeln".

## Nästa steg (efter detta är byggt)
- Lägga in riktiga bilder (par-foto, slottsillustration, klädkodsinspo).
- Skriva färdiga texter för välkomst, inbjudan och klädkod.
- Fylla i toastmasters-info när den är klar.
