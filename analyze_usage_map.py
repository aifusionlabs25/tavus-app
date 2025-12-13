import zipfile
import xml.etree.ElementTree as ET
import sys

def parse_xlsx(file_path):
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
                
                rows_iter = root.find('ns:sheetData', ns).findall('ns:row', ns)
                
                # Header
                header = []
                for c in rows_iter[0].findall('ns:c', ns):
                    val = ""
                    v = c.find('ns:v', ns)
                    if v is not None:
                        if c.get('t')=='s': val = strings[int(v.text)]
                        else: val = v.text
                    header.append(val)

                # Find first match for 2025-12
                for row in rows_iter[1:]:
                    r = []
                    for c in row.findall('ns:c', ns):
                        val = ""
                        v = c.find('ns:v', ns)
                        if v is not None:
                            if c.get('t')=='s': 
                                try: val = strings[int(v.text)]
                                except: val = ""
                            else: val = v.text
                        r.append(val)
                    
                    if any('2025-12-11' in str(x) or '2025-12-12' in str(x) for x in r):
                        print("--- MATCHED ROW MAPPING ---")
                        for i, val in enumerate(r):
                            h_name = header[i] if i < len(header) else f"Col_{i}"
                            print(f"{i} [{h_name}]: {val}")
                        # Found one, verifying the 3611 case if possible
                        if '3611.0' in r:
                            print("\n!!! FOUND THE 60-MIN SESSION !!!")
                        break

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    parse_xlsx(sys.argv[1])
