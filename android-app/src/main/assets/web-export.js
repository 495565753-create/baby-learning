(function () {
  'use strict';
  if (window.__guolichengExportDispose) window.__guolichengExportDispose();
  var port = null, busy = false, token = '__GC_EXPORT_TOKEN__';
  function receive(event) {
    // Native WebView messages have no DOM window source; targetOrigin is enforced in Java.
    // A per-navigation nonce and a trusted native event reject iframe/self/synthetic handshakes.
    if (event.source !== null || !event.isTrusted || event.data !== token || !event.ports || event.ports.length !== 1) return;
    if (port) port.close();
    port = event.ports[0]; port.start();
  }
  function send(data, name) {
    var match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(data);
    if (!match || !port || match[2].length > 22369624) throw new Error('unsupported export');
    port.postMessage(JSON.stringify({type: 'save', mime: match[1], name: name || '果粒橙作品', data: match[2]}));
  }
  function click(event) {
    var a = event.target.closest && event.target.closest('a[download]');
    if (!event.isTrusted || !a || !port) return;
    var href = a.href;
    if (!/^data:|^blob:/.test(href)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (busy) return;
    if (/^data:/.test(href)) { try { send(href, a.download); } catch (_) { alert('这幅作品暂时没保存好，换一张画再试试吧。'); } return; }
    if (href.indexOf('blob:' + location.origin + '/') !== 0) return;
    busy = true;
    fetch(href).then(function (response) { return response.blob(); }).then(function (blob) {
      if (blob.size > 16777216) throw new Error('too large');
      var reader = new FileReader();
      reader.onload = function () { busy = false; try { send(reader.result, a.download); } catch (_) { alert('这幅作品暂时没保存好，再试试吧。'); } };
      reader.onerror = function () { busy = false; alert('作品暂时没保存好，再试试吧。'); };
      reader.readAsDataURL(blob);
    }).catch(function () { busy = false; alert('作品暂时没保存好，再试试吧。'); });
  }
  window.addEventListener('message', receive);
  document.addEventListener('click', click, true);
  window.__guolichengExportDispose = function () { if (port) port.close(); port = null; window.removeEventListener('message', receive); document.removeEventListener('click', click, true); };
})();
