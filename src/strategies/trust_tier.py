import logging

logger = logging.getLogger(__name__)

class SelectorTrustTier:
    def __init__(self, tiers):
        """
        tiers: A list of selectors from most trusted (Tier 0) to least trusted (Tier N).
        Example: ["#primary-id", ".secondary-class", "xpath=//fallback"]
        """
        self.tiers = tiers
        self.current_tier_index = 0

    def resolve(self, page):
        """
        Iterates through tiers to find the first working selector.
        Returns: (element_handle, tier_index) or (None, -1)
        """
        import random
        import time
        
        for i, selector in enumerate(self.tiers):
            try:
                # 使用隨機 timeout (800-1500ms) 避免機械化模式
                timeout = random.randint(800, 1500)
                element = page.wait_for_selector(selector, timeout=timeout, state="visible")
                if element:
                    if i > 0:
                         logger.warning(f"Degradation Signal: Using Tier {i} selector: {selector}")
                    return element, i
            except Exception:
                # 查詢失敗時加入短暫隨機延遲(模擬人類反應)
                if i < len(self.tiers) - 1:  # 不是最後一次嘗試
                    time.sleep(random.uniform(0.1, 0.3))
                continue
        
        logger.error("All Selector Tiers FAILED.")
        return None, -1
