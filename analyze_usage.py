import zipfile
import xml.etree.ElementTree as ET
import sys
import datetime

def parse_xlsx(file_path):
    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            # Shared Strings
            shared_strings = []
            if 'xl/sharedStrings.xml' in z.namelist():
                with z.open('xl/sharedStrings.xml') as f:
                    root = ET.parse(f).getroot()
                    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                    for si in root.findall('ns:si', ns):
                        t = si.find('ns:t', ns)
                        shared_strings.append(t.text if t is not None else "")

            # Sheet Data
            if 'xl/worksheets/sheet1.xml' in z.namelist():
                with z.open('xl/worksheets/sheet1.xml') as f:
                    root = ET.parse(f).getroot()
                    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                    rows = []
                    for row in root.find('ns:sheetData', ns).findall('ns:row', ns):
                        r_data = []
                        for c in row.findall('ns:c', ns):
                            val = ""
                            v = c.find('ns:v', ns)
                            if v is not None:
                                t = c.get('t')
                                if t == 's': val = shared_strings[int(v.text)]
                                else: val = v.text
                            r_data.append(val)
                        rows.append(r_data)
                    return rows
    except Exception as e:
        print(f"Error: {e}")
        return []

def analyze(file_path):
    rows = parse_xlsx(file_path)
    if not rows: return

    header = rows[0]
    print(f"DEBUG: Columns found: {header}")
    
    # Try to identify columns
    try:
        idx_date_created = -1
        idx_date_ended = -1
        idx_duration = -1
        idx_status = -1
        idx_name = -1

        for i, col in enumerate(header):
            c = str(col).lower()
            if 'created' in c: idx_date_created = i
            if 'ended' in c: idx_date_ended = i
            if 'duration' in c: idx_duration = i
            if 'status' in c: idx_status = i
            if 'name' in c: idx_name = i

        print(f"DEBUG: DateIdx={idx_date_created}, DurIdx={idx_duration}")

        total_seconds = 0.0
        print("\n--- SESSIONS (Dec 11-12) ---")
        print(f"{'ID':<15} | {'Status':<10} | {'Created':<25} | {'Ended':<25} | {'Duration (s)':<10} | {'Mins':<10}")

        for r in rows[1:]:
            if len(r) <= idx_date_created: continue
            
            created_val = r[idx_date_created]
            
            if '2025-12-11' in str(created_val) or '2025-12-12' in str(created_val):
                dur = 0.0
                if idx_duration != -1 and len(r) > idx_duration:
                    try: dur = float(r[idx_duration])
                    except: pass
                
                status = str(r[idx_status]) if idx_status != -1 and len(r) > idx_status else "?"
                ended = str(r[idx_date_ended]) if idx_date_ended != -1 and len(r) > idx_date_ended else "?"
                name = str(r[idx_name]) if idx_name != -1 and len(r) > idx_name else "?"

                total_seconds += dur
                print(f"{str(r[0])[:15]:<15} | {status[:10]:<10} | {str(created_val)[:25]:<25} | {str(ended)[:25]:<25} | {dur:<10.1f} | {dur/60:<10.1f}")

        print("\n--- SUMMARY ---")
        print(f"Total Duration: {total_seconds:.1f} seconds")
        print(f"Total Duration: {total_seconds/60:.1f} minutes")

    except Exception as e:
        print(f"Analysis Error: {e}")

if __name__ == "__main__":
    analyze(sys.argv[1])
