import re

with open("SamSamplerDSPTest.cpp") as f:
    content = f.read()

# Fix all remaining TEST macros
content = re.sub(r"TEST\(([^,]+),\s+([^)]+)\)\s*\n\{", r"TEST(\1_\2, {", content)

with open("SamSamplerDSPTest.cpp", "w") as f:
    f.write(content)

print("Fixed TEST macros")
