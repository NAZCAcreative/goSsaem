import { createClient } from '@/lib/supabase/client';
import { collectPages } from './paging';

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
  const data = await collectPages((from, to) => supabase
    .from('materials')
    .select('id, file_name, file_url, file_size, folder, created_at')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false }).order('id').range(from, to));
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
  const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']);
  if (file.size <= 0 || file.size > 10 * 1024 * 1024 || !allowed.has(file.type)) throw new Error('PDF·이미지·텍스트·DOCX·PPTX 파일을 10MB 이하로 올려주세요.');
  const safeName = file.name.replace(/[^\p{L}\p{N}._-]/gu, '_').slice(-120);
  const storagePath = `${teacherId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from('materials').upload(storagePath, file);
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from('materials')
    .insert({ teacher_id: teacherId, file_name: file.name, file_url: storagePath, file_size: formatFileSize(file.size), folder })
    .select('id, file_name, file_url, file_size, folder, created_at')
    .single();

  if (error) { await supabase.storage.from('materials').remove([storagePath]); throw new Error('자료 정보를 저장하지 못했습니다. 다시 시도해주세요.'); }
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
