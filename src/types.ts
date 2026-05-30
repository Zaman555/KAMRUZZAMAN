/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ScriptLine {
  id: number;
  banglaText: string;
  englishTitle: string;
  defaultText: string;
}

export interface BorderReport {
  id: string;
  senderName: string;
  senderPhone: string;
  location: string;
  reportType: 'trafficking' | 'infiltration' | 'suspicious' | 'other';
  description: string;
  timestamp: string;
  status: 'Received' | 'Verifying' | 'Action Taken' | 'Dismissed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolutionNotes?: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface BgbContact {
  id: number;
  region: string;
  sector: string;
  campName: string;
  contactNumber: string;
  isEmergency: boolean;
}
