-- Mertyk KPSS V2 Veritabanı Şeması
-- Bu kodları Supabase SQL Editor'e yapıştırıp çalıştırın.

-- 1. Kullanıcı Profilleri Tablosu (Supabase Auth ile entegre)
CREATE TABLE public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role text check (role in ('student', 'teacher')) default 'student',
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Öğretmen Sınıfları Tablosu
CREATE TABLE public.classes (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  room_code text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Soru Kumbarası Tablosu (Öğrenci Yanlışları veya Öğretmen Kütüphanesi)
CREATE TABLE public.questions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  image_url text not null,
  education_level text not null,
  subject text not null,
  correct_answer text,
  solution_url text,
  reminder_date timestamp with time zone,
  is_solved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Sınıf Öğrencileri Tablosu
CREATE TABLE public.class_students (
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  score integer default 0,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (class_id, student_id)
);

-- RLS (Row Level Security) Güvenlik Kuralları
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.questions enable row level security;
alter table public.class_students enable row level security;

-- Herkes kendi profilini görebilir ve güncelleyebilir
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Sınıfları herkes görebilir (Oda koduyla girmek için), ama sadece öğretmenler oluşturabilir
create policy "Anyone can view classes" on classes for select using (true);
create policy "Teachers can insert classes" on classes for insert with check (auth.uid() = teacher_id);

-- Soruları sadece oluşturan görebilir (Öğrenci kumbarası özeldir)
create policy "Users can view own questions" on questions for select using (auth.uid() = user_id);
create policy "Users can insert own questions" on questions for insert with check (auth.uid() = user_id);
create policy "Users can update own questions" on questions for update using (auth.uid() = user_id);

-- 5. Storage (Depolama Kovası) Ayarları (Görseller için)
-- Eğer bucket yoksa oluştur
insert into storage.buckets (id, name, public) 
values ('question_images', 'question_images', true)
on conflict (id) do nothing;

-- Herkes görsel okuyabilir
create policy "Anyone can read images" on storage.objects for select using (bucket_id = 'question_images');
-- Sadece giriş yapanlar görsel yükleyebilir
create policy "Authenticated users can upload images" on storage.objects for insert with check (bucket_id = 'question_images' and auth.role() = 'authenticated');
-- Sadece yükleyen kendi görselini silebilir
create policy "Users can delete own images" on storage.objects for delete using (bucket_id = 'question_images' and auth.uid() = owner);

-- 6. Abonelik (Premium) ve Kota Sistemi
alter table public.profiles add column subscription_plan text default 'free';
alter table public.profiles add column question_count integer default 0;

-- 7. SİBER GÜVENLİK: Karakter Kısıtlamaları (Veritabanı Şişirme Engelleme)
alter table public.classes drop constraint if exists classes_name_check;
alter table public.classes add constraint classes_name_check check (char_length(name) <= 255);

alter table public.questions drop constraint if exists questions_subject_check;
alter table public.questions add constraint questions_subject_check check (char_length(subject) <= 255);

-- 8. SİBER GÜVENLİK: Storage Virüs (Malware) Koruması
-- Sadece JPEG, PNG ve WEBP formatındaki resimlerin yüklenmesine izin ver.
drop policy if exists "Authenticated users can upload images" on storage.objects;
create policy "Authenticated users can upload images SECURE" 
on storage.objects for insert 
with check (
  bucket_id = 'question_images' 
  and auth.role() = 'authenticated'
  and (storage.extension(name) = 'jpg' or storage.extension(name) = 'jpeg' or storage.extension(name) = 'png' or storage.extension(name) = 'webp')
);
