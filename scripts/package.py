from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET
root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
version = ET.parse(dist / 'config.xml').getroot().attrib['version']
output = root / f'SmartTubeTizen-{version}-unsigned.wgt'
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(dist.rglob('*')):
        if file.is_file():
            archive.write(file, file.relative_to(dist))
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert {'app.js','index.html','config.xml','icon.png'} <= set(archive.namelist())
print(output)
