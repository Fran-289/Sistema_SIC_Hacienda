'use client';

import ModulePlaceholder from "@/components/ModulePlaceholder";

export default function TareasPage() {
  return (
    <ModulePlaceholder
      icon="tareas"
      color="#f59e0b"
      title="Tareas Pendientes"
      subtitle="Seguimiento de pendientes y acciones por resolver"
      description="Este módulo mostrará las tareas y alertas pendientes del sistema: depósitos sin identificar, conciliaciones vencidas y solicitudes en espera."
      features={[
        'Alertas de depósitos sin identificar',
        'Conciliaciones vencidas',
        'Asignación de responsables',
        'Historial de estados',
        'Notificaciones internas',
      ]}
    />
  );
}
