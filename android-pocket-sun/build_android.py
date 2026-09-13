#!/usr/bin/env python3
"""Build an offline Android wrapper without editing the website's game files.
All intermediate changes happen under android-pocket-sun/out/.
Python 3.10+, Node 22+, Java 17+, Android SDK 35, Gradle 8.11.1.
"""
from pathlib import Path
import hashlib, json, os, re, shutil, subprocess, sys

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
OUT = HERE / 'out'
PROJECT = OUT / 'PocketSunAndroid'
WEB = OUT / 'web-source'


def run(*args, cwd=None):
    print('+', ' '.join(map(str, args)), flush=True)
    subprocess.run(list(map(str, args)), cwd=cwd, check=True)


def write(relative, text):
    p = PROJECT / relative
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text.strip() + '\n', encoding='utf-8')


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError('Source contract changed; refusing an ambiguous patch: ' + old[:100])
    return text.replace(old, new, 1)


NATIVE_BOOT = r'''
(() => {
  'use strict';
  const contexts = new Set();
  const wasRunning = new Set();
  let active = true;
  const Base = window.AudioContext;
  if (Base) {
    window.AudioContext = class extends Base {
      constructor(options) {
        super(options);
        contexts.add(this);
        if (window.PocketSunAndroid && !window.PocketSunAndroid.requestSound()) this.suspend().catch(() => {});
        this.addEventListener('statechange', () => {
          if (!active && this.state === 'running') this.suspend().catch(() => {});
          if (this.state === 'closed') { contexts.delete(this); wasRunning.delete(this); }
        });
      }
      resume() {
        if (!active) return Promise.resolve();
        if (window.PocketSunAndroid && !window.PocketSunAndroid.requestSound()) return Promise.resolve();
        return super.resume();
      }
    };
  }
  window.__pocketNativeActive = true;
  window.__pocketSetActive = function(next) {
    next = Boolean(next);
    window.__pocketNativeActive = next;
    window.dispatchEvent(new CustomEvent('pocket-native-lifecycle', {detail:{active:next}}));
    if (active === next) return;
    active = next;
    if (!active) {
      contexts.forEach(c => {
        if (c.state === 'running') { wasRunning.add(c); c.suspend().catch(() => {}); }
      });
    } else {
      wasRunning.forEach(c => { if (c.state === 'suspended') c.resume().catch(() => {}); });
      wasRunning.clear();
    }
  };
  window.addEventListener('pocket-game-ready', () => {
    if (window.PocketSunAndroid) window.PocketSunAndroid.ready();
  });
  if (window.PocketSunAndroid) {
    Object.defineProperty(navigator, 'vibrate', {configurable:true, value(pattern) {
      let duration = Array.isArray(pattern) ? Number(pattern[0] || 0) : Number(pattern);
      duration = Number.isFinite(duration) ? Math.max(0, Math.min(80, duration)) : 0;
      window.PocketSunAndroid.vibrate(Math.round(duration));
      return true;
    }});
    // Android is already immersive; do not create a second HTML fullscreen surface.
    document.documentElement.requestFullscreen = () => Promise.resolve();
  }
})();
'''

NATIVE_HOOK = r'''
    // Android-only lifecycle integration. Physics, gestures and rendering are unchanged.
    type PocketNativeWindow = Window & {
      __pocketNativeActive?: boolean;
      PocketSunAndroid?: { background: () => void };
      __POCKET_ANDROID_TEST__?: () => { suspended: boolean; paused: boolean; pointerDown: boolean };
    };
    const nativeWindow = window as PocketNativeWindow;
    let nativeSuspended = nativeWindow.__pocketNativeActive === false;
    const releaseNativePointer = () => {
      const id = state.pointer.id;
      if (id >= 0 && canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
      state.pointer.down = false;
      state.pointer.id = -1;
      state.pointer.orbitAngle = null;
      state.pointer.orbitTravel = 0;
    };
    const onNativeLifecycle = (event: Event) => {
      nativeSuspended = !(event as CustomEvent<{ active: boolean }>).detail.active;
      visibilitySuspended = document.hidden || nativeSuspended;
      if (visibilitySuspended) releaseNativePointer();
      lastTime = performance.now();
      resetPerformanceWindow(lastTime);
      if (!visibilitySuspended) atmosphereDirty = true;
    };
    const onNativeBack = () => {
      releaseNativePointer();
      if (!state.paused) togglePause();
      else nativeWindow.PocketSunAndroid?.background();
    };
    visibilitySuspended = document.hidden || nativeSuspended;
    nativeWindow.__POCKET_ANDROID_TEST__ = () => ({
      suspended: visibilitySuspended, paused: state.paused, pointerDown: state.pointer.down
    });
    window.addEventListener('pocket-native-lifecycle', onNativeLifecycle);
    window.addEventListener('pocket-native-back', onNativeBack);
'''

