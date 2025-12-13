import zipfile
import xml.etree.ElementTree as ET
import sys
import os

def read_xlsx(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            # 1. Parse Shared Strings
            shared_strings = []
            if 'xl/sharedStrings.xml' in z.namelist():
                with z.open('xl/sharedStrings.xml') as f:
                    tree = ET.parse(f)
                    root = tree.getroot()
                    # Namespace usually: {http://schemas.openxmlformats.org/spreadsheetml/2006/main}
                    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                    for si in root.findall('ns:si', ns):
                        t = si.find('ns:t', ns)
                        if t is not None:
                            shared_strings.append(t.text)
            
            # 2. Parse Sheet 1
            if 'xl/worksheets/sheet1.xml' in z.namelist():
                with z.open('xl/worksheets/sheet1.xml') as f:
                    tree = ET.parse(f)
                    root = tree.getroot()
                    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                    
                    rows_data = []
                    sheetData = root.find('ns:sheetData', ns)
                    for row in sheetData.findall('ns:row', ns):
                        row_cells = []
                        for c in row.findall('ns:c', ns):
                            cell_val = ""
                            v = c.find('ns:v', ns)
                            if v is not None:
                                val = v.text
                                type_attr = c.get('t')
                                if type_attr == 's': # Shared String
                                    try:
                                        cell_val = shared_strings[int(val)]
                                    except:
                                        cell_val = f"STR#{val}"
                                else:
                                    cell_val = val
                            row_cells.append(cell_val)
                        rows_data.append(row_cells)
                    
                    # Print formatted
                    for r in rows_data:
                        print(" | ".join([str(x) for x in r]))

            else:
                print("Sheet1 not found in xlsx")

    except Exception as e:
        print(f"Error reading xlsx: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python read_xlsx_std.py <file_path>")
    else:
        read_xlsx(sys.argv[1])
