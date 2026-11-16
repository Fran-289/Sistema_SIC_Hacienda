'use client';

import ModulePlaceholder from "@/components/ModulePlaceholder";

export default function ReportesPage() {
  return (
    <ModulePlaceholder
      icon="reportes"
      color="#3b82f6"
      title="Bandeja de Reportes"
      subtitle="Generación y consulta de reportes de ingresos consulares"
      description="Este módulo permitirá generar reportes consolidados de depósitos consulares, exportarlos en PDF/Excel y consultar históricos por período y sede."
      features={[
        'Reporte consolidado por período',
        'Exportación PDF y Excel',
        'Reporte por embajada/consulado',
        'Histórico mensual y anual',
        'Distribución vs. sin identificar',
      ]}
    />
  );
}
