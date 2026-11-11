import { createClient } from '@/lib/supabase/client';

export type MaterialRow = {
  id: string;
  fileName: string;
  storagePath: string;
  fileSize: string;
  folder: string | null;
  createdAt: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function listMaterials(teacherId: string): Promise<MaterialRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('materials')
    .select('id, file_name, file_url, file_size, folder, created_at')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    fileName: row.file_name,
    storagePath: row.file_url,
    fileSize: row.file_size ?? '',
    folder: row.folder,
    createdAt: row.created_at,
  }));
}

export async function uploadMaterial(teacherId: string, file: File, folder: string | null): Promise<MaterialRow> {
  const supabase = createClient();
  const storagePath = `${teacherId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from('materials').upload(storagePath, file);
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from('materials')
    .insert({ teacher_id: teacherId, file_name: file.name, file_url: storagePath, file_size: formatFileSize(file.size), folder })
    .select('id, file_name, file_url, file_size, folder, created_at')
    .single();

  if (error) {
    await supabase.storage.from('materials').remove([storagePath]);
    throw new Error(error.message);
  }
  return {
    id: data.id,
    fileName: data.file_name,
    storagePath: data.file_url,
    fileSize: data.file_size ?? '',
    folder: data.folder,
    createdAt: data.created_at,
  };
}

export async function deleteMaterial(materialId: string, storagePath: string): Promise<void> {
  const supabase = createClient();
  const { error: storageError } = await supabase.storage.from('materials').remove([storagePath]);
  if (storageError) throw new Error(storageError.message);

  const { error } = await supabase.from('materials').delete().eq('id', materialId);
  if (error) throw new Error(error.message);
}

export async function getMaterialDownloadUrl(storagePath: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from('materials').createSignedUrl(storagePath, 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