ACTIVITY = r'''
package com.qualiacology.pocketsun;

import android.app.Activity;
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
import android.util.Log;
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

public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/pocket-sun/index.html";
    private WebView web;
    private volatile boolean resumed = false, focused = false, ready = false, audioBlocked = false;
    private volatile boolean hasAudioFocus = false;
    private AudioManager audio;
    private AudioFocusRequest focusRequest;
    private Vibrator vibrator;
    private long lastVibration = 0;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
            .setOnAudioFocusChangeListener(change -> runOnUiThread(() -> {
                hasAudioFocus = change == AudioManager.AUDIOFOCUS_GAIN;
                audioBlocked = change < 0;
                sendActive();
            })).build();
        vibrator = Build.VERSION.SDK_INT >= 31
            ? ((VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE)).getDefaultVibrator()
            : (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(3, 6, 13));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(3, 6, 13));
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
                DisplayCutout cutout = insets.getDisplayCutout();
                if (cutout != null) {
                    top = cutout.getSafeInsetTop(); left = cutout.getSafeInsetLeft();
                    right = cutout.getSafeInsetRight(); bottom = cutout.getSafeInsetBottom();
                }
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
                    WebResourceResponse result = loader.shouldInterceptRequest(u);
                    if (result != null) return result;
                }
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found",
                    java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                return !("https".equals(u.getScheme()) && HOST.equals(u.getHost())
                    && u.getPath() != null && u.getPath().startsWith("/pocket-sun/"));
            }
            @Override public void onPageFinished(WebView view, String url) { sendActive(); }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                if (BuildConfig.DEBUG) Log.d("PocketSunJS", message.messageLevel() + ": " + message.message());
                return true;
            }
        });
        web.addJavascriptInterface(new NativeBridge(), "PocketSunAndroid");
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::gameBack);
        }
        immersive();
        web.loadUrl(HOME);
    }

    private boolean isActive() { return resumed && focused && !audioBlocked; }
    private void sendActive() {
        if (web == null) return;
        boolean active = isActive();
        web.setKeepScreenOn(active);
        web.evaluateJavascript("window.__pocketSetActive && window.__pocketSetActive(" + active + ")", null);
        if (!active && vibrator != null) vibrator.cancel();
    }
    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN |
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }
    @Override protected void onResume() {
        super.onResume(); resumed = true; audioBlocked = false;
        if (web != null) { web.onResume(); web.resumeTimers(); }
        immersive(); sendActive();
    }
    @Override protected void onPause() {
        resumed = false; sendActive();
        if (web != null) { web.onPause(); web.pauseTimers(); }
        if (hasAudioFocus) { audio.abandonAudioFocusRequest(focusRequest); hasAudioFocus = false; }
        super.onPause();
    }
    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus); focused = hasFocus;
        if (hasFocus) immersive();
        sendActive();
    }
    private void gameBack() {
        if (ready && web != null) web.evaluateJavascript("window.dispatchEvent(new Event('pocket-native-back'))", null);
        else moveTaskToBack(true);
    }
    @SuppressWarnings("deprecation") @Override public void onBackPressed() { gameBack(); }
    @Override protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("PocketSunAndroid");
            web.stopLoading(); web.destroy(); web = null;
        }
        if (hasAudioFocus) audio.abandonAudioFocusRequest(focusRequest);
        if (vibrator != null) vibrator.cancel();
        super.onDestroy();
    }
    public final class NativeBridge {
        @JavascriptInterface public void ready() {
            runOnUiThread(() -> { ready = true; sendActive(); Log.i("PocketSun", "GAME_READY"); });
        }
        @JavascriptInterface public void background() { runOnUiThread(() -> moveTaskToBack(true)); }
        @JavascriptInterface public boolean requestSound() {
            if (!resumed || !focused) return false;
            if (hasAudioFocus) return true;
            hasAudioFocus = audio.requestAudioFocus(focusRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
            return hasAudioFocus;
        }
        @JavascriptInterface public void vibrate(int milliseconds) {
            runOnUiThread(() -> {
                if (vibrator == null || !isActive()) return;
                if (milliseconds <= 0) { vibrator.cancel(); return; }
                long now = android.os.SystemClock.uptimeMillis();
                if (now - lastVibration < 28) return;
                lastVibration = now;
                vibrator.vibrate(VibrationEffect.createOneShot(Math.min(milliseconds, 80), VibrationEffect.DEFAULT_AMPLITUDE));
            });
        }
    }
}
'''


