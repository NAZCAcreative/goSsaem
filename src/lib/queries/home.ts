import { createClient } from '@/lib/supabase/client';

export type HomeBanner = {
  tag: string;
  title: string;
  cta_label: string;
  cta_href: string;
  image_scene: 'cafe' | 'desk' | 'seoul';
  is_active: boolean;
};

export async function getHomeBanner(): Promise<HomeBanner | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('home_banner_settings')
    .select('tag, title, cta_label, cta_href, image_scene, is_active')
    .eq('id', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
