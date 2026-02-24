"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface Campaign {
  id: string;
  name: string;
  color: string;
  archived?: boolean;
  createdAt: number;
}

interface CampaignContextType {
  campaigns: Campaign[];
  activeCampaignId: string | null;
  activeCampaign: Campaign | null;
  setActiveCampaignId: (id: string | null) => void;
  addCampaign: (name: string) => Campaign;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  archiveCampaign: (id: string) => void;
  deleteCampaign: (id: string) => void;
}

const CampaignContext = createContext<CampaignContextType | null>(null);

const STORAGE_CAMPAIGNS = "ucals-campaigns";
const STORAGE_ACTIVE = "ucals-active-campaign";

const COLORS = [
  "#3B82F6", "#EF4444", "#22C55E", "#F59E0B", "#A855F7",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function loadCampaigns(): Campaign[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_CAMPAIGNS) || "[]"); } catch { return []; }
}

function saveCampaigns(c: Campaign[]) {
  try { localStorage.setItem(STORAGE_CAMPAIGNS, JSON.stringify(c)); } catch {}
}

function loadActive(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_ACTIVE) || null;
}

function saveActive(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_ACTIVE, id);
    else localStorage.removeItem(STORAGE_ACTIVE);
  } catch {}
}

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignId, _setActive] = useState<string | null>(null);

  useEffect(() => {
    setCampaigns(loadCampaigns());
    _setActive(loadActive());
  }, []);

  useEffect(() => { if (campaigns.length || localStorage.getItem(STORAGE_CAMPAIGNS)) saveCampaigns(campaigns); }, [campaigns]);

  const setActiveCampaignId = useCallback((id: string | null) => {
    _setActive(id);
    saveActive(id);
  }, []);

  const addCampaign = useCallback((name: string): Campaign => {
    const c: Campaign = {
      id: uid(),
      name: name.trim(),
      color: COLORS[campaigns.length % COLORS.length],
      createdAt: Date.now(),
    };
    setCampaigns(prev => [...prev, c]);
    return c;
  }, [campaigns.length]);

  const updateCampaign = useCallback((id: string, updates: Partial<Campaign>) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const archiveCampaign = useCallback((id: string) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, archived: true } : c));
    _setActive(prev => prev === id ? null : prev);
    if (activeCampaignId === id) saveActive(null);
  }, [activeCampaignId]);

  const deleteCampaign = useCallback((id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    _setActive(prev => prev === id ? null : prev);
    if (activeCampaignId === id) saveActive(null);
  }, [activeCampaignId]);

  const activeCampaign = activeCampaignId ? campaigns.find(c => c.id === activeCampaignId) || null : null;

  return (
    <CampaignContext.Provider value={{
      campaigns, activeCampaignId, activeCampaign,
      setActiveCampaignId, addCampaign, updateCampaign, archiveCampaign, deleteCampaign,
    }}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error("useCampaign must be used within CampaignProvider");
  return ctx;
}
