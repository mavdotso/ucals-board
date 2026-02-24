"use client";
import { useState, useEffect, useCallback } from "react";

// Maps item IDs to campaign IDs
// Key format: "campaign-tags"
const STORAGE_KEY = "ucals-campaign-tags";

type TagMap = Record<string, string[]>; // itemId → campaignId[]

function loadTags(): TagMap {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function saveTags(tags: TagMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tags)); } catch {}
}

export function useCampaignTags() {
  const [tags, setTags] = useState<TagMap>({});

  useEffect(() => { setTags(loadTags()); }, []);
  useEffect(() => { if (Object.keys(tags).length || localStorage.getItem(STORAGE_KEY)) saveTags(tags); }, [tags]);

  const getItemCampaigns = useCallback((itemId: string): string[] => {
    return tags[itemId] || [];
  }, [tags]);

  const tagItem = useCallback((itemId: string, campaignId: string) => {
    setTags(prev => {
      const current = prev[itemId] || [];
      if (current.includes(campaignId)) return prev;
      return { ...prev, [itemId]: [...current, campaignId] };
    });
  }, []);

  const untagItem = useCallback((itemId: string, campaignId: string) => {
    setTags(prev => {
      const current = prev[itemId] || [];
      const next = current.filter(id => id !== campaignId);
      if (next.length === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  }, []);

  const toggleTag = useCallback((itemId: string, campaignId: string) => {
    setTags(prev => {
      const current = prev[itemId] || [];
      if (current.includes(campaignId)) {
        const next = current.filter(id => id !== campaignId);
        if (next.length === 0) { const { [itemId]: _, ...rest } = prev; return rest; }
        return { ...prev, [itemId]: next };
      }
      return { ...prev, [itemId]: [...current, campaignId] };
    });
  }, []);

  const itemMatchesCampaign = useCallback((itemId: string, campaignId: string | null): boolean => {
    if (!campaignId) return true; // no filter = show all
    return (tags[itemId] || []).includes(campaignId);
  }, [tags]);

  return { getItemCampaigns, tagItem, untagItem, toggleTag, itemMatchesCampaign };
}
