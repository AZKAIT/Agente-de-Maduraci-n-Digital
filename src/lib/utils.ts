import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind CSS de manera eficiente
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Simula una espera asíncrona (útil para testing de loading states)
 */
export async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Codifica el identificador de usuario (email) para usar en URLs de manera segura y limpia.
 * Usa Base64Url (RFC 4648) para evitar caracteres especiales y ocultar el email a simple vista.
 */
export function encodeUserIdentifier(email: string): string {
  if (!email) return '';
  try {
    return btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error("Error encoding identifier:", e);
    return email; // Fallback
  }
}

/**
 * Decodifica el identificador de usuario desde la URL.
 */
export function decodeUserIdentifier(encoded: string | null): string | null {
  if (!encoded) return null;
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return atob(base64);
  } catch (e) {
    console.error("Error decoding identifier:", e);
    return null;
  }
}
