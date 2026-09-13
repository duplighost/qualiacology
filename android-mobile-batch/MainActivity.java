package com.qualiacology.mobilegame;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.DisplayCutout;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.util.Collections;

/** Offline-only shell. Game files are bundled, not loaded from the public website. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    private volatile boolean resumed, focused, menuOpen, audioBlocked, hasAudioFocus;
    private AudioManager audio;
    private AudioFocusRequest audioRequest;
    private Vibrator vibrator;
    private long vibrationAt;
    private int lifecycleSequence;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams p = getWindow().getAttributes();
            p.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(p);
        }
        audio = (AudioManager)getSystemService(Context.AUDIO_SERVICE);
        audioRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
            .setOnAudioFocusChangeListener(change -> runOnUiThread(() -> {
                hasAudioFocus = change == AudioManager.AUDIOFOCUS_GAIN;
                audioBlocked = change < 0;
                syncLifecycle();
            })).build();
        vibrator = Build.VERSION.SDK_INT >= 31
            ? ((VibratorManager)getSystemService(Context.VIBRATOR_MANAGER_SERVICE)).getDefaultVibrator()
            : (Vibrator)getSystemService(Context.VIBRATOR_SERVICE);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(5, 8, 17));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(5, 8, 17));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setHorizontalScrollBarEnabled(false);
        web.setVerticalScrollBarEnabled(false);
        web.setLongClickable(false);
        web.setOnLongClickListener(v -> true);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int top = 0, left = 0, right = 0, bottom = 0;
            if (Build.VERSION.SDK_INT >= 28) {
                DisplayCutout c = insets.getDisplayCutout();
                if (c != null) { top = c.getSafeInsetTop(); left = c.getSafeInsetLeft(); right = c.getSafeInsetRight(); bottom = c.getSafeInsetBottom(); }
            }
            if (Build.VERSION.SDK_INT >= 29) bottom = Math.max(bottom, insets.getMandatorySystemGestureInsets().bottom);
            v.setPadding(left, top, right, bottom);
            return insets;
        });
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("https".equals(u.getScheme()) && HOST.equals(u.getHost())) {
                    WebResourceResponse r = loader.shouldInterceptRequest(u);
                    if (r != null) return r;
                }
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                return !("https".equals(u.getScheme()) && HOST.equals(u.getHost())
                    && u.getPath() != null && u.getPath().startsWith("/" + BuildConfig.GAME_PATH + "/"));
            }
            @Override public void onPageFinished(WebView view, String url) {
                android.util.Log.i("Qualiacology", "PAGE_LOADED " + BuildConfig.GAME_PATH);
                syncLifecycle();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) {
                if (BuildConfig.DEBUG) android.util.Log.d("QualiacologyJS", m.messageLevel() + ": " + m.message());
                return true;
            }
        });
        web.addJavascriptInterface(new NativeBridge(), "QualiacologyAndroid");
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
            android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::showGameMenu);
        immersive();
        web.loadUrl("https://" + HOST + "/" + BuildConfig.GAME_PATH + "/index.html");
    }
    private boolean active() { return resumed && focused && !menuOpen && !audioBlocked; }
    private void syncLifecycle() {
        if (web == null) return;
        boolean a = active();
        int sequence = ++lifecycleSequence;
        web.setKeepScreenOn(a);
        if (a) { web.onResume(); web.resumeTimers(); }
        web.evaluateJavascript("window.__androidSetActive && window.__androidSetActive(" + a + ")", ignored -> {
            if (web != null && sequence == lifecycleSequence && !active()) { web.onPause(); web.pauseTimers(); }
        });
        if (!a && vibrator != null) vibrator.cancel();
    }
    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }
    private void showGameMenu() {
        if (isFinishing() || menuOpen) return;
        menuOpen = true;
        syncLifecycle();
        AlertDialog dialog = new AlertDialog.Builder(this).setTitle(getString(R.string.app_name))
            .setMessage("Game paused")
            .setPositiveButton("Resume", (d, which) -> {})
            .setNeutralButton("Restart run", (d, which) -> { if (web != null) web.reload(); })
            .setNegativeButton("Home", (d, which) -> moveTaskToBack(true)).create();
        dialog.setOnDismissListener(d -> { menuOpen = false; immersive(); syncLifecycle(); });
        dialog.show();
    }
    @SuppressWarnings("deprecation") @Override public void onBackPressed() { showGameMenu(); }
    @Override protected void onResume() {
        super.onResume(); resumed = true; audioBlocked = false;
        if (web != null) { web.onResume(); web.resumeTimers(); }
        immersive(); syncLifecycle();
    }
    @Override protected void onPause() {
        resumed = false; syncLifecycle();
        if (hasAudioFocus) { audio.abandonAudioFocusRequest(audioRequest); hasAudioFocus = false; }
        super.onPause();
    }
    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus); focused = hasFocus;
        if (hasFocus) immersive();
        syncLifecycle();
    }
    @Override protected void onDestroy() {
        ++lifecycleSequence;
        if (web != null) { web.removeJavascriptInterface("QualiacologyAndroid"); web.stopLoading(); web.destroy(); web = null; }
        if (hasAudioFocus) audio.abandonAudioFocusRequest(audioRequest);
        if (vibrator != null) vibrator.cancel();
        super.onDestroy();
    }
    public final class NativeBridge {
        @JavascriptInterface public void ready() { runOnUiThread(() -> syncLifecycle()); }
        @JavascriptInterface public void menu() { runOnUiThread(() -> showGameMenu()); }
        @JavascriptInterface public boolean requestSound() {
            if (!resumed || !focused || menuOpen || audioBlocked) return false;
            if (hasAudioFocus) return true;
            hasAudioFocus = audio.requestAudioFocus(audioRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
            return hasAudioFocus;
        }
        @JavascriptInterface public void vibrate(int duration) {
            runOnUiThread(() -> {
                if (vibrator == null || !active()) return;
                if (duration <= 0) { vibrator.cancel(); return; }
                long now = android.os.SystemClock.uptimeMillis();
                if (now - vibrationAt < 28) return;
                vibrationAt = now;
                vibrator.vibrate(VibrationEffect.createOneShot(Math.min(duration, 80), VibrationEffect.DEFAULT_AMPLITUDE));
            });
        }
    }
}
