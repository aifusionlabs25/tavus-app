import zipfile
import xml.etree.ElementTree as ET
import sys

def analyze(file_path):
    # READ XLSX (Simulating zip/xml read)
    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            strings = []
            if 'xl/sharedStrings.xml' in z.namelist():
                root = ET.parse(z.open('xl/sharedStrings.xml')).getroot()
                ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                strings = [t.text if t is not None else "" for t in root.findall('ns:si/ns:t', ns)]

            if 'xl/worksheets/sheet1.xml' in z.namelist():
                root = ET.parse(z.open('xl/worksheets/sheet1.xml')).getroot()
                ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                rows = []
                for row in root.find('ns:sheetData', ns).findall('ns:row', ns):
                    r = []
                    for c in row.findall('ns:c', ns):
                        val = ""
                        v = c.find('ns:v', ns)
                        if v:
                            if c.get('t')=='s': val = strings[int(v.text)]
                            else: val = v.text
                        r.append(val)
                    rows.append(r)
                
                # DEBUG OUTPUT
                if not rows: return
                header = rows[0]
                print(f"Header: {header}")
                
                idx_created = -1
                for i,h in enumerate(header): 
                    if 'created' in str(h).lower(): idx_created = i; break
                
                print(f"Created Index: {idx_created}")
                
                print("\n--- FIRST 5 ROWS ---")
                for i in range(1, min(6, len(rows))):
                    print(rows[i])

                print("\n--- UNIQUE DATES FOUND ---")
                dates = set()
                for r in rows[1:]:
                    if len(r) > idx_created:
                        d = str(r[idx_created])[:10] # Just YYYY-MM-DD
                        dates.add(d)
                print(sorted(list(dates)))

    except Exception as e:
        print(e)

if __name__ == "__main__":
    analyze(sys.argv[1])
