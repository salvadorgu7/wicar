
"use client";
import React, { useEffect, useRef, useState } from "react";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

type Suggestion = { label:string; lat:number; lon:number };

export default function AddressPicker({ value, onChange, onSelectCoords, favorites=[], onAddFavorite }:{
  value:string; onChange:(v:string)=>void; onSelectCoords:(lat:number, lon:number)=>void;
  favorites?: { label:string, lat:number, lon:number }[];
  onAddFavorite?: (fav:{label:string,lat:number,lon:number})=>void;
}){
  const [q, setQ] = useState(value||"");
  const [list, setList] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<any>(null);

  useEffect(()=> setQ(value||""), [value]);

  const searchNominatim = async(term:string)=>{
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&limit=5`);
    const js = await r.json();
    return (js||[]).map((x:any)=> ({ label:x.display_name, lat:parseFloat(x.lat), lon:parseFloat(x.lon) }));
  };

  const search = async(term:string)=>{
    if(!term || term.length<3){ setList([]); return; }
    try{
      if(GOOGLE_KEY){
        // lightweight Places Text Search via proxy-free URL is not allowed; keep Nominatim as default
        const alt = await searchNominatim(term);
        setList(alt);
      } else {
        const alt = await searchNominatim(term);
        setList(alt);
      }
    }catch{ setList([]); }
  };

  const onInput=(v:string)=>{
    setQ(v); onChange(v); setOpen(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(()=> search(v), 350);
  };

  return (
    <div className="relative">
      <input className="border rounded px-2 py-2 w-full" placeholder="Rua, número, bairro"
        value={q} onChange={(e)=> onInput(e.target.value)} onFocus={()=>setOpen(true)} />
      {open && (list.length>0 || favorites.length>0) && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border bg-white shadow max-h-64 overflow-auto">
          {favorites.length>0 && <div className="px-3 py-1 text-[11px] text-gray-500">Favoritos</div>}
          {favorites.map((f,i)=> (
            <button key={"fav"+i} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
              onClick={()=>{ setOpen(false); setQ(f.label); onChange(f.label); onSelectCoords(f.lat, f.lon); }}>{f.label}</button>
          ))}
          {list.length>0 && <div className="px-3 py-1 text-[11px] text-gray-500">Sugestões</div>}
          {list.map((s,i)=> (
            <button key={i} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
              onClick={()=>{ setOpen(false); setQ(s.label); onChange(s.label); onSelectCoords(s.lat, s.lon); }}>{s.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
