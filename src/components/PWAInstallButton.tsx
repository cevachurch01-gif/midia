import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X } from 'lucide-react';

interface Props {
  variant?: 'button' | 'banner' | 'badge';
  className?: string;
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'button', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed or running as standalone PWA, suppress
  if (isInstalled) {
    return null;
  }

  // If neither installable event nor iOS, show general install guide button if user requests on mobile
  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowIOSGuide(true);
    }
  };

  const renderContent = () => {
    if (variant === 'banner') {
      return (
        <div className={`p-3 rounded-2xl bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white shadow-lg flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Instalar Aplicativo no Celular</p>
              <p className="text-[11px] text-indigo-100">Acesse escalas e notificações sem precisar abrir o navegador</p>
            </div>
          </div>
          <button
            onClick={handleClick}
            className="px-3.5 py-1.5 rounded-xl bg-white text-indigo-700 text-xs font-bold shadow hover:bg-indigo-50 shrink-0 cursor-pointer transition active:scale-95"
          >
            Baixar App
          </button>
        </div>
      );
    }

    if (variant === 'badge') {
      return (
        <button
          onClick={handleClick}
          title="Instalar no celular"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar App</span>
        </button>
      );
    }

    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition cursor-pointer active:scale-95 ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>Baixar App no Celular</span>
      </button>
    );
  };

  return (
    <>
      {renderContent()}

      {/* iOS Safari Instruction Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold">Instalar no iPhone / Android</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <p className="font-semibold text-indigo-300">
                {isIOS ? 'No Safari (iPhone/iPad):' : 'Instalação rápida pelo navegador:'}
              </p>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Toque no botão de Compartilhar</p>
                  <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                    Ícone <Share className="w-3 h-3 inline text-indigo-400" /> na barra inferior do Safari (ou menu de 3 pontinhos no Chrome).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 text-xs font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Adicionar à Tela de Início</p>
                  <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                    Role as opções e toque em <PlusSquare className="w-3 h-3 inline text-emerald-400" /> <strong>"Adicionar à Tela de Início"</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 text-xs font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Pronto!</p>
                  <p className="text-[11px] text-zinc-400">
                    O aplicativo aparecerá direto na tela do seu celular com ícone próprio e abrirá em tela cheia como um app nativo.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
