# EyePhone App

Animated robot eyes for Android — full-screen, expressive, and remotely controllable. Built to run on low-power Android phones as an interactive face for robots, kiosks, or art installations.

![Android](https://img.shields.io/badge/Android-24%2B-green?logo=android)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Animated Eyes** — Realistic eyeballs with iris fibers, dynamic pupils, curved eyebrows, and 3D depth effects powered by GSAP
- **10 Mood Presets** — Happy, Sad, Angry, Surprise, Fear, Disgust, Confused, Love, Sleepy, Excited with persistent hold states and periodic emphasis animations
- **Face Tracking** — ML Kit face detection drives gaze following, blink mirroring, and reactive expressions (smile → joy, head turn → surprise, etc.)
- **IMU Gaze** — Accelerometer and gyroscope data tilts the eyes when the phone moves
- **Touch Gaze** — Tap or drag anywhere to direct eye movement
- **7 Color Themes** — OD Green (default), Cyan, Amber, Green, Red, White, Purple + custom hex color picker
- **Kiosk Mode** — Lock the app with a passcode using Android Device Owner / Lock Task Mode
- **Auto Snapshots** — Periodic JPEG captures from the front camera during face detection with 200MB auto-recycling
- **Battery Management** — Adaptive screen brightness based on battery level and charge state
- **WebSocket Control** — Remote mood, gaze, and theme commands from any machine on the network
- **Boot on Startup** — Auto-launches after device reboot

## Architecture

```
app/src/main/
├── assets/
│   ├── index.html              # WebView entry point
│   ├── web-eye-animation.js    # All eye rendering, animation, UI, and state
│   └── gsap.min.js             # GSAP animation library (bundled)
├── java/com/ceim/roboteyes/
│   ├── MainActivity.java       # WebView host, CameraX, ML Kit, IMU, battery, kiosk
│   ├── AdminReceiver.java      # Device admin for kiosk lock task
│   └── BootReceiver.java       # Auto-start on boot
└── res/
    ├── values/
    │   ├── strings.xml
    │   └── themes.xml
    └── xml/
        └── device_admin.xml

controller/
└── eye_controller.py           # Python WebSocket server for remote control
```

## Quick Start

### Prerequisites

- Android SDK (API 24+)
- JDK 17
- ADB

### Build & Install

```bash
# Clone
git clone https://github.com/CummingsElec/EyePhone_App.git
cd EyePhone_App

# Set your Android SDK path
echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties

# Build
chmod +x gradlew
./gradlew assembleDebug

# Install to connected device
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Kiosk Mode (Optional)

To enable lock task mode, set the app as device owner:

```bash
# Factory reset or clear device owners first, then:
adb shell dpm set-device-owner com.ceim.roboteyes/.AdminReceiver
```

Then toggle Kiosk Lock from the in-app menu (long-press to open). Default passcode is `1234` — change it immediately.

### Remote Control (Optional)

Run the WebSocket controller on any machine on the same network:

```bash
cd controller
pip install websockets
python3 eye_controller.py
```

Commands:
| Command | Example |
|---|---|
| `emotion <mood>` | `emotion joy` |
| `eye <x> <y>` | `eye 0.8 0.3` (normalized 0-1) |
| `eye target <x> <y> <z> <focal>` | `eye target 100 50 200 1000` |
| `theme <name>` | `theme odgreen` |
| `neutral` | Reset to idle |

## In-App Menu

Long-press anywhere to open the settings overlay:

- **Mood** — Select a persistent mood or tap again to deactivate
- **Iris Color** — Tap a swatch, use the color picker, or enter a hex code
- **IMU Toggle** — Enable/disable tilt-based gaze
- **Face Tracking Toggle** — Enable/disable camera-based face following
- **Kiosk Lock** — Lock the app with passcode protection
- **Auto Snapshot** — Save periodic detection frames to local storage
- **Snapshot Management** — View count, clear stored snapshots

## Credits

**Created by [Jacob Yount](https://github.com/CummingsElec)**
Cummings Electrical & Industrial Maintenance

Built with assistance from **Claude** (Anthropic) via Cursor IDE.

### Third-Party

- **[GSAP](https://greensock.com/gsap/)** (GreenSock Animation Platform) — Animation engine. Subject to [GreenSock's license](https://greensock.com/licensing/).
- **[ML Kit](https://developers.google.com/ml-kit)** (Google) — On-device face detection. Apache 2.0.
- **[CameraX](https://developer.android.com/training/camerax)** (AndroidX) — Camera API. Apache 2.0.

## License

MIT — see [LICENSE](LICENSE) for details.
