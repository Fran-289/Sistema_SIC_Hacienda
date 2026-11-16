'use client';

import ModulePlaceholder from "@/components/ModulePlaceholder";

export default function ConfiguracionPage() {
  return (
    <ModulePlaceholder
      icon="configuracion"
      color="#a78bfa"
      title="Configuración"
      subtitle="Parámetros generales del Sistema de Ingresos Consulares"
      description="Este módulo permitirá administrar los parámetros del sistema: catálogos de valores consulares, períodos de concentración, datos institucionales y respaldos."
      features={[
        'Catálogo de valores consulares',
        'Períodos de concentración',
        'Datos institucionales',
        'Parámetros de comisiones',
        'Respaldo y restauración',
      ]}
    />
  );
}
