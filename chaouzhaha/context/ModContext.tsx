
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Mod, SiteSettings } from '../types';
import { INITIAL_MODS, PROFILE_IMAGE, INSTALL_STEPS } from '../constants';

// Endpoint persistente único para o site
const API_URL = `https://api.npoint.io/46e491269382103328e7`;
const STORAGE_KEY = 'chaouz_persistent_data_v2';

interface PersistentData {
  mods: Mod[];
  siteSettings: SiteSettings;
  updatedAt: number;
}

interface ModContextType {
  mods: Mod[];
  siteSettings: SiteSettings;
  isLoading: boolean;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  addMod: (mod: Mod) => Promise<void>;
  updateMod: (mod: Mod) => Promise<void>;
  deleteMod: (id: string) => Promise<void>;
  getMod: (id: string) => Mod | undefined;
  updateSiteSettings: (settings: SiteSettings) => Promise<void>;
  refreshData: () => Promise<void>;
  lastSynced: number;
}

const ModContext = createContext<ModContextType | undefined>(undefined);

export const ModProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mods, setMods] = useState<Mod[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    profileImage: PROFILE_IMAGE,
    installSteps: INSTALL_STEPS
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [lastSynced, setLastSynced] = useState<number>(0);
  
  const isSavingRef = useRef(false);
  const initialized = useRef(false);

  // 1. Carregamento Inicial Robusto
  useEffect(() => {
    const loadInitialData = async () => {
      let dataToUse: PersistentData | null = null;

      // Tenta primeiro o LocalStorage (disponibilidade imediata)
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        try {
          dataToUse = JSON.parse(local);
        } catch (e) { console.error("Erro no local storage", e); }
      }

      // Tenta a Nuvem para ver se há algo mais novo
      try {
        const response = await fetch(API_URL);
        if (response.ok) {
          const cloud: PersistentData = await response.json();
          // Se a nuvem tem dados válidos e é mais nova ou se o local estava vazio
          if (cloud && cloud.updatedAt && (!dataToUse || cloud.updatedAt > dataToUse.updatedAt)) {
            dataToUse = cloud;
          }
        }
      } catch (e) {
        console.warn("Offline ou erro de rede. Usando cache local.");
      }

      if (dataToUse && dataToUse.mods) {
        setMods(dataToUse.mods);
        setSiteSettings(dataToUse.siteSettings);
        setLastSynced(dataToUse.updatedAt);
      } else {
        // APENAS se for a PRIMEIRA vez absoluta (sem cache e sem nuvem)
        setMods(INITIAL_MODS);
      }
      
      initialized.current = true;
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  // 2. Persistência Definitiva
  const persistData = async (newMods: Mod[], newSettings: SiteSettings) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    
    const timestamp = Date.now();
    const data: PersistentData = {
      mods: newMods,
      siteSettings: newSettings,
      updatedAt: timestamp
    };

    // Atualiza estado local e storage imediatamente (Resiliência)
    setMods(newMods);
    setSiteSettings(newSettings);
    setLastSynced(timestamp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // Tenta subir para a nuvem
    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        if (response.status === 413) {
          alert("ERRO DE TAMANHO: O site não pôde salvar na nuvem porque os dados (provavelmente imagens locais) estão muito pesados. Use links de imagens externos para garantir a persistência.");
        }
        throw new Error("Falha na sincronização remota");
      }
      console.log("Sincronizado com sucesso!");
    } catch (error) {
      console.error("Dados salvos apenas localmente devido a erro de rede:", error);
    } finally {
      isSavingRef.current = false;
    }
  };

  // 3. Refresh Inteligente (Evita resets)
  const refreshData = useCallback(async () => {
    // Não sincroniza se estiver editando ou se ainda não carregou o inicial
    if (isEditing || isSavingRef.current || !initialized.current) return;

    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const cloud: PersistentData = await response.json();
        // SÓ substitui se a nuvem for estritamente mais nova que o que temos aqui
        if (cloud && cloud.updatedAt > lastSynced) {
          console.log("Nova versão detectada na nuvem. Atualizando...");
          setMods(cloud.mods);
          setSiteSettings(cloud.siteSettings);
          setLastSynced(cloud.updatedAt);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud));
        }
      }
    } catch (e) {
      // Falha silenciosa
    }
  }, [isEditing, lastSynced]);

  useEffect(() => {
    const interval = setInterval(refreshData, 20000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const addMod = async (mod: Mod) => {
    await persistData([mod, ...mods], siteSettings);
  };

  const updateMod = async (mod: Mod) => {
    const next = mods.map(m => m.id === mod.id ? mod : m);
    await persistData(next, siteSettings);
  };

  const deleteMod = async (id: string) => {
    const next = mods.filter(m => m.id !== id);
    await persistData(next, siteSettings);
  };

  const updateSiteSettings = async (newSettings: SiteSettings) => {
    await persistData(mods, newSettings);
  };

  const getMod = (id: string) => mods.find(m => m.id === id);

  return (
    <ModContext.Provider value={{ 
      mods, 
      siteSettings, 
      isLoading,
      isEditing,
      setIsEditing,
      addMod, 
      updateMod, 
      deleteMod, 
      getMod,
      updateSiteSettings,
      refreshData,
      lastSynced
    }}>
      {children}
    </ModContext.Provider>
  );
};

export const useMods = () => {
  const context = useContext(ModContext);
  if (!context) throw new Error('useMods must be used within a ModProvider');
  return context;
};
