from playwright.sync_api import sync_playwright
import sys
import time
import subprocess
import os
import shutil
from src.strategies.stealth import StealthStrategy

class BrowserManager:
    def __init__(self, debug_port=9222):
        self.debug_port = debug_port
        self.playwright = None
        self.browser = None
        self.context = None
        self.log_file = os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])), "browser_debug.log")
        self.stealth = StealthStrategy()

    def log(self, message):
        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(f"{time.ctime()} - {message}\n")
        except:
            pass

    def _find_edge_path(self):
        paths = [
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
        ]
        for p in paths:
            if os.path.exists(p):
                return p
        return None

    def _auto_launch_edge(self):
        self.log("Auto-launching Edge...")
        edge_path = self._find_edge_path()
        if not edge_path:
            self.log("Edge executable not found.")
            return False

        # Use a TEMP profile
        temp_dir = os.path.join(os.environ.get("TEMP", "."), f"EdgeDebugProfile_{int(time.time())}")
        
        # Kill existing edge processes (Aggressive but necessary for port binding)
        # Note: In a packaged app, maybe user doesn't want us killing their browser?
        # But without it, we can't bind the port. We will proceed with caution or just try to launch.
        # Let's try to launch first. If it fails, we assume port is busy.
        
        cmd = [
            edge_path,
            f"--remote-debugging-port={self.debug_port}",
            f"--user-data-dir={temp_dir}",
            "--no-first-run",
            "--no-default-browser-check",
            "https://gemini.google.com",
            "https://chatgpt.com"
        ]
        
        try:
            subprocess.Popen(cmd)
            self.log(f"Launched Edge with profile: {temp_dir}")
            time.sleep(3) # Wait for startup
            return True
        except Exception as e:
            self.log(f"Failed to launch Edge: {e}")
            return False

    def connect(self):
        """Connects to an existing Chrome/Edge instance via CDP. Auto-launches if needed."""
        self.playwright = sync_playwright().start()
        
        for attempt in range(2):
            try:
                self.browser = self.playwright.chromium.connect_over_cdp(f"http://127.0.0.1:{self.debug_port}")
                if self.browser.contexts:
                    self.context = self.browser.contexts[0]
                self.log(f"Connected to Browser. Contexts: {len(self.browser.contexts)}")
                
                # 注入 stealth 腳本到所有 context
                self._inject_stealth()
                
                # (New) 確保關鍵分頁存在
                self._ensure_tabs()
                
                return True
            except Exception as e:
                self.log(f"Connection attempt {attempt+1} failed: {e}")
                
                if attempt == 0:
                    # Try to auto-launch
                    if self._auto_launch_edge():
                        continue # Retry connect
                
        return False

    def get_tab(self, keyword):
        """Finds a tab (page) containing the keyword in its title or URL."""
        if not self.browser:
            self.log("Browser not connected.")
            return None
            
        self.log(f"Looking for tab: '{keyword}'")
        
        # Retry logic: pages might take a moment to be listed?
        for attempt in range(3):
            all_pages = []
            # Scan ALL contexts
            for ctx in self.browser.contexts:
                all_pages.extend(ctx.pages)
            
            self.log(f"Attempt {attempt+1}: Found {len(all_pages)} pages total.")
            
            for i, page in enumerate(all_pages):
                try:
                    title = page.title()
                    url = page.url
                    self.log(f"  Page [{i}]: '{title}' | {url}")
                    if keyword.lower() in title.lower() or keyword.lower() in url.lower():
                        self.log(f"  -> Match found for '{keyword}'")
                        return page
                except Exception as e:
                    self.log(f"  Error reading page [{i}]: {e}")
                    continue
            
            time.sleep(1) # Wait before retry
            
        self.log(f"  -> No match found for '{keyword}' after retries.")
        return None

    def _ensure_tabs(self):
        """確保 Gemini 和 ChatGPT 分頁已開啟"""
        if not self.context:
            return
            
        required_tabs = {
            "Gemini": "https://gemini.google.com",
            "ChatGPT": "https://chatgpt.com"
        }
        
        for name, url in required_tabs.items():
            found = self.get_tab(name)
            if not found:
                self.log(f"Tab '{name}' not found. Opening new tab...")
                try:
                    page = self.context.new_page()
                    page.goto(url)
                    self.log(f"Opened {name} at {url}")
                except Exception as e:
                    self.log(f"Failed to open {name}: {e}")
            else:
                self.log(f"Tab '{name}' already exists.")

    def _inject_stealth(self):
        """將 stealth 腳本注入到所有 browser contexts 和頁面"""
        if not self.browser:
            return
        
        try:
            # 注入到所有現有的 context
            for ctx in self.browser.contexts:
                self.stealth.inject_to_context(ctx)
                self.log(f"Stealth injected to context")
                
                # 注入到 context 中已存在的頁面
                for page in ctx.pages:
                    self.stealth.inject_to_page(page)
                    self.log(f"Stealth injected to existing page: {page.url}")
        except Exception as e:
            self.log(f"Failed to inject stealth: {e}")

    def close(self):
        if self.playwright:
            self.playwright.stop()
