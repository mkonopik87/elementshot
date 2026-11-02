from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent.parent
extension = root / 'extension'
output = root / 'dist' / 'elementshot.zip'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(extension.rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(extension))
print(output)
