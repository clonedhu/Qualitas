"""
Stealth 策略 - 隱藏自動化特徵

此模組負責注入 JavaScript 來隱藏 Playwright/WebDriver 的自動化特徵,
降低被 AI 平台偵測的風險。
"""

import logging
from typing import Optional
from playwright.sync_api import Page, BrowserContext

logger = logging.getLogger(__name__)


class StealthStrategy:
    """隱藏自動化特徵的策略類別"""
    
    def __init__(self):
        # Stealth 腳本 - 綜合多種反偵測技術
        self.stealth_script = """
// ===== 1. 覆寫 navigator.webdriver =====
Object.defineProperty(navigator, 'webdriver', {
    get: () => false,
    configurable: true
});

// ===== 2. 修復 navigator.permissions =====
// 某些自動化工具會破壞 permissions API
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
);

// ===== 3. 偽裝 navigator.plugins =====
// 正常瀏覽器會有 plugins,自動化工具通常沒有
Object.defineProperty(navigator, 'plugins', {
    get: () => [
        {
            name: 'Chrome PDF Plugin',
            description: 'Portable Document Format',
            filename: 'internal-pdf-viewer',
            length: 1
        },
        {
            name: 'Chrome PDF Viewer',
            description: 'Portable Document Format',
            filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
            length: 1
        },
        {
            name: 'Native Client',
            description: 'Native Client Executable',
            filename: 'internal-nacl-plugin',
            length: 2
        }
    ],
    configurable: true
});

// ===== 4. 偽裝 navigator.languages =====
Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-TW', 'zh', 'en-US', 'en'],
    configurable: true
});

// ===== 5. 修復 Chrome Runtime =====
// 正常的 Chrome 擴充功能 API
if (!window.chrome) {
    window.chrome = {};
}
if (!window.chrome.runtime) {
    window.chrome.runtime = {};
}

// ===== 6. 覆寫 Object.getOwnPropertyDescriptor =====
// 防止偵測腳本檢查我們的覆寫
const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
Object.getOwnPropertyDescriptor = function(obj, prop) {
    // 如果是檢查 navigator.webdriver,返回 undefined(表示不存在)
    if (obj === navigator && prop === 'webdriver') {
        return undefined;
    }
    return originalGetOwnPropertyDescriptor(obj, prop);
};

// ===== 7. 偽裝 window.chrome.app =====
// Headless Chrome 沒有 chrome.app
if (!window.chrome.app) {
    window.chrome.app = {
        isInstalled: false,
        InstallState: {
            DISABLED: 'disabled',
            INSTALLED: 'installed',
            NOT_INSTALLED: 'not_installed'
        },
        RunningState: {
            CANNOT_RUN: 'cannot_run',
            READY_TO_RUN: 'ready_to_run',
            RUNNING: 'running'
        }
    };
}

// ===== 8. 修復 window.navigator.connection =====
// 正常瀏覽器有網路連接資訊
if (!navigator.connection) {
    Object.defineProperty(navigator, 'connection', {
        get: () => ({
            effectiveType: '4g',
            rtt: 100,
            downlink: 10,
            saveData: false
        }),
        configurable: true
    });
}

// ===== 9. 偽裝 Battery API =====
// 部分偵測會檢查 Battery API
if (!navigator.getBattery) {
    navigator.getBattery = () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1
    });
}

// ===== 10. 防止 CDP Runtime 特徵洩漏 =====
// 刪除可能暴露的 CDP 相關屬性
delete window.__playwright;
delete window.__pw_manual;
delete window.__PW_inspect;

// ===== 11. 偽裝 User Activation =====
// 模擬真實的使用者互動狀態
Object.defineProperty(navigator, 'userActivation', {
    get: () => ({
        hasBeenActive: true,
        isActive: true
    }),
    configurable: true
});

// ===== 12. Canvas 指紋保護 =====
// 加入微小的隨機雜訊以避免 Canvas 指紋追蹤
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function(type) {
    // 在 canvas 上加入極微小的隨機雜訊(人眼不可見)
    const context = this.getContext('2d');
    if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            // 隨機微調 RGB 值(±1)
            if (Math.random() < 0.001) {
                imageData.data[i] += Math.random() < 0.5 ? -1 : 1;
            }
        }
        context.putImageData(imageData, 0, 0);
    }
    return originalToDataURL.apply(this, arguments);
};

// ===== 13. WebGL 指紋保護 =====
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
    // 對特定參數加入微小隨機變化
    if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
        return 'Intel Inc.';
    }
    if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
        return 'Intel Iris OpenGL Engine';
    }
    return getParameter.apply(this, arguments);
};

console.log('[Stealth] Anti-detection script loaded successfully');
"""

    def inject_to_page(self, page: Page) -> bool:
        """
        將 stealth 腳本注入到指定頁面
        
        Args:
            page: Playwright 頁面物件
            
        Returns:
            是否注入成功
        """
        try:
            page.add_init_script(self.stealth_script)
            logger.info(f"Stealth script injected to page: {page.url}")
            return True
        except Exception as e:
            logger.error(f"Failed to inject stealth script: {e}")
            return False
    
    def inject_to_context(self, context: BrowserContext) -> bool:
        """
        將 stealth 腳本注入到整個瀏覽器上下文
        這會影響該上下文中所有現有和未來的頁面
        
        Args:
            context: Playwright 瀏覽器上下文
            
        Returns:
            是否注入成功
        """
        try:
            context.add_init_script(self.stealth_script)
            logger.info("Stealth script injected to browser context")
            return True
        except Exception as e:
            logger.error(f"Failed to inject stealth script to context: {e}")
            return False
    
    def verify_stealth(self, page: Page) -> dict:
        """
        驗證 stealth 腳本是否生效
        
        Args:
            page: Playwright 頁面物件
            
        Returns:
            驗證結果字典
        """
        try:
            result = page.evaluate("""
                () => ({
                    webdriver: navigator.webdriver,
                    plugins: navigator.plugins.length,
                    languages: navigator.languages.length,
                    hasChrome: typeof window.chrome !== 'undefined',
                    hasChromeRuntime: typeof window.chrome.runtime !== 'undefined',
                    playwrightDetected: typeof window.__playwright !== 'undefined'
                })
            """)
            
            logger.info(f"Stealth verification result: {result}")
            return result
        except Exception as e:
            logger.error(f"Failed to verify stealth: {e}")
            return {}
