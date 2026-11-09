self.addEventListener("install",e=>{self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(self.clients.claim())});
// Network-first shop: catalog and orders require internet to stay shared and current.
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;});
