import sys
import os
import traceback

# Ensure the root directory is in sys.path so 'src' can be imported
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(base_dir)

panic_log = os.path.join(base_dir, "panic.log")

try:
    from src.main import main
    if __name__ == "__main__":
        main()
except Exception as e:
    with open(panic_log, "w") as f:
        f.write(f"CRITICAL ERROR:\n{str(e)}\n\nTRACEBACK:\n{traceback.format_exc()}")
    # Also try to show a message box if possible
    try:
        import tkinter.messagebox
        import tkinter as tk
        root = tk.Tk()
        root.withdraw()
        tkinter.messagebox.showerror("Critical Error", f"Failed to start:\n{str(e)}\n\nSee panic.log for details.")
    except:
        pass
