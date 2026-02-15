import logging
import time
import random
from src.core.browser import BrowserManager
from src.strategies.trust_tier import SelectorTrustTier
from src.strategies.anchor import StructuralAnchor
from src.strategies.convergence import SemanticConvergence
from src.strategies.entropy import BehavioralEntropy

logger = logging.getLogger(__name__)

class ResilienceAdapter:
    def __init__(self):
        self.browser_manager = BrowserManager()
        self.convergence = SemanticConvergence()
        self.entropy = BehavioralEntropy()
        
        # Selectors (Placeholder - needs real world validation)
        self.gemini_selectors = {
            "input": ["div[contenteditable='true']", "textarea"],
            "response": ["model-response", ".message-content"],
            "user_msg": ["user-query", ".user-message"],
            "send_btn": ["button[aria-label='Send']"]
        }
        
        self.gpt_selectors = {
            "input": ["#prompt-textarea"],
            "response": [".markdown"],
            "user_msg": ["div[data-message-author-role='user']"],
            "send_btn": ["button[data-testid='send-button']"]
        }

    def connect(self):
        if not self.browser_manager.playwright:
             return self.browser_manager.connect()
        return True

    def _clean_ai_response(self, content: str) -> str:
        """
        清理 AI 回應中的反問句和不必要的結尾
        
        Args:
            content: 原始 AI 回應內容
            
        Returns:
            清理後的內容
        """
        import re
        
        if not content:
            return content
        
        # 常見的 AI 反問句模式(繁體中文)
        chinese_patterns = [
            r'^Gemini said:',
            r'^ChatGPT said:',
            r'^You said:',
            r'^Gemini 說:',
            r'^ChatGPT 說:',
            r'^你說:',
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
            r'^Gemini said:',
            r'^ChatGPT said:',
            r'^You said:',
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
        
        # 1. 移除開頭的對話標籤 (Gemini said:, You said: 等)
        # 這些標籤通常出現在開頭，但也可能在中間 (如果是多輪對話複製)
        # 這裡主要針對每一行的開頭進行檢查
        
        lines = cleaned.split('\n')
        new_lines = []
        for line in lines:
            line_stripped = line.strip()
            # 檢查是否以標籤開頭
            is_tag = False
            for pattern in chinese_patterns + english_patterns:
                # 只檢查以該模式開頭的情況 (也就是標籤)
                # 反問句模式通常有 $ 結尾，這裡過濾掉那些
                if pattern.endswith('$'): 
                    continue
                    
                if re.match(pattern, line_stripped, re.IGNORECASE):
                    is_tag = True
                    break
            
            if not is_tag:
                new_lines.append(line)
            else:
                logger.info(f"Removed AI tag: {line_stripped[:20]}...")

        lines = new_lines
        
        # 2. 移除結尾的反問句(逐行處理,從最後一行開始)
        
        # 檢查最後 1-3 行是否為反問句
        lines_to_check = min(3, len(lines))
        removed_count = 0
        
        for i in range(lines_to_check):
            if not lines:
                break
                
            last_line = lines[-1].strip()
            
            # 空行直接移除
            if not last_line:
                lines.pop()
                continue
            
            # 檢查是否匹配反問句模式
            is_question = False
            
            for pattern in chinese_patterns + english_patterns:
                # 這次包含所有模式(主要是反問句)
                if re.search(pattern, last_line, re.IGNORECASE | re.MULTILINE):
                    is_question = True
                    break
            
            # 如果是反問句,移除這一行
            if is_question:
                lines.pop()
                removed_count += 1
            else:
                # 如果不是反問句,停止檢查
                break
        
        cleaned = '\n'.join(lines).strip()
        
        # 記錄清理資訊
        if removed_count > 0:
            logger.info(f"Removed {removed_count} AI follow-up question(s) from response")
        
        return cleaned
    
    def health_check(self):
        status = "SYSTEM READY"
        self.connect()
        
        gemini = self.browser_manager.get_tab("Gemini")
        gpt = self.browser_manager.get_tab("ChatGPT")
        
        if not gemini or not gpt:
            return "BROKEN (Missing Tab)"
            
        # Check inputs
        g_in, _ = SelectorTrustTier(self.gemini_selectors["input"]).resolve(gemini)
        if not g_in: status = "DEGRADED (Gemini In)"
        
        p_in, _ = SelectorTrustTier(self.gpt_selectors["input"]).resolve(gpt)
        if not p_in: status = "DEGRADED (GPT In)"
        
        return status

    def _transfer(self, source_tab, target_tab, source_selectors, target_selectors, stress_test=False):
        """Generic transfer logic."""
        if not source_tab or not target_tab:
            return "FAILED (Missing Tab)"

        # 1. ANCHOR CHECK & RETRIEVAL
        # Find valid response using Structural Anchor
        anchor = StructuralAnchor(source_selectors["user_msg"][0], source_selectors["response"][0])
        # Note: Anchor strategy here is simplified to just check last response validation
        # But for retrieval, we use Trust Tier to get the element first.
        
        response_tier = SelectorTrustTier(source_selectors["response"])
        # We need ALL responses to find the last one? 
        # TrustTier returns the first match for the selector. 
        # 'model-response' typically matches all. We want the last one.
        # Let's adjust TrustTier usage or just use page.query_selector_all with the trusted selector.
        
        # Get trusted selector first
        _, tier_idx = response_tier.resolve(source_tab)
        if tier_idx == -1:
            return "NO RESPONSE FOUND (Type something in Gemini?)"
            
        trusted_selector = source_selectors["response"][tier_idx]
        responses = source_tab.query_selector_all(trusted_selector)
        if not responses:
            return "STRUCTURE RISK (No Response Elements)"
            
        last_response = responses[-1]
        
        # Validate Anchor (User message before Assistant message)
        # Using a fresh Anchor instance with specific selectors
        # (This assumes Tier 0 of UserMsg is valid, which might be risky, but Anchor class handles its own logic?)
        # Let's trust Anchor class to find user messages.
        
        # [TODO]: Integrate Anchor check strictly. For now, trusting the last response element.
        
        # 模擬閱讀來源內容
        self.entropy.simulate_reading(source_tab, trusted_selector)
        
        # 2. CONVERGENCE
        content = self.convergence.wait_for_convergence(last_response)
        if not content:
            return "CONTENT FAILED"
        
        # 清理 AI 回應中的反問句
        content = self._clean_ai_response(content)
        
        # (New) 附加壓力測試提示詞
        if stress_test:
            stress_prompt = "\n\n請對我剛才的邏輯進行一次『壓力測試』。請針對我的論點提出 2 個最具挑戰性的反對意見，並指出我可能忽略掉的隱性前提或關鍵細節。"
            content += stress_prompt
            logger.info("Appended Stress Test prompt")
        
        # 隨機短暫停頓(模擬思考要傳什麼)
        self.entropy.random_wait(0.5, 1.5)
            
        # 3. ENTROPY INJECTION (Typing)
        target_tab.bring_to_front()
        
        # 偶爾隨機移動滑鼠(20% 機率)
        if random.random() < 0.2:
            self.entropy.random_mouse_movement(target_tab)
        
        target_input_tier = SelectorTrustTier(target_selectors["input"])
        target_input, t_idx = target_input_tier.resolve(target_tab)
        
        if not target_input:
            return "DEGRADED (Target Input Missing)"
            
        # Use Entropy to type
        # We need the selector string for entropy.
        target_input_selector = target_selectors["input"][t_idx]
        
        # Clear input first?
        try:
            target_input.fill("") 
        except Exception:
            pass

        # 使用改進的 fast_fill(包含真實鍵盤事件和滑鼠移動)
        self.entropy.fast_fill(target_tab, target_input_selector, content)
        
        self.entropy.random_wait(0.2, 0.5) # Minimal wait before send
        
        # 4. SEND (Disabled by user request)
        # send_tier = SelectorTrustTier(target_selectors["send_btn"])
        # send_btn, _ = send_tier.resolve(target_tab)
        
        # if send_btn:
        #     send_btn.click()
        # else:
        #     target_tab.keyboard.press("Enter")
            
        return "COMPLETED"

    def transfer_gemini_to_gpt(self, stress_test=False):
        self.connect()
        return self._transfer(
            self.browser_manager.get_tab("Gemini"),
            self.browser_manager.get_tab("ChatGPT"),
            self.gemini_selectors,
            self.gpt_selectors,
            stress_test=stress_test
        )

    def transfer_gpt_to_gemini(self, stress_test=False):
        self.connect()
        return self._transfer(
            self.browser_manager.get_tab("ChatGPT"),
            self.browser_manager.get_tab("Gemini"),
            self.gpt_selectors,
            self.gemini_selectors,
            stress_test=stress_test
        )
