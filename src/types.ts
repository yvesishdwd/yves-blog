export interface CanvasImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width?: number;
  caption?: string;
  zIndex?: number;
  alignment?: 'left' | 'center' | 'right';
}

export interface Article {
  id: string;
  slug?: string;
  title: string;
  date: string;
  category?: string;
  readTime: string;
  summary: string;
  content:
    | {
        type: 'paragraph' | 'heading' | 'quote' | 'list' | 'divider';
        text?: string;
        items?: string[];
        author?: string;
      }[]
    | string;
  images?: CanvasImage[];
  tags?: string[];
  authorEmail?: string;
}

export interface NoteItem {
  id: string;
  date: string;
  text: string;
  location?: string;
  authorEmail?: string;
  images?: CanvasImage[];
}

export interface DeletedItem {
  id: string;
  type: 'diary' | 'writing';
  title?: string;
  date: string;
  text?: string;
  summary?: string;
  content?: any;
  images?: CanvasImage[];
  deletedAt: string;
}

export interface ReaderNote {
  id: string;
  articleId: string;
  name: string;
  note: string;
  timestamp: string;
}
