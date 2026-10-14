import { backendFetch } from './backendApi';

/**
 * Uploads a file to private Supabase Storage and returns a signed URL.
 * The bucket and upload policy are created by asset_management_migration.sql.
 */
export async function uploadFileToSupabase(file: File, folder: string = 'general'): Promise<string | null> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    const result = await backendFetch('/storage/upload', {
      method: 'POST',
      body: JSON.stringify({
        folder,
        file_name: file.name,
        content_type: file.type || 'application/octet-stream',
        data_base64: btoa(binary),
      }),
    });
    return result?.public_url || null;
  } catch (err) {
    console.error('Failed to upload file:', err);
    return null;
  }
}
