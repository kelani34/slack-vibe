'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { auth } from '@/auth';

export async function uploadFile(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  const file = formData.get('file') as File;
  if (!file) {
    return { error: 'No file provided' };
  }

  const supabase = createAdminClient();
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

  // Convert File to ArrayBuffer for Supabase upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from('workspace-files')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return { error: 'Upload failed' };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('workspace-files').getPublicUrl(fileName);

  return { url: publicUrl, name: file.name, type: file.type, size: file.size };
}
