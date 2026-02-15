import logging

logger = logging.getLogger(__name__)

class StructuralAnchor:
    def __init__(self, user_selector, assistant_selector):
        """
        user_selector: Selector to identify a user message (the anchor).
        assistant_selector: Selector to identify the assistant's response.
        """
        self.user_selector = user_selector
        self.assistant_selector = assistant_selector

    def validate_last_response(self, page):
        """
        Validates that the last assistant response is structurally anchored to a preceding user message.
        Returns: The element handle of the valid response or None.
        """
        # This is a simplified logic. In a real DOM, we'd need more complex traversal.
        # For v5.0, we check if the last user message exists, and if there is an assistant message *after* it.
        
        try:
            # 1. Find all user messages
            user_msgs = page.query_selector_all(self.user_selector)
            if not user_msgs:
                logger.error("Anchor Missing: No user messages found.")
                return None

            # 2. Find all assistant messages
            asst_msgs = page.query_selector_all(self.assistant_selector)
            if not asst_msgs:
                logger.error("Response Missing: No assistant messages found.")
                return None
            
            # 3. Structural Integrity Check (Conceptually)
            # We want the LAST assistant message.
            # We verify it's visually or DOM-wise after the LAST user message.
            
            last_user = user_msgs[-1]
            last_asst = asst_msgs[-1]
            
            # Simple bounding box check (vertical position)
            # If assistant message top < user message bottom, something is wrong (unless it's side-by-side which is rare for these UIs)
            
            u_box = last_user.bounding_box()
            a_box = last_asst.bounding_box()
            
            if u_box and a_box:
                if a_box['y'] > u_box['y']:
                    return last_asst
                else:
                   logger.warning("Structural Risk: Last assistant message appears BEFORE last user message.")
                   # Fallback: maybe the last message IS the user message and assistant hasn't replied yet?
                   return None
            
            return last_asst # Fallback if no bounding box (hidden?)

        except Exception as e:
            logger.error(f"Anchor Check Failed: {e}")
            return None
