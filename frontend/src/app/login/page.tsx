'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, getToken, getRememberedEmail, setSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
      return;
    }
    const savedEmail = getRememberedEmail();
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const data = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      if (data && data.success && data.token) {
        setSession(data.token, data.user, remember, trimmedEmail);
        router.push("/dashboard");
      } else {
        setError(data?.message || "Credenciales incorrectas.");
      }
    } catch (err: any) {
      setError(err.message || "Credenciales incorrectas. Verifique usuario y contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#1d3b7a", display: "flex", flexDirection: "column", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* Encabezado Superior con Escudo Oficial */}
      <header style={{ width: "100%", backgroundColor: "#152a58", borderBottom: "1px solid #2d4f96", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img 
              src="/logo-hacienda.svg" 
              alt="Escudo El Salvador" 
              style={{ width: "100%", height: "100%", objectFit: "contain" }} 
            />
          </div>

          <div>
            <div style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "1px", color: "#93c5fd", textTransform: "uppercase" }}>
              GOBIERNO DE EL SALVADOR
            </div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#FFFFFF" }}>
              MINISTERIO DE HACIENDA
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: "#0f1d3e", border: "1px solid #2d4f96", padding: "4px 12px", borderRadius: "6px", fontSize: "11px", color: "#93c5fd" }}>
          Sistema de Ingresos Consulares (SIC)
        </div>
      </header>

      {/* Tarjeta Principal */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: "880px", backgroundColor: "#FFFFFF", borderRadius: "8px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)", padding: "40px 50px", color: "#334155" }}>
          
          {/* Encabezado Nivelado */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "30px", marginBottom: "35px" }}>
            
            {/* Bloque Izquierdo: Escudo + GOBIERNO DE EL SALVADOR */}
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <img 
                src="/logo-hacienda.svg" 
                alt="Escudo Oficial El Salvador"
                style={{ width: "105px", height: "105px", objectFit: "contain", marginBottom: "6px" }}
              />
              <div style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "#1e3a8a", letterSpacing: "1px", textTransform: "uppercase", lineHeight: "1.2", fontWeight: "600" }}>
                GOBIERNO DE<br />EL SALVADOR
              </div>
            </div>

            {/* Línea Divisoria */}
            <div style={{ width: "1.5px", height: "85px", backgroundColor: "#1e3a8a", opacity: 0.85, margin: "0 5px" }}></div>

            {/* Bloque Derecho: MINISTERIO DE HACIENDA */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: "30px", fontWeight: "400", color: "#1e3a8a", margin: 0, letterSpacing: "1px", lineHeight: "1.2", textTransform: "uppercase" }}>
                MINISTERIO<br />DE HACIENDA
              </h1>
            </div>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", padding: "10px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "20px" }}>
              {error}
            </div>
          )}

          {/* Formulario e Información Nivelados */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "45px", alignItems: "start" }}>
            
            {/* Columna Izquierda: Formulario */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#475569", marginBottom: "6px", lineHeight: "1" }}>
                  Usuario
                </label>
                <input
                  type="email"
                  required
                  maxLength={150}
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "14px", color: "#1e293b", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#475569", marginBottom: "6px", lineHeight: "1" }}>
                  Contraseña
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    maxLength={72}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: "100%", padding: "10px 40px 10px 12px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "14px", color: "#1e293b", outline: "none", boxSizing: "border-box" }}
                  />
                  
                  {/* Botón Ojito Interactivo */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {showPassword ? (
                      /* Ícono Ojo Abierto */
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    ) : (
                      /* Ícono Ojo Tachado */
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="remember" style={{ fontSize: "13px", color: "#475569", cursor: "pointer" }}>
                  Recordar
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ width: "100%", padding: "10px", borderRadius: "4px", backgroundColor: "#5b8def", color: "#FFFFFF", border: "none", fontSize: "14px", fontWeight: "500", cursor: "pointer", marginTop: "4px" }}
              >
                {loading ? "Cargando..." : "Iniciar sesión"}
              </button>
            </form>

            {/* Columna Derecha: Texto legal */}
            <div style={{ fontSize: "11px", color: "#1e3a8a", lineHeight: "1.55", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ margin: 0, padding: 0 }}>
                "La información que contiene este sistema está sujeta a los criterios de CONFIDENCIALIDAD establecidos en la Ley de Acceso a la Información Pública y su uso está condicionado a la autorización que regulan las normas legales y técnicas aplicables.
              </p>
              <p style={{ margin: 0, padding: 0 }}>
                Las actividades que se realizan dentro del sistema son registradas y monitoreadas.
              </p>
              <p style={{ margin: 0, padding: 0 }}>
                Cualquier acción indebida en el uso de la información, relativa a su generación, distribución y/o difusión parcial o total para fines no autorizados, queda sujeta a las sanciones legales correspondientes."
              </p>
            </div>

          </div>

        </div>
      </main>

    </div>
  );
}