"""
Small desktop UI for the monthly attendance report.

Launch with "Attendance Report.bat" (or:  pythonw ui.py).
The actual work lives in attendance_report.py - this is just the window.
"""
import os
import queue
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

import attendance_report as engine

LAST_DIR_FILE = os.path.join(engine.HERE, ".last_dir")


def _open_in_os(path):
    try:
        os.startfile(path)                       # Windows
    except AttributeError:
        subprocess.call(["open" if sys.platform == "darwin" else "xdg-open", path])


class App:
    def __init__(self, root):
        self.root = root
        self.result_path = None
        self.msgq = queue.Queue()
        root.title("Attendance Report")
        root.geometry("760x520")
        root.minsize(620, 420)

        pad = {"padx": 10, "pady": 6}
        top = ttk.Frame(root)
        top.pack(fill="x", **pad)

        ttk.Label(top, text="xPortal export:").grid(row=0, column=0, sticky="w")
        self.file_var = tk.StringVar()
        ttk.Entry(top, textvariable=self.file_var).grid(row=0, column=1, sticky="ew", padx=6)
        ttk.Button(top, text="Choose…", command=self.pick_file).grid(row=0, column=2)

        ttk.Label(top, text="Lunch deducted (min):").grid(row=1, column=0, sticky="w", pady=(6, 0))
        self.lunch_var = tk.StringVar(value=str(engine.LUNCH_MIN))
        ttk.Spinbox(top, from_=0, to=180, increment=15, width=6,
                    textvariable=self.lunch_var).grid(row=1, column=1, sticky="w", padx=6, pady=(6, 0))
        top.columnconfigure(1, weight=1)

        btns = ttk.Frame(root)
        btns.pack(fill="x", **pad)
        self.run_btn = ttk.Button(btns, text="Generate report", command=self.run)
        self.run_btn.pack(side="left")
        self.open_report_btn = ttk.Button(btns, text="Open report", command=self.open_report,
                                          state="disabled")
        self.open_report_btn.pack(side="left", padx=6)
        ttk.Button(btns, text="Open staff list", command=self.open_staff_list).pack(side="left")

        self.out = tk.Text(root, wrap="word", height=18, state="disabled",
                           font=("Consolas", 10))
        self.out.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        self._log("Pick an xPortal ‘Daily Attendance Report (Lite)’ export, then "
                  "Generate report.\nThe report is written next to that file.")

    # ---- helpers ----------------------------------------------------------
    def _log(self, text, clear=False):
        self.out.configure(state="normal")
        if clear:
            self.out.delete("1.0", "end")
        self.out.insert("end", text + "\n")
        self.out.see("end")
        self.out.configure(state="disabled")

    def _load_last_dir(self):
        try:
            with open(LAST_DIR_FILE) as f:
                d = f.read().strip()
                return d if os.path.isdir(d) else engine.HERE
        except OSError:
            return engine.HERE

    def _save_last_dir(self, path):
        try:
            with open(LAST_DIR_FILE, "w") as f:
                f.write(os.path.dirname(os.path.abspath(path)))
        except OSError:
            pass

    # ---- actions --------------------------------------------------------
    def pick_file(self):
        path = filedialog.askopenfilename(
            title="Select the xPortal Daily Attendance (Lite) export",
            initialdir=self._load_last_dir(),
            filetypes=[("Excel files", "*.xlsx *.xls"), ("All files", "*.*")])
        if path:
            self.file_var.set(path)
            self._save_last_dir(path)

    def open_staff_list(self):
        if not os.path.exists(engine.MASTER_CSV):
            messagebox.showerror("Missing file", f"employees.csv not found:\n{engine.MASTER_CSV}")
            return
        _open_in_os(engine.MASTER_CSV)

    def open_report(self):
        if self.result_path and os.path.exists(self.result_path):
            _open_in_os(self.result_path)

    def run(self):
        src = self.file_var.get().strip()
        if not src or not os.path.exists(src):
            messagebox.showwarning("Pick a file", "Choose the xPortal export first.")
            return
        try:
            lunch = int(self.lunch_var.get())
        except ValueError:
            messagebox.showwarning("Lunch value", "Lunch minutes must be a whole number.")
            return

        self.run_btn.configure(state="disabled")
        self.open_report_btn.configure(state="disabled")
        self._log("Working…", clear=True)
        threading.Thread(target=self._work, args=(src, lunch), daemon=True).start()
        self.root.after(100, self._drain)

    def _work(self, src, lunch):
        try:
            res = engine.build(src, lunch_min=lunch)
            self.msgq.put(("ok", res))
        except SystemExit as e:                  # engine uses sys.exit for bad input
            self.msgq.put(("err", str(e)))
        except Exception as e:
            self.msgq.put(("err", f"{type(e).__name__}: {e}"))

    def _drain(self):
        try:
            kind, payload = self.msgq.get_nowait()
        except queue.Empty:
            self.root.after(100, self._drain)
            return
        self.run_btn.configure(state="normal")
        if kind == "err":
            self._log("Could not build the report:\n\n" + payload, clear=True)
            messagebox.showerror("Failed", payload)
            return
        self.result_path = payload["out_path"]
        self.open_report_btn.configure(state="normal")
        self._log(engine.format_report(payload), clear=True)


if __name__ == "__main__":
    root = tk.Tk()
    try:
        ttk.Style().theme_use("vista")
    except tk.TclError:
        pass
    App(root)
    root.mainloop()
