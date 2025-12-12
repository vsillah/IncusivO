export enum AppStep {
  WELCOME = 0,
  UPLOAD_REFERENCE = 1,
  ANALYZING = 2,
  REVIEW_ANALYSIS = 3,
  UPLOAD_TARGET = 4,
  REWRITING = 5,
  RESULT = 6,
  EXPORT = 7,
}

export interface ReferenceHighlight {
  id: string; // client-side generated
  snippet: string;
  characteristic: string;
  explanation: string;
}

export interface CharacteristicDefinition {
  name: string;
  description: string;
}

export interface VisualStyle {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  textColor: string;
  backgroundColor: string;
  textAlign: string;
  spacing: string;
  isDarkTheme?: boolean;
}

export interface InclusivityAnalysis {
  fullText: string;
  characteristics: CharacteristicDefinition[];
  highlights: ReferenceHighlight[];
  systemInstruction: string;
  tone: string;
  visualStyle: VisualStyle;
}

export interface FileContent {
  mimeType: string;
  data: string; // text content OR base64 string
  isBinary: boolean;
}

export interface ContentChange {
  id: string; // generated client-side for keying
  originalSnippet: string;
  rewrittenSnippet: string;
  concept: string;
  explanation: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface RewriteResult {
  originalText: string;
  rewrittenText: string;
  summary: string;
  changes: ContentChange[];
  finalLayoutStyle: VisualStyle;
}

export interface DocumentState {
  reference: FileContent | null;
  referenceFileName?: string;
  analysis: InclusivityAnalysis | null;
  target: FileContent | null;
  targetFileName?: string;
  result: RewriteResult | null;
}