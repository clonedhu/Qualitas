import time
import logging

logger = logging.getLogger(__name__)

class SemanticConvergence:
    def __init__(self, timeout=30, stability_threshold=3, min_length=10):
        self.timeout = timeout
        self.stability_threshold = stability_threshold
        self.min_length = min_length

    def wait_for_convergence(self, element_handle):
        """
        Monitors the element's text content until it stabilizes.
        """
        import random
        
        start_time = time.time()
        stable_count = 0
        last_text = ""

        while time.time() - start_time < self.timeout:
            try:
                current_text = element_handle.inner_text()
            except Exception:
                # Element might have been removed/re-rendered
                return None

            # Check for "..." or empty/short content
            if len(current_text) < self.min_length:
                time.sleep(random.uniform(0.8, 1.5))
                continue

            if current_text.strip().endswith("..."):
                # Still streaming clearly
                stable_count = 0
            elif current_text == last_text:
                stable_count += 1
            else:
                stable_count = 0
            
            last_text = current_text

            if stable_count >= self.stability_threshold:
                return current_text
            
            # 使用隨機間隔而非固定 1 秒
            time.sleep(random.uniform(0.8, 1.5))
        
        logger.warning("Semantic Convergence Timeout: Returning unstable content.")
        return last_text