def prepare():
    OUT.mkdir(parents=True, exist_ok=True)
    shutil.copytree(REPO / 'pocket-sun/source', WEB, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('node_modules', 'dist', '.git'))
    run('npm', 'ci', '--no-audit', '--no-fund', cwd=WEB)
    run('npm', 'run', 'typecheck', cwd=WEB)
    run('npm', 'test', cwd=WEB)
    run('npm', 'run', 'build', cwd=WEB)
    shutil.copytree(WEB / 'dist/site', OUT / 'baseline', dirs_exist_ok=True)
    original = (WEB / 'app/page.tsx').read_text()
    modified = replace_once(original, '    const onVisibility = () => {', NATIVE_HOOK + '\n    const onVisibility = () => {')
    modified = replace_once(modified, '    const onVisibility = () => {\n      visibilitySuspended = document.hidden;', '    const onVisibility = () => {\n      visibilitySuspended = document.hidden || nativeSuspended;\n      if (visibilitySuspended) releaseNativePointer();')
    modified = replace_once(modified, '    document.body.dataset.gameReady = "true";', '    document.body.dataset.gameReady = "true";\n    window.dispatchEvent(new Event("pocket-game-ready"));')
    modified = replace_once(modified, '      sound.close();', '      window.removeEventListener("pocket-native-lifecycle", onNativeLifecycle);\n      window.removeEventListener("pocket-native-back", onNativeBack);\n      delete nativeWindow.__POCKET_ANDROID_TEST__;\n      sound.close();')
    (WEB / 'app/page.tsx').write_text(modified)
    template = WEB / 'index.html.template'
    html = template.read_text()
    html = re.sub(r'<link\b[^>]*rel="(?:icon|canonical|manifest)"[^>]*>', '', html)
    html = replace_once(html, '<head>', '<head><script>' + NATIVE_BOOT + '</script>')
    template.write_text(html)
    run('npm', 'run', 'typecheck', cwd=WEB)
    run('npm', 'test', cwd=WEB)
    run('npm', 'run', 'build', cwd=WEB)
    shutil.copytree(WEB / 'dist/site', PROJECT / 'app/src/main/assets/pocket-sun', dirs_exist_ok=True)
    original_icons = list((REPO / 'pocket-sun/icons').glob('*.png'))
    if not original_icons: raise RuntimeError('Original game icon not found')
    icon = next((p for p in original_icons if '512' in p.name), max(original_icons, key=lambda p:p.stat().st_size))
    (PROJECT / 'app/src/main/res/drawable-nodpi').mkdir(parents=True, exist_ok=True)
    shutil.copy2(icon, PROJECT / 'app/src/main/res/drawable-nodpi/pocket_sun.png')
    write('settings.gradle', """
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name = 'PocketSunAndroid'
include ':app'
""")
    write('build.gradle', "plugins { id 'com.android.application' version '8.9.2' apply false }")
    write('gradle.properties', 'org.gradle.jvmargs=-Xmx3072m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\nandroid.nonTransitiveRClass=true')
    write('app/build.gradle', """
plugins { id 'com.android.application' }
android {
    namespace 'com.qualiacology.pocketsun'
    compileSdk 35
    defaultConfig {
        applicationId 'com.qualiacology.pocketsun'
        minSdk 26
        targetSdk 35
        versionCode 3020001
        versionName '3.2.0-android.1'
    }
    buildFeatures { buildConfig true }
    compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }
    signingConfigs { localTest { storeFile rootProject.file('signing/pocket-sun-test.jks'); storePassword 'android'; keyAlias 'pocketsun-test'; keyPassword 'android' } }
    buildTypes {
        debug { signingConfig signingConfigs.localTest }
        release { minifyEnabled false }
    }
}
dependencies { implementation 'androidx.webkit:webkit:1.12.1' }
""")
    write('app/src/main/AndroidManifest.xml', """
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.VIBRATE" />
  <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
  <application android:label="POCKET SUN" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher"
      android:theme="@style/PocketSunTheme" android:allowBackup="false" android:usesCleartextTraffic="false"
      android:hardwareAccelerated="true" android:supportsRtl="true" android:appCategory="game">
    <activity android:name=".MainActivity" android:exported="true" android:screenOrientation="portrait"
        android:configChanges="orientation|screenSize|screenLayout|keyboardHidden|uiMode|density"
        android:enableOnBackInvokedCallback="true" android:resizeableActivity="false">
      <intent-filter><action android:name="android.intent.action.MAIN" /><category android:name="android.intent.category.LAUNCHER" /></intent-filter>
    </activity>
  </application>
</manifest>
""")
    write('app/src/main/res/values/styles.xml', """
<resources>
  <color name="pocket_background">#03060D</color>
  <style name="PocketSunTheme" parent="android:style/Theme.Material.NoActionBar">
    <item name="android:fontFamily">sans</item>
    <item name="android:windowLightStatusBar">false</item>
    <item name="android:windowLightNavigationBar">false</item>
    <item name="android:windowActionModeOverlay">true</item>
    <item name="android:windowBackground">@color/pocket_background</item>
    <item name="android:statusBarColor">@color/pocket_background</item>
    <item name="android:navigationBarColor">@color/pocket_background</item>
    <item name="android:colorAccent">#FFE77C</item>
  </style>
</resources>
""")
    write('app/src/main/res/values-v31/styles.xml', """
<resources>
  <style name="PocketSunTheme" parent="android:style/Theme.Material.NoActionBar">
    <item name="android:windowSplashScreenBackground">@color/pocket_background</item>
    <item name="android:windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>
    <item name="android:windowLightStatusBar">false</item>
    <item name="android:windowLightNavigationBar">false</item>
    <item name="android:windowBackground">@color/pocket_background</item>
    <item name="android:statusBarColor">@color/pocket_background</item>
    <item name="android:navigationBarColor">@color/pocket_background</item>
    <item name="android:colorAccent">#FFE77C</item>
  </style>
</resources>
""")
    write('app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml', """
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/pocket_background" />
  <foreground android:drawable="@drawable/icon_foreground" />
</adaptive-icon>
""")
    write('app/src/main/res/drawable/icon_foreground.xml', """
<inset xmlns:android="http://schemas.android.com/apk/res/android" android:inset="18dp">
  <bitmap android:src="@drawable/pocket_sun" android:gravity="fill" android:filter="true" />
</inset>
""")
    write('app/src/main/java/com/qualiacology/pocketsun/MainActivity.java', ACTIVITY)
    (PROJECT / 'signing').mkdir(exist_ok=True)
    key = PROJECT / 'signing/pocket-sun-test.jks'
    if not key.exists():
        run('keytool', '-genkeypair', '-keystore', key, '-storepass', 'android', '-keypass', 'android',
            '-alias', 'pocketsun-test', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
            '-dname', 'CN=Pocket Sun LOCAL TEST, O=Qualiacology, C=US', '-storetype', 'JKS')
    write('.gitignore', '.gradle/\nlocal.properties\n**/build/\nsigning/\n*.jks')
    write('README.md', """
# POCKET SUN — Android test build

Portrait, fullscreen, offline Android app using the current website game, version 3.2.0.
The gameplay and touch controls are preserved. Android Back pauses; another Back minimizes.
Home/lock/focus loss suspends the simulation and audio, releases active touches, and retains
an intentional manual pause. Best score and lifetime totals use the game's existing local
storage keys. Browser saves are separate from app saves. A run survives backgrounding while
the process remains alive, but the original game does not serialize full runs across process death.

## Build
Requires JDK 17+, Android SDK platform 35 and Build Tools, and network access for first-time
Gradle dependencies. Open this folder in Android Studio, or run `./gradlew assembleDebug`.
Windows: `gradlew.bat assembleDebug`. APK: `app/build/outputs/apk/debug/app-debug.apk`.
All playable assets are already bundled in `app/src/main/assets/pocket-sun/`.
No Node build is required to rebuild this Android project.

The included signing/pocket-sun-test.jks is a NON-PRODUCTION test key, password `android`,
alias `pocketsun-test`. Retain it locally for compatible updates to this test APK. Never use
it to publish to Google Play; generate and protect a separate production signing key.
Debug WebView inspection is enabled only in debug builds. The app has no INTERNET permission;
its only requested permission is VIBRATE. There are no ads, analytics, accounts or remote assets.

This is an installable test build, not a Play Store release. Check performance, audio balance,
haptics, screen cutouts and navigation gestures on an actual phone before calling it final.
The web source and Android adaptation are included under web-source/ for further development.
""")
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip()
    write('BUILD-INFO.json', json.dumps({'website_game_version':'3.2.0','android_version':'3.2.0-android.1',
        'source_commit':revision,'source_file_sha256':hashlib.sha256(original.encode()).hexdigest(),
        'application_id':'com.qualiacology.pocketsun','orientation':'portrait','offline':True,
        'native_shell':'Android WebView + AndroidX WebViewAssetLoader','game_icon':icon.name},indent=2))
    shutil.copytree(WEB, PROJECT / 'web-source', dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('node_modules', 'dist'))
    print('PREPARED', PROJECT, flush=True)


if __name__ == '__main__':
    prepare()
