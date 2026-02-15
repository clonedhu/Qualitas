from playwright.sync_api import sync_playwright

def check_browser():
    output_lines = []
    try:
        with sync_playwright() as p:
            output_lines.append("Connecting to Chrome on port 9222 (127.0.0.1)...")
            browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
            output_lines.append("Connected!")
            
            if not browser.contexts:
                output_lines.append("No contexts found.")
            else:
                context = browser.contexts[0]
                output_lines.append(f"Found {len(context.pages)} pages:")
                
                for i, page in enumerate(context.pages):
                    try:
                        title = page.title()
                        url = page.url
                        output_lines.append(f"  [{i}] Title: '{title}' | URL: {url}")
                    except Exception as e:
                        output_lines.append(f"  [{i}] Error reading page: {e}")
            
            browser.close()
            
    except Exception as e:
        output_lines.append(f"FAILED to connect: {e}")
        output_lines.append("Please ensure Chrome is running with: --remote-debugging-port=9222")

    with open("debug_output.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))
    print("Debug output saved to debug_output.txt")

if __name__ == "__main__":
    check_browser()
