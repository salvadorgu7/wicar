
"use client";
import { Map as PigeonMap, Marker } from "pigeon-maps";
import React, { useState } from "react";

export default function Map({ userType, pickMode=false, onPick }:{ userType: string | null, pickMode?: boolean, onPick?:(lat:number, lon:number)=>void }) {
  const center: [number, number] = [-19.9167, -43.9345]; // BH
  const [pin, setPin] = useState<[number, number] | null>(null);

  return (
    <div className="rounded-2xl overflow-hidden border bg-white">
      <PigeonMap height={260} defaultCenter={center} defaultZoom={13} onClick={(e)=>{
        if(!pickMode) return;
        const { latLng } = e; const [lat, lon] = latLng as [number, number];
        setPin([lat, lon]); onPick?.(lat, lon);
      }}>
        <Marker width={40} anchor={pin || center} />
      </PigeonMap>
      <div className="p-2 text-[11px] text-gray-500">
        {pickMode? "Clique no mapa para escolher o local.": "Mapa ilustrativo. Rotas/geo reais requerem internet."}
      </div>
    </div>
  );
}
