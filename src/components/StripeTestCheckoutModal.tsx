import React, { useState } from "react";
import {
  CreditCard,
  Lock,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  Loader2,
  Calendar,
  KeyRound,
  User,
  Zap,
} from "lucide-react";
import { sounds } from "../utils/audio";
import confetti from "canvas-confetti";

interface StripeTestCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  discountEarned?: boolean;
  onSuccessPayment?: () => void;
  currentUser?: any;
}

export const StripeTestCheckoutModal: React.FC<StripeTestCheckoutModalProps> = ({
  isOpen,
  onClose,
  discountEarned = false,
  onSuccessPayment,
  currentUser,
}) => {
  const [email, setEmail] = useState(currentUser?.email || "estudiante@ejemplo.com");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("123");
  const [cardHolder, setCardHolder] = useState(currentUser?.displayName || "Estudiante Pro");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen) return null;

  const finalPrice = discountEarned ? "1,69" : "1,99";

  const handleFillTestData = () => {
    sounds.playPop();
    setCardNumber("4242 4242 4242 4242");
    setExpiry("08/29");
    setCvc("888");
    setCardHolder(currentUser?.displayName || "Alex Gómez");
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playPop();
    setIsProcessing(true);

    // Realistic Stripe processing simulation
    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      sounds.playSuccess();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      if (onSuccessPayment) {
        onSuccessPayment();
      }

      setTimeout(() => {
        setIsCompleted(false);
        onClose();
      }, 2200);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[92dvh] sm:max-h-[90vh] my-auto flex flex-col shadow-2xl border border-slate-200 overflow-hidden relative animate-scaleUp">
        {/* Stripe Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center font-black text-sm">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white font-display">
                  Stripe Checkout
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase">
                  Modo Prueba
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Pasarela simulada con datos ficticios
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playPop();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Plan summary badge */}
        <div className="p-5 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase text-indigo-900 tracking-wider block">
              Plan Estudiante Pro
            </span>
            <span className="text-xs text-slate-600">Suscripción mensual ilimitada</span>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1.5 justify-end">
              <span className="text-2xl font-black text-indigo-950">{finalPrice} €</span>
              <span className="text-xs text-slate-500 font-bold">/ mes</span>
            </div>
            {discountEarned && (
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                -15% Reto Oral Activo
              </span>
            )}
          </div>
        </div>

        {/* Completed screen */}
        {isCompleted ? (
          <div className="p-8 text-center space-y-4 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                ¡Suscripción Activada!
              </h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Tu pago ficticio de <strong>{finalPrice} €</strong> ha sido validado correctamente. Tienes acceso Pro ilimitado.
              </p>
            </div>
          </div>
        ) : (
          /* Form screen */
          <form onSubmit={handleSubmitPayment} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain touch-pan-y custom-scrollbar">
            {/* Quick Autofill banner */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
              <span className="text-amber-900 font-medium">
                ¿Quieres probar rápido sin teclear?
              </span>
              <button
                type="button"
                onClick={handleFillTestData}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-[11px] cursor-pointer transition-all shadow-2xs"
              >
                ⚡ Rellenar datos ficticios
              </button>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@ejemplo.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
              />
            </div>

            {/* Card Info */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Información de la tarjeta (ficticia)</span>
                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Cifrado SSL 256-bit
                </span>
              </label>

              <div className="rounded-xl border border-slate-300 overflow-hidden divide-y divide-slate-200">
                <div className="flex items-center px-3 py-2.5 bg-white">
                  <CreditCard className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    className="w-full text-xs text-slate-900 font-mono tracking-wider focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 divide-x divide-slate-200 bg-white">
                  <div className="flex items-center px-3 py-2.5">
                    <Calendar className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      required
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      placeholder="MM / AA"
                      maxLength={5}
                      className="w-full text-xs text-slate-900 font-mono focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center px-3 py-2.5">
                    <KeyRound className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      required
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      placeholder="CVC"
                      maxLength={4}
                      className="w-full text-xs text-slate-900 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cardholder Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Nombre en la tarjeta
              </label>
              <div className="flex items-center px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white">
                <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  required
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="Nombre y Apellidos"
                  className="w-full text-xs text-slate-900 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Conectando con Stripe...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pagar {finalPrice} € / mes (Simulación)</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Modo seguro de prueba: no se efectuará ningún cargo real.</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
