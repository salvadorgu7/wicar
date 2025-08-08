
"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import AddressPicker from "@/components/AddressPicker";
import AdminPanelPro, { ConfigBundle } from "@/components/AdminPanelPro";
type Role = null | "cliente" | "wicarrista" | "operacoes" | "admin";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });
const BRL = (n:number)=> (n||0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const toRad = (x:number)=> (x*Math.PI)/180;
const haversineKm = (a:[number,number], b:[number,number])=>{ const R=6371; const dLat=toRad(b[0]-a[0]); const dLon=toRad(b[1]-a[1]); const lat1=toRad(a[0]); const lat2=toRad(b[0]); const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(h)); };
const download = (name:string, content:string, type='text/plain')=>{ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); };

class RT {
  bc: BroadcastChannel | null = null;
  es: EventSource | null = null;
  constructor(){ if (typeof window!=='undefined' && "BroadcastChannel" in window) this.bc = new BroadcastChannel("wicar"); }
  connect(onEvent:(evt:any)=>void){ if(typeof window==='undefined') return ()=>{}; if("EventSource" in window){ this.es=new EventSource("/api/stream"); this.es.onmessage=(e)=>{ try{onEvent(JSON.parse(e.data))}catch{} }; } if(this.bc) this.bc.onmessage=(e)=> onEvent((e as any).data); return ()=>{ if(this.es) this.es.close(); if(this.bc) (this.bc as any).onmessage=null; };}
  async emit(evt:any){ try{ await fetch("/api/stream",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(evt) }); } catch { this.bc?.postMessage(evt); } }
}
const rt = typeof window!=='undefined' ? new RT() : null;
const BH:[number,number]=[-19.9167, -43.9345];

