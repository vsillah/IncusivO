export enum AppStep {
  UPLOAD_REFERENCE = 0,
  ANALYZING = 1,
  REVIEW_ANALYSIS = 2,
  UPLOAD_TARGET = 3,
  REWRITING = 4,
  RESULT = 5,
  EXPORT = 6,
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