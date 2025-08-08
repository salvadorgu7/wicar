
"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Vehicle = { id:string; label:string; base:number };
type Service = { id:string; name:string; base:number; minutes:number };
type Addon = { id:string; label:string; price:number; minutes:number };
type Partner = { id:string; name:string; address:string; pos:[number,number] };

export type WicarConfig = {
  kmPrice: number;
  kmMin: number;
  orderMin: number;
  surgeZonesEnabled: boolean;
  services: Service[];
  vehicles: Vehicle[];
  addons: Addon[];
  partners: Partner[];
};

const DEFAULTS: WicarConfig = {
  kmPrice: 2.2,
  kmMin: 8,
  orderMin: 55,
  surgeZonesEnabled: true,
  services: [
    { id:"eco-basic", name:"Ecológica Básica", base:49, minutes:45 },
    { id:"eco-plus",  name:"Ecológica + Cera", base:79, minutes:60 },
    { id:"detail",    name:"Detailing Leve",  base:149, minutes:90 },
  ],
  vehicles: [
    { id:"hatch",   label:"Hatch",   base:70 },
    { id:"sedan",   label:"Sedan",   base:75 },
    { id:"suv",     label:"SUV",     base:85 },
    { id:"crossover", label:"Crossover", base:75 },
    { id:"minivan", label:"Minivan", base:75 },
    { id:"wagon",   label:"Station Wagon", base:80 },
    { id:"cupe",    label:"Cupê",    base:75 },
    { id:"sport",   label:"Esportivo", base:150 },
    { id:"pickup",  label:"Picape",  base:85 },
    { id:"furgao",  label:"Furgão",  base:95 },
  ],
  addons: [
    { id:"interior", label:"Higienização interna", price:39, minutes:20 },
    { id:"odor",     label:"Odorizador premium",   price:12, minutes:0 },
  ],
  partners: [
    { id:"hospital", name:"Hospital Metropolitano", address:"Av. Cardoso, 1234", pos:[-19.888,-43.963] },
    { id:"plaza",    name:"The Plaza", address:"R. da Bahia, 4500", pos:[-19.931,-43.936] },
    { id:"atlanta",  name:"Atlanta Parking", address:"Av. dos Andradas, 2200", pos:[-19.949,-43.915] },
  ]
};

