import os
import json

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. v2-client/package.json
client_pkg = {
  "name": "v2-client",
  "private": True,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.42.0",
    "lucide-react": "^0.372.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.3",
    "socket.io-client": "^4.7.5"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.34.1",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.6",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "vite": "^5.2.0"
  }
}
write_file('v2-client/package.json', json.dumps(client_pkg, indent=2))

# 2. v2-client/src/main.jsx (ensure it imports tailwind)
main_jsx = """import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
"""
write_file('v2-client/src/main.jsx', main_jsx)

# 3. v2-client/index.html
index_html = """<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Mertyk KPSS V2 - Soru Kumbarası</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
"""
write_file('v2-client/index.html', index_html)

# 4. Supabase Schema SQL
schema_sql = """-- Mertyk KPSS V2 Veritabanı Şeması
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
"""
write_file('v2-server/supabase_schema.sql', schema_sql)

print("Packages, entry points and DB schema fixed.")
