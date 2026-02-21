import os
import re

def remediate_v4(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            
            if file == "Clarinet.toml":
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                # Ensure clarity-version = 4
                new_content = re.sub(r'clarity-version\s*=\s*\d+', 'clarity-version = 4', content)
                # Ensure epoch = "3.1" (Latest for Clarity 4)
                new_content = re.sub(r'epoch\s*=\s*".*?"', 'epoch = "3.1"', new_content)
                if content != new_content:
                    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                        f.write(new_content)
                    print(f"Updated {file_path}")

            if file.endswith(".clar"):
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                # Revert to-consensus-buff? to to-consensus-buff for V4
                new_content = content.replace('to-consensus-buff?', 'to-consensus-buff')
                if content != new_content:
                    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                        f.write(new_content)
                    print(f"Remediated {file_path}")

if __name__ == "__main__":
    remediate_v4("C:/Users/bmokoka/Conxian-Labs/Conxian")
