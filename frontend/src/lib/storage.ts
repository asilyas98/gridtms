import { supabase } from './supabase';

const BUCKET_NAME = 'documents';

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * The bucket and upload policy are created by asset_management_migration.sql.
 */
export async function uploadFileToSupabase(file: File, folder: string = 'general'): Promise<string | null> {
  if (!supabase) {
    console.warn('Supabase client not initialized. Cannot upload file.');
    return null;
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file to Supabase:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Failed to upload file:', err);
    return null;
  }
}
