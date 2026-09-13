#!/usr/bin/env python3
"""Validate the compiled APK with bounded commands and durable test evidence."""
import json, re, signal, subprocess, sys, time, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
import websocket
HERE=Path(__file__).resolve().parent
OUT=HERE/'out'; QA=OUT/'qa'
PACKAGE='com.qualiacology.pocketsun'; COMPONENT=PACKAGE+'/.MainActivity'
report={'ok':False,'checks':[],'environment':'Android API 35 emulator; not a physical device',
        'audioLimit':'AudioContext lifecycle only; audible output and physical haptics are not assessed.'}
ws=None; sequence=0

def journal():
    QA.mkdir(parents=True,exist_ok=True)
    (QA/'android-report.json').write_text(json.dumps(report,indent=2))

def adb(*args,check=True,timeout=15):
    return subprocess.run(['adb',*map(str,args)],check=check,capture_output=True,timeout=timeout).stdout.decode(errors='replace').strip()

def screenshot(name):
    r=subprocess.run(['adb','exec-out','screencap','-p'],check=True,capture_output=True,timeout=10)
    if not r.stdout.startswith(b'\x89PNG\r\n\x1a\n'): raise RuntimeError('Invalid screenshot')
    (QA/name).write_bytes(r.stdout)

def dismiss_system_dialogs():
    for attempt in range(3):
        try:
            focus=adb('shell','dumpsys','window','windows',timeout=6)
            focused_line=next((x for x in focus.splitlines() if 'mCurrentFocus=' in x),'')
            report['windowFocus']=focused_line
            if PACKAGE in focused_line: return
            adb('shell','uiautomator','dump','/sdcard/pocket-qa-window.xml',timeout=6)
            raw=adb('shell','cat','/sdcard/pocket-qa-window.xml',timeout=4)
            (QA/('system-dialog-'+str(attempt)+'.xml')).write_text(raw)
            root=ET.fromstring(raw)
            text=' '.join(n.get('text','') for n in root.iter('node'))
            target=None
            for node in root.iter('node'):
                label=node.get('text','').strip().lower()
                if 'Viewing full screen' in text and label=='got it': target=node; break
                if 'Pixel Launcher' in text and (label=='close app' or node.get('resource-id','')=='android:id/aerr_close'): target=node; break
            if target is None: return
            b=list(map(int,re.findall(r'\d+',target.get('bounds',''))))
            if len(b)!=4: return
            report.setdefault('systemDialogsDismissed',[]).append(text); journal()
            adb('shell','input','tap',(b[0]+b[2])//2,(b[1]+b[3])//2)
            time.sleep(.5)
        except (ET.ParseError,subprocess.TimeoutExpired,subprocess.CalledProcessError) as e:
            report.setdefault('systemInspectionNotes',[]).append(repr(e)); journal(); return

def verify(label,condition):
    if not condition: raise AssertionError(label)
    report['checks'].append(label); journal(); print('PASS:',label,flush=True)

def command(method,params=None):
    global sequence
    sequence+=1; msg_id=sequence
    report['lastCommand']={'method':method,'params':params or {}}; journal()
    print('CDP',msg_id,method,str(params)[:150],flush=True)
    ws.settimeout(8); ws.send(json.dumps({'id':msg_id,'method':method,'params':params or {}}))
    end=time.monotonic()+10
    while time.monotonic()<end:
        ws.settimeout(max(.1,end-time.monotonic()))
        r=json.loads(ws.recv())
        if r.get('id')==msg_id:
            if 'error' in r: raise RuntimeError(r['error'])
            return r.get('result',{})
    raise TimeoutError('CDP deadline: '+method)

def evaluate(expression):
    r=command('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':False})
    if 'exceptionDetails' in r: raise RuntimeError(r['exceptionDetails'])
    return r.get('result',{}).get('value')

def close_socket():
    global ws
    if ws:
        try: ws.close(timeout=1)
        except Exception: pass
        ws=None

def connect():
    global ws
    close_socket(); end=time.monotonic()+30; error=''
    while time.monotonic()<end:
        try:
            pid=adb('shell','pidof','-s',PACKAGE,timeout=4)
            if not pid: raise RuntimeError('Process not ready')
            adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+pid,timeout=4)
            with urllib.request.urlopen('http://127.0.0.1:9222/json',timeout=3) as r: pages=json.load(r)
            page=next(p for p in pages if 'appassets.androidplatform.net' in p.get('url',''))
            ws=websocket.create_connection(page['webSocketDebuggerUrl'],suppress_origin=True,timeout=8)
            if evaluate('document.body && document.body.dataset.gameReady')=='true': return
        except Exception as e: error=repr(e)
        close_socket(); time.sleep(.3)
    raise RuntimeError('No ready WebView: '+error)

def wait_for(expression,seconds=10):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        if evaluate(expression): return True
        time.sleep(.2)
    return False

def start():
    adb('shell','am','start','-W','-n',COMPONENT)
    time.sleep(.7); dismiss_system_dialogs()

