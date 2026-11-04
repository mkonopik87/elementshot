(() => {
  const key = '__zenScreenshot';
  if (globalThis[key]) { globalThis[key](); return; }
  const host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;';
  const root = host.attachShadow({mode: 'closed'});
  root.innerHTML = `<style>
    :host{color-scheme:dark}*{box-sizing:border-box}button{font:500 14px system-ui;color:#fafafa;background:#27272a;border:1px solid #52525b;border-radius:6px;padding:9px 15px;cursor:pointer}button:hover{background:#3f3f46}button:focus-visible{outline:2px solid #a78bfa;outline-offset:3px}button.primary{background:#fafafa;color:#18181b;border-color:#fafafa}button:disabled{opacity:.5;cursor:wait}[hidden]{display:none!important}.surface{position:fixed;inset:0;cursor:crosshair;touch-action:none;font:14px system-ui;color:#fafafa}.selection{position:fixed;border:2px solid #ffffff66;border-radius:6px;box-shadow:0 0 0 100vmax #0008;pointer-events:none;transition:all .1s}.selection.chosen{border:2px dashed white;transition:none;pointer-events:auto;cursor:move}.panel{position:fixed;top:3%;right:1.5%;display:flex;gap:8px;padding:8px;border:1px solid #3f3f46;border-radius:9px;background:#18181b;box-shadow:0 6px 24px #0005;cursor:default}.actions{top:auto;right:auto}.handle{position:absolute;width:10px;height:10px;background:white;border:1px solid #71717a;border-radius:50%;pointer-events:auto}.handle[data-h=nw]{left:-6px;top:-6px;cursor:nwse-resize}.handle[data-h=ne]{right:-6px;top:-6px;cursor:nesw-resize}.handle[data-h=sw]{left:-6px;bottom:-6px;cursor:nesw-resize}.handle[data-h=se]{right:-6px;bottom:-6px;cursor:nwse-resize}.handle[data-h=n]{left:50%;top:-6px;cursor:ns-resize}.handle[data-h=s]{left:50%;bottom:-6px;cursor:ns-resize}.handle[data-h=w]{left:-6px;top:50%;cursor:ew-resize}.handle[data-h=e]{right:-6px;top:50%;cursor:ew-resize}.preview{position:fixed;inset:0;background:#000b;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;cursor:default}.preview img{max-width:90vw;max-height:80vh;object-fit:contain;box-shadow:0 4px 24px #0008}.preview nav{display:flex;gap:8px}.error{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#27272a;padding:12px 20px;border-radius:8px;max-width:80vw}
  </style><div class="surface"><div class="selection" hidden></div><nav class="panel"><button data-a="full">Save full page</button><button data-a="visible">Save visible</button><button data-a="close" aria-label="Close">✕</button></nav><nav class="panel actions" hidden><button data-a="reset" aria-label="Cancel selection">✕</button><button data-a="copy">Copy</button><button data-a="download" class="primary">Download</button></nav><div class="preview" hidden><img alt="Screenshot preview"><nav><button data-a="reset">Back</button><button data-a="copy">Copy</button><button data-a="download" class="primary">Download</button><button data-a="close" aria-label="Close">✕</button></nav></div><div class="error" role="alert" hidden></div></div>`;
  document.documentElement.append(host);
  const $ = selector => root.querySelector(selector);
  const box = $('.selection'), actions = $('.actions'), preview = $('.preview');
  let rect, selected = false, drag, busy = false, blob, imageURL, cancelled = false;
  const previousFocus = document.activeElement;
  const controller = new AbortController();
  function close() {
    cancelled = true;
    controller.abort(); host.remove();
    if (imageURL) URL.revokeObjectURL(imageURL);
    delete globalThis[key];
    previousFocus?.focus({preventScroll:true});
  }
  globalThis[key] = close;
  function error(message) { $('.error').textContent = message; $('.error').hidden = false; }
  function render() {
    box.hidden = !rect;
    if (!rect) return;
    Object.assign(box.style, {left: `${rect.x - scrollX}px`, top: `${rect.y - scrollY}px`, width: `${rect.w}px`, height: `${rect.h}px`});
    box.classList.toggle('chosen', selected);
    box.innerHTML = selected ? ['nw','n','ne','e','se','s','sw','w'].map(h => `<i class="handle" data-h="${h}"></i>`).join('') : '';
    actions.hidden = !selected || !!drag;
    actions.style.left = `${Math.max(8, Math.min(innerWidth - 290, rect.x - scrollX + rect.w - 280))}px`;
    actions.style.top = `${Math.max(8, Math.min(innerHeight - 60, rect.y - scrollY + rect.h + 12))}px`;
  }
  function reset() { selected = false; rect = null; blob = null; preview.hidden = true; actions.hidden = true; $('.error').hidden = true; $('.panel').hidden = false; render(); }
  function pick(x, y) {
    host.style.pointerEvents = 'none';
    let el = document.elementFromPoint(x, y);
    while (el?.shadowRoot?.elementFromPoint(x, y)) {
      const child = el.shadowRoot.elementFromPoint(x, y);
      if (child === el) break;
      el = child;
    }
    host.style.pointerEvents = '';
    while (el && el !== document.documentElement) {
      const r = el.getBoundingClientRect();
      if (r.width >= 16 && r.height >= 16) return {x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height};
      el = el.parentElement;
    }
    return null;
  }
  root.addEventListener('pointermove', e => {
    if (busy || !preview.hidden) return;
    if (!drag) { if (!selected && !e.target.closest('nav')) { rect = pick(e.clientX, e.clientY); render(); } return; }
    const x = e.clientX + scrollX, y = e.clientY + scrollY;
    const dx = x - drag.x, dy = y - drag.y;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    if (drag.mode === 'move') rect = {...drag.rect, x: Math.max(0, drag.rect.x + dx), y: Math.max(0, drag.rect.y + dy)};
    else {
      let x1 = drag.mode === 'new' ? drag.x : drag.rect.x, y1 = drag.mode === 'new' ? drag.y : drag.rect.y;
      let x2 = drag.mode === 'new' ? x : x1 + drag.rect.w, y2 = drag.mode === 'new' ? y : y1 + drag.rect.h;
      if (drag.mode.includes('w') && drag.mode !== 'new') x1 += dx;
      if (drag.mode.includes('e') && drag.mode !== 'new') x2 += dx;
      if (drag.mode.includes('n') && drag.mode !== 'new') y1 += dy;
      if (drag.mode.includes('s')) y2 += dy;
      rect = {x: Math.max(0, Math.min(x1,x2)), y: Math.max(0, Math.min(y1,y2)), w: Math.max(1,Math.abs(x2-x1)), h: Math.max(1,Math.abs(y2-y1))};
    }
    render();
  });
  root.addEventListener('pointerdown', e => {
    if (e.button || busy || !preview.hidden || e.target.closest('nav')) return;
    e.preventDefault();
    drag = {x:e.clientX + scrollX,y:e.clientY + scrollY,rect:rect && {...rect},mode:e.target.dataset.h || (selected && e.target === box ? 'move' : 'new'),moved:false};
    $('.surface').setPointerCapture(e.pointerId);
  });
  root.addEventListener('pointerup', () => {
    if (!drag) return;
    if (!drag.moved && drag.mode === 'new') rect = pick(drag.x-scrollX, drag.y-scrollY);
    drag = null; selected = !!rect; render();
  });
  window.addEventListener('scroll', render, {signal:controller.signal,passive:true});
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {e.preventDefault();e.stopImmediatePropagation();if(selected && !busy) reset(); else close();}
    if (e.key === 'Enter' && selected && !busy && e.target === document.body) capture('preview');
  }, {capture:true,signal:controller.signal});
  async function capture(action) {
    if (busy) return;
    busy = true;
    $('.error').hidden = true;
    root.querySelectorAll('button').forEach(b => b.disabled = true);
    const origin = {x:scrollX,y:scrollY};
    const style = document.createElement('style');
    style.textContent = 'html{scroll-behavior:auto!important;scroll-snap-type:none!important}';
    try {
      if (!blob) {
        const area = rect || {x:scrollX,y:scrollY,w:innerWidth,h:innerHeight};
        const scale = devicePixelRatio;
        if (area.w * area.h * scale * scale > 100000000 || Math.max(area.w,area.h)*scale > 32767) throw new Error('Selection is too large. Select a smaller area.');
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(area.w*scale); canvas.height = Math.ceil(area.h*scale);
        const ctx = canvas.getContext('2d');
        document.documentElement.append(style);
        selected = false;
        box.hidden = true;
        actions.hidden = true;
        $('.panel').hidden = true;
        host.style.visibility = 'hidden';
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        for (let y = area.y; y < area.y + area.h; y += innerHeight) {
          for (let x = area.x; x < area.x + area.w; x += innerWidth) {
            if (cancelled) throw new Error('Capture cancelled.');
            window.scrollTo(x,y);
            await new Promise(r => setTimeout(r,100));
            const response = await chrome.runtime.sendMessage({type:'zen-capture'});
            if (response.error) throw new Error(response.error);
            const img = new Image(); img.src = response.data; await img.decode();
            const sx = img.width/innerWidth, sy = img.height/innerHeight;
            const w = Math.min(innerWidth,area.x+area.w-x), h = Math.min(innerHeight,area.y+area.h-y);
            ctx.drawImage(img,(x-scrollX)*sx,(y-scrollY)*sy,w*sx,h*sy,(x-area.x)*scale,(y-area.y)*scale,w*scale,h*scale);
          }
        }
        blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
        if (!blob) throw new Error('Could not encode screenshot.');
      }
      if (cancelled) return;
      if (action === 'copy') { await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]); close(); }
      else if (action === 'download') {
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = `Screenshot ${new Date().toISOString().replace(/[:.]/g,'-')}.png`; a.click();
        setTimeout(() => URL.revokeObjectURL(url),60000); close();
      } else {
        if(imageURL) URL.revokeObjectURL(imageURL);
        imageURL = URL.createObjectURL(blob); $('.preview img').src = imageURL;
        preview.hidden = false; actions.hidden = true; $('.panel').hidden = true;
      }
    } catch(e) { error(e.message); }
    finally {window.scrollTo(origin.x,origin.y);style.remove();host.style.visibility='';if(preview.hidden){render();$('.panel').hidden=false;}else{box.hidden=true;actions.hidden=true;$('.panel').hidden=true;}busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
  root.addEventListener('click', e => {
    const action = e.target.closest('button')?.dataset.a;
    if (!action || busy) return;
    if (action === 'close') close();
    else if (action === 'reset') reset();
    else if (action === 'full' || action === 'visible') {
      blob = null;
      selected = false;
      box.hidden = true;
      actions.hidden = true;
      rect = action === 'full' ? {x:0,y:0,w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight} : {x:scrollX,y:scrollY,w:innerWidth,h:innerHeight};
      capture('preview');
    } else capture(action);
  });
  $('.panel button').focus();
})();
