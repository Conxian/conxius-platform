import os

actions_path = "services/elizaos-plugin-conxian/src/actions.ts"
if os.path.exists(actions_path):
    with open(actions_path, "r") as f:
        lines = f.readlines()

    unique_imports = []
    seen = set()
    in_import = False
    new_lines = []
    for line in lines:
        if "from \"./conxianClient\";" in line:
            in_import = False
            # Filter unique imports
            clean_imports = []
            for imp in unique_imports:
                clean = imp.strip().replace(",", "")
                if clean and clean not in seen:
                    clean_imports.append(imp)
                    seen.add(clean)
            new_lines.append("  " + "\n  ".join(clean_imports).replace("\n  ", "\n  ") + "\n")
            new_lines.append(line)
            continue

        if "import {" in line and "conxianClient" in "".join(lines[lines.index(line):lines.index(line)+10]):
             in_import = True
             continue

        if in_import:
            unique_imports.append(line.strip())
            continue

        new_lines.append(line)

    with open(actions_path, "w") as f:
        f.writelines(new_lines)
