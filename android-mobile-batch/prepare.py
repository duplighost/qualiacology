#!/usr/bin/env python3
"""Prepare offline Android apps from this checkout. Original website files are never edited."""
from pathlib import Path
import hashlib, html, json, os, re, shutil, subprocess, sys, urllib.parse, urllib.request, zipfile

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
OUT = HERE / 'out'
PROJECT = OUT / 'MobileGamesAndroid'
GAMES = [('fallingopen','falling-open','FALLING OPEN'), ('lilbigbang','lil-big-bang','LIL BIG BANG'), ('thrown','thrown','THROWN'), ('iseentit','i-seent-it','I SEENT IT')]
TEXT = {'.html','.js','.mjs','.css','.json'}
ASSET = re.compile(r'''(["'])([^"'<>\s\\]+\.(?:m?js|css|png|jpe?g|webp|svg|gif|json|glb|gltf|bin|ogg|mp3|wav|ktx2|wasm)(?:\?[^"'<>\s]*)?)\1''', re.I)

def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')

def digest(data): return hashlib.sha256(data).hexdigest()

def prepare():
    if PROJECT.exists(): shutil.rmtree(PROJECT)
    PROJECT.mkdir(parents=True)
    write(PROJECT/'settings.gradle', "pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }\ndependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }\nrootProject.name='QualiacologyMobileGames'\n" + '\n'.join("include ':"+m+"'" for m,_,_ in GAMES)+'\n')
    write(PROJECT/'build.gradle', "plugins { id 'com.android.application' version '8.9.2' apply false }\n")
    write(PROJECT/'gradle.properties', 'org.gradle.jvmargs=-Xmx3g -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\norg.gradle.parallel=true\n')
    signing=PROJECT/'signing'; signing.mkdir()
    subprocess.run(['keytool','-genkeypair','-keystore',str(signing/'mobile-test.jks'),'-storepass','android','-keypass','android','-alias','mobile-test','-keyalg','RSA','-keysize','2048','-validity','3650','-dname','CN=Qualiacology Local Test, O=Qualiacology, C=US'],check=True)
    icons = {
      'fallingopen': ('#091625','#8de4eb','M22,53 C23,23 85,23 86,53 L22,53 M51,50 L57,50 L57,78 C57,91 37,92 36,79 L42,79 C43,84 51,84 51,78 Z'),
      'lilbigbang': ('#170f2c','#ffd582','M54,17 L61,40 L83,29 L70,49 L95,57 L69,64 L82,85 L60,73 L53,96 L46,73 L23,86 L37,65 L12,56 L38,48 L25,28 L47,40 Z'),
      'thrown': ('#132326','#d5f7ce','M27,88 L47,88 L47,83 L27,83 Z M63,68 L83,68 L83,63 L63,63 Z M29,48 L49,48 L49,43 L29,43 Z M53,79 L46,72 L56,62 L56,51 L53,44 L55,34 L59,34 L62,47 L68,38 L72,40 L67,53 L68,60 Z M66,26 L85,26 L85,21 L66,21 Z'),
      'iseentit': ('#161426','#d9c9ff','M70,23 C32,12 15,57 39,79 C53,92 76,88 87,70 C52,84 35,39 70,23 Z M22,86 L83,86 L83,91 L22,91 Z')}
    inventory=[]
    for module,slug,title in GAMES:
        app=PROJECT/module
        assets=app/'src/main/assets'; assets.mkdir(parents=True)
        source_dir=REPO/slug
        if not (source_dir/'index.html').exists(): raise RuntimeError('Missing game: '+slug)
        shutil.copytree(source_dir,assets/slug,ignore=shutil.ignore_patterns('node_modules','.git','*.map','*.woff','*.woff2','*.ttf','*.otf'))
        originals={str(p.relative_to(REPO)):digest(p.read_bytes()) for p in source_dir.rglob('*') if p.is_file()}
        seen=set(); queue=[(p,REPO/p.relative_to(assets)) for p in (assets/slug).rglob('*') if p.is_file() and p.suffix in TEXT]
        external=[]
        while queue:
            dest,origin=queue.pop()
            if str(dest) in seen: continue
            seen.add(str(dest))
            text=dest.read_text(encoding='utf-8')
            if text.startswith('version https://git-lfs.github.com/spec/'): raise RuntimeError('LFS placeholder: '+str(dest))
            # Web fonts are not runtime dependencies; preserve system-font fallbacks offline.
            if dest.suffix=='.html':
                text=re.sub(r'<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>', '', text, flags=re.I)
                text=re.sub(r'<link\b[^>]*rel=["\'](?:preconnect|dns-prefetch)["\'][^>]*>', '', text, flags=re.I)
            for match in list(ASSET.finditer(text)):
                raw=match.group(2)
                if raw.startswith(('data:','blob:','#')) or '${' in raw: continue
                parsed=urllib.parse.urlsplit(raw)
                if parsed.scheme in ('http','https') and parsed.netloc not in ('qualiacology.com','www.qualiacology.com'):
                    # Vendoring fixed engine/script resources happens only at build time.
                    if not parsed.path.endswith(('.js','.mjs','.css','.wasm')): continue
                    rel=Path('_vendor')/digest(raw.encode())[:12]/Path(parsed.path).name
                    target=assets/rel
                    if not target.exists():
                        req=urllib.request.Request(raw,headers={'User-Agent':'Qualiacology Android offline builder'})
                        data=urllib.request.urlopen(req,timeout=45).read()
                        target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(data)
                        external.append({'url':raw,'path':str(rel),'sha256':digest(data)})
                    text=text.replace(match.group(0),match.group(1)+'/'+rel.as_posix()+match.group(1))
                    continue
                path=urllib.parse.unquote(parsed.path)
                candidate=(REPO/path.lstrip('/')) if path.startswith('/') else origin.parent/path
                candidate=candidate.resolve()
                if not candidate.is_relative_to(REPO) or not candidate.is_file(): continue
                rel=candidate.relative_to(REPO); target=assets/rel
                if not target.exists():
                    target.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(candidate,target)
                if candidate.suffix in TEXT and str(target) not in seen: queue.append((target,candidate))
            dest.write_text(text,encoding='utf-8')
        # A small app-only CSS adjustment removes the website's home link, not game controls.
        entry=assets/slug/'index.html'; text=entry.read_text()
        app_style='<style>html,body{overscroll-behavior:none!important;-webkit-tap-highlight-color:transparent}a[href="/"],a[href="https://qualiacology.com/"]{display:none!important}</style>'
        text=text.replace('</head>',app_style+'</head>',1); entry.write_text(text)
        write(app/'build.gradle', """plugins { id 'com.android.application' }
android {
 namespace 'com.qualiacology.mobilegame'
 compileSdk 35
 defaultConfig {
  applicationId 'com.qualiacology."""+module+"""'
  minSdk 26
  targetSdk 35
  versionCode 10001
  versionName '1.0.0-test.1'
  buildConfigField 'String', 'GAME_PATH', '\""""+slug+"""\"'
 }
 buildFeatures { buildConfig true }
 compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }
 signingConfigs { localTest { storeFile rootProject.file('signing/mobile-test.jks'); storePassword 'android'; keyAlias 'mobile-test'; keyPassword 'android' } }
 buildTypes { debug { signingConfig signingConfigs.localTest }; release { minifyEnabled false } }
}
dependencies { implementation 'androidx.webkit:webkit:1.12.1' }
""")
        native=app/'src/main/java/com/qualiacology/mobilegame/MainActivity.java'; native.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(HERE/'MainActivity.java',native)
        write(app/'src/main/AndroidManifest.xml', '''<manifest xmlns:android="http://schemas.android.com/apk/res/android">
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-feature android:glEsVersion="0x00020000" android:required="false"/>
<application android:label="@string/app_name" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher" android:theme="@style/AppTheme" android:allowBackup="false" android:hardwareAccelerated="true" android:usesCleartextTraffic="false" android:enableOnBackInvokedCallback="true">
<activity android:name="com.qualiacology.mobilegame.MainActivity" android:exported="true" android:screenOrientation="portrait" android:configChanges="orientation|screenSize|smallestScreenSize|keyboardHidden" android:windowSoftInputMode="adjustNothing">
<intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter>
</activity></application></manifest>''')
        bg,fg,path=icons[module]
        write(app/'src/main/res/values/resources.xml','<resources><string name="app_name">'+html.escape(title)+'</string><color name="icon_background">'+bg+'</color><style name="AppTheme" parent="android:style/Theme.Material.NoActionBar"><item name="android:windowActionModeOverlay">true</item><item name="android:windowLightStatusBar">false</item><item name="android:windowBackground">'+bg+'</item><item name="android:colorAccent">'+fg+'</item></style></resources>')
        write(app/'src/main/res/drawable/icon_foreground.xml','<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="'+fg+'" android:pathData="'+path+'"/></vector>')
        write(app/'src/main/res/mipmap-anydpi-v26/ic_launcher.xml','<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/icon_background"/><foreground android:drawable="@drawable/icon_foreground"/></adaptive-icon>')
        asset_hashes={str(p.relative_to(assets)):digest(p.read_bytes()) for p in assets.rglob('*') if p.is_file()}
        inventory.append({'module':module,'slug':slug,'title':title,'package':'com.qualiacology.'+module,'original_files':originals,'bundled_files':asset_hashes,'vendored':external})
    commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip()
    write(PROJECT/'SOURCE-SNAPSHOT.json',json.dumps({'source_commit':commit,'games':inventory},indent=2))
    write(PROJECT/'README.md', '# Qualiacology Android test apps\n\nFour separate offline, portrait Android apps. Android 8.0+; target SDK 35. These preserve the existing browser engines and touch controls inside an AndroidX WebViewAssetLoader shell; they are not native-engine rewrites. No INTERNET permission, no account, no ads added. Website files remain unchanged.\n\nAndroid Back opens Resume / Restart run / Home. Native timers suspend behind the menu/background; full background-audio behavior and device performance require physical-phone testing. WebView localStorage saves are separate from website saves. An unfinished run is not guaranteed to survive Android process termination.\n\nBuild: open this directory in Android Studio, or run ./gradlew assembleDebug. Every module has a separate package ID and launcher icon. The signing/mobile-test.jks key is a NON-PRODUCTION test key (password android, alias mobile-test). Preserve it for compatible test updates; use your own private production signing for Google Play.\n\nSource versions and all packaged asset digests are in SOURCE-SNAPSHOT.json. No full game playthrough or physical-device certification is implied by smoke tests.\n')
    print(json.dumps({'project':str(PROJECT),'games':[{'slug':x['slug'],'asset_count':len(x['bundled_files']),'vendored':x['vendored']} for x in inventory]},indent=2))

