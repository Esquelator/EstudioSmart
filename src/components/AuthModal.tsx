import React, { useState } from "react";
import { X, Mail, Lock, User, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { loginWithEmail, registerWithEmail, loginWithGoogle } from "../firebase";
import { sounds } from "../utils/audio";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (name: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Por favor, introduce tu correo y contraseña.");
      return;
    }

    if (mode === "register" && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);
      sounds.playPop();

      if (mode === "register") {
        const user = await registerWithEmail(email.trim(), password, name.trim());
        sounds.playSuccess();
        onSuccess(user.displayName || name || user.email?.split("@")[0] || "Estudiante");
        onClose();
      } else {
        const user = await loginWithEmail(email.trim(), password);
        sounds.playSuccess();
        onSuccess(user.displayName || user.email?.split("@")[0] || "Estudiante");
        onClose();
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let userFriendlyMsg = "Error al autenticar. Verifica tus credenciales.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        userFriendlyMsg = "Correo o contraseña incorrectos.";
      } else if (err.code === "auth/email-already-in-use") {
        userFriendlyMsg = "Este correo electrónico ya está registrado. Intenta iniciar sesión.";
      } else if (err.code === "auth/weak-password") {
        userFriendlyMsg = "La contraseña es demasiado débil (mínimo 6 caracteres).";
      } else if (err.code === "auth/invalid-email") {
        userFriendlyMsg = "El formato de correo no es válido.";
      }
      setError(userFriendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      setLoading(true);
      sounds.playPop();
      const user = await loginWithGoogle();
      sounds.playSuccess();
      onSuccess(user.displayName || user.email?.split("@")[0] || "Estudiante");
      onClose();
    } catch (err: any) {
      console.error("Google sign in error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Error al iniciar sesión con Google. Intenta con correo y contraseña.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all my-auto max-h-[92dvh] sm:max-h-[90vh] flex flex-col">
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-5 sm:p-6 text-white relative shrink-0">
          <button
            onClick={() => {
              sounds.playPop();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>

          <h2 className="text-2xl font-black tracking-tight font-display">
            {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
          </h2>
          <p className="text-sm text-indigo-100 mt-1">
            {mode === "login"
              ? "Guarda tus materias, mapas mentales y progreso en la base de datos."
              : "Regístrate gratis para sincronizar tus temas en la nube."}
          </p>
        </div>

        {/* Form Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-8 space-y-5 overscroll-contain touch-pan-y custom-scrollbar">
          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 hover:border-indigo-400 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition-all cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continuar con Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs text-slate-400 font-medium uppercase tracking-wider absolute">
              o con tu correo
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre o Apodo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Sofía Gómez"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="estudiante@ejemplo.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === "login" ? "Acceder a mi cuenta" : "Crear mi cuenta gratis"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="text-center pt-2">
            {mode === "login" ? (
              <p className="text-xs text-slate-600">
                ¿No tienes una cuenta aún?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer underline"
                >
                  Regístrate aquí
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-600">
                ¿Ya tienes una cuenta registrada?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer underline"
                >
                  Inicia sesión aquí
                </button>
              </p>
            )}
          </div>

          {/* Database guarantee note */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Base de datos Firestore sincronizada con cifrado seguro</span>
          </div>
        </div>
      </div>
    </div>
  );
};
