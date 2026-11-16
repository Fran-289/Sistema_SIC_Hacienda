import './globals.css';

export const metadata = {
  title: 'Sistema de Ingresos Consulares | Ministerio de Hacienda',
  description: 'Gobierno de El Salvador - Dirección General de Tesorería',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}