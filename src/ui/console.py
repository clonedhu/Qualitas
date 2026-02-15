
import customtkinter as ctk
import threading
import logging
import queue
import tkinter as tk
from tkinter import messagebox
from PIL import Image, ImageTk
import os
import sys

# Configure logging
logger = logging.getLogger(__name__)

class ResilienceConsole:
    def __init__(self, root, adapter):
        self.root = root
        self.adapter = adapter
        
        # UI Setup
        ctk.set_appearance_mode("Dark")  # Modes: "System" (standard), "Dark", "Light"
        ctk.set_default_color_theme("blue")  # Themes: "blue" (standard), "green", "dark-blue"
        
        self.root.title("Resilience Adapter v1.3")
        self.root.geometry("450x400") # Reduced height by default
        self.root.resizable(False, True) # Allow height resizing
        
        # Threading
        self.task_queue = queue.Queue()
        self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.worker_thread.start()
        
        self.create_widgets()
        
        # Redirect stdout/stderr to log window
        sys.stdout = self.RedirectText(self.log_textbox, "stdout")
        sys.stderr = self.RedirectText(self.log_textbox, "stderr")
        
    def resource_path(self, relative_path):
        """ Get absolute path to resource, works for dev and for PyInstaller """
        try:
            # PyInstaller creates a temp folder and stores path in _MEIPASS
            base_path = sys._MEIPASS
        except Exception:
            base_path = os.path.abspath(".")

        return os.path.join(base_path, relative_path)
        
    def create_widgets(self):
        # Grid layout
        self.root.grid_columnconfigure(0, weight=1)
        self.root.grid_rowconfigure(0, weight=0)  # Header
        self.root.grid_rowconfigure(1, weight=0)  # Status
        self.root.grid_rowconfigure(2, weight=0)  # Actions
        self.root.grid_rowconfigure(3, weight=0)  # Options
        self.root.grid_rowconfigure(4, weight=1)  # Log
        
        # Load Icons
        gemini_icon_path = self.resource_path(os.path.join("assets", "gemini_icon.png"))
        gpt_icon_path = self.resource_path(os.path.join("assets", "gpt_icon.png"))
        
        self.gemini_icon = None
        self.gpt_icon = None
        
        try:
            if os.path.exists(gemini_icon_path):
                self.gemini_icon = ctk.CTkImage(light_image=Image.open(gemini_icon_path), 
                                              dark_image=Image.open(gemini_icon_path),
                                              size=(30, 30))
        except Exception as e:
            logger.error(f"Failed to load Gemini icon: {e}")

        try:
            if os.path.exists(gpt_icon_path):
                self.gpt_icon = ctk.CTkImage(light_image=Image.open(gpt_icon_path), 
                                           dark_image=Image.open(gpt_icon_path),
                                           size=(30, 30))
        except Exception as e:
            logger.error(f"Failed to load GPT icon: {e}")
            
        # --- Header ---
        self.header_frame = ctk.CTkFrame(self.root, corner_radius=0)
        self.header_frame.grid(row=0, column=0, sticky="ew")
        
        self.title_label = ctk.CTkLabel(self.header_frame, text="🛡 Resilience Adapter", font=ctk.CTkFont(size=20, weight="bold"))
        self.title_label.pack(pady=10)
        
        # --- Status ---
        self.status_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        self.status_frame.grid(row=1, column=0, sticky="ew", padx=20, pady=(10, 0))
        
        self.status_indicator = ctk.CTkLabel(self.status_frame, text="●", font=ctk.CTkFont(size=24), text_color="gray")
        self.status_indicator.pack(side="left", padx=(10, 5))
        
        self.status_label = ctk.CTkLabel(self.status_frame, text="SYSTEM READY", font=ctk.CTkFont(size=14, weight="bold"))
        self.status_label.pack(side="left")
        
        # --- Actions ---
        self.action_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        self.action_frame.grid(row=2, column=0, sticky="ew", padx=20, pady=20)
        self.action_frame.grid_columnconfigure(0, weight=1)
        self.action_frame.grid_columnconfigure(1, weight=1)
        
        self.btn_gemini_gpt = ctk.CTkButton(self.action_frame, text="Gemini ➔ GPT", height=50, 
                                            image=self.gemini_icon, compound="left",
                                            command=self.trigger_gemini_to_gpt, font=ctk.CTkFont(size=16, weight="bold"))
        self.btn_gemini_gpt.grid(row=0, column=0, padx=5, sticky="ew")
        
        self.btn_gpt_gemini = ctk.CTkButton(self.action_frame, text="GPT ➔ Gemini", height=50, 
                                            image=self.gpt_icon, compound="left",
                                            command=self.trigger_gpt_to_gemini, font=ctk.CTkFont(size=16, weight="bold"))
        self.btn_gpt_gemini.grid(row=0, column=1, padx=5, sticky="ew")
        
        self.btn_health_check = ctk.CTkButton(self.action_frame, text="🔍 Health Check", height=40, fg_color="gray", hover_color="#555",
                                              command=self.trigger_health_check)
        self.btn_health_check.grid(row=1, column=0, columnspan=2, pady=(10, 0), sticky="ew")

        # --- Options ---
        self.option_frame = ctk.CTkFrame(self.root)
        self.option_frame.grid(row=3, column=0, sticky="ew", padx=20, pady=(0, 20))
        
        self.topmost_var = tk.BooleanVar(value=True)
        self.chk_topmost = ctk.CTkCheckBox(self.option_frame, text="Stay on Top", variable=self.topmost_var, command=self.toggle_topmost)
        self.chk_topmost.pack(side="left", padx=20, pady=10)
        
        self.show_log_var = tk.BooleanVar(value=False)
        self.chk_show_log = ctk.CTkCheckBox(self.option_frame, text="Show Logs", variable=self.show_log_var, command=self.toggle_log)
        self.chk_show_log.pack(side="left", padx=10, pady=10)
        
        self.stress_test_var = tk.BooleanVar(value=True)
        self.chk_stress_test = ctk.CTkCheckBox(self.option_frame, text="Stress Test", variable=self.stress_test_var)
        self.chk_stress_test.pack(side="left", padx=10, pady=10)
        
        # Dummy Checkboxes for features (visual only for now as features are always on)
        # self.stealth_var = tk.BooleanVar(value=True)
        # self.chk_stealth = ctk.CTkCheckBox(self.option_frame, text="Stealth Mode", variable=self.stealth_var, state="disabled")
        # self.chk_stealth.pack(side="left", padx=10, pady=10)
        
        # --- Log Window ---
        self.log_frame = ctk.CTkFrame(self.root, fg_color="transparent") # Container for log
        self.log_frame.grid(row=4, column=0, padx=20, pady=(0, 20), sticky="nsew")
        
        self.log_textbox = ctk.CTkTextbox(self.log_frame, width=400, height=200)
        self.log_textbox.pack(expand=True, fill="both")
        self.log_textbox.insert("0.0", "--- Application Started ---\n")
        self.log_textbox.configure(state="disabled")
        
        self.toggle_log() # Apply initial state

    def toggle_topmost(self):
        self.root.attributes("-topmost", self.topmost_var.get())

    def toggle_log(self):
        if self.show_log_var.get():
            self.log_frame.grid(row=4, column=0, padx=20, pady=(0, 20), sticky="nsew")
            self.root.geometry("450x600")
        else:
            self.log_frame.grid_forget()
            self.root.geometry("450x400")

    def _worker_loop(self):
        while True:
            task = self.task_queue.get()
            if task is None:
                break
            
            func, args = task
            try:
                # Disable buttons
                self.root.after(0, lambda: self.set_buttons_state("disabled"))
                
                result = func(*args)
                
                self.root.after(0, lambda: self.update_status(result))
                self.root.after(0, lambda: self.log_message(f"Task Completed: {result}"))
                
            except Exception as e:
                logger.error(f"Worker Error: {e}")
                self.root.after(0, lambda: self.update_status("SYSTEM ERROR"))
                self.root.after(0, lambda: self.log_message(f"Error: {e}"))
            finally:
                # Re-enable buttons
                self.root.after(0, lambda: self.set_buttons_state("normal"))
            
            self.task_queue.task_done()

    def set_buttons_state(self, state):
        self.btn_gemini_gpt.configure(state=state)
        self.btn_gpt_gemini.configure(state=state)
        self.btn_health_check.configure(state=state)

    def _enqueue_task(self, func, *args):
        self.task_queue.put((func, args))

    def trigger_gemini_to_gpt(self):
        self.update_status("PROCESSING")
        self.log_message("Starting Transfer: Gemini -> GPT...")
        self._enqueue_task(self.adapter.transfer_gemini_to_gpt, self.stress_test_var.get())

    def trigger_gpt_to_gemini(self):
        self.update_status("PROCESSING")
        self.log_message("Starting Transfer: GPT -> Gemini...")
        self._enqueue_task(self.adapter.transfer_gpt_to_gemini, self.stress_test_var.get())

    def trigger_health_check(self):
        self.update_status("CHECKING...")
        self.log_message("Running Health Check...")
        self._enqueue_task(self.adapter.health_check)

    def update_status(self, status):
        self.status_label.configure(text=status)
        
        # Color coding
        if status == "SYSTEM READY":
            self.status_indicator.configure(text_color="#00ff00") # Green
            self.status_label.configure(text_color="#00ff00")
        elif status == "PROCESSING" or status == "CHECKING...":
            self.status_indicator.configure(text_color="#ffff00") # Yellow
            self.status_label.configure(text_color="#ffff00")
        elif status == "DEGRADED":
            self.status_indicator.configure(text_color="#ffa500") # Orange
            self.status_label.configure(text_color="#ffa500")
        elif status == "COMPLETED":
            self.status_indicator.configure(text_color="#00ffff")  # Cyan
            self.status_label.configure(text_color="#00ffff")
        elif "FAIL" in status or "ERROR" in status or "RISK" in status or "BROKEN" in status:
            self.status_indicator.configure(text_color="#ff0000") # Red
            self.status_label.configure(text_color="#ff0000")
        else:
            self.status_indicator.configure(text_color="gray")
            self.status_label.configure(text_color="white")

    def log_message(self, message):
        self.log_textbox.configure(state="normal")
        self.log_textbox.insert("end", message + "\n")
        self.log_textbox.see("end")
        self.log_textbox.configure(state="disabled")

    class RedirectText(object):
        def __init__(self, text_widget, tag="stdout"):
            self.text_widget = text_widget
            self.tag = tag

        def write(self, string):
            self.text_widget.configure(state="normal")
            self.text_widget.insert("end", string)
            self.text_widget.see("end")
            self.text_widget.configure(state="disabled")

        def flush(self):
            pass
