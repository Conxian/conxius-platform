import os
import re

def standardize_clarity(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file == "Clarinet.toml":
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Update clarity-version to 4
                new_content = re.sub(r'clarity-version\s*=\s*\d+', 'clarity-version = 4', content)
                # Ensure epoch is 3.1 or 3.0 for Nakamoto
                if 'epoch = "3.1"' not in new_content and 'epoch = "3.0"' not in new_content:
                     new_content = re.sub(r'epoch\s*=\s*".*?"', 'epoch = "3.1"', new_content)
                
                if content != new_content:
                    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                        f.write(new_content)
                    print(f"Updated {file_path}")

if __name__ == "__main__":
    standardize_clarity("C:/Users/bmokoka/Conxian-Labs/Conxian")
