import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Packages the shipped game, never recompiles or edits its gameplay bundle.
const root = process.cwd();
const source = path.join(root, 'pocket-sun');
const out = path.join(root, 'pocket-sun-android');
const write = (name, text) => { const file = path.join(out, name); fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, text); };
const run = (command, args, cwd=out) => execFileSync(command,args,{cwd,stdio:'inherit',env:process.env});
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if (!fs.existsSync(path.join(source,'index.html'))) throw new Error('Run from the repository root containing pocket-sun/index.html');
if (fs.existsSync(out)) throw new Error('Output already exists; move pocket-sun-android before regenerating.');
fs.mkdirSync(out,{recursive:true});
for (const folder of ['assets','icons']) fs.cpSync(path.join(source,folder),path.join(out,'www',folder),{recursive:true});
let html = fs.readFileSync(path.join(source,'index.html'),'utf8');
html = html.replace(/<link\b[^>]*rel="(?:manifest|canonical|icon)"[^>]*>/g,'');
html = html.replace(/<meta\b[^>]*(?:property="og:[^"]*"|name="twitter:[^"]*")[^>]*>/g,'');
html = html.replaceAll('/pocket-sun/','./');
html = html.replace('</head>','<link rel="icon" href="./icons/icon-192.png"><script src="./android-shell.js"></script></head>');
write('www/index.html',html);
write('package.json',JSON.stringify({name:'pocket-sun-android',version:'1.0.0',private:true,scripts:{sync:'cap sync android',open:'cap open android',apk:'cd android && ./gradlew assembleDebug',bundle:'cd android && ./gradlew bundleRelease'},dependencies:{'@capacitor/core':'^8.0.0','@capacitor/android':'^8.0.0'},devDependencies:{'@capacitor/cli':'^8.0.0'}},null,2));
write('capacitor.config.json',JSON.stringify({appId:'com.qualiacology.pocketsun',appName:'POCKET SUN',webDir:'www',backgroundColor:'#03060d',zoomEnabled:false,loggingBehavior:'debug',server:{hostname:'localhost',androidScheme:'https'},android:{backgroundColor:'#03060d',allowMixedContent:false,webContentsDebuggingEnabled:false,initialFocus:true}},null,2));
write('www/android-shell.js',String.raw`(() => {
  'use strict';
  let active = true;
  const pointers = new Map();
  const contexts = new Set();
  const native = !!window.Capacitor;
  const game = () => window.__POCKET_SUN__;
  const snapshot = () => game()?.snapshot?.();
  const pause = () => {
    const state = snapshot();
    if (state && !state.paused) window.dispatchEvent(new KeyboardEvent('keydown', {key:'p'}));
  };
  function releasePointers() {
    for (const [id,target] of pointers) {
      if (target?.dispatchEvent) target.dispatchEvent(new PointerEvent('pointercancel',{pointerId:id,pointerType:'touch',bubbles:true}));
    }
    pointers.clear();
    game()?.setPointer?.(false,0,0);
  }
  const suspendAudio = () => { for (const context of contexts) if (context.state === 'running') context.suspend().catch(()=>{}); };
  const wakeAudio = () => { if (!active || document.hidden) return; for (const context of contexts) if (context.state === 'suspended') context.resume().catch(()=>{}); };
  for (const name of ['AudioContext','webkitAudioContext']) {
    const Original = window[name];
    if (!Original) continue;
    window[name] = new Proxy(Original,{construct(Target,args){
      const context = Reflect.construct(Target,args);
      contexts.add(context);
      if (!active) context.suspend().catch(()=>{});
      return context;
    }});
  }
  window.addEventListener('pointerdown',event=>{ pointers.set(event.pointerId,event.target); wakeAudio(); },{capture:true,passive:true});
  for (const type of ['pointerup','pointercancel','lostpointercapture']) window.addEventListener(type,event=>pointers.delete(event.pointerId),{capture:true,passive:true});
  window.PocketSunAndroid = Object.freeze({
    setActive(value) {
      active = !!value;
      if (!active) { releasePointers(); pause(); suspendAudio(); }
      // Returning to the app deliberately leaves its existing pause screen up.
      // A tap resumes through the game's original controls, never a new overlay.
    },
    back() {
      releasePointers();
      const state = snapshot();
      if (state && !state.paused) { pause(); suspendAudio(); return true; }
      return false;
    },
    diagnostics() { return {active,pointers:pointers.size,audio:[...contexts].map(c=>c.state),native}; }
  });
  document.addEventListener('visibilitychange',()=>{ if (document.hidden) window.PocketSunAndroid.setActive(false); else active=true; });
  document.addEventListener('contextmenu',event=>event.preventDefault());
})();
`);
run('npm',['install','--save-exact','@capacitor/core@8','@capacitor/android@8']);
run('npm',['install','--save-dev','--save-exact','@capacitor/cli@8']);
run('npx',['cap','add','android']);
const manifestPath = path.join(out,'android/app/src/main/AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath,'utf8');
manifest = manifest.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ');
manifest = manifest.replace('android:allowBackup="true"','android:allowBackup="false"');
manifest = manifest.replace('<application','<application android:usesCleartextTraffic="false" android:hardwareAccelerated="true" android:appCategory="game"');
manifest = manifest.replace('<activity','<activity android:screenOrientation="portrait" android:enableOnBackInvokedCallback="true"');
manifest = manifest.replace('<uses-permission android:name="android.permission.INTERNET" />','<uses-permission android:name="android.permission.INTERNET" tools:node="remove" />');
manifest = manifest.replace('</manifest>','<uses-permission android:name="android.permission.VIBRATE" /></manifest>');
fs.writeFileSync(manifestPath,manifest);
let vars = fs.readFileSync(path.join(out,'android/variables.gradle'),'utf8');
vars = vars.replace(/minSdkVersion\s*=\s*\d+/,'minSdkVersion = 24').replace(/compileSdkVersion\s*=\s*\d+/,'compileSdkVersion = 36').replace(/targetSdkVersion\s*=\s*\d+/,'targetSdkVersion = 36');
write('android/variables.gradle',vars);
let gradle = fs.readFileSync(path.join(out,'android/app/build.gradle'),'utf8');
gradle = gradle.replace(/versionName\s+"[^"]*"/,'versionName "3.2.0-android.1"');
write('android/app/build.gradle',gradle);
write('android/app/src/main/java/com/qualiacology/pocketsun/MainActivity.java',String.raw`package com.qualiacology.pocketsun;

import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/** Android-only shell; gameplay and pointer controls remain the shipped web code. */
public class MainActivity extends BridgeActivity {
    private boolean backgrounded = false;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(),false);
        getWindow().getDecorView().setBackgroundColor(Color.rgb(3,6,13));
        if (bridge == null || bridge.getWebView() == null) return;
        WebView web = bridge.getWebView();
        web.setBackgroundColor(Color.rgb(3,6,13));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setHorizontalScrollBarEnabled(false);
        web.setVerticalScrollBarEnabled(false);
        web.getSettings().setSupportZoom(false);
        web.getSettings().setBuiltInZoomControls(false);
        web.getSettings().setDisplayZoomControls(false);
        // Secure local HTTPS assets are intercepted by Capacitor, not a website.
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content,(view,insets)->{
            Insets safe = insets.getInsets(WindowInsetsCompat.Type.displayCutout());
            view.setPadding(safe.left,safe.top,safe.right,safe.bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(content);
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (bridge == null) { moveTaskToBack(true); return; }
                bridge.getWebView().evaluateJavascript(
                    "window.PocketSunAndroid ? window.PocketSunAndroid.back() : false",
                    result -> { if (!"true".equals(result)) moveTaskToBack(true); }
                );
            }
        });
        immersive();
    }

    private void immersive() {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(),getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    @Override public void onResume() {
        super.onResume();
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (bridge != null) {
            bridge.getWebView().onResume();
            if (backgrounded) bridge.getWebView().evaluateJavascript("window.PocketSunAndroid?.setActive(true)",null);
        }
        backgrounded = false;
        immersive();
    }

    @Override public void onPause() {
        backgrounded = true;
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (bridge != null) {
            bridge.getWebView().evaluateJavascript("window.PocketSunAndroid?.setActive(false)",null);
            bridge.getWebView().onPause();
        }
        super.onPause();
    }
}
`);
// Reuse the game's own artwork. No invented replacement icon or visual redesign.
const res = path.join(out,'android/app/src/main/res');
for (const entry of fs.readdirSync(res)) {
  if (entry.startsWith('mipmap-') || entry.startsWith('drawable-land') || entry.startsWith('drawable-port')) fs.rmSync(path.join(res,entry),{recursive:true,force:true});
}
fs.mkdirSync(path.join(res,'mipmap-nodpi'),{recursive:true});
for (const name of ['ic_launcher.png','ic_launcher_round.png']) fs.copyFileSync(path.join(source,'icons/icon-512.png'),path.join(res,'mipmap-nodpi',name));
fs.mkdirSync(path.join(res,'drawable-nodpi'),{recursive:true});
fs.copyFileSync(path.join(source,'icons/icon-512.png'),path.join(res,'drawable-nodpi/pocket_sun_icon.png'));
write('android/app/src/main/res/drawable/splash.xml','<?xml version="1.0" encoding="utf-8"?><layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:drawable="@color/sun_background"/></layer-list>');
const oldSplash = path.join(res,'drawable/splash.png'); if(fs.existsSync(oldSplash)) fs.unlinkSync(oldSplash);
write('android/app/src/main/res/values/colors.xml','<?xml version="1.0" encoding="utf-8"?><resources><color name="colorPrimary">#03060d</color><color name="colorPrimaryDark">#03060d</color><color name="colorAccent">#fff36a</color><color name="sun_background">#03060d</color></resources>');
write('android/app/src/main/res/values/styles.xml','<?xml version="1.0" encoding="utf-8"?><resources><style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar"><item name="android:windowBackground">@color/sun_background</item><item name="android:windowActionModeOverlay">true</item><item name="android:fontFamily">sans</item><item name="colorAccent">@color/colorAccent</item></style><style name="AppTheme.NoActionBar" parent="AppTheme"><item name="windowActionBar">false</item><item name="windowNoTitle">true</item></style><style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen"><item name="windowSplashScreenBackground">@color/sun_background</item><item name="windowSplashScreenAnimatedIcon">@drawable/pocket_sun_icon</item><item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item></style></resources>');
run('npx',['cap','sync','android']);
const files = fs.readdirSync(path.join(source,'assets')).filter(f=>/\.(js|css)$/.test(f));
const evidence = files.map(file=>({file:'assets/'+file,sourceSHA256:sha256(path.join(source,'assets',file)),packagedSHA256:sha256(path.join(out,'www/assets',file))}));
for (const item of evidence) if(item.sourceSHA256!==item.packagedSHA256) throw new Error('Gameplay asset changed: '+item.file);
const packages = JSON.parse(fs.readFileSync(path.join(out,'package.json'),'utf8'));
write('BUILD-PROVENANCE.json',JSON.stringify({website:'https://qualiacology.com/pocket-sun/',sourceCommit:'616f75690c54ee37a53f603ecc6d7a0d1ca13b17',gameBuild:'pocket-sun-3.2.0-long-moonrise',appId:'com.qualiacology.pocketsun',versionName:'3.2.0-android.1',portrait:true,gameplayAssetsByteIdentical:true,dependencies:packages.dependencies,devDependencies:packages.devDependencies,files:evidence},null,2));
write('README.md',`# POCKET SUN for Android\n\nPortrait Android packaging of Alex's shipped POCKET SUN. The JavaScript and CSS game bundles are byte-identical to production commit 616f75690c54ee37a53f603ecc6d7a0d1ca13b17. See BUILD-PROVENANCE.json. The website was not changed.\n\n## Play\nInstall POCKET-SUN-Android-test.apk on your phone. It is a debug-signed test application, not a Play Store release. Allow installation from the app opening the APK when Android asks. No account, browser, or internet connection is needed for gameplay. Existing website saves do not automatically transfer into Android's separate app storage.\n\nTouch controls, gameplay, graphics settings, scoring, palettes and audio remain the game's original implementation. App switching cancels held touches, pauses and suspends audio. Returning shows the game's original resume overlay. Back pauses; Back again backgrounds the app. Android may recreate a fresh run after process death; only the game's existing persisted data survive. No claim of full session persistence.\n\n## Build again\nRequirements: Node 22+, JDK 21, Android SDK platform 36 and accepted SDK licenses.\n\n\`\`\`sh\nnpm ci\nnpx cap sync android\ncd android\n./gradlew assembleDebug\n\`\`\`\n\nWindows: use gradlew.bat assembleDebug. APK: android/app/build/outputs/apk/debug/app-debug.apk. Open the android folder in Android Studio. The included package-lock pins the exact build dependencies.\n\n## Publishing\nCreate and safely store your own release signing key before public distribution. Do not publish the debug key or use it for production. Configure release signing and use bundleRelease for a Play submission; store listing, privacy/data safety declarations and physical-device validation are separate steps.\n\n## Validation boundary\nConsult the accompanying checks and screenshots for tests actually executed. Emulator/desktop tests are not measurements from Alex's physical Pixel.\n`);
write('.gitignore','node_modules/\nandroid/.gradle/\nandroid/local.properties\nandroid/**/build/\n*.jks\n*.keystore\n');
fs.copyFileSync(path.join(root,'android-apps/pocket-sun/prepare.mjs'),path.join(out,'prepare-from-repository.mjs'));
console.log('Prepared Android project without modifying shipped gameplay.');