export default function AdminPanel({ onSave }:{ onSave:(cfg: WicarConfig)=>void }){
  const [cfg, setCfg] = useState<WicarConfig>(DEFAULTS);
  const [jsonTxt, setJsonTxt] = useState("");

  useEffect(()=>{
    const saved = localStorage.getItem("wicar_config");
    if(saved){ try{ setCfg(JSON.parse(saved)); }catch{} }
  },[]);

  const save = ()=>{
    localStorage.setItem("wicar_config", JSON.stringify(cfg));
    onSave(cfg);
    alert("Config salva!");
  };

  const addVehicle = ()=> setCfg(c=> ({...c, vehicles: [...c.vehicles, { id: "novo-"+Date.now(), label:"Novo", base:0 }]}));
  const addService = ()=> setCfg(c=> ({...c, services: [...c.services, { id: "svc-"+Date.now(), name:"Novo Serviço", base:0, minutes:60 }]}));
  const addAddon = ()=> setCfg(c=> ({...c, addons: [...c.addons, { id: "add-"+Date.now(), label:"Novo Add-on", price:0, minutes:0 }]}));
  const addPartner = ()=> setCfg(c=> ({...c, partners: [...c.partners, { id:"par-"+Date.now(), name:"Novo Parceiro", address:"", pos:[-19.9167,-43.9345]}]}));

  const removeAt = (arr:any[], i:number)=> arr.filter((_,idx)=> idx!==i);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-3">
          <div className="text-sm font-medium mb-2">Regras Gerais</div>
          <label className="block text-xs">R$/km</label>
          <input className="border rounded px-2 py-1 w-full mb-2" type="number" step="0.1" value={cfg.kmPrice} onChange={e=>setCfg({...cfg, kmPrice: parseFloat(e.target.value)})} />
          <label className="block text-xs">Deslocamento mínimo</label>
          <input className="border rounded px-2 py-1 w-full mb-2" type="number" value={cfg.kmMin} onChange={e=>setCfg({...cfg, kmMin: parseFloat(e.target.value)})} />
          <label className="block text-xs">Pedido mínimo</label>
          <input className="border rounded px-2 py-1 w-full mb-2" type="number" value={cfg.orderMin} onChange={e=>setCfg({...cfg, orderMin: parseFloat(e.target.value)})} />
          <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={cfg.surgeZonesEnabled} onChange={e=>setCfg({...cfg, surgeZonesEnabled: e.target.checked})}/> Surge por zona</label>
        </div>

        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Tipos de Veículo</div>
            <Button size="sm" onClick={addVehicle}>Adicionar</Button>
          </div>
          <div className="space-y-2 max-h-56 overflow-auto">
            {cfg.vehicles.map((v, i)=> (
              <div key={i} className="grid grid-cols-3 gap-2 items-center text-sm">
                <input className="border rounded px-2 py-1" value={v.label} onChange={e=>{
                  const arr=[...cfg.vehicles]; arr[i]={...v, label:e.target.value}; setCfg({...cfg, vehicles: arr});
                }}/>
                <input className="border rounded px-2 py-1" type="number" value={v.base} onChange={e=>{
                  const arr=[...cfg.vehicles]; arr[i]={...v, base: parseFloat(e.target.value)}; setCfg({...cfg, vehicles: arr});
                }}/>
                <Button size="sm" variant="outline" onClick={()=> setCfg({...cfg, vehicles: removeAt(cfg.vehicles,i)})}>Remover</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Serviços</div>
            <Button size="sm" onClick={addService}>Adicionar</Button>
          </div>
          <div className="space-y-2 max-h-56 overflow-auto">
            {cfg.services.map((s, i)=> (
              <div key={i} className="grid grid-cols-4 gap-2 items-center text-sm">
                <input className="border rounded px-2 py-1 col-span-2" value={s.name} onChange={e=>{
                  const arr=[...cfg.services]; arr[i]={...s, name:e.target.value}; setCfg({...cfg, services: arr});
                }}/>
                <input className="border rounded px-2 py-1" type="number" value={s.base} onChange={e=>{
                  const arr=[...cfg.services]; arr[i]={...s, base: parseFloat(e.target.value)}; setCfg({...cfg, services: arr});
                }}/>
                <input className="border rounded px-2 py-1" type="number" value={s.minutes} onChange={e=>{
                  const arr=[...cfg.services]; arr[i]={...s, minutes: parseInt(e.target.value)}; setCfg({...cfg, services: arr});
                }}/>
                <Button size="sm" variant="outline" onClick={()=> setCfg({...cfg, services: removeAt(cfg.services,i)})}>Remover</Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Add-ons</div>
            <Button size="sm" onClick={addAddon}>Adicionar</Button>
          </div>
          <div className="space-y-2 max-h-56 overflow-auto">
            {cfg.addons.map((a, i)=> (
              <div key={i} className="grid grid-cols-4 gap-2 items-center text-sm">
                <input className="border rounded px-2 py-1 col-span-2" value={a.label} onChange={e=>{
                  const arr=[...cfg.addons]; arr[i]={...a, label:e.target.value}; setCfg({...cfg, addons: arr});
                }}/>
                <input className="border rounded px-2 py-1" type="number" value={a.price} onChange={e=>{
                  const arr=[...cfg.addons]; arr[i]={...a, price: parseFloat(e.target.value)}; setCfg({...cfg, addons: arr});
                }}/>
                <input className="border rounded px-2 py-1" type="number" value={a.minutes} onChange={e=>{
                  const arr=[...cfg.addons]; arr[i]={...a, minutes: parseInt(e.target.value)}; setCfg({...cfg, addons: arr});
                }}/>
                <Button size="sm" variant="outline" onClick={()=> setCfg({...cfg, addons: removeAt(cfg.addons,i)})}>Remover</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Parceiros</div>
            <Button size="sm" onClick={addPartner}>Adicionar</Button>
          </div>
          <div className="space-y-2 max-h-56 overflow-auto">
            {cfg.partners.map((p, i)=> (
              <div key={i} className="grid grid-cols-5 gap-2 items-center text-sm">
                <input className="border rounded px-2 py-1" value={p.name} onChange={e=>{
                  const arr=[...cfg.partners]; arr[i]={...p, name:e.target.value}; setCfg({...cfg, partners: arr});
                }}/>
                <input className="border rounded px-2 py-1 col-span-2" value={p.address} onChange={e=>{
                  const arr=[...cfg.partners]; arr[i]={...p, address:e.target.value}; setCfg({...cfg, partners: arr});
                }}/>
                <input className="border rounded px-2 py-1" value={p.pos[0]} onChange={e=>{
                  const arr=[...cfg.partners]; arr[i]={...p, pos:[parseFloat(e.target.value), p.pos[1]] as any}; setCfg({...cfg, partners: arr});
                }}/>
                <input className="border rounded px-2 py-1" value={p.pos[1]} onChange={e=>{
                  const arr=[...cfg.partners]; arr[i]={...p, pos:[p.pos[0], parseFloat(e.target.value)] as any}; setCfg({...cfg, partners: arr});
                }}/>
                <Button size="sm" variant="outline" onClick={()=> setCfg({...cfg, partners: removeAt(cfg.partners,i)})}>Remover</Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={save}>Salvar</Button>
        <Button variant="outline" onClick={()=>{ setJsonTxt(JSON.stringify(cfg, null, 2)); }}>Exportar JSON</Button>
        <Button variant="outline" onClick={()=>{
          try { const obj=JSON.parse(jsonTxt); setCfg(obj); alert("JSON carregado na tela (clique Salvar)"); } catch { alert("JSON inválido"); }
        }}>Importar do campo</Button>
      </div>
      <textarea className="border rounded w-full p-2 text-xs" rows={8} placeholder="Cole aqui para importar ou copie para exportar" value={jsonTxt} onChange={(e)=>setJsonTxt(e.target.value)} />
    </div>
  );
}