def collect():
    delivery=OUT/'delivery'; delivery.mkdir(exist_ok=True)
    sdk=Path(os.environ.get('ANDROID_HOME',os.environ.get('ANDROID_SDK_ROOT','/usr/local/lib/android/sdk')))
    tools=sorted((sdk/'build-tools').glob('*'))[-1]
    reports={}
    for module,slug,title in GAMES:
        apk=PROJECT/module/'build/outputs/apk/debug'/f'{module}-debug.apk'
        target=delivery/(slug.upper()+'-Android-1.0.0-test.1.apk'); shutil.copy2(apk,target)
        check=subprocess.check_output([str(tools/'apksigner'),'verify','--verbose','--print-certs',str(target)],text=True)
        badging=subprocess.check_output([str(tools/'aapt'),'dump','badging',str(target)],text=True)
        permissions=subprocess.check_output([str(tools/'aapt'),'dump','permissions',str(target)],text=True)
        if 'android.permission.INTERNET' in permissions: raise RuntimeError('Unexpected INTERNET permission')
        with zipfile.ZipFile(target) as archive:
            if archive.testzip(): raise RuntimeError('APK ZIP CRC failed')
            for name,data in json.loads((PROJECT/'SOURCE-SNAPSHOT.json').read_text())['games'][len(reports)]['bundled_files'].items():
                assert digest(archive.read('assets/'+name))==data, name
        reports[slug]={'apk':target.name,'bytes':target.stat().st_size,'sha256':digest(target.read_bytes()),'signature':check,'badging':badging,'permissions':permissions,'asset_hash_verification':True}
    write(delivery/'APK-VERIFICATION.json',json.dumps(reports,indent=2))
    with zipfile.ZipFile(delivery/'Qualiacology-Android-Source.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in PROJECT.rglob('*'):
            if p.is_file() and not any(x in p.relative_to(PROJECT).parts for x in ('build','.gradle')) and p.name!='local.properties': z.write(p,'MobileGamesAndroid/'+str(p.relative_to(PROJECT)))
        for p in HERE.glob('*'):
            if p.is_file(): z.write(p,'build-scripts/'+p.name)
    shutil.copy2(PROJECT/'README.md',delivery/'README.md')
    shutil.copy2(PROJECT/'SOURCE-SNAPSHOT.json',delivery/'SOURCE-SNAPSHOT.json')
    if (OUT/'qa').exists(): shutil.copytree(OUT/'qa',delivery/'qa',dirs_exist_ok=True)
    print(json.dumps(reports,indent=2))

if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='collect': collect()
    else: prepare()
