import re

with open("SamSamplerDSPTest.cpp") as f:
    content = f.read()

# Replace all underscore-separated test names with comma-separated format
content = re.sub(r"TEST\((\w+)_(\w+),\s*\{", r"TEST(\1, \2)", content)

# Fix closing braces
content = re.sub(r"\}\s*\)\s*$", "}", content, flags=re.MULTILINE)

with open("SamSamplerDSPTest.cpp", "w") as f:
    f.write(content)

print("Fixed test format")
