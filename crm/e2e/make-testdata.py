"""Generates invented test files for the browser tests. Usage: python3 make-testdata.py <output folder>"""
import csv, datetime, random, sys

out = sys.argv[1]
random.seed(7)
first = ["Anna", "Lukas", "Sophie", "Max", "Elena", "Tobias", "Mira", "Jonas", "Katharina", "Felix", "Amira", "David", "Lea", "Stefan", "Ivana", "Paul", "Nora", "Emre", "Julia", "Marko", "Jürgen", "Björn", "René"]
last = ["Gruber", "Huber", "Bauer", "Wagner", "Pichler", "Steiner", "Moser", "Hofer", "Leitner", "Berger", "Fuchs", "Eder", "Novak", "Schmid", "Winkler", "Weber", "Reiter", "Müller", "Größl", "Öztürk"]
prods = ["Kranken", "Leben", "Haushalt", "Haftpflicht", "Kfz", "Unfall", "Rechtsschutz", "Pensionsvorsorge", "Berufsunfähigkeit"]
plain = str.maketrans({"ü": "ue", "ö": "oe", "ß": "ss", "é": "e"})
rows = [["Vorname", "Nachname", "E-Mail", "Telefon", "Geburtsdatum", "Straße", "PLZ", "Ort", "Sprache", "Beruf", "Auto", "Produkte", "Polizzennummer", "Prämie", "E-Mail Einwilligung", "SMS Einwilligung", "WhatsApp Einwilligung", "Werbung Einwilligung", "Notizen"]]
people = []
for i in range(1000):
    f, l = random.choice(first), random.choice(last)
    y, m, d = random.randint(1945, 2004), random.randint(1, 12), random.randint(1, 28)
    dob = random.choice(["{d:02d}.{m:02d}.{y}", "{y}-{m:02d}-{d:02d}", "{d}/{m}/{y}", "{d}.{m}.{y}"]).format(d=d, m=m, y=y) if random.random() > 0.05 else ""
    email = f"{f}.{l}{i}@example.com".lower().translate(plain) if random.random() > 0.08 else ""
    phone = random.choice(["0660 %07d", "+43 664 %07d", "0043676%07d", "0699/%07d"]) % random.randint(1000000, 9999999) if random.random() > 0.1 else ""
    yn = lambda p: "ja" if random.random() < p else "nein"
    people.append([f, l, email, phone, dob, f"Testgasse {i}; Stiege 2", "1050", "Wien", random.choice(["de", "de", "de", "en"]), "Angestellte", random.choice(["ja", "nein", "", ""]), ", ".join(random.sample(prods, random.randint(1, 4))), "", "", yn(.85), yn(.3), yn(.6), yn(.65), 'Zeile mit "Anführungszeichen"' if i % 97 == 0 else ""])
rows += people
rows.append(["Bad", "Email", "not-an-email", "12", "31.02.1990", "", "", "", "", "", "", "Yacht", "", "", "ja", "", "", "", " "])
rows.append(["", "", "nobody@example.com"] + [""] * 16)
for p in people[:25]:  # the same people again with one more policy, as in a one-row-per-policy export
    q = list(p); q[11] = "Rechtsschutz"; q[12] = "AT-555%03d" % random.randint(0, 999); q[13] = "22,50"; rows.append(q)
with open(out + "/kunden-1000.csv", "w", newline="", encoding="cp1252", errors="replace") as fh:
    csv.writer(fh, delimiter=";").writerows(rows)

def write(name, text):
    with open(out + "/" + name, "w", encoding="utf-8") as fh: fh.write(text)

write("wohn.csv", "Vorname;Nachname;E-Mail;Telefon;Geburtsdatum;Wohnsituation;Kinder;Produkte;E-Mail Einwilligung;Werbung Einwilligung\nRosa;Mieterin;rosa@example.com;0660 1111111;01.05.1990;Miete;0;Haushalt;ja;ja\nKarl;Kreditnehmer;karl@example.com;0660 2222222;12.08.1978;Eigentum mit Kredit;2;Kranken;ja;ja\nEva;Eigentum;eva@example.com;0660 3333333;03.03.1985;Eigentum;1;Kindervorsorge, Finanzierung;ja;ja\n")
today = datetime.date.today()
fmt = lambda k: (today + datetime.timedelta(days=k)).strftime("%d.%m.%Y")
write("maria.csv", "Vorname;Nachname;E-Mail;Telefon;Geburtsdatum;Familienstand;Beschäftigung;Nettoeinkommen;Kinder Geburtsjahre;Wohnsituation;Auto;Produkte;Polizzennummer;Vertragsende;Prämie;E-Mail Einwilligung;Werbung Einwilligung\n"
      f"Maria;Beispiel;maria@example.com;0660 1234567;12.04.1988;verheiratet;angestellt;2.800;{today.year - 7}, {today.year - 4};Miete;ja;Kfz;AT-777;{fmt(40)};61,50;ja;ja\n"
      f"Maria;Beispiel;maria@example.com;0660 1234567;12.04.1988;verheiratet;angestellt;2.800;{today.year - 7}, {today.year - 4};Miete;ja;Haushalt;AT-778;{fmt(-10)};19;ja;ja\n")
write("doc.pdf", "%PDF-1.4 fake test document\n")
try:
    import openpyxl
    wb = openpyxl.Workbook(); ws = wb.active
    ws.append(["Name", "Email", "Mobile", "Date of birth", "City", "Products", "Marketing consent", "Email consent"])
    for i in range(20):
        ws.append([f"Excel Person{i}", f"excel{i}@example.com", "+43 660 55500%02d" % i, datetime.date(1980 + i, 3, 1 + i), "Graz", "Health, Car" if i % 2 else "Life", "yes" if i % 3 else "no", "yes"])
    wb.save(out + "/customers.xlsx")
except ImportError:
    print("openpyxl is not installed: customers.xlsx was not created and the Excel step of main.js will fail")
