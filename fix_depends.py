import os
import re

files = ['routes/notifications.py', 'routes/numbers.py', 'routes/ranges.py', 'routes/transactions.py']

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    # Pattern: async def name(..., request: Request, ...): \n    p = Depends(get_current_user)
    # Target: async def name(..., request: Request, ..., p=Depends(get_current_user)):

    def replacer(match):
        func_def = match.group(1)
        # Remove p = Depends from body
        # and add to func_def
        if 'p=Depends' not in func_def:
            func_def = func_def.rstrip('):') + ', p=Depends(get_current_user)):'
        return func_def

    new_content = re.sub(r'(async def .*?\(.*?\):)\s+p = Depends\(get_current_user\)', replacer, content, flags=re.DOTALL)

    with open(filepath, 'w') as f:
        f.write(new_content)
