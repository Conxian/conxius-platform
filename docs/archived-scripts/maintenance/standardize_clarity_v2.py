import os
import re

def standardize_clarity(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file == "Clarinet.toml":
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Update clarity-version to 2
                new_content = re.sub(r'clarity-version\s*=\s*\d+', 'clarity-version = 2', content)
                # Update epoch to 3.0 if present
                new_content = re.sub(r'epoch\s*=\s*".*?"', 'epoch = "3.0"', new_content)
                
                if content != new_content:
                    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                        f.write(new_content)
                    print(f"Updated {file_path}")

            if file.endswith(".clar"):
                file_path = os.path.join(root, file)
                # Ensure LF line endings and potentially check content
                # (Existing logic for to-consensus-buff? is already done but we can double check)
                pass

if __name__ == "__main__":
    standardize_clarity("C:/Users/bmokoka/Conxian-Labs/Conxian")
