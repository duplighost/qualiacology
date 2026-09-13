#!/usr/bin/env python3
"""Exercise existing APKs on a disposable emulator. Does not rebuild or alter any app."""
import hashlib,json,os,pathlib,re,subprocess,time,urllib.request,xml.etree.ElementTree as ET
import websocket
HERE=pathlib.Path(__file__).resolve().parent
QA=HERE/'out';QA.mkdir(parents=True,exist_ok=True)
APK_DIR=pathlib.Path(os.environ['ANDROID_APK_DIR'])
GAMES=[('fallingopen','falling-open'),('lilbigbang','lil-big-bang'),('thrown','thrown'),('iseentit','i-seent-it')]
verification=json.loads((APK_DIR/'APK-VERIFICATION.json').read_text())

def adb(*args,timeout=40,binary=False):
    run=subprocess.run(['adb',*map(str,args)],timeout=timeout,capture_output=True,text=not binary)
    if run.returncode:
        raise RuntimeError('adb '+str(args)+': '+str(run.stdout)[-1500:]+' '+str(run.stderr)[-1500:])
    return run.stdout

def ui_dump():
    adb('shell','uiautomator','dump','/sdcard/mobile-recheck.xml',timeout=25)
    return adb('shell','cat','/sdcard/mobile-recheck.xml')

