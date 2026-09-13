#!/usr/bin/env python3
"""Exercise the compiled APK on Android; journal evidence even if DevTools stalls."""
import json, re, signal, subprocess, sys, time, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
import websocket

HERE = Path(__file__).resolve().parent
OUT = HERE / 'out'
QA = OUT / 'qa'
PACKAGE = 'com.qualiacology.pocketsun'
COMPONENT = PACKAGE + '/.MainActivity'
report = {'ok': False, 'checks': [], 'environment': 'Android API 35 emulator; not a physical device',
          'audioLimit': 'Audible output and physical haptics are not assessed; AudioContext checks are listed individually.'}
ws = None
sequence = 0


def journal():
    QA.mkdir(parents=True, exist_ok=True)
    (QA / 'android-report.json').write_text(json.dumps(report, indent=2))


def adb(*args, check=True, timeout=20):
    return subprocess.run(['adb', *map(str,args)], check=check, capture_output=True,
                          timeout=timeout).stdout.decode(errors='replace').strip()


def screenshot(name):
    result = subprocess.run(['adb','exec-out','screencap','-p'], check=True,
                            capture_output=True, timeout=15)
    if not result.stdout.startswith(b'\x89PNG\r\n\x1a\n'):
        raise RuntimeError('Android screenshot was not a PNG')
    (QA / name).write_bytes(result.stdout)


def dismiss_system_dialogs():
    # Only dismiss identified OS onboarding or Pixel Launcher errors. Never hide a game crash.
    for attempt in range(3):
        focus = adb('shell','dumpsys','window','windows',timeout=8)
        focused_line = next((x for x in focus.splitlines() if 'mCurrentFocus=' in x), '')
        report['windowFocus'] = focused_line
        if PACKAGE in focused_line: return
        try:
            adb('shell','uiautomator','dump','/sdcard/pocket-qa-window.xml',timeout=8)
            raw = adb('shell','cat','/sdcard/pocket-qa-window.xml',timeout=5)
            (QA / ('system-dialog-' + str(attempt) + '.xml')).write_text(raw)
            root = ET.fromstring(raw)
            all_text = ' '.join(n.get('text','') for n in root.iter('node'))
            target = None
            for node in root.iter('node'):
                text = node.get('text','').strip()
                if 'Viewing full screen' in all_text and text.lower() == 'got it':
                    target = node; break
                if 'Pixel Launcher' in all_text and (text.lower() == 'close app' or node.get('resource-id','') == 'android:id/aerr_close'):
                    target = node; break
            if target is None: return
            bounds = list(map(int,re.findall(r'\d+',target.get('bounds',''))))
            if len(bounds) != 4: return
            report.setdefault('systemDialogsDismissed',[]).append(all_text)
            journal()
            adb('shell','input','tap',(bounds[0]+bounds[2])//2,(bounds[1]+bounds[3])//2)
            time.sleep(.4)
        except (ET.ParseError, subprocess.TimeoutExpired):
            return


def verify(label, condition):
    if not condition: raise AssertionError(label)
    report['checks'].append(label)
    journal()
    print('PASS:',label,flush=True)


def command(method, params=None):
    global sequence
    sequence += 1
    msg_id = sequence
    report['lastCommand'] = {'method':method,'params':params or {}}
    journal()
    print('CDP',msg_id,method,str(params)[:180],flush=True)
    ws.settimeout(8)
    ws.send(json.dumps({'id':msg_id,'method':method,'params':params or {}}))
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        ws.settimeout(max(.1, deadline-time.monotonic()))
        response = json.loads(ws.recv())
        if response.get('id') == msg_id:
            if 'error' in response: raise RuntimeError(response['error'])
            return response.get('result',{})
    raise TimeoutError('DevTools response deadline: ' + method)


def evaluate(expression):
    r = command('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':False})
    if 'exceptionDetails' in r: raise RuntimeError(r['exceptionDetails'])
    return r.get('result',{}).get('value')


def close_socket():
    global ws
    if ws:
        try: ws.close(timeout=1)
        except Exception: pass
        ws = None


def connect():
    global ws
    close_socket()
    deadline = time.monotonic() + 35
    last_error = ''
    while time.monotonic() < deadline:
        try:
            pid = adb('shell','pidof','-s',PACKAGE, timeout=5).strip()
            if not pid: raise RuntimeError('Process not ready')
            adb('forward','tcp:9222','localabstract:webview_devtools_remote_' + pid, timeout=5)
            with urllib.request.urlopen('http://127.0.0.1:9222/json', timeout=3) as r:
                pages = json.load(r)
            page = next(p for p in pages if 'appassets.androidplatform.net' in p.get('url',''))
            ws = websocket.create_connection(page['webSocketDebuggerUrl'], suppress_origin=True, timeout=8)
            if evaluate('document.body && document.body.dataset.gameReady') == 'true': return
            close_socket()
        except Exception as e:
            last_error = repr(e)
            close_socket()
        time.sleep(.3)
    raise RuntimeError('No ready game WebView: ' + last_error)


def wait_for(expression, seconds=10):
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        if evaluate(expression): return True
        time.sleep(.15)
    return False


def start():
    adb('shell','am','start','-W','-n',COMPONENT)
    time.sleep(.5)
    dismiss_system_dialogs()


def deadline_expired(signum, frame):
    raise TimeoutError('Overall Android validation deadline expired')


signal.signal(signal.SIGALRM, deadline_expired)
signal.alarm(150)
try:
    journal()
    adb('logcat','-c')
    # Lower only the emulator's physical pixel count; do not alter the game's quality settings.
    adb('shell','wm','size','540x1200')
    adb('shell','wm','density','210')
    adb('shell','settings','put','secure','immersive_mode_confirmations','confirmed')
    time.sleep(1)
    dismiss_system_dialogs()
    adb('install','-r', OUT / 'POCKET-SUN-3.2.0-android.1.apk')
    adb('shell','svc','wifi','disable',check=False)
    adb('shell','svc','data','disable',check=False)
    start()
    time.sleep(1)
    dismiss_system_dialogs()
    screenshot('android-launch.png')
    connect()
    verify('APK launches the bundled game with network services disabled',evaluate('document.body.dataset.gameReady') == 'true')
    screenshot('portrait-android.png')
    verify('Game uses the packaged local origin',evaluate('location.origin') == 'https://appassets.androidplatform.net')
    verify('Portrait viewport',evaluate('innerHeight > innerWidth'))
    verify('Visible foreground simulation is active',wait_for('!window.__POCKET_ANDROID_TEST__().suspended'))
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
    screenshot('portrait-android-playing.png')
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
    print('ANDROID CHECK FAILED:',repr(e),flush=True)
finally:
    signal.alarm(0)
    journal()
    close_socket()
    try:
        screenshot('android-final.png')
        logs = adb('logcat','-d','-s','PocketSun:I','PocketSunJS:D','AndroidRuntime:E','chromium:E',check=False, timeout=8)
    except Exception as e:
        logs = 'Log retrieval failed: ' + repr(e)
    (QA / 'android-logcat.txt').write_text(logs)
    if 'FATAL EXCEPTION' in logs:
        report['ok'] = False
        report['fatalException'] = True
    journal()
    print(json.dumps(report,indent=2),flush=True)
if not report.get('ok'): sys.exit(1)
