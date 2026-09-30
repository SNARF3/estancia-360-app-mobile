// hooks/collaborators/use-Collaborators.ts
//
// Gestión de colaboradores desde el lado del dueño: listar y quitar. Usa el grupo "Ranch
// Members"/"Ranch Users" del backend — GET /ranch-users/ranch/{idRanch} (listar) y
// DELETE /ranch-users/ranch/{idRanch}/members/{idTargetUser} (quitar). El alta NO pasa por
// acá — se hace generando un QR (QrWorkerGenerator.tsx) que el colaborador escanea y
// confirma desde su propio dispositivo (QrScannerRanch.tsx → POST /ranch-users).
//
// El DELETE está documentado en Swagger como "Remove an administrator", pero nuestros
// colaboradores se unen con rol Worker (vía POST /ranch-users) — no hay garantía desde el
// spec de que este mismo DELETE también dé de baja a un Worker. Si el backend lo rechaza,
// removeCollaborator() devuelve { success: false, notSupported: true } para que la UI lo
// distinga de un error de red genérico.

import { useState } from 'react';
import { deleteRequest, getRequest } from '../db.postre-connection/db.connection';

export interface CollaboratorItem {
  idUser: number;
  idRanch: number;
  roleId: number;
  roleName: string;
  fullname: string;
  email: string;
}

export function useCollaborators() {
  const [collaborators, setCollaborators] = useState<CollaboratorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollaborators = async (idRanch: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRequest<any[]>(`ranch-users/ranch/${idRanch}`);
      const raw: any[] = response?.data ?? (Array.isArray(response) ? response : []);

      setCollaborators(
        raw.map((ru) => ({
          idUser: ru.idUser ?? ru.user?.id,
          idRanch: ru.idRanch,
          roleId: ru.role?.id,
          roleName: ru.role?.name ?? '',
          fullname: ru.user?.fullname ?? 'Usuario',
          email: ru.user?.email ?? '',
        }))
      );
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo cargar la lista de colaboradores.');
    } finally {
      setLoading(false);
    }
  };

  const removeCollaborator = async (
    idRanch: number,
    idTargetUser: number
  ): Promise<{ success: boolean; notSupported?: boolean; message?: string }> => {
    try {
      await deleteRequest(`ranch-users/ranch/${idRanch}/members/${idTargetUser}`);
      setCollaborators((prev) => prev.filter((c) => c.idUser !== idTargetUser));
      return { success: true };
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403 || status === 404) {
        return {
          success: false,
          notSupported: true,
          message: 'Esta acción no está disponible todavía para colaboradores.',
        };
      }
      return { success: false, message: err?.message ?? 'No se pudo quitar al colaborador.' };
    }
  };

  return { collaborators, loading, error, fetchCollaborators, removeCollaborator };
}
