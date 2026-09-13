#!/usr/bin/env python3
"""Exercise the compiled APK on an Android emulator through adb and WebView DevTools."""
import json, os, subprocess, sys, time, urllib.request
from pathlib import Path
import websocket

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
QA = OUT / 'qa'
PACKAGE = 'com.qualiacology.pocketsun'
COMPONENT = PACKAGE + '/.MainActivity'
report = {'checks': [], 'environment': 'Android API 35 emulator; not a physical device',
          'audioLimit': 'AudioContext lifecycle is tested; audible output and physical haptics are not.'}
ws = None
sequence = 0


def adb(*args, check=True):
    return subprocess.run(['adb', *map(str,args)], check=check, capture_output=True).stdout.decode(errors='replace').strip()


def verify(label, condition):
    if not condition: raise AssertionError(label)
    report['checks'].append(label)
    print('PASS:',label,flush=True)


def connect():
    global ws
    if ws:
        try: ws.close()
        except Exception: pass
    for _ in range(80):
        try:
            pid = adb('shell','pidof','-s',PACKAGE).strip()
            if not pid: raise RuntimeError('Process not ready')
            adb('forward','tcp:9222','localabstract:webview_devtools_remote_' + pid)
            with urllib.request.urlopen('http://127.0.0.1:9222/json', timeout=3) as r:
                pages = json.load(r)
            page = next(p for p in pages if 'appassets.androidplatform.net' in p.get('url',''))
            ws = websocket.create_connection(page['webSocketDebuggerUrl'], suppress_origin=True, timeout=20)
            if evaluate('document.body && document.body.dataset.gameReady') == 'true': return
        except Exception: time.sleep(.5)
    raise RuntimeError('The APK did not expose a ready game WebView')


def command(method, params=None):
    global sequence
    sequence += 1
    msg_id = sequence
    ws.send(json.dumps({'id':msg_id,'method':method,'params':params or {}}))
    while True:
        response = json.loads(ws.recv())
        if response.get('id') == msg_id:
            if 'error' in response: raise RuntimeError(response['error'])
            return response.get('result',{})


def evaluate(expression):
    r = command('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':True})
    if 'exceptionDetails' in r: raise RuntimeError(r['exceptionDetails'])
    return r.get('result',{}).get('value')


def wait_for(expression, seconds=12):
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        if evaluate(expression): return True
        time.sleep(.15)
    return False


def start():
    adb('shell','am','start','-W','-n',COMPONENT)


try:
    QA.mkdir(parents=True,exist_ok=True)
    adb('logcat','-c')
    adb('install','-r', OUT / 'POCKET-SUN-3.2.0-android.1.apk')
    adb('shell','svc','wifi','disable',check=False)
    adb('shell','svc','data','disable',check=False)
    start()
    connect()
    verify('APK launches the bundled game with network services disabled',evaluate('document.body.dataset.gameReady') == 'true')
    verify('Game uses the packaged local origin',evaluate('location.origin') == 'https://appassets.androidplatform.net')
    verify('Portrait viewport',evaluate('innerHeight > innerWidth'))
    verify('Visible foreground simulation is active',wait_for('!window.__POCKET_ANDROID_TEST__().suspended'))
    # Observe the existing audio constructor without changing the game's audio graph.
    evaluate('''(() => {
      window.__qaAudioContexts = [];
      const Base = window.AudioContext;
      window.AudioContext = class extends Base {
        constructor(...args) { super(...args); window.__qaAudioContexts.push(this); }
      };
    })()''')
    dims = evaluate('({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})')
    report['viewport'] = dims
    x, y = int(dims['width']*.52), int(dims['height']*.55)
    command('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]})
    verify('Touch reaches the unchanged hold control',wait_for('window.__POCKET_ANDROID_TEST__().pointerDown'))
    verify('First touch starts the game AudioContext',wait_for('window.__qaAudioContexts.length > 0 && window.__qaAudioContexts.every(c => c.state === "running")'))
    time.sleep(.3)
    adb('shell','input','keyevent','3')
    time.sleep(.7)
    verify('Home suspends the game',evaluate('window.__POCKET_ANDROID_TEST__().suspended'))
    verify('Home suspends the game AudioContext',wait_for('window.__qaAudioContexts.every(c => c.state !== "running")'))
    verify('Home releases a held finger',not evaluate('window.__POCKET_ANDROID_TEST__().pointerDown'))
    suspended_hash = evaluate('window.__POCKET_SUN__.stateHash()')
    time.sleep(.5)
    verify('Simulation does not run in the background',suspended_hash == evaluate('window.__POCKET_SUN__.stateHash()'))
    command('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
    start()
    verify('Returning to the app resumes the game',wait_for('!window.__POCKET_ANDROID_TEST__().suspended'))
    verify('Returning to the app resumes the AudioContext',wait_for('window.__qaAudioContexts.every(c => c.state === "running")'))
    time.sleep(.5)
    verify('The resumed simulation moves again',suspended_hash != evaluate('window.__POCKET_SUN__.stateHash()'))
    adb('shell','input','keyevent','4')
    verify('Android Back displays the existing pause screen',wait_for('window.__POCKET_ANDROID_TEST__().paused && !!document.querySelector(".pause-screen")'))
    adb('shell','input','keyevent','3')
    time.sleep(.4)
    start()
    verify('A manual pause survives leaving and reopening the app',wait_for('window.__POCKET_ANDROID_TEST__().paused && !window.__POCKET_ANDROID_TEST__().suspended'))
    evaluate('document.querySelector(".pause-screen").click()')
    verify('The original pause screen resumes the game',wait_for('!window.__POCKET_ANDROID_TEST__().paused'))
    command('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':2}]})
    time.sleep(.4)
    command('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    time.sleep(.7)
    with (QA / 'portrait-android.png').open('wb') as f:
        subprocess.run(['adb','exec-out','screencap','-p'],stdout=f,check=True)
    # Freeze the old run before injecting the persistence fixture.
    evaluate('window.__pocketSetActive(false); localStorage.setItem("pocket-sun-best","24680")')
    report['storageBeforeStop'] = evaluate('localStorage.getItem("pocket-sun-best")')
    time.sleep(.5)
    adb('shell','am','force-stop',PACKAGE)
    start()
    connect()
    report['storageAfterRelaunch'] = evaluate('localStorage.getItem("pocket-sun-best")')
    verify('Saved best score survives force-stop and relaunch',report['storageBeforeStop'] == '24680' and report['storageAfterRelaunch'] == '24680')
    verify('Relaunch remains in portrait',evaluate('innerHeight > innerWidth'))
    report['gameSnapshot'] = evaluate('window.__POCKET_SUN__.snapshot()')
    report['ok'] = True
except Exception as e:
    report['ok'] = False
    report['error'] = repr(e)
    raise
finally:
    if ws:
        try: ws.close()
        except Exception: pass
    logs = adb('logcat','-d','-s','PocketSun:I','PocketSunJS:D','AndroidRuntime:E','chromium:E',check=False)
    (QA / 'android-logcat.txt').write_text(logs)
    if 'FATAL EXCEPTION' in logs:
        report['ok'] = False
        report['fatalException'] = True
    (QA / 'android-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
if not report.get('ok'): sys.exit(1)
