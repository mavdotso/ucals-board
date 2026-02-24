"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export interface Campaign {
  _id: Id<"campaigns">;
  name: string;
  color: string;
  archived: boolean;
  createdAt: number;
}

interface CampaignTag {
  _id: Id<"campaignTags">;
  itemId: string;
  campaignId: Id<"campaigns">;
}

interface CampaignContextType {
  campaigns: Campaign[];
  activeCampaignId: Id<"campaigns"> | null;
  activeCampaign: Campaign | null;
  setActiveCampaignId: (id: Id<"campaigns"> | null) => void;
  addCampaign: (name: string) => Promise<Id<"campaigns">>;
  updateCampaign: (id: Id<"campaigns">, updates: { name?: string; color?: string; archived?: boolean }) => void;
  deleteCampaign: (id: Id<"campaigns">) => void;
  // Tags
  tags: CampaignTag[];
  getItemCampaigns: (itemId: string) => Id<"campaigns">[];
  tagItem: (itemId: string, campaignId: Id<"campaigns">) => void;
  untagItem: (itemId: string, campaignId: Id<"campaigns">) => void;
  toggleTag: (itemId: string, campaignId: Id<"campaigns">) => void;
  itemMatchesCampaign: (itemId: string, campaignId: Id<"campaigns"> | null) => boolean;
}

const CampaignContext = createContext<CampaignContextType | null>(null);

const STORAGE_ACTIVE = "ucals-active-campaign";

const COLORS = [
  "#3B82F6", "#EF4444", "#22C55E", "#F59E0B", "#A855F7",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

export function CampaignProvider({ children }: { children: ReactNode }) {
  const campaignsData = useQuery(api.campaigns.list) ?? [];
  const tagsData = useQuery(api.campaigns.listTags) ?? [];

  const createCampaign = useMutation(api.campaigns.create);
  const updateCampaignMut = useMutation(api.campaigns.update);
  const removeCampaign = useMutation(api.campaigns.remove);
  const tagItemMut = useMutation(api.campaigns.tagItem);
  const untagItemMut = useMutation(api.campaigns.untagItem);

  const [activeCampaignId, _setActive] = useState<Id<"campaigns"> | null>(null);

  // Load active from localStorage (just the filter state, not the data)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_ACTIVE);
    if (saved) _setActive(saved as Id<"campaigns">);
  }, []);

  const setActiveCampaignId = useCallback((id: Id<"campaigns"> | null) => {
    _setActive(id);
    if (id) localStorage.setItem(STORAGE_ACTIVE, id);
    else localStorage.removeItem(STORAGE_ACTIVE);
  }, []);

  const campaigns = campaignsData as Campaign[];
  const tags = tagsData as CampaignTag[];

  const addCampaign = useCallback(async (name: string) => {
    const color = COLORS[campaigns.length % COLORS.length];
    return await createCampaign({ name: name.trim(), color });
  }, [campaigns.length, createCampaign]);

  const updateCampaign = useCallback((id: Id<"campaigns">, updates: { name?: string; color?: string; archived?: boolean }) => {
    updateCampaignMut({ id, ...updates });
  }, [updateCampaignMut]);

  const deleteCampaign = useCallback((id: Id<"campaigns">) => {
    removeCampaign({ id });
    if (activeCampaignId === id) {
      _setActive(null);
      localStorage.removeItem(STORAGE_ACTIVE);
    }
  }, [removeCampaign, activeCampaignId]);

  const getItemCampaigns = useCallback((itemId: string): Id<"campaigns">[] => {
    return tags.filter(t => t.itemId === itemId).map(t => t.campaignId);
  }, [tags]);

  const tagItem = useCallback((itemId: string, campaignId: Id<"campaigns">) => {
    tagItemMut({ itemId, campaignId });
  }, [tagItemMut]);

  const untagItem = useCallback((itemId: string, campaignId: Id<"campaigns">) => {
    untagItemMut({ itemId, campaignId });
  }, [untagItemMut]);

  const toggleTag = useCallback((itemId: string, campaignId: Id<"campaigns">) => {
    const existing = tags.find(t => t.itemId === itemId && t.campaignId === campaignId);
    if (existing) untagItemMut({ itemId, campaignId });
    else tagItemMut({ itemId, campaignId });
  }, [tags, tagItemMut, untagItemMut]);

  const itemMatchesCampaign = useCallback((itemId: string, campaignId: Id<"campaigns"> | null): boolean => {
    if (!campaignId) return true;
    return tags.some(t => t.itemId === itemId && t.campaignId === campaignId);
  }, [tags]);

  const activeCampaign = activeCampaignId ? campaigns.find(c => c._id === activeCampaignId) || null : null;

  return (
    <CampaignContext.Provider value={{
      campaigns, activeCampaignId, activeCampaign,
      setActiveCampaignId, addCampaign, updateCampaign, deleteCampaign,
      tags, getItemCampaigns, tagItem, untagItem, toggleTag, itemMatchesCampaign,
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
