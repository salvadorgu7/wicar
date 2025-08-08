
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase, hasSupabase } from "@/lib/supabase";

export type Vehicle = { id?:string; code:string; label:string; base_price:number };
export type Service = { id?:string; code:string; name:string; base_price:number; minutes:number };
export type Addon = { id?:string; code:string; label:string; price:number; minutes:number };
export type Partner = { id?:string; code:string; name:string; address:string; lat:number; lon:number; discount_service:number; active:boolean };
export type Rules = { km_price:number; km_min:number; order_min:number; surge_zones:boolean; coverage_geojson?:any };

export type ConfigBundle = { rules:Rules; vehicles:Vehicle[]; services:Service[]; addons:Addon[]; partners:Partner[] };

const DEFAULT: ConfigBundle = {
  rules: { km_price:2.2, km_min:8, order_min:55, surge_zones:true },
  vehicles: [
    { code:"hatch", label:"Hatch", base_price:70 },
    { code:"sedan", label:"Sedan", base_price:75 },
    { code:"suv", label:"SUV", base_price:85 },
    { code:"crossover", label:"Crossover", base_price:75 },
    { code:"minivan", label:"Minivan", base_price:75 },
    { code:"wagon", label:"Station Wagon", base_price:80 },
    { code:"cupe", label:"Cupê", base_price:75 },
    { code:"sport", label:"Esportivo", base_price:150 },
    { code:"pickup", label:"Picape", base_price:85 },
    { code:"furgao", label:"Furgão", base_price:95 },
  ],
  services: [
    { code:"eco-basic", name:"Ecológica Básica", base_price:49, minutes:45 },
    { code:"eco-plus",  name:"Ecológica + Cera", base_price:79, minutes:60 },
    { code:"detail",    name:"Detailing Leve",  base_price:149, minutes:90 },
  ],
  addons: [
    { code:"interior", label:"Higienização interna", price:39, minutes:20 },
    { code:"odor",     label:"Odorizador premium",   price:12, minutes:0  },
  ],
  partners: [
    { code:"hospital", name:"Hospital Metropolitano", address:"Av. Cardoso, 1234", lat:-19.888, lon:-43.963, discount_service:0.05, active:true },
    { code:"plaza",    name:"The Plaza", address:"R. da Bahia, 4500", lat:-19.931, lon:-43.936, discount_service:0.05, active:true },
    { code:"atlanta",  name:"Atlanta Parking", address:"Av. dos Andradas, 2200", lat:-19.949, lon:-43.915, discount_service:0.05, active:true },
  ]
};

async function upsert(table:string, rows:any[]){
  if(!hasSupabase || !supabase) return;
  for(const r of rows){
    await supabase.from(table).upsert(r, { onConflict: "code" });
  }
}

async function fetchTable(table:string){
  if(!hasSupabase || !supabase) return { data:null };
  return await supabase.from(table).select("*").order("code");
}

