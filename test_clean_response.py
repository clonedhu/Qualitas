# 內容清理測試腳本

import re

def clean_ai_response(content: str) -> str:
    """測試清理功能"""
    
    # 常見的 AI 反問句模式(繁體中文)
    chinese_patterns = [
        r'需要我.*?嗎[?？]?$',
        r'還有什麼.*?嗎[?？]?$',
        r'如果.*?請.*?[。!！]?$',
        r'請問.*?嗎[?？]?$',
        r'有任何.*?嗎[?？]?$',
        r'要不要.*?[?？]$',
        r'想要.*?嗎[?？]?$',
        r'希望.*?嗎[?？]?$',
    ]
    
    # 常見的 AI 反問句模式(英文)
    english_patterns = [
        r'Is there anything else.*?[?]?$',
        r'Would you like.*?[?]?$',
        r'Do you need.*?[?]?$',
        r'Let me know if.*?[.!]?$',
        r'Feel free to.*?[.!]?$',
        r'Can I help.*?[?]?$',
        r'Should I.*?[?]?$',
        r'Would you.*?[?]?$',
    ]
    
    cleaned = content.strip()
    lines = cleaned.split('\n')
    
    # 檢查最後 1-3 行
    lines_to_check = min(3, len(lines))
    removed_count = 0
    
    for i in range(lines_to_check):
        if not lines:
            break
            
        last_line = lines[-1].strip()
        
        if not last_line:
            lines.pop()
            continue
        
        is_question = False
        
        for pattern in chinese_patterns + english_patterns:
            if re.search(pattern, last_line, re.IGNORECASE | re.MULTILINE):
                is_question = True
                print(f"✓ 偵測到反問句: {last_line}")
                break
        
        if is_question:
            lines.pop()
            removed_count += 1
        else:
            break
    
    cleaned = '\n'.join(lines).strip()
    
    if removed_count > 0:
        print(f"\n移除了 {removed_count} 行反問句")
    
    return cleaned


# 測試案例
test_cases = [
    """這是主要內容。
這裡有一些重要資訊。

需要我進一步說明嗎?""",
    
    """Here is the main content.
Some important information here.

Is there anything else you'd like to know?""",
    
    """內容內容內容

還有什麼我可以幫您的嗎?""",
    
    """Content here.

Would you like me to explain further?""",
    
    """這是正常內容,沒有反問句。
就這樣結束了。"""
]

print("=" * 60)
print("AI 反問句清理測試")
print("=" * 60)

for i, test in enumerate(test_cases, 1):
    print(f"\n測試案例 {i}:")
    print("-" * 60)
    print("【原始內容】")
    print(test)
    print("\n【清理後】")
    cleaned = clean_ai_response(test)
    print(cleaned)
    print("-" * 60)
