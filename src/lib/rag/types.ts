export interface ParsedPage {
  page: number;
  markdown: string;
}

export interface RawChunk {
  page: number;
  section: string | null;
  chunkIndex: number;
  content: string;
  isTable: boolean;
}

export interface ChunkRecord extends RawChunk {
  id: string;
  documentId: string;
  contextual: string | null;
}

export interface Candidate {
  chunkId: string;
  rank: number;
  score?: number;
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  docName: string;
  page: number;
  content: string;
  score: number;
}

export interface Citation {
  docName: string;
  page: number;
}