export default function AdminPanelPro({ onSave }:{ onSave:(cfg:ConfigBundle)=>void }){
  const [cfg, setCfg] = useState<ConfigBundle>(DEFAULT);
  const [jsonTxt, setJsonTxt] = useState("");

  useEffect(()=>{
    const boot = async()=>{
      if(hasSupabase && supabase){
        const [veh, svc, add, par, rules] = await Promise.all([
          fetchTable("vehicle_types"), fetchTable("services"), fetchTable("addons"), fetchTable("partners"),
          supabase.from("configs").select("*").eq("key","rules").single()
        ]);
        const bundle: ConfigBundle = {
          rules: (rules.data?.value) || DEFAULT.rules,
          vehicles: veh.data || DEFAULT.vehicles,
          services: svc.data || DEFAULT.services,
          addons: add.data || DEFAULT.addons,
          partners: par.data || DEFAULT.partners
        };
        setCfg(bundle);
      } else {
        // local fallback
        const saved = localStorage.getItem("wicar_bundle");
        setCfg(saved? JSON.parse(saved) : DEFAULT);
      }
    };
    boot();
  },[]);

  const save = async()=>{
    if(hasSupabase && supabase){
      await supabase.from("configs").upsert({ key:"rules", value: cfg.rules });
      await upsert("vehicle_types", cfg.vehicles);
      await upsert("services", cfg.services);
      await upsert("addons", cfg.addons);
      await upsert("partners", cfg.partners);
    } else {
      localStorage.setItem("wicar_bundle", JSON.stringify(cfg));
    }
    onSave(cfg); alert("Config salva!");
  };

  const simulate = (vehicle:string, service:string, km:number, qty:number, partner:boolean, addons:string[])=>{
    const veh = cfg.vehicles.find(v=>v.code===vehicle);
    const svc = cfg.services.find(s=>s.code===service);
    const adds = (addons||[]).map(a=> cfg.addons.find(x=>x.code===a)?.price||0).reduce((a,b)=>a+b,0);
    const base = (veh?.base_price||0) + (svc?.base_price||0) - 49;
    const discounts = [0,0.10,0.15];
    const discountPerc = discounts[Math.min((qty||1)-1, 2)];
    const subtotalSvc = Math.max(0, (base + adds) * (qty||1) * (1-discountPerc));
    const desloc = Math.max(cfg.rules.km_min, Math.round((km||0)*cfg.rules.km_price));
    let subtotal = subtotalSvc + desloc;
    if (partner) subtotal = Math.round((subtotal - desloc) * 0.95) + desloc;
    const total = Math.max(cfg.rules.order_min, subtotal);
    return { base, adds, subtotalSvc, desloc, total };
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600">Banco: {hasSupabase? "Supabase conectado" : "Local (sem Supabase)"}</div>

      <div className="rounded-xl border p-3">
        <div className="text-sm font-medium mb-2">Regras Gerais</div>
        <div className="grid grid-cols-4 gap-2 text-sm">
          <label className="flex flex-col">R$/km<input className="border rounded px-2 py-1" type="number" step="0.1" value={cfg.rules.km_price} onChange={e=>setCfg({...cfg, rules:{...cfg.rules, km_price:parseFloat(e.target.value)}})}/></label>
          <label className="flex flex-col">Desloc. mín.<input className="border rounded px-2 py-1" type="number" value={cfg.rules.km_min} onChange={e=>setCfg({...cfg, rules:{...cfg.rules, km_min:parseFloat(e.target.value)}})}/></label>
          <label className="flex flex-col">Pedido mín.<input className="border rounded px-2 py-1" type="number" value={cfg.rules.order_min} onChange={e=>setCfg({...cfg, rules:{...cfg.rules, order_min:parseFloat(e.target.value)}})}/></label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={cfg.rules.surge_zones} onChange={e=>setCfg({...cfg, rules:{...cfg.rules, surge_zones:e.target.checked}})}/> Surge por zona</label>
        </div>
      </div>

      <Section title="Veículos" rows={cfg.vehicles} onAdd={()=> setCfg({...cfg, vehicles:[...cfg.vehicles, { code:"novo-"+Date.now(), label:"Novo", base_price:0 }]})} onRemove={(i)=> setCfg({...cfg, vehicles: cfg.vehicles.filter((_,idx)=>idx!==i)})} onChange={(i,key,val)=>{
        const arr=[...cfg.vehicles]; (arr as any)[i][key]=val; setCfg({...cfg, vehicles:arr});
      }} fields={[["label","text"],["base_price","number"],["code","text"]]} />

      <Section title="Serviços" rows={cfg.services} onAdd={()=> setCfg({...cfg, services:[...cfg.services, { code:"svc-"+Date.now(), name:"Novo", base_price:0, minutes:60 }]})} onRemove={(i)=> setCfg({...cfg, services: cfg.services.filter((_,idx)=>idx!==i)})} onChange={(i,key,val)=>{
        const arr=[...cfg.services]; (arr as any)[i][key]=val; setCfg({...cfg, services:arr});
      }} fields={[["name","text"],["base_price","number"],["minutes","number"],["code","text"]]} />

      <Section title="Add-ons" rows={cfg.addons} onAdd={()=> setCfg({...cfg, addons:[...cfg.addons, { code:"add-"+Date.now(), label:"Novo", price:0, minutes:0 }]})} onRemove={(i)=> setCfg({...cfg, addons: cfg.addons.filter((_,idx)=>idx!==i)})} onChange={(i,key,val)=>{
        const arr=[...cfg.addons]; (arr as any)[i][key]=val; setCfg({...cfg, addons:arr});
      }} fields={[["label","text"],["price","number"],["minutes","number"],["code","text"]]} />

      <Section title="Parceiros" rows={cfg.partners} onAdd={()=> setCfg({...cfg, partners:[...cfg.partners, { code:"par-"+Date.now(), name:"Novo", address:"", lat:-19.9167, lon:-43.9345, discount_service:0.05, active:true }]})} onRemove={(i)=> setCfg({...cfg, partners: cfg.partners.filter((_,idx)=>idx!==i)})} onChange={(i,key,val)=>{
        const arr=[...cfg.partners]; (arr as any)[i][key]=val; setCfg({...cfg, partners:arr});
      }} fields={[["name","text"],["address","text"],["lat","number"],["lon","number"],["discount_service","number"],["active","checkbox"],["code","text"]]} />

      <div className="rounded-xl border p-3 space-y-2">
        <div className="text-sm font-medium">Simulador de Preço</div>
        <Simulator cfg={cfg} />
      </div>

      <div className="flex gap-2">
        <Button onClick={save}>Salvar</Button>
        <Button variant="outline" onClick={()=> setJsonTxt(JSON.stringify(cfg,null,2))}>Exportar JSON</Button>
        <Button variant="outline" onClick={()=>{ try{const obj=JSON.parse(jsonTxt); setCfg(obj);}catch{alert("JSON inválido")}}}>Importar JSON</Button>
      </div>
      <textarea className="border rounded w-full p-2 text-xs" rows={8} value={jsonTxt} onChange={e=>setJsonTxt(e.target.value)} placeholder="Cole/Edite o JSON aqui" />
    </div>
  );
}

