package com.ceim.roboteyes;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.admin.DevicePolicyManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.ImageFormat;
import android.graphics.Rect;
import android.graphics.YuvImage;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.wifi.WifiManager;
import android.os.BatteryManager;
import android.os.Bundle;
import android.util.Log;
import android.util.Size;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.face.Face;
import com.google.mlkit.vision.face.FaceDetection;
import com.google.mlkit.vision.face.FaceDetector;
import com.google.mlkit.vision.face.FaceDetectorOptions;

import java.io.File;
import java.io.FileOutputStream;
import java.net.InetAddress;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity implements SensorEventListener {

    private static final String TAG = "RobotEyes";
    private static final int CAMERA_PERM = 100;
    private static final int IMU_INTERVAL_MS = 20;
    private static final int FACE_INTERVAL_MS = 100;
    private static final float ALPHA = 0.35f;
    private static final int SNAPSHOT_INTERVAL_MS = 5000;
    private static final long MAX_SNAPSHOT_BYTES = 200L * 1024 * 1024; // 200 MB cap

    private WebView webView;
    private boolean webViewReady = false;

    // IMU
    private SensorManager sensorManager;
    private Sensor accelerometer, gyroscope;
    private long lastImuPush = 0;
    private float fAx, fAy, fGx, fGy;

    // Face tracking — lazy init
    private boolean faceTrackingRequested = false;
    private ProcessCameraProvider cameraProvider;
    private FaceDetector faceDetector;
    private ExecutorService analysisExecutor;
    private long lastFacePush = 0;
    private boolean faceProcessing = false;
    private int imgW = 320, imgH = 240;

    // Kiosk
    private DevicePolicyManager dpm;
    private ComponentName adminComponent;
    private SharedPreferences prefs;

    // Snapshots
    private volatile boolean snapshotEnabled = false;
    private long lastSnapshotTime = 0;

    // Battery
    private int batteryPct = 100;
    private boolean batteryCharging = false;
    private final BroadcastReceiver batteryReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            int status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
            batteryPct = (level >= 0 && scale > 0) ? (level * 100 / scale) : 100;
            batteryCharging = (status == BatteryManager.BATTERY_STATUS_CHARGING
                            || status == BatteryManager.BATTERY_STATUS_FULL);
            adjustBrightness();
            jsCall(String.format(
                "if(window.eyes&&eyes.onBattery)eyes.onBattery(%d,%s);",
                batteryPct, batteryCharging ? "true" : "false"));
        }
    };

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        prefs = getSharedPreferences("robot_eyes_prefs", MODE_PRIVATE);
        snapshotEnabled = prefs.getBoolean("snapshot_enabled", false);

        // Kiosk setup
        dpm = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        adminComponent = AdminReceiver.getComponentName(this);
        ensureWhitelist();
        if (prefs.getBoolean("kiosk_enabled", false)) {
            try { startLockTask(); } catch (Exception e) { Log.e(TAG, "startLockTask", e); }
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setCacheMode(WebSettings.LOAD_NO_CACHE);

        webView.addJavascriptInterface(new RobotBridge(), "RobotConfig");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                webViewReady = true;
            }
        });
        webView.setBackgroundColor(0xFF000000);
        webView.loadUrl("file:///android_asset/index.html");

        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);

        registerReceiver(batteryReceiver, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));

        hideSystemUI();
    }

    // ===== KIOSK =====

    private void ensureWhitelist() {
        if (!dpm.isDeviceOwnerApp(getPackageName())) return;
        try {
            dpm.setLockTaskPackages(adminComponent, new String[]{getPackageName()});
        } catch (Exception e) { Log.e(TAG, "ensureWhitelist", e); }
    }

    private void startKiosk() {
        ensureWhitelist();
        try { startLockTask(); } catch (Exception e) { Log.e(TAG, "startKiosk", e); }
    }

    private void stopKiosk() {
        try { stopLockTask(); } catch (Exception e) { Log.e(TAG, "stopKiosk", e); }
    }

    // ===== LIFECYCLE =====

    @Override
    protected void onResume() {
        super.onResume();
        if (accelerometer != null)
            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME);
        if (gyroscope != null)
            sensorManager.registerListener(this, gyroscope, SensorManager.SENSOR_DELAY_GAME);
    }

    @Override
    protected void onPause() {
        super.onPause();
        sensorManager.unregisterListener(this);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        webViewReady = false;
        try { unregisterReceiver(batteryReceiver); } catch (Exception ignored) {}
        if (analysisExecutor != null) analysisExecutor.shutdown();
        if (faceDetector != null) faceDetector.close();
    }

    private void jsCall(String js) {
        if (!webViewReady || webView == null) return;
        webView.post(() -> {
            try { webView.evaluateJavascript(js, null); }
            catch (Exception ignored) {}
        });
    }

    // ===== IMU =====

    @Override
    public void onSensorChanged(SensorEvent ev) {
        if (ev.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            fAx = ALPHA * ev.values[0] + (1 - ALPHA) * fAx;
            fAy = ALPHA * ev.values[1] + (1 - ALPHA) * fAy;
        } else if (ev.sensor.getType() == Sensor.TYPE_GYROSCOPE) {
            fGx = ALPHA * ev.values[0] + (1 - ALPHA) * fGx;
            fGy = ALPHA * ev.values[1] + (1 - ALPHA) * fGy;
        }
        long now = System.currentTimeMillis();
        if (now - lastImuPush < IMU_INTERVAL_MS) return;
        lastImuPush = now;
        jsCall(String.format("if(window.eyes&&eyes.imu)eyes.imu(%.3f,%.3f,%.3f,%.3f);", fAx, fAy, fGx, fGy));
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    // ===== FACE TRACKING =====

    private void ensureFaceDetector() {
        if (faceDetector != null) return;
        FaceDetectorOptions opts = new FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
            .setMinFaceSize(0.2f)
            .build();
        faceDetector = FaceDetection.getClient(opts);
    }

    private void ensureExecutor() {
        if (analysisExecutor == null || analysisExecutor.isShutdown())
            analysisExecutor = Executors.newSingleThreadExecutor();
    }

    private void startCamera() {
        ensureFaceDetector();
        ensureExecutor();
        ListenableFuture<ProcessCameraProvider> future = ProcessCameraProvider.getInstance(this);
        future.addListener(() -> {
            try {
                cameraProvider = future.get();
                ImageAnalysis analysis = new ImageAnalysis.Builder()
                    .setTargetResolution(new Size(320, 240))
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build();
                analysis.setAnalyzer(analysisExecutor, this::analyzeFrame);
                cameraProvider.unbindAll();
                cameraProvider.bindToLifecycle(this, CameraSelector.DEFAULT_FRONT_CAMERA, analysis);
                Log.d(TAG, "Camera started");
                jsCall("if(window.eyes&&eyes.faceTrackingStatus)eyes.faceTrackingStatus(true);");
            } catch (Exception e) {
                Log.e(TAG, "Camera start failed", e);
                jsCall("if(window.eyes&&eyes.faceTrackingStatus)eyes.faceTrackingStatus(false);");
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void stopCamera() {
        if (cameraProvider != null) {
            cameraProvider.unbindAll();
            Log.d(TAG, "Camera stopped");
        }
    }

    @SuppressLint("UnsafeOptInUsageError")
    private void analyzeFrame(ImageProxy proxy) {
        if (!faceTrackingRequested || proxy.getImage() == null || faceProcessing) {
            proxy.close();
            return;
        }

        long now = System.currentTimeMillis();
        if (now - lastFacePush < FACE_INTERVAL_MS) {
            proxy.close();
            return;
        }

        faceProcessing = true;
        imgW = proxy.getWidth();
        imgH = proxy.getHeight();

        // Pre-capture frame bytes on the analysis thread (proxy is only safe here)
        final byte[] frameNv21;
        final int frameW = imgW, frameH = imgH;
        final boolean wantSnapshot = snapshotEnabled && (now - lastSnapshotTime > SNAPSHOT_INTERVAL_MS);
        if (wantSnapshot) {
            lastSnapshotTime = now;
            byte[] captured = null;
            try { captured = proxyToNv21(proxy); } catch (Exception e) { Log.e(TAG, "NV21 capture", e); }
            frameNv21 = captured;
        } else {
            frameNv21 = null;
        }

        InputImage img = InputImage.fromMediaImage(
            proxy.getImage(), proxy.getImageInfo().getRotationDegrees());

        faceDetector.process(img)
            .addOnSuccessListener(faces -> {
                lastFacePush = System.currentTimeMillis();
                if (faces.isEmpty()) {
                    pushFace(false, 0, 0, 0, 1, 1, 0, 0.5f, 0.5f);
                } else {
                    Face f = faces.get(0);
                    Float el = f.getLeftEyeOpenProbability();
                    Float er = f.getRightEyeOpenProbability();
                    Float sm = f.getSmilingProbability();
                    pushFace(true,
                        f.getHeadEulerAngleX(), f.getHeadEulerAngleY(), f.getHeadEulerAngleZ(),
                        el != null ? el : 1f, er != null ? er : 1f,
                        sm != null ? sm : 0f,
                        f.getBoundingBox().centerX() / (float) imgW,
                        f.getBoundingBox().centerY() / (float) imgH);

                    if (frameNv21 != null) {
                        lastSnapshotTime = System.currentTimeMillis();
                        new Thread(() -> saveSnapshot(frameNv21, frameW, frameH)).start();
                    }
                }
            })
            .addOnCompleteListener(task -> {
                faceProcessing = false;
                proxy.close();
            });
    }

    private void pushFace(boolean det, float eX, float eY, float eZ,
                          float eyeL, float eyeR, float smile, float cx, float cy) {
        jsCall(String.format(
            "if(window.eyes&&eyes.face)eyes.face(%s,%.1f,%.1f,%.1f,%.2f,%.2f,%.2f,%.3f,%.3f);",
            det ? "true" : "false", eX, eY, eZ, eyeL, eyeR, smile, cx, cy));
    }

    // ===== SNAPSHOTS =====

    @SuppressLint("UnsafeOptInUsageError")
    private byte[] proxyToNv21(ImageProxy proxy) {
        android.media.Image image = proxy.getImage();
        if (image == null) return null;

        android.media.Image.Plane yPlane = image.getPlanes()[0];
        android.media.Image.Plane uPlane = image.getPlanes()[1];
        android.media.Image.Plane vPlane = image.getPlanes()[2];

        int w = image.getWidth(), h = image.getHeight();
        byte[] nv21 = new byte[w * h * 3 / 2];

        // Y plane — safe row-by-row copy
        ByteBuffer yBuf = yPlane.getBuffer();
        int yRowStride = yPlane.getRowStride();
        for (int row = 0; row < h; row++) {
            int srcOff = row * yRowStride;
            for (int col = 0; col < w; col++) {
                nv21[row * w + col] = yBuf.get(srcOff + col);
            }
        }

        // VU interleaved — pixel-by-pixel (safe for any stride/pixelStride combo)
        ByteBuffer uBuf = uPlane.getBuffer();
        ByteBuffer vBuf = vPlane.getBuffer();
        int uRowStride = uPlane.getRowStride();
        int uPixelStride = uPlane.getPixelStride();
        int vRowStride = vPlane.getRowStride();
        int vPixelStride = vPlane.getPixelStride();

        int pos = w * h;
        for (int row = 0; row < h / 2; row++) {
            for (int col = 0; col < w / 2; col++) {
                nv21[pos++] = vBuf.get(row * vRowStride + col * vPixelStride);
                nv21[pos++] = uBuf.get(row * uRowStride + col * uPixelStride);
            }
        }
        return nv21;
    }

    private void saveSnapshot(byte[] nv21, int w, int h) {
        try {
            YuvImage yuvImage = new YuvImage(nv21, ImageFormat.NV21, w, h, null);
            File dir = new File(getExternalFilesDir(null), "snapshots");
            if (!dir.exists()) dir.mkdirs();

            recycleSnapshots(dir);

            File file = new File(dir, "det_" + System.currentTimeMillis() + ".jpg");
            FileOutputStream fos = new FileOutputStream(file);
            yuvImage.compressToJpeg(new Rect(0, 0, w, h), 80, fos);
            fos.close();
            Log.d(TAG, "Snapshot: " + file.getAbsolutePath());

            String[] list = dir.list();
            int count = list != null ? list.length : 0;
            jsCall("if(window.eyes&&eyes.onSnapshotCount)eyes.onSnapshotCount(" + count + ");");
        } catch (Exception e) { Log.e(TAG, "Snapshot save", e); }
    }

    private void recycleSnapshots(File dir) {
        File[] files = dir.listFiles();
        if (files == null || files.length == 0) return;

        long totalSize = 0;
        for (File f : files) totalSize += f.length();

        if (totalSize <= MAX_SNAPSHOT_BYTES) return;

        // Sort oldest first by filename (det_<timestamp>.jpg)
        java.util.Arrays.sort(files, (a, b) -> a.getName().compareTo(b.getName()));

        int idx = 0;
        while (totalSize > MAX_SNAPSHOT_BYTES * 8 / 10 && idx < files.length) {
            totalSize -= files[idx].length();
            boolean deleted = files[idx].delete();
            if (deleted) Log.d(TAG, "Recycled: " + files[idx].getName());
            idx++;
        }
    }

    // ===== PERMISSIONS =====

    @Override
    public void onRequestPermissionsResult(int code, @NonNull String[] perms, @NonNull int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code == CAMERA_PERM) {
            if (res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED) {
                startCamera();
            } else {
                jsCall("if(window.eyes&&eyes.faceTrackingStatus)eyes.faceTrackingStatus(false);");
            }
        }
    }

    // ===== JS BRIDGE =====

    public class RobotBridge {
        @JavascriptInterface
        public String getHost() { return ""; }

        @JavascriptInterface
        public String getDeviceIP() {
            try {
                WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                int ip = wm.getConnectionInfo().getIpAddress();
                byte[] b = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(ip).array();
                return InetAddress.getByAddress(b).getHostAddress();
            } catch (Exception e) { return "unknown"; }
        }

        @JavascriptInterface
        public void startFaceTracking() {
            runOnUiThread(() -> {
                faceTrackingRequested = true;
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                        == PackageManager.PERMISSION_GRANTED) {
                    startCamera();
                } else {
                    ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{Manifest.permission.CAMERA}, CAMERA_PERM);
                }
            });
        }

        @JavascriptInterface
        public void stopFaceTracking() {
            runOnUiThread(() -> {
                faceTrackingRequested = false;
                stopCamera();
            });
        }

        // Kiosk
        @JavascriptInterface
        public boolean isKioskEnabled() {
            return prefs.getBoolean("kiosk_enabled", false);
        }

        @JavascriptInterface
        public void setKioskEnabled(boolean enabled) {
            prefs.edit().putBoolean("kiosk_enabled", enabled).apply();
            runOnUiThread(() -> {
                if (enabled) startKiosk();
                else stopKiosk();
            });
        }

        @JavascriptInterface
        public String getPasscode() {
            return prefs.getString("passcode", "1234");
        }

        @JavascriptInterface
        public void setPasscode(String code) {
            if (code != null && code.length() >= 4)
                prefs.edit().putString("passcode", code).apply();
        }

        // Snapshots
        @JavascriptInterface
        public boolean isSnapshotEnabled() {
            return prefs.getBoolean("snapshot_enabled", false);
        }

        @JavascriptInterface
        public void setSnapshotEnabled(boolean enabled) {
            prefs.edit().putBoolean("snapshot_enabled", enabled).apply();
            snapshotEnabled = enabled;
        }

        @JavascriptInterface
        public int getSnapshotCount() {
            File dir = new File(getExternalFilesDir(null), "snapshots");
            if (!dir.exists()) return 0;
            String[] files = dir.list();
            return files != null ? files.length : 0;
        }

        @JavascriptInterface
        public void clearSnapshots() {
            File dir = new File(getExternalFilesDir(null), "snapshots");
            if (dir.exists()) {
                File[] files = dir.listFiles();
                if (files != null) for (File f : files) f.delete();
            }
        }

        // Battery
        @JavascriptInterface
        public int getBatteryLevel() { return batteryPct; }

        @JavascriptInterface
        public boolean isBatteryCharging() { return batteryCharging; }
    }

    // ===== BATTERY & BRIGHTNESS =====

    private void adjustBrightness() {
        float brightness;
        if (batteryCharging || batteryPct > 50) {
            brightness = 1.0f;
        } else {
            // Scale linearly: 50% → 0.6, 25% → 0.35, 10% → 0.2, 0% → 0.1
            brightness = Math.max(0.1f, 0.1f + (batteryPct / 50.0f) * 0.5f);
        }
        final float b = brightness;
        runOnUiThread(() -> {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.screenBrightness = b;
            getWindow().setAttributes(lp);
        });
    }

    // ===== UI =====

    private void hideSystemUI() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUI();
    }

    @Override
    public void onBackPressed() {}
}
