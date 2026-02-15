"""
反偵測驗證腳本

此腳本用於驗證 stealth 腳本是否正確注入並生效
"""

import sys
import os

# 加入專案路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.browser import BrowserManager
from src.strategies.stealth import StealthStrategy

def test_stealth_injection():
    """測試 Stealth 注入是否生效"""
    print("=" * 60)
    print("反偵測功能驗證測試")
    print("=" * 60)
    
    # 初始化瀏覽器管理器
    manager = BrowserManager()
    
    print("\n[1/4] 連接瀏覽器...")
    if not manager.connect():
        print("❌ 瀏覽器連接失敗")
        print("\n請確保:")
        print("  1. 已使用 launch_edge.ps1 啟動瀏覽器")
        print("  2. 瀏覽器正在運行並可訪問 Gemini 和 ChatGPT")
        return False
    
    print("✓ 瀏覽器連接成功")
    
    print("\n[2/4] 檢查 Gemini 分頁...")
    gemini = manager.get_tab("Gemini")
    if not gemini:
        print("❌ 找不到 Gemini 分頁")
        print("   請確保已開啟 https://gemini.google.com")
        return False
    
    print(f"✓ 找到 Gemini 分頁: {gemini.url}")
    
    print("\n[3/4] 驗證 Stealth 腳本...")
    result = manager.stealth.verify_stealth(gemini)
    
    print("\n檢測結果:")
    print(f"  - navigator.webdriver: {result.get('webdriver', 'N/A')}")
    print(f"  - plugins 數量: {result.get('plugins', 'N/A')}")
    print(f"  - languages 數量: {result.get('languages', 'N/A')}")
    print(f"  - window.chrome 存在: {result.get('hasChrome', 'N/A')}")
    print(f"  - chrome.runtime 存在: {result.get('hasChromeRuntime', 'N/A')}")
    print(f"  - Playwright 偵測: {result.get('playwrightDetected', 'N/A')}")
    
    # 判斷是否通過
    success = (
        result.get('webdriver') == False and
        result.get('plugins', 0) > 0 and
        result.get('hasChrome') == True and
        result.get('playwrightDetected') == False
    )
    
    print("\n[4/4] 測試結果:")
    if success:
        print("✓✓✓ 反偵測功能正常運作 ✓✓✓")
        print("\n建議下一步:")
        print("  1. 手動訪問 https://bot.sannysoft.com/ 進行完整檢測")
        print("  2. 檢查所有項目是否顯示為「未偵測到」")
        print("  3. 測試實際的 Gemini → ChatGPT 傳輸")
    else:
        print("❌❌❌ 反偵測功能可能未完全生效 ❌❌❌")
        print("\n問題:")
        if result.get('webdriver') != False:
            print("  - navigator.webdriver 仍為 true")
        if result.get('plugins', 0) <= 0:
            print("  - plugins 數量異常")
        if result.get('playwrightDetected') == True:
            print("  - Playwright 特徵仍可被偵測")
    
    print("\n" + "=" * 60)
    manager.close()
    return success


if __name__ == "__main__":
    try:
        success = test_stealth_injection()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ 測試過程發生錯誤: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