def deadline_expired(signum,frame): raise TimeoutError('Overall Android validation deadline')
signal.signal(signal.SIGALRM,deadline_expired); signal.alarm(150)
try:
    journal(); adb('logcat','-c')
    # Keep the AVD's original display configuration; resizing it can restart/hang Pixel Launcher.
    adb('shell','settings','put','secure','immersive_mode_confirmations','confirmed')
    adb('shell','input','keyevent','224'); adb('shell','wm','dismiss-keyguard',check=False)
    time.sleep(3)
    adb('install','-r',OUT/'POCKET-SUN-3.2.0-android.1.apk')
    adb('shell','svc','wifi','disable',check=False); adb('shell','svc','data','disable',check=False)
    start(); time.sleep(1); dismiss_system_dialogs(); screenshot('android-launch.png'); connect()
    verify('APK launches the bundled game with network services disabled',evaluate('document.body.dataset.gameReady')=='true')
    verify('Game uses the packaged local origin',evaluate('location.origin')=='https://appassets.androidplatform.net')
    verify('Portrait viewport',evaluate('innerHeight > innerWidth'))
    verify('Visible foreground simulation is active',wait_for('!window.__POCKET_ANDROID_TEST__().suspended'))
    screenshot('portrait-android.png')
    evaluate('''(() => {window.__qaAudioContexts=[]; const Base=window.AudioContext;
      window.AudioContext=class extends Base {constructor(...args){super(...args);window.__qaAudioContexts.push(this);}};})()''')
    dims=evaluate('({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})'); report['viewport']=dims
    x,y=int(dims['width']*.52),int(dims['height']*.55)
    command('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]})
    verify('Touch reaches the unchanged hold control',wait_for('window.__POCKET_ANDROID_TEST__().pointerDown'))
    verify('First touch starts the game AudioContext',wait_for('window.__qaAudioContexts.length > 0 && window.__qaAudioContexts.every(c => c.state === "running")'))
    time.sleep(.3); adb('shell','input','keyevent','3'); time.sleep(.7)
    verify('Home suspends the game',evaluate('window.__POCKET_ANDROID_TEST__().suspended'))
    verify('Home suspends the game AudioContext',wait_for('window.__qaAudioContexts.every(c => c.state !== "running")'))
    verify('Home releases a held finger',not evaluate('window.__POCKET_ANDROID_TEST__().pointerDown'))
    frozen=evaluate('window.__POCKET_SUN__.stateHash()'); time.sleep(.5)
    verify('Simulation does not run in the background',frozen==evaluate('window.__POCKET_SUN__.stateHash()'))
    command('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]}); start()
    verify('Returning to the app resumes the game',wait_for('!window.__POCKET_ANDROID_TEST__().suspended'))
    verify('Returning to the app resumes the AudioContext',wait_for('window.__qaAudioContexts.every(c => c.state === "running")'))
    time.sleep(.5)
    verify('The resumed simulation moves again',frozen!=evaluate('window.__POCKET_SUN__.stateHash()'))
    adb('shell','input','keyevent','4')
    verify('Android Back displays the existing pause screen',wait_for('window.__POCKET_ANDROID_TEST__().paused && !!document.querySelector(".pause-screen")'))
    adb('shell','input','keyevent','3'); time.sleep(.4); start()
    verify('A manual pause survives leaving and reopening the app',wait_for('window.__POCKET_ANDROID_TEST__().paused && !window.__POCKET_ANDROID_TEST__().suspended'))
    evaluate('document.querySelector(".pause-screen").click()')
    verify('The original pause screen resumes the game',wait_for('!window.__POCKET_ANDROID_TEST__().paused'))
    command('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':2}]}); time.sleep(.4)
    command('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]}); time.sleep(.7)
    screenshot('portrait-android-playing.png')
    evaluate('window.__pocketSetActive(false); localStorage.setItem("pocket-sun-best","24680")')
    report['storageBeforeStop']=evaluate('localStorage.getItem("pocket-sun-best")'); time.sleep(.5)
    adb('shell','am','force-stop',PACKAGE); start(); connect()
    report['storageAfterRelaunch']=evaluate('localStorage.getItem("pocket-sun-best")')
    verify('Saved best score survives force-stop and relaunch',report['storageBeforeStop']=='24680' and report['storageAfterRelaunch']=='24680')
    verify('Relaunch remains in portrait',evaluate('innerHeight > innerWidth'))
    report['gameSnapshot']=evaluate('window.__POCKET_SUN__.snapshot()'); report['ok']=True
except Exception as e:
    report['ok']=False; report['error']=repr(e); print('ANDROID CHECK FAILED:',repr(e),flush=True)
finally:
    signal.alarm(0); journal(); close_socket()
    try: screenshot('android-final.png')
    except Exception as e: report['screenshotError']=repr(e)
    try: logs=adb('logcat','-d','-s','PocketSun:I','PocketSunJS:D','AndroidRuntime:E','chromium:E',check=False,timeout=8)
    except Exception as e: logs='Log retrieval failed: '+repr(e)
    (QA/'android-logcat.txt').write_text(logs)
    if 'FATAL EXCEPTION' in logs: report['ok']=False; report['fatalException']=True
    journal(); print(json.dumps(report,indent=2),flush=True)
if not report.get('ok'): sys.exit(1)
