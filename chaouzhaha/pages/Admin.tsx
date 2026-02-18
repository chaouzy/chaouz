
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMods } from '../context/ModContext';
import { Mod } from '../types';
import { Plus, Edit2, Trash2, Save, X, Upload, Check, User as UserIcon, BookOpen, Layout as LayoutIcon, Loader2, AlertCircle, CloudCheck, Globe, Wifi, WifiOff } from 'lucide-react';

export const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { mods, addMod, updateMod, deleteMod, siteSettings, updateSiteSettings, isLoading, setIsEditing, lastSynced } = useMods();
  const [editingMod, setEditingMod] = useState<Partial<Mod> | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [tempProfileImg, setTempProfileImg] = useState(siteSettings.profileImage);
  const [tempSteps, setTempSteps] = useState([...siteSettings.installSteps]);

  useEffect(() => {
    const auth = localStorage.getItem('chaouz_auth');
    if (auth !== 'true') navigate('/login');
  }, [navigate]);

  useEffect(() => {
    if (!showSettings) {
      setTempProfileImg(siteSettings.profileImage);
      setTempSteps([...siteSettings.installSteps]);
    }
  }, [siteSettings, showSettings]);

  useEffect(() => {
    // Trava o polling de background enquanto o usuário interage
    setIsEditing(showSettings || !!editingMod);
  }, [showSettings, editingMod, setIsEditing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'mod' | 'profile' | number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limite preventivo para não quebrar o JSON da nuvem
    if (file.size > 80 * 1024) {
      alert("⚠️ ARQUIVO MUITO GRANDE!\nPara que as mudanças sejam salvas para TODO MUNDO, você deve usar arquivos pequenos (<80KB) ou colar um LINK direto da imagem (Google Drive, Discord, Imgur, etc).\nArquivos gigantes impedem o salvamento permanente.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'image') setEditingMod(prev => ({ ...prev, imageUrl: base64 }));
      else if (type === 'mod') setEditingMod(prev => ({ ...prev, downloadUrl: base64, isLocalFile: true }));
      else if (type === 'profile') setTempProfileImg(base64);
      else if (typeof type === 'number') {
        const newSteps = [...tempSteps];
        newSteps[type].image = base64;
        setTempSteps(newSteps);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveGlobalSettings = async () => {
    setIsSaving(true);
    try {
      await updateSiteSettings({
        profileImage: tempProfileImg,
        installSteps: tempSteps
      });
      setShowSettings(false);
    } catch (e) {
      alert("Erro ao salvar! Tente usar links em vez de arquivos locais.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMod = async () => {
    if (!editingMod?.name || !editingMod?.version) {
      alert('Nome e Versão são obrigatórios!');
      return;
    }

    setIsSaving(true);
    try {
      const modData = {
        ...editingMod,
        id: editingMod.id || Date.now().toString(),
        loader: editingMod.loader || 'Forge',
        buttonText: editingMod.buttonText || 'BAIXAR AGORA',
        imageUrl: editingMod.imageUrl || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=800',
        downloadUrl: editingMod.downloadUrl || '#'
      } as Mod;

      if (isAdding) await addMod(modData);
      else await updateMod(modData);
      
      setEditingMod(null);
      setIsAdding(false);
    } catch (e) {
      alert("Erro ao publicar! Se você subiu um arquivo muito grande, esse é o motivo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-amber-500 gap-6">
        <Loader2 size={64} className="animate-spin" />
        <div className="text-center">
          <p className="font-black uppercase italic tracking-widest text-xl">Sincronizando Banco de Dados...</p>
          <p className="text-zinc-500 text-xs mt-2 uppercase font-bold tracking-widest">Aguarde a conexão com a nuvem</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700 max-w-6xl mx-auto pb-20 px-4">
      {/* Header Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 bg-[#2c1f16] p-10 rounded-[48px] border border-[#3d2b1f] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <Globe size={120} className="text-white" />
        </div>
        
        <div className="relative z-10">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">Portal do <span className="text-amber-500">Chaouz</span></h1>
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20">
              <Wifi size={12} /> Persistência Ativa
            </span>
            <span className="text-zinc-500 text-[10px] font-bold uppercase italic bg-zinc-900/50 px-4 py-2 rounded-full">
              Último Backup: {lastSynced > 0 ? new Date(lastSynced).toLocaleTimeString() : 'NUNCA'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <button 
            onClick={() => setShowSettings(true)}
            className="bg-zinc-800 text-white px-8 py-5 rounded-[24px] font-black flex items-center justify-center gap-3 hover:bg-zinc-700 transition-all shadow-xl active:scale-95 uppercase italic tracking-tighter text-sm"
          >
            <LayoutIcon size={20} /> CUSTOMIZAR SITE
          </button>
          <button 
            onClick={() => { setIsAdding(true); setEditingMod({}); }}
            className="bg-amber-500 text-black px-10 py-5 rounded-[24px] font-black flex items-center justify-center gap-3 hover:bg-amber-400 transition-all shadow-2xl shadow-amber-500/20 active:scale-95 uppercase italic tracking-tighter text-sm"
          >
            <Plus size={24} /> NOVO MODPACK
          </button>
        </div>
      </div>

      {/* Lista de Mods */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-zinc-500 font-black uppercase tracking-[0.4em] text-[10px] italic">Gerenciar Biblioteca ({mods.length})</h2>
          <div className="h-px flex-grow bg-zinc-800/50 ml-6"></div>
        </div>

        {mods.length === 0 && (
          <div className="bg-[#1a120b] border-4 border-dashed border-[#3d2b1f] p-24 rounded-[48px] text-center">
            <p className="text-zinc-600 font-black italic uppercase tracking-widest text-lg">Sem modpacks publicados.</p>
          </div>
        )}

        {mods.map(mod => (
          <div key={mod.id} className="bg-[#2c1f16] border border-[#3d2b1f] p-8 rounded-[40px] flex flex-col md:flex-row items-center gap-8 group hover:border-amber-500/40 transition-all shadow-xl">
            <div className="w-full md:w-44 h-32 rounded-3xl overflow-hidden bg-black flex-shrink-0 border-2 border-white/5 shadow-inner">
              <img src={mod.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" alt="" />
            </div>
            <div className="flex-grow text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">{mod.name}</h3>
                <span className="bg-amber-500/10 text-amber-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-amber-500/20">{mod.version}</span>
              </div>
              <p className="text-zinc-500 text-sm font-bold line-clamp-1 italic max-w-xl opacity-70">{mod.description}</p>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <button 
                onClick={() => { setIsAdding(false); setEditingMod(mod); }}
                className="flex-1 md:flex-none p-5 rounded-2xl bg-zinc-800 text-white hover:bg-amber-500 hover:text-black transition-all flex items-center justify-center shadow-lg active:scale-90"
              >
                <Edit2 size={24} />
              </button>
              <button 
                onClick={() => { if(confirm('Apagar modpack permanentemente?')) deleteMod(mod.id); }}
                className="flex-1 md:flex-none p-5 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-lg active:scale-90"
              >
                <Trash2 size={24} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modais omitidos para brevidade, mas mantendo a lógica de travamento de refresh */}
      {/* [O código dos modais permaneceria o mesmo, mas agora com a proteção do ModContext que impede o reset automático] */}
      
      {/* Botão de Emergência caso queira forçar sync */}
      <div className="mt-20 flex justify-center">
         <button 
           onClick={() => window.location.reload()}
           className="text-zinc-700 hover:text-zinc-500 transition-colors text-[10px] font-black uppercase tracking-[0.5em] italic flex items-center gap-2"
         >
           <WifiOff size={12} /> Reiniciar conexão caso trave
         </button>
      </div>

      {/* Reaproveitamento da estrutura de modal do seu código original para edição de mods */}
      {editingMod && (
        <div className="fixed inset-0 z-[120] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#2c1f16] w-full max-w-4xl rounded-[56px] border border-[#3d2b1f] shadow-2xl overflow-hidden my-auto">
            <div className="p-10 border-b border-[#3d2b1f] flex items-center justify-between bg-[#3d2b1f]/30">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                {isAdding ? 'Novo Registro' : 'Editar Modpack'}
              </h2>
              <button onClick={() => setEditingMod(null)} className="text-zinc-500 hover:text-white transition-all p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-full">
                <X size={28} />
              </button>
            </div>

            <div className="p-10 space-y-10">
              <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl flex gap-4 items-center">
                <AlertCircle className="text-amber-500 flex-shrink-0" size={24} />
                <p className="text-[11px] text-amber-200 font-bold italic leading-relaxed">
                  DICA: Para que o site nunca resete, use sempre LINKS para as imagens. Subir arquivos do seu PC ocupa muito espaço na nuvem e pode falhar se você colocar muitos arquivos pesados.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-4 ml-1 italic">Título do Modpack</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Better Minecraft"
                    value={editingMod.name || ''} 
                    onChange={e => setEditingMod({...editingMod, name: e.target.value})}
                    className="w-full bg-[#1a120b] border border-[#3d2b1f] rounded-3xl p-6 font-black outline-none focus:border-amber-500 transition-all text-lg uppercase italic tracking-tighter"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-4 ml-1 italic">Versão Recomendada</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 1.20.1"
                    value={editingMod.version || ''} 
                    onChange={e => setEditingMod({...editingMod, version: e.target.value})}
                    className="w-full bg-[#1a120b] border border-[#3d2b1f] rounded-3xl p-6 font-black outline-none focus:border-amber-500 transition-all text-lg uppercase italic tracking-tighter"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-4 ml-1 italic">Fala pra rapaziada (Descrição)</label>
                <textarea 
                  placeholder="Escreve aqui o que você achou desse mod..."
                  value={editingMod.description || ''} 
                  onChange={e => setEditingMod({...editingMod, description: e.target.value})}
                  className="w-full bg-[#1a120b] border border-[#3d2b1f] rounded-[40px] p-8 font-bold outline-none focus:border-amber-500 h-44 resize-none text-lg italic leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1 italic">Capa (Imagem)</label>
                  <div className="bg-[#1a120b] p-8 rounded-[48px] border border-[#3d2b1f] shadow-inner space-y-6">
                    <input 
                      type="text" 
                      placeholder="Link da imagem (RECOMENDADO)..."
                      className="w-full bg-[#2c1f16] p-4 rounded-2xl border border-white/5 outline-none font-black text-[10px] uppercase"
                      value={editingMod.imageUrl && !editingMod.imageUrl.startsWith('data:') ? editingMod.imageUrl : ''}
                      onChange={e => setEditingMod({...editingMod, imageUrl: e.target.value})}
                    />
                    <label className="flex items-center justify-center gap-3 bg-[#3d2b1f] hover:bg-amber-500 hover:text-black p-6 rounded-[24px] cursor-pointer transition-all font-black text-xs uppercase italic tracking-tighter border border-white/5 active:scale-95">
                      <Upload size={20} /> OU SUBIR MINIATURA
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'image')} />
                    </label>
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 ml-1 italic">Link de Download</label>
                  <div className="bg-[#1a120b] p-8 rounded-[48px] border border-[#3d2b1f] shadow-inner space-y-6">
                    <input 
                      type="text" 
                      placeholder="URL (CurseForge, Mediafire, etc)..."
                      className="w-full bg-[#2c1f16] p-4 rounded-2xl border border-white/5 outline-none font-black text-[10px] uppercase"
                      value={editingMod.downloadUrl && !editingMod.isLocalFile ? editingMod.downloadUrl : ''}
                      onChange={e => setEditingMod({...editingMod, downloadUrl: e.target.value, isLocalFile: false})}
                    />
                    <label className={`flex items-center justify-center gap-3 p-6 rounded-[24px] cursor-pointer transition-all font-black text-xs uppercase italic border active:scale-95 ${editingMod.isLocalFile ? 'bg-green-500 text-black border-green-500' : 'bg-[#3d2b1f] border-white/5'}`}>
                      {editingMod.isLocalFile ? <Check size={20} /> : <Upload size={20} />} 
                      {editingMod.isLocalFile ? 'ARQUIVO CARREGADO' : 'SUBIR .JAR'}
                      <input type="file" className="hidden" accept=".jar,.zip" onChange={e => handleFileChange(e, 'mod')} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 border-t border-[#3d2b1f] bg-[#1a120b]/80 grid grid-cols-2 gap-6">
              <button onClick={() => setEditingMod(null)} className="bg-zinc-800 text-zinc-500 p-6 rounded-[32px] font-black uppercase text-xs tracking-[0.3em]">
                FECHAR
              </button>
              <button 
                disabled={isSaving}
                onClick={handleSaveMod} 
                className="bg-amber-500 hover:bg-amber-400 text-black p-6 rounded-[32px] font-black flex items-center justify-center gap-3 uppercase italic shadow-xl active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={24} /> : <CloudCheck size={24} />} 
                {isSaving ? 'SALVANDO...' : 'PUBLICAR AGORA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configurações do Site (Avatar e Tutorial) */}
      {showSettings && (
        <div className="fixed inset-0 z-[110] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#2c1f16] w-full max-w-5xl rounded-[56px] border border-[#3d2b1f] shadow-2xl overflow-hidden my-auto">
             <div className="p-10 border-b border-[#3d2b1f] flex items-center justify-between bg-[#3d2b1f]/30">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-4">
                <LayoutIcon className="text-amber-500" size={32} /> Visual do Site
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white transition-all p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-full">
                <X size={28} />
              </button>
            </div>

            <div className="p-10 space-y-12">
              <div className="space-y-6">
                <h3 className="text-xl font-black uppercase italic flex items-center gap-3">
                  <UserIcon className="text-amber-500" size={24} /> Avatar do Chaouz
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#1a120b] p-8 rounded-[48px] border border-[#3d2b1f]">
                  <div className="flex flex-col justify-center gap-6">
                    <input 
                      type="text" 
                      placeholder="Link da imagem..."
                      className="w-full bg-[#2c1f16] border border-[#3d2b1f] rounded-2xl p-4 font-bold outline-none focus:border-amber-500 transition-all text-xs"
                      value={tempProfileImg.startsWith('data:') ? '' : tempProfileImg}
                      onChange={e => setTempProfileImg(e.target.value)}
                    />
                    <label className="flex items-center justify-center gap-3 bg-[#3d2b1f] hover:bg-amber-500 hover:text-black p-5 rounded-2xl cursor-pointer transition-all font-black uppercase text-xs italic border border-white/5 active:scale-95">
                      <Upload size={18} /> TROCAR FOTO
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'profile')} />
                    </label>
                  </div>
                  <div className="flex justify-center">
                    <div className="w-40 h-40 rounded-full border-4 border-amber-500 p-2 bg-zinc-900 shadow-2xl overflow-hidden">
                      <img src={tempProfileImg} className="w-full h-full object-cover rounded-full" alt="Preview" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-black uppercase italic flex items-center gap-3">
                  <BookOpen className="text-amber-500" size={24} /> Tutorial do Site
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {tempSteps.map((step, idx) => (
                    <div key={idx} className="bg-[#1a120b] p-6 rounded-[40px] border border-[#3d2b1f] space-y-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-2">Etapa {idx + 1}</div>
                      <div className="h-32 rounded-2xl overflow-hidden mb-4 border border-white/5 bg-black">
                        <img src={step.image} className="w-full h-full object-cover opacity-50" alt={`Step ${idx+1}`} />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Link da imagem..."
                        className="w-full bg-[#2c1f16] border border-[#3d2b1f] rounded-xl p-3 text-[10px] font-bold outline-none focus:border-amber-500 transition-all"
                        value={step.image.startsWith('data:') ? '' : step.image}
                        onChange={e => {
                          const newSteps = [...tempSteps];
                          newSteps[idx].image = e.target.value;
                          setTempSteps(newSteps);
                        }}
                      />
                      <label className="flex items-center justify-center gap-2 bg-[#3d2b1f] hover:bg-amber-500 hover:text-black p-3 rounded-xl cursor-pointer transition-all font-black uppercase text-[9px] tracking-widest border border-white/5">
                        <Upload size={14} /> CARREGAR
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, idx)} />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-10 border-t border-[#3d2b1f] bg-[#1a120b]/80 grid grid-cols-2 gap-6">
              <button onClick={() => setShowSettings(false)} className="bg-zinc-800 text-zinc-500 hover:text-white p-6 rounded-[32px] font-black uppercase text-xs tracking-[0.3em]">
                CANCELAR
              </button>
              <button 
                disabled={isSaving}
                onClick={saveGlobalSettings} 
                className="bg-amber-500 hover:bg-amber-400 text-black p-6 rounded-[32px] font-black flex items-center justify-center gap-3 uppercase text-sm tracking-tighter italic shadow-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={24} />} 
                {isSaving ? 'SALVANDO...' : 'SALVAR TUDO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
