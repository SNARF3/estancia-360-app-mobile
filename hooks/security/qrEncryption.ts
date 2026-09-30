// hooks/security/qrEncryption.ts
//
// Cifrado del payload que va dentro del QR de "Agregar Colaborador". Es AES con una
// clave estática embebida en el bundle de la app — sirve para que el QR no se pueda leer
// a simple vista desde una foto/captura de pantalla, NO es seguridad real: cualquiera con
// el .apk/.ipa puede extraer la clave, y el backend (POST /ranch-users) tampoco valida nada
// de esto del lado servidor. El único propósito es evitar la lectura trivial del código.

import CryptoJS from 'crypto-js';

const QR_SECRET_KEY = 'Estancia360-QR-v1-8f2a1c6d9b3e4f70';

export interface RanchQrPayload {
  ranchId: number;
  ranchName: string;
}

export function encryptRanchQrPayload(payload: RanchQrPayload): string {
  const json = JSON.stringify({ v: 1, ...payload });
  return CryptoJS.AES.encrypt(json, QR_SECRET_KEY).toString();
}

export function decryptRanchQrPayload(cipherText: string): RanchQrPayload | null {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, QR_SECRET_KEY);
    const json = bytes.toString(CryptoJS.enc.Utf8);
    if (!json) return null;

    const parsed = JSON.parse(json);
    const ranchId = Number(parsed?.ranchId);
    const ranchName = String(parsed?.ranchName ?? '');
    if (!ranchId || isNaN(ranchId)) return null;

    return { ranchId, ranchName };
  } catch {
    return null;
  }
}
