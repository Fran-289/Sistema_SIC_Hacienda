'use client';

import ModulePlaceholder from "@/components/ModulePlaceholder";

export default function UsuariosPage() {
  return (
    <ModulePlaceholder
      icon="usuarios"
      color="#38bdf8"
      title="Gestión de Usuarios"
      subtitle="Administración de usuarios y permisos del sistema"
      description="Este módulo permitirá administrar los usuarios del sistema: alta, baja, asignación de roles (ADMIN/USER) y control de acceso por módulo."
      features={[
        'Alta y baja de usuarios',
        'Asignación de roles',
        'Restablecimiento de contraseñas',
        'Bloqueo de cuentas',
        'Auditoría de accesos',
      ]}
    />
  );
}
