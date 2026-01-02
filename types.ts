
export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
  resultImages: string[];
  statusMessage: string;
}

export interface UserInput {
  image: string | null; // base64
  scenery: string;
  pageCount: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface QuestPage {
  imageUrl: string;
  questItems: string[];
}

export interface SavedBook {
  id: string;
  title: string;
  pages: QuestPage[];
  targetImage: string | null;
  createdAt: number;
}
