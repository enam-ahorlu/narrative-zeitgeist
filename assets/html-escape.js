// Escaping helpers shared by every screen. Loaded first so later scripts can call them.
// escHtml: text or a double-quoted attribute value.
// escJs: a value placed inside a quoted JS string inside a double-quoted attribute,
//        for example onclick="filterByTag('...')". Escapes for JS first, then for HTML.
// cssUrl: a safe CSS url() value, or 'none' for anything that is not an http(s) or
//         site-relative address.
function escHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escJs(s){
  return escHtml(String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'\\r'));
}
function cssUrl(u){
  u=String(u==null?'':u).trim();
  if(!/^(https?:\/\/|\/(?!\/))/i.test(u))return 'none';
  return 'url("'+u.replace(/[\\"\n\r\s]/g,function(c){return encodeURIComponent(c);})+'")';
}
if (typeof module !== 'undefined') module.exports = { escHtml, escJs, cssUrl };
