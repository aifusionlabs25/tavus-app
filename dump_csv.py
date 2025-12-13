import zipfile
import xml.etree.ElementTree as ET
import sys

def dump_csv(file_path):
    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            strings = []
            if 'xl/sharedStrings.xml' in z.namelist():
                root = ET.parse(z.open('xl/sharedStrings.xml')).getroot()
                # Remove namespaces for easier find
                for elem in root.iter():
                    if '}' in elem.tag: elem.tag = elem.tag.split('}', 1)[1]
                strings = [t.text if t is not None else "" for t in root.findall('si/t')]

            if 'xl/worksheets/sheet1.xml' in z.namelist():
                root = ET.parse(z.open('xl/worksheets/sheet1.xml')).getroot()
                for elem in root.iter():
                    if '}' in elem.tag: elem.tag = elem.tag.split('}', 1)[1]
                
                rows = []
                for row in root.find('sheetData').findall('row'):
                    r = []
                    for c in row.findall('c'):
                        val = ""
                        v = c.find('v')
                        if v is not None and v.text is not None:
                            if c.get('t')=='s': 
                                try: val = strings[int(v.text)]
                                except: val = f"ERR:{v.text}"
                            else: val = v.text
                        r.append(val)
                    print(",".join(f'"{x}"' for x in r))

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    dump_csv(sys.argv[1])
