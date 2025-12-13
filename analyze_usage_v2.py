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
                header_row = rows_iter[0]
                header = []
                for c in header_row.findall('ns:c', ns):
                    val = ""
                    v = c.find('ns:v', ns)
                    if v is not None:
                        if c.get('t')=='s': val = strings[int(v.text)]
                        else: val = v.text
                    header.append(val)
                print(f"Header: {header}")
                
                # Data
                print("--- MATCHING ROWS ---")
                total_dur = 0
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
                    
                    # Check for 2025-12-12 or 11
                    row_str = str(r)
                    if '2025-12-11' in row_str or '2025-12-12' in row_str:
                        # Print Cols 11 (Created) and 13 (Duration)
                        created = r[11] if len(r)>11 else "?"
                        dur = r[13] if len(r)>13 else "0"
                        print(f"Date: {created} | Dur: {dur}")
                        try: total_dur += float(dur)
                        except: pass
                
                print(f"Total Duration (raw sum): {total_dur}")
                print(f"Total Duration (minutes): {total_dur/60}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    parse_xlsx(sys.argv[1])
