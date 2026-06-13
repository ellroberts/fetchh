-- Library documents table for non-AI imported files (txt, md, docx, pdf)
CREATE TABLE public.library_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.library_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own library documents"
  ON public.library_documents
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_library_documents_user_id ON public.library_documents(user_id);
CREATE INDEX idx_library_documents_project_id ON public.library_documents(project_id);
