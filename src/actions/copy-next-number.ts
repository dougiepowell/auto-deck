import { KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { spawn }                        from "child_process";

// Full path to your python.exe (adjust if needed)
const PYTHON = "C:/Users/maxdo/AppData/Local/Programs/Python/Python313/python.exe";
// Absolute path to your script
const SCRIPT = "H:/AutoDeck/phone_sender.py";

export class CopyNextNumberAction extends SingletonAction {
  constructor(manifestId: string) {
    super(manifestId);
  }

  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    console.log("[AutoDeck] ▶️ spawning:", PYTHON, SCRIPT, "next");

    const proc = spawn(PYTHON, [SCRIPT, "next"], { cwd: "H:/AutoDeck" });

    proc.stdout.on("data", (data) =>
      console.log("[AutoDeck][py-out]", data.toString().trim())
    );
    proc.stderr.on("data", (data) =>
      console.error("[AutoDeck][py-err]", data.toString().trim())
    );
    proc.on("error", (err) =>
      console.error("[AutoDeck][spawn-error]", err.message)
    );
    proc.on("exit", (code) =>
      console.log("[AutoDeck][exit-code]", code)
    );
    proc.on("exit", (code) =>
      code === 0 ? this.showOk() : this.showAlert()
    );
  }
}