export default function Page(){
  const [bundle, setBundle] = useState<ConfigBundle|null>(null);
  useEffect(()=>{
    const saved = localStorage.getItem("wicar_bundle");
    if(saved){ setBundle(JSON.parse(saved)); }
    else {
      // light default (será carregado pelo Admin Pro)
      setBundle(null);
    }
  },[]);

  const [userType, setUserType] = useState<Role>(null);



  const [wicarristas] = useState<any[]>(Array.from({length:8}).map((_,i)=>({
    id:'w'+(i+1), name:['Rafael','Camila','Bruno','Isis','Victor','Brenda','Leandro','Paula'][i%8],
    rating:+(4.6+Math.random()*0.4).toFixed(2), jobs:Math.floor(100+Math.random()*700),
    pos:[BH[0]+(Math.random()-0.5)*0.06, BH[1]+(Math.random()-0.5)*0.06] as [number,number],
    online:Math.random()>0.2, earnings:Math.floor(400+Math.random()*5000)
  })));
  const [openJobs, setOpenJobs] = useState(0);
  const [bookings, setBookings] = useState<any[]>([]);
  const [surge, setSurge] = useState(1);
  const [geo, setGeo] = useState<{ready:boolean,pos:[number,number]}>({ ready:false, pos: BH });
  useEffect(()=>{ if(!navigator.geolocation) return setGeo({ready:true,pos:BH}); navigator.geolocation.getCurrentPosition((p)=> setGeo({ready:true,pos:[p.coords.latitude, p.coords.longitude]}), ()=> setGeo({ready:true,pos:BH}), { enableHighAccuracy:true, timeout: 5000 }); },[]);
  const hour = new Date().getHours();
  const timeSurge = (hour>=7&&hour<=9) || (hour>=17&&hour<=20) ? 1.10 : 1.0;
  const zoneSurge = (pos:[number,number])=>{ if(!bundle?.rules.surge_zones) return 1.0; const [lat, lon] = pos||BH; if(lon>-43.92) return 1.10; if(lat<-19.93) return 1.08; return 1.0; };
  useEffect(()=> setSurge((openJobs>=3?1.15:1.0)*timeSurge*zoneSurge(geo.pos)), [openJobs, timeSurge, geo.pos, bundle?.rules.surge_zones]);

  // Cliente form
  const [service, setService] = useState<string>("eco-basic");
  const [vehicle, setVehicle] = useState<string>("hatch");
  const [addons, setAddons] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [tip, setTip] = useState(0);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [partnerCode, setPartnerCode] = useState<string>('');
  const [tempoEstimado, setTempoEstimado] = useState<number|null>(null);
  const [aceitaPolitica, setAceitaPolitica] = useState(false);
  const [km, setKm] = useState(4);
  const [pickedPos, setPickedPos] = useState<[number,number]|null>(null);
  const [favorites, setFavorites] = useState<{label:string,lat:number,lon:number}[]>(()=>{
    try { return JSON.parse(localStorage.getItem("wicar_favs")||"[]"); } catch { return []; }
  });

  const partners = bundle?.partners||[];
  const services = bundle?.services||[];
  const vehicles = bundle?.vehicles||[];
  const addonsList = bundle?.addons||[];
  const partner = useMemo(()=> partners.find(p=>p.code===partnerCode)||null,[partnerCode,partners]);

  async function reverseGeocode(lat:number, lon:number){
    try{ const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`); const js=await r.json(); return js?.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;}catch{ return `${lat.toFixed(5)}, ${lon.toFixed(5)}`; }
  }
  async function routeKmEta(from:[number,number], to:[number,number]){ const url=`https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=false`; const r=await fetch(url); const js=await r.json(); if(!js.routes||!js.routes[0]) throw new Error('Rota indisponível'); const m=js.routes[0].distance; const s=js.routes[0].duration; return { km: +(m/1000).toFixed(1), etaMin: Math.round(s/60) }; }

  const calcKmHome = async()=>{ try{ const base = pickedPos || geo.pos; const ons=wicarristas.filter(w=>w.online); const near=ons.sort((a:any,b:any)=> haversineKm(base,a.pos)-haversineKm(base,b.pos))[0]||wicarristas[0]; const {km:kmR,etaMin}=await routeKmEta(base, near.pos); setKm(kmR); setTempoEstimado(etaBase()+Math.min(25,etaMin)); }catch{ const v=haversineKm(pickedPos||geo.pos, wicarristas[0].pos); setKm(Math.max(1, +v.toFixed(1))); } };
  const calcKmPartner = async()=>{ if(!partner) return alert("Escolha um parceiro"); try{ const base = pickedPos || geo.pos; const {km:kmR,etaMin}=await routeKmEta(base, [partner.lat, partner.lon] as any); setKm(kmR); setTempoEstimado(etaBase()+Math.min(25,etaMin)); }catch{ const v=haversineKm(pickedPos||geo.pos, [partner.lat, partner.lon] as any); setKm(Math.max(1, +v.toFixed(1))); } };

  const [status, setStatus] = useState('idle');
  const [pedido, setPedido] = useState<any|null>(null);
  const [pagamento, setPagamento] = useState<any|null>(null);

  const etaBase=()=>{ const svc:any=services.find(s=>s.code===service)||services[0]; const qtyFactor=qty>1?(qty-1)*Math.floor((svc?.minutes||60)/2):0; const load=surge>1?10:0; return ((svc?.minutes||60) + qtyFactor) + Math.min(25, Math.max(5, Math.round(km))) + load; };

  const calcular=(det:any)=>{
    const svc:any = services.find(s=>s.code===det.service) || services[0];
    const veh:any = vehicles.find(v=>v.code===det.vehicle) || vehicles[0];
    const adds = (det.addons||[]).map((id:string)=> addonsList.find(a=>a.code===id)?.price||0).reduce((a,b)=>a+b,0);
    let base = (veh?.base_price||0) + (svc?.base_price||0) - 49;
    if(base<0) base=svc?.base_price||0;

    const discounts=[0,0.10,0.15];
    const discountPerc=discounts[Math.min((det.qty||1)-1,2)];
    const subtotalSvc=Math.max(0, (base+adds) * (det.qty||1) * (1-discountPerc));

    const rules = bundle?.rules || { km_price:2.2, km_min:8, order_min:55, surge_zones:true };
    const deslocCalc = Math.max(rules.km_min, Math.round((det.km ?? km) * rules.km_price));

    let subtotal = Math.round(subtotalSvc * surge) + deslocCalc;
    if(det.partnerCode){ subtotal = Math.round((subtotal - deslocCalc) * 0.95) + deslocCalc; }
    subtotal = Math.max(rules.order_min, subtotal);
    const total = subtotal + (det.tip||0);
    return { total, desloc: deslocCalc, subtotal };
  };

  async function createCheckout(amount:number){ try{ const r=await fetch('/api/checkout',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ amount }) }); const js=await r.json(); if(js?.checkoutUrl) return js.checkoutUrl; throw new Error('Sem checkoutUrl'); } catch { return 'https://pagar.me/sandbox-checkout'; } }

  const iniciarPedido=async()=>{ if(!date||!time) return alert('Escolha data e hora'); if(!aceitaPolitica) return alert('Aceite a política'); const { total, desloc, subtotal } = calcular({ service, vehicle, km, partnerCode, qty, tip, addons }); const id='B'+Date.now().toString().slice(-6); const job:any={ id, service, vehicle, addons, qty, km, desloc, valorFinal: total, subtotal, tip, date, time, address, partnerCode, status:'buscando', wicarristaId: null, clientPos: pickedPos||geo.pos }; setPedido(job); setStatus('buscando'); setOpenJobs(j=>j+1); setBookings(b=>[job,...b]); setTempoEstimado(etaBase()); await rt?.emit({ type:'NEW_JOB', payload: job }); };

  useEffect(()=> rt?.connect((evt:any)=>{ if(evt?.type==='JOB_UPDATE' && pedido && evt.payload.id===pedido.id){ setStatus(evt.payload.status); setPedido((p:any)=>({...p,...evt.payload})); setBookings((list:any[])=> list.map((x:any)=> x.id===evt.payload.id?{...x,status:evt.payload.status}:x)); if(evt.payload.status==='encontrado'){ createCheckout(pedido?.valorFinal||0).then((url)=> setPagamento({ link:url, valor:pedido?.valorFinal||0 })); } if(evt.payload.status==='finalizado') setOpenJobs(j=>Math.max(0,j-1)); } }),[pedido]);

  const cancelar=()=>{ if(!pedido) return; let fee=0; if(['encontrado','a_caminho','lavando'].includes(status)) fee=Math.round((pedido.subtotal||0)*0.3); else fee=10; alert(`Cancelado. Taxa aplicada: ${BRL(fee)}`); setStatus('cancelado'); setPedido((p:any)=> p?{...p,status:'cancelado',cancelFee:fee}:p); setBookings((list:any[])=> list.map((x:any)=> x.id===pedido.id?{...x,status:'cancelado',cancelFee:fee}:x)); setOpenJobs(j=>Math.max(0,j-1)); };

  // Wicarrista checklists + timer
  const [myOnline, setMyOnline] = useState(false);
  const [myEarnings, setMyEarnings] = useState(0);
  const [myQueue, setMyQueue] = useState<any[]>([]);
  const checklist = (svcCode:string)=>{
    if(svcCode==="detail") return ["Tapetes","Aspiração","Painel","Bancos","Rodagem","Cera"];
    if(svcCode==="eco-plus") return ["Aspiração","Painel","Vidros","Cera"];
    return ["Aspiração","Painel","Vidros"];
  };
  const [timers, setTimers] = useState<Record<string, number>>({}); // seconds
  useEffect(()=>{
    const id = setInterval(()=>{
      setTimers((t)=>{
        const upd={...t};
        Object.keys(upd).forEach(k=> upd[k]+=1);
        return upd;
      });
    }, 1000);
    return ()=> clearInterval(id);
  },[]);

  useEffect(()=> rt?.connect((evt:any)=>{ if(userType!=='wicarrista' || !myOnline) return; if(evt?.type==='NEW_JOB') console.log('Novo job', evt.payload.id); }),[userType,myOnline]);

  const aceitarProximo=()=>{ if(!myOnline) return alert('Fique online para aceitar'); if(!pedido || status!=='buscando') return alert('Nenhum pedido na fila agora'); const upd={...pedido,status:'encontrado',wicarristaId:'w1'}; setMyQueue(q=>[upd,...q]); rt?.emit({ type:'JOB_UPDATE', payload:{ id:upd.id, status:'encontrado', wicarristaId:upd.wicarristaId } }); setTimers((t)=>({...t,[upd.id]:0})); };
  const avancarEtapa=(job:any)=>{ const next=job.status==='encontrado'?'a_caminho':job.status==='a_caminho'?'lavando':'finalizado'; const payload={ id:job.id, status:next }; if(next==='finalizado') setMyEarnings(e=> e + Math.round((job.valorFinal||0)*0.7)); setMyQueue(q=> q.map((j:any)=> j.id===job.id?{...j,status:next}:j)); rt?.emit({ type:'JOB_UPDATE', payload }); };

  if(userType==='admin'){
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Admin — Configuração (Supabase + JSON)</h1>
        <AdminPanelPro onSave={(cfg)=>{ setBundle(cfg); localStorage.setItem("wicar_bundle", JSON.stringify(cfg)); }} />
      </div>
    );
  }

  if(!bundle && userType!=='admin'){
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button onClick={()=> setUserType('cliente')}>Sou Cliente</Button>
          <Button onClick={()=> setUserType('wicarrista')}>Sou Wicarrista</Button>
          <Button onClick={()=> setUserType('operacoes')}>Painel Operacional</Button>
          <Button variant="outline" onClick={()=> setUserType('admin')}>Admin</Button>
        </div>
        <div className="text-sm text-gray-600">Abra <strong>Admin</strong> e clique <strong>Salvar</strong> para inicializar as configurações.</div>
      </div>
    );
  }

  const calc = calcular({ service, vehicle, km, partnerCode, qty, tip, addons });

  return (
    <div className="min-h-screen p-2 md:p-4 space-y-6">
      {!userType && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={()=> setUserType('cliente')}>Sou Cliente</Button>
          <Button onClick={()=> setUserType('wicarrista')}>Sou Wicarrista</Button>
          <Button onClick={()=> setUserType('operacoes')}>Painel Operacional</Button>
          <Button variant="outline" onClick={()=> setUserType('admin')}>Admin</Button>
        </div>
      )}

      {userType==='cliente' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Solicitar Lavagem</h1>
          <Map userType={userType} pickMode onPick={async(lat,lon)=>{
            setPickedPos([lat,lon]);
            const addr = await reverseGeocode(lat,lon);
            setAddress(addr);
          }}/>

          <div className="grid md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-gray-600">Serviço</label>
              <select className="border rounded px-2 py-2 w-full" value={service} onChange={e=>setService(e.target.value)}>
                {services.map(s=> <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Tipo de veículo</label>
              <select className="border rounded px-2 py-2 w-full" value={vehicle} onChange={e=>setVehicle(e.target.value)}>
                {vehicles.map(v=> <option key={v.code} value={v.code}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Add-ons</label>
              <div className="flex flex-col gap-1 text-sm">
                {addonsList.map(a=> (
                  <label key={a.code} className="inline-flex items-center gap-2"><input type="checkbox" checked={addons.includes(a.code)} onChange={(e)=> setAddons((prev)=> e.target.checked? [...prev, a.code] : prev.filter(x=>x!==a.code)) }/> {a.label} (+{BRL(a.price)})</label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Qtd. Veículos</label>
              <select className="border rounded px-2 py-2 w-full" value={qty} onChange={e=>setQty(parseInt(e.target.value))}>
                {[1,2,3].map(q=> <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Ponto parceiro (opcional)</label>
              <select className="border rounded px-2 py-2 w-full" value={partnerCode} onChange={e=>setPartnerCode(e.target.value)}>
                <option value="">—</option>
                {partners.map(p=> <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Button variant="outline" onClick={calcKmHome}>Calcular (em casa)</Button>
                <Button variant="outline" onClick={calcKmPartner}>Calcular (no parceiro)</Button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600">Data</label>
              <input type="date" className="border rounded px-2 py-2 w-full" value={date} onChange={e=>setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Hora</label>
              <input type="time" step={900} className="border rounded px-2 py-2 w-full" value={time} onChange={e=>setTime(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Endereço</label>
              <AddressPicker value={address} onChange={setAddress} onSelectCoords={(lat,lon)=> setPickedPos([lat,lon])} favorites={favorites} onAddFavorite={(f)=>{
                const arr=[...favorites,f]; setFavorites(arr); localStorage.setItem("wicar_favs", JSON.stringify(arr));
              }}/>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-2">
            <div className="px-3 py-2 border rounded bg-white text-sm">KM: {km} km</div>
            <div className="px-3 py-2 border rounded bg-white text-sm">Surge: {surge.toFixed(2)}x</div>
            <div className="px-3 py-2 border rounded bg-white text-sm">Pedido mín.: {BRL(bundle?.rules.order_min||55)}</div>
            <div className="px-3 py-2 border rounded bg-white text-sm flex items-center gap-2">Gorjeta:
              <select className="border rounded px-2 py-1" value={tip} onChange={e=>setTip(parseInt(e.target.value))}>
                {[0,5,10,20].map(v=> <option key={v} value={v}>{BRL(v)}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-3 space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Estimativa</div>
                <div className="text-gray-500 text-xs">{services.find(s=>s.code===service)?.name} • {vehicles.find(v=>v.code===vehicle)?.label} • Qtd: {qty} • ETA ~ {tempoEstimado || (services.find(s=>s.code===service)?.minutes || 60)} min</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-xl font-semibold">{BRL(calc.total)}</div>
                {tip>0 && <div className="text-xs text-gray-500">Inclui gorjeta {BRL(tip)}</div>}
              </div>
            </div>
            <div className="text-xs text-gray-500">Surge: {surge.toFixed(2)}x • Desloc.: {BRL(calc.desloc)} {partnerCode && <>• Parceiro: -5% serviço</>}</div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input id="policy" type="checkbox" checked={aceitaPolitica} onChange={e=>setAceitaPolitica(e.target.checked)} />
            <label htmlFor="policy">Aceito a <span className="underline">política de cancelamento</span>.</label>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button className="flex-1" onClick={iniciarPedido}>Confirmar Pedido</Button>
            {status!=='idle' && <span className="px-3 py-2 rounded bg-white border text-sm">Status: {status}{tempoEstimado?` • ETA ${tempoEstimado} min`:''}</span>}
            {pagamento && <a className="px-3 py-2 rounded bg-emerald-600 text-white" href={pagamento.link} target="_blank">Pagar {BRL(pagamento.valor)}</a>}
            {pedido && <Button variant="outline" onClick={cancelar}>Cancelar</Button>}
            {pedido && <Button variant="outline" onClick={()=>{
              const svcName=services.find(s=>s.code===pedido.service)?.name;
              const vehName=vehicles.find(v=>v.code===pedido.vehicle)?.label;
              const txt=`Wicar — Recibo\nPedido: ${pedido.id}\nServiço: ${svcName}\nVeículo: ${vehName}\nData/Hora: ${pedido.date} ${pedido.time}\nEndereço: ${pedido.address||'—'}\nQtd: ${pedido.qty}\nGorjeta: ${BRL(pedido.tip||0)}\nDeslocamento: ${BRL(pedido.desloc)}\nParceiro: ${pedido.partnerCode||'—'}\nTotal: ${BRL(pedido.valorFinal)}\nStatus: ${status}\n`; download('recibo-wicar.txt', txt);
            }}>Baixar Recibo</Button>}
          </div>
        </div>
      )}

      {userType==='wicarrista' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Painel do Wicarrista</h1>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={myOnline} onChange={e=>setMyOnline(e.target.checked)} /> Online</label>
            <div className="text-sm">Ganhos: <strong>{BRL(myEarnings)}</strong></div>
          </div>
          <Map userType={userType} />
          <div className="flex gap-2">
            <Button onClick={aceitarProximo}>Aceitar próximo pedido</Button>
          </div>
          <div>
            <div className="text-sm font-medium mt-2 mb-1">Meus trabalhos</div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {myQueue.map((job)=> (
                <div key={job.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between"><div className="font-medium text-sm">{job.id} • {services.find(s=>s.code===job.service)?.name}</div><span className="text-xs border rounded px-2 py-0.5">{job.status}</span></div>
                  <div className="text-xs text-gray-600 mt-1">{job.date} {job.time} • {job.km} km • Total {BRL(job.valorFinal)}</div>
                  <div className="text-xs text-gray-600">Tempo decorrido: {Math.floor((timers[job.id]||0)/60)}m {(timers[job.id]||0)%60}s</div>
                  <div className="mt-2">
                    <div className="text-xs font-medium mb-1">Checklist</div>
                    <div className="flex flex-wrap gap-2">
                      {checklist(job.service).map((item:string,idx:number)=> (
                        <label key={idx} className="inline-flex items-center gap-2 text-xs rounded border px-2 py-1">
                          <input type="checkbox" />
                          {item}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {['encontrado','a_caminho','lavando'].includes(job.status) && <Button size="sm" onClick={()=>avancarEtapa(job)}>Avançar etapa</Button>}
                  </div>
                </div>
              ))}
              {myQueue.length===0 && <div className="text-xs text-gray-500">Nenhum trabalho atribuído ainda.</div>}
            </div>
          </div>
        </div>
      )}

      {userType==='operacoes' && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Painel Operacional</h1>
          <Map userType={userType} />
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Pedidos em aberto" value={openJobs} />
            <Stat label="Surge" value={`${surge.toFixed(2)}x`} />
            <Stat label="Wicarristas online" value={wicarristas.filter(w=>w.online).length} />
          </div>

          <div className="rounded-xl border p-3">
            <div className="text-sm font-medium mb-2">Filtros</div>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <select className="border rounded px-2 py-1"><option>Todos parceiros</option>{partners.map(p=> <option key={p.code}>{p.name}</option>)}</select>
              <select className="border rounded px-2 py-1"><option>Todos serviços</option>{services.map(s=> <option key={s.code}>{s.name}</option>)}</select>
              <input className="border rounded px-2 py-1" placeholder="De (aaaa-mm-dd)" />
              <input className="border rounded px-2 py-1" placeholder="Até (aaaa-mm-dd)" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>{
              const header='id,data,hora,servico,veiculo,preco,status\n';
              const body=bookings.map(b=> `${b.id},${b.date},${b.time},${b.service}+${b.vehicle},${b.valorFinal},${b.status}`).join('\n');
              download('wicar-pedidos.csv', header+body, 'text/csv');
            }}>Exportar CSV (pedidos)</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }:{label:string, value:any}){
  return (<div className="rounded-2xl border p-3"><div className="text-xs text-gray-500">{label}</div><div className="text-base font-semibold">{value}</div></div>);
}