function Section({title, rows, onAdd, onRemove, onChange, fields}:{title:string; rows:any[]; onAdd:()=>void; onRemove:(i:number)=>void; onChange:(i:number,key:string,val:any)=>void; fields:[string,string][]}){
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">{title}</div>
        <Button size="sm" onClick={onAdd}>Adicionar</Button>
      </div>
      <div className="space-y-2 max-h-64 overflow-auto">
        {rows.map((r, i)=> (
          <div key={i} className="grid md:grid-cols-7 gap-2 items-center text-sm">
            {fields.map(([k,t])=> (
              t==="checkbox" ?
              <label key={k} className="inline-flex items-center gap-2"><input type="checkbox" checked={!!r[k]} onChange={e=>onChange(i,k,e.target.checked)} /> {k}</label>
              :
              <input key={k} className="border rounded px-2 py-1" value={r[k]} type={t} onChange={e=>onChange(i,k, t==="number"? parseFloat(e.target.value): e.target.value)} />
            ))}
            <Button size="sm" variant="outline" onClick={()=>onRemove(i)}>Remover</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Simulator({ cfg }:{ cfg: ConfigBundle }){
  const [vehicle, setVehicle] = useState(cfg.vehicles[0]?.code||"");
  const [service, setService] = useState(cfg.services[0]?.code||"");
  const [km, setKm] = useState(5);
  const [qty, setQty] = useState(1);
  const [partner, setPartner] = useState(false);
  const [adds, setAdds] = useState<string[]>([]);

  const result = useMemo(()=>{
    const veh = cfg.vehicles.find(v=>v.code===vehicle);
    const svc = cfg.services.find(s=>s.code===service);
    const addSum = (adds||[]).map(a=> cfg.addons.find(x=>x.code===a)?.price||0).reduce((a,b)=>a+b,0);
    const base = (veh?.base_price||0) + (svc?.base_price||0) - 49;
    const discounts = [0,0.10,0.15];
    const discountPerc = discounts[Math.min((qty||1)-1, 2)];
    const subtotalSvc = Math.max(0, (base + addSum) * (qty||1) * (1-discountPerc));
    const desloc = Math.max(cfg.rules.km_min, Math.round((km||0)*cfg.rules.km_price));
    let subtotal = subtotalSvc + desloc;
    if (partner) subtotal = Math.round((subtotal - desloc) * 0.95) + desloc;
    const total = Math.max(cfg.rules.order_min, subtotal);
    return { base, addSum, subtotalSvc, desloc, total };
  }, [cfg, vehicle, service, km, qty, partner, adds]);

  return (
    <div className="grid md:grid-cols-6 gap-2 items-end text-sm">
      <select className="border rounded px-2 py-2" value={vehicle} onChange={e=>setVehicle(e.target.value)}>
        {cfg.vehicles.map(v=> <option key={v.code} value={v.code}>{v.label}</option>)}
      </select>
      <select className="border rounded px-2 py-2" value={service} onChange={e=>setService(e.target.value)}>
        {cfg.services.map(s=> <option key={s.code} value={s.code}>{s.name}</option>)}
      </select>
      <input className="border rounded px-2 py-2" type="number" value={km} onChange={e=>setKm(parseFloat(e.target.value))} placeholder="Km" />
      <select className="border rounded px-2 py-2" value={qty} onChange={e=>setQty(parseInt(e.target.value))}>
        {[1,2,3].map(q=> <option key={q} value={q}>{q} veículo(s)</option>)}
      </select>
      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={partner} onChange={e=>setPartner(e.target.checked)} /> No parceiro</label>
      <div className="flex gap-2 flex-wrap">
        {cfg.addons.map(a=> (
          <label key={a.code} className="inline-flex items-center gap-2"><input type="checkbox" checked={adds.includes(a.code)} onChange={(e)=> setAdds(v=> e.target.checked? [...v,a.code] : v.filter(x=>x!==a.code)) }/> {a.label}</label>
        ))}
      </div>
      <div className="col-span-full text-xs text-gray-600">Total estimado: <strong>R$ {result.total.toFixed(2)}</strong> • (base {result.base} + add-ons {result.addSum} + desloc {result.desloc})</div>
    </div>
  );
}