def dismiss_fullscreen_lesson():
    dismissed=0
    for _ in range(3):
        text=ui_dump()
        if 'Viewing full screen' not in text and 'immersive_cling' not in text: break
        for node in ET.fromstring(text).iter('node'):
            if node.get('text','').strip().lower()=='got it':
                nums=list(map(int,re.findall(r'\d+',node.get('bounds',''))))
                if len(nums)==4:
                    adb('shell','input','tap',(nums[0]+nums[2])//2,(nums[1]+nums[3])//2)
                    dismissed+=1;time.sleep(1)
                    break
        else: raise RuntimeError('Fullscreen tutorial found but its Got it control was not found')
    return dismissed

def connect(package):
    pid=adb('shell','pidof',package).strip().split()[0]
    adb('forward','--remove','tcp:9239') if 'tcp:9239' in adb('forward','--list') else None
    adb('forward','tcp:9239','localabstract:webview_devtools_remote_'+pid)
    error=None
    for _ in range(10):
        try:
            targets=json.load(urllib.request.urlopen('http://127.0.0.1:9239/json',timeout=5))
            target=next(t for t in targets if t.get('type')=='page')
            return websocket.create_connection(target['webSocketDebuggerUrl'],timeout=15,suppress_origin=True)
        except Exception as e:error=e;time.sleep(1)
    raise RuntimeError('WebView debugger: '+str(error))

sequence=0

def evaluate(ws,expression):
    global sequence
    sequence+=1;current=sequence
    ws.send(json.dumps({'id':current,'method':'Runtime.evaluate','params':{'expression':expression,'returnByValue':True}}))
    while True:
        reply=json.loads(ws.recv())
        if reply.get('id')==current:
            if 'error' in reply:raise RuntimeError(str(reply['error']))
            if reply.get('result',{}).get('exceptionDetails'):raise RuntimeError(str(reply['result']['exceptionDetails']))
            return reply.get('result',{}).get('result',{}).get('value')

# Only emulator test settings: leave the delivered application unchanged.
adb('shell','wm','size','720x1600')
adb('shell','wm','density','280')
adb('shell','settings','put','system','screen_off_timeout','600000')
adb('shell','svc','power','stayon','true')
adb('shell','input','keyevent','KEYCODE_WAKEUP')
adb('shell','wm','dismiss-keyguard')
adb('shell','svc','wifi','disable');adb('shell','svc','data','disable')
reports=[]
for module,slug in GAMES:
    package='com.qualiacology.'+module
    apk=APK_DIR/verification[slug]['apk']
    report={'slug':slug,'package':package,'physical_phone':False,'apk_sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'tested_build_run':34743298270}
    ws=None
    try:
        assert report['apk_sha256']==verification[slug]['sha256'],'APK does not match signed build inventory'
        report['install']=adb('install','-r',apk,timeout=100)
        adb('logcat','-c')
        report['launch']=adb('shell','am','start','-W','-n',package+'/com.qualiacology.mobilegame.MainActivity')
        time.sleep(3)
        report['dismissed_system_tutorials']=dismiss_fullscreen_lesson()
        ws=connect(package)
        report['initial']=evaluate(ws,"({title:document.title,url:location.href,canvas:Array.from(document.querySelectorAll('canvas'),c=>({width:c.width,height:c.height})),text:document.body.innerText.slice(0,5000),width:innerWidth,height:innerHeight,visibility:document.visibilityState,focused:document.hasFocus()})")
        evaluate(ws,"window.__recheckFrames=0;window.__recheckTouches=0;window.__recheckErrors=[];window.__recheckLoop=()=>{window.__recheckFrames++;requestAnimationFrame(window.__recheckLoop)};requestAnimationFrame(window.__recheckLoop);addEventListener('pointerdown',()=>window.__recheckTouches++,true);addEventListener('error',e=>window.__recheckErrors.push(e.message));localStorage.setItem('__android_recheck','retained');true")
        # Native input, not synthetic DOM pointer events.
        adb('shell','input','tap',360,960)
        time.sleep(1)
        for direction in [1,-1,1]:
            adb('shell','input','swipe',360,900,360+direction*150,780,420)
        time.sleep(2)
        report['played']=evaluate(ws,"({frames:window.__recheckFrames,touches:window.__recheckTouches,errors:window.__recheckErrors,visibility:document.visibilityState,focused:document.hasFocus(),text:document.body.innerText.slice(0,5000),lbb:window.__LBB?window.__LBB.state():null,seent:window.__SEENT_IT__?window.__SEENT_IT__.snapshot():null})")
        (QA/(slug+'-android-played.png')).write_bytes(adb('exec-out','screencap','-p',binary=True,timeout=40))
        adb('shell','input','keyevent','KEYCODE_BACK');time.sleep(1)
        menu=ui_dump();(QA/(slug+'-menu.xml')).write_text(menu)
        report['nativePauseMenu']='Game paused' in menu and 'Resume' in menu
        if report['nativePauseMenu']:
            paused0=evaluate(ws,'window.__recheckFrames');time.sleep(.75);paused1=evaluate(ws,'window.__recheckFrames')
            report['menuFrameDelta']=paused1-paused0
        adb('shell','input','keyevent','KEYCODE_BACK');time.sleep(1)
        dismiss_fullscreen_lesson()
        resumed0=evaluate(ws,'window.__recheckFrames');time.sleep(.75);resumed1=evaluate(ws,'window.__recheckFrames')
        report['menuResumeFrames']=resumed1-resumed0
        adb('shell','input','keyevent','KEYCODE_HOME');time.sleep(1)
        before=evaluate(ws,'window.__recheckFrames');time.sleep(.75);after=evaluate(ws,'window.__recheckFrames')
        report['backgroundFrameDelta']=after-before
        adb('shell','am','start','-W','-n',package+'/com.qualiacology.mobilegame.MainActivity');time.sleep(2)
        report['resumedFrames']=evaluate(ws,'window.__recheckFrames')-after
        report['storageRetained']=evaluate(ws,"localStorage.getItem('__android_recheck')==='retained'")
        evaluate(ws,"localStorage.removeItem('__android_recheck');true")
        logs=adb('logcat','-d','-s','AndroidRuntime:E','Qualiacology:I','QualiacologyJS:D',timeout=30)
        (QA/(slug+'-android-logcat.txt')).write_text(logs)
        report['fatalException']='FATAL EXCEPTION' in logs
        report['passed']=(report['played']['frames']>5 and report['played']['touches']>=3 and not report['played']['errors'] and bool(report['initial']['canvas']) and report['nativePauseMenu'] and report.get('menuFrameDelta',100)<=2 and report['menuResumeFrames']>2 and report['backgroundFrameDelta']<=2 and report['resumedFrames']>2 and report['storageRetained'] and not report['fatalException'])
    except Exception as error:
        report['passed']=False;report['error']=str(error)
        try:(QA/(slug+'-failure.png')).write_bytes(adb('exec-out','screencap','-p',binary=True,timeout=15))
        except Exception:pass
    finally:
        if ws:
            try:ws.close()
            except Exception:pass
        try:adb('shell','am','force-stop',package);adb('uninstall',package,timeout=45)
        except Exception:pass
        reports.append(report)
        (QA/'android-recheck.json').write_text(json.dumps({'environment':'Android API 35 Google APIs x86_64 emulator; 720x1600, density 280; network disabled; Android onboarding dismissed through its Got it control','note':'These are the exact APKs from build 34743298270, not rebuilt versions. No physical-phone performance certification.','reports':reports},indent=2))
        print(json.dumps(report),flush=True)
if len(reports)!=4 or any(not r['passed'] for r in reports):raise SystemExit(1)
