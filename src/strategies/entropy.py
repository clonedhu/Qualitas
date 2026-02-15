"""
行為熵策略 - 模擬自然的人類操作行為

此模組負責加入隨機性和人類特徵到自動化操作中,
包括滑鼠移動、打字行為、滾動等。
"""

import time
import random
import math
from typing import Optional, List, Tuple
from datetime import datetime
from playwright.sync_api import Page


class BehavioralEntropy:
    """模擬人類行為的策略類別"""
    
    def __init__(self):
        # 字元類型對應的打字速度(毫秒)
        self.char_speeds = {
            'letter': (40, 120),      # 字母:快速
            'number': (50, 130),      # 數字:稍慢
            'space': (80, 150),       # 空格:較慢
            'punctuation': (60, 180), # 標點:更慢
            'newline': (100, 200),    # 換行:最慢
            'special': (80, 200)      # 特殊字元:慢
        }
    
    def _get_char_type(self, char: str) -> str:
        """判斷字元類型"""
        if char.isalpha():
            return 'letter'
        elif char.isdigit():
            return 'number'
        elif char == ' ':
            return 'space'
        elif char == '\n':
            return 'newline'
        elif char in '.,;:!?':
            return 'punctuation'
        else:
            return 'special'
    
    def _bezier_curve(self, start: Tuple[float, float], end: Tuple[float, float], 
                      control_points: int = 2) -> List[Tuple[float, float]]:
        """
        使用貝茲曲線生成自然的滑鼠移動軌跡
        
        Args:
            start: 起始點 (x, y)
            end: 結束點 (x, y)
            control_points: 控制點數量
            
        Returns:
            軌跡點列表
        """
        steps = random.randint(15, 30)  # 移動步數
        points = []
        
        # 生成隨機控制點
        controls = []
        for _ in range(control_points):
            # 控制點在起點和終點之間的隨機位置,加入一些偏移
            t = random.random()
            x = start[0] + (end[0] - start[0]) * t + random.uniform(-50, 50)
            y = start[1] + (end[1] - start[1]) * t + random.uniform(-50, 50)
            controls.append((x, y))
        
        # 計算貝茲曲線上的點
        all_points = [start] + controls + [end]
        n = len(all_points) - 1
        
        for i in range(steps + 1):
            t = i / steps
            x = y = 0
            
            # 貝茲曲線公式
            for j, point in enumerate(all_points):
                # 二項式係數
                binomial = math.comb(n, j)
                # 貝茲基底函數
                basis = binomial * (t ** j) * ((1 - t) ** (n - j))
                x += basis * point[0]
                y += basis * point[1]
            
            points.append((x, y))
        
        return points
    
    def move_mouse_naturally(self, page: Page, target_selector: str) -> bool:
        """
        自然地移動滑鼠到目標元素
        
        Args:
            page: Playwright 頁面
            target_selector: 目標元素選擇器
            
        Returns:
            是否成功
        """
        try:
            # 取得目標元素位置
            element = page.wait_for_selector(target_selector, timeout=2000)
            if not element:
                return False
            
            box = element.bounding_box()
            if not box:
                return False
            
            # 目標位置(元素中心)
            target_x = box['x'] + box['width'] / 2
            target_y = box['y'] + box['height'] / 2
            
            # 目前滑鼠位置(隨機假設一個起始位置)
            # 實際上 Playwright 無法讀取當前游標位置,所以我們假設一個合理的位置
            viewport = page.viewport_size
            start_x = random.uniform(viewport['width'] * 0.3, viewport['width'] * 0.7)
            start_y = random.uniform(viewport['height'] * 0.3, viewport['height'] * 0.7)
            
            # 生成軌跡
            trajectory = self._bezier_curve((start_x, start_y), (target_x, target_y))
            
            # 沿著軌跡移動滑鼠
            for x, y in trajectory:
                page.mouse.move(x, y)
                # 隨機延遲(1-5ms)
                time.sleep(random.uniform(0.001, 0.005))
            
            # 到達目標後稍微停頓
            time.sleep(random.uniform(0.05, 0.15))
            
            return True
        except Exception as e:
            # 如果移動失敗,不影響後續操作
            return False
    
    def type_with_jitter(self, page: Page, selector: str, text: str) -> bool:
        """
        使用人類化的打字行為輸入文字
        
        Args:
            page: Playwright 頁面
            selector: 輸入框選擇器
            text: 要輸入的文字
            
        Returns:
            是否成功
        """
        try:
            element = page.wait_for_selector(selector, timeout=2000)
            if not element:
                return False
            
            # 先移動滑鼠並點擊
            self.move_mouse_naturally(page, selector)
            element.click()
            
            # 聚焦延遲
            time.sleep(random.uniform(0.1, 0.3))
            
            i = 0
            while i < len(text):
                char = text[i]
                char_type = self._get_char_type(char)
                
                # 5% 機率打錯字
                if random.random() < 0.05 and char.isalpha():
                    # 隨機打一個錯誤字元
                    wrong_char = random.choice('abcdefghijklmnopqrstuvwxyz')
                    element.type(wrong_char)
                    
                    # 短暫延遲後發現錯誤
                    time.sleep(random.uniform(0.1, 0.4))
                    
                    # 按下 Backspace 刪除
                    page.keyboard.press('Backspace')
                    time.sleep(random.uniform(0.05, 0.15))
                
                # 正確輸入字元
                element.type(char)
                
                # 根據字元類型決定延遲
                delay_range = self.char_speeds.get(char_type, (50, 150))
                # 使用正態分佈(更接近人類)
                delay = random.gauss(
                    (delay_range[0] + delay_range[1]) / 2,  # 平均值
                    (delay_range[1] - delay_range[0]) / 6   # 標準差
                )
                # 確保延遲在合理範圍
                delay = max(delay_range[0], min(delay_range[1], delay))
                
                # 偶爾暫停思考(3% 機率)
                if random.random() < 0.03:
                    delay += random.uniform(300, 800)
                
                time.sleep(delay / 1000)  # 轉換為秒
                i += 1
            
            return True
        except Exception as e:
            return False
    
    def fast_fill(self, page: Page, selector: str, text: str) -> bool:
        """
        模擬複製貼上行為(但包含真實的鍵盤事件)
        
        Args:
            page: Playwright 頁面
            selector: 輸入框選擇器
            text: 要輸入的文字
            
        Returns:
            是否成功
        """
        try:
            element = page.wait_for_selector(selector, timeout=2000)
            if not element:
                return False
            
            # 移動滑鼠並點擊
            self.move_mouse_naturally(page, selector)
            element.click()
            
            # 聚焦延遲
            time.sleep(random.uniform(0.1, 0.3))
            
            # 模擬 Ctrl+A 全選(如果有舊內容)
            page.keyboard.down('Control')
            page.keyboard.press('a')
            page.keyboard.up('Control')
            time.sleep(random.uniform(0.05, 0.1))
            
            # 使用 fill 方法(快速但會觸發 input 事件)
            element.fill(text)
            
            # 貼上後的短暫延遲(模擬檢查內容)
            time.sleep(random.uniform(0.2, 0.5))
            
            return True
        except Exception as e:
            return False
    
    def natural_scroll(self, page: Page, direction: str = 'down', 
                       distance: Optional[int] = None) -> None:
        """
        自然地滾動頁面
        
        Args:
            page: Playwright 頁面
            direction: 滾動方向 ('up' 或 'down')
            distance: 滾動距離(像素),None 則隨機
        """
        if distance is None:
            distance = random.randint(100, 400)
        
        # 將大距離分解為多次小滾動
        scroll_steps = random.randint(3, 8)
        step_distance = distance / scroll_steps
        
        for _ in range(scroll_steps):
            delta = step_distance if direction == 'down' else -step_distance
            # 加入隨機變化
            delta += random.uniform(-20, 20)
            
            page.mouse.wheel(0, delta)
            # 每次滾動間的延遲
            time.sleep(random.uniform(0.1, 0.3))
    
    def simulate_reading(self, page: Page, element_selector: Optional[str] = None) -> None:
        """
        模擬閱讀行為(滾動+停頓)
        
        Args:
            page: Playwright 頁面
            element_selector: 要閱讀的元素選擇器(可選)
        """
        # 如果指定元素,先滾動到該元素
        if element_selector:
            try:
                element = page.wait_for_selector(element_selector, timeout=2000)
                if element:
                    element.scroll_into_view_if_needed()
            except Exception:
                pass
        
        # 模擬閱讀:隨機滾動與停頓
        reading_time = random.uniform(1, 3)  # 總閱讀時間
        start_time = time.time()
        
        while time.time() - start_time < reading_time:
            # 隨機小幅滾動
            if random.random() < 0.3:
                self.natural_scroll(page, distance=random.randint(50, 150))
            
            # 停頓
            time.sleep(random.uniform(0.5, 1.5))
    
    def random_mouse_movement(self, page: Page) -> None:
        """
        隨機移動滑鼠(模擬無意識的游標移動)
        
        Args:
            page: Playwright 頁面
        """
        try:
            viewport = page.viewport_size
            target_x = random.uniform(0, viewport['width'])
            target_y = random.uniform(0, viewport['height'])
            
            # 簡單的線性移動(不需要精確軌跡)
            page.mouse.move(target_x, target_y)
        except Exception:
            pass
    
    def random_wait(self, min_seconds: float = 1.0, max_seconds: float = 3.0) -> None:
        """
        智慧等待 - 根據時間調整延遲
        
        Args:
            min_seconds: 最小等待秒數
            max_seconds: 最大等待秒數
        """
        # 基礎延遲使用對數常態分佈
        mu = (min_seconds + max_seconds) / 2
        sigma = (max_seconds - min_seconds) / 4
        delay = random.lognormvariate(math.log(mu), sigma / mu)
        
        # 限制在範圍內
        delay = max(min_seconds, min(max_seconds, delay))
        
        # 深夜或清晨加入額外延遲(模擬疲倦)
        hour = datetime.now().hour
        if hour < 6 or hour > 23:
            delay *= random.uniform(1.2, 1.8)
        
        time.sleep(delay)

