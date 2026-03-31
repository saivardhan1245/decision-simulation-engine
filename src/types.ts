export type StartupStage = 'idea' | 'prototype';

export interface StartupInfo {
  name: string;
  idea: string;
  stage: StartupStage;
  targetUsers: string;
  budget: string;
  goals: string;
}

export interface Stakeholder {
  name: string;
  type: 'customer' | 'investor' | 'team' | 'government' | 'ngo' | 'other';
  reaction: 'positive' | 'negative' | 'neutral';
  comment: string;
}

export interface Metrics {
  impact: number;
  financials: number;
  risk: number;
  trust: number;
}

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
}

export interface DecisionPoint {
  id: string;
  title: string;
  context: string;
  options: DecisionOption[];
  isFinal?: boolean;
}

export interface SimulationStep {
  decision: DecisionPoint;
  selectedOptionId?: string;
  customDecision?: string;
  outcome?: {
    stakeholders: Stakeholder[];
    metricChanges: Partial<Metrics>;
    insight: string;
    alternative: string;
    successRate: number;
  };
  whatIfs?: {
    [optionId: string]: {
      stakeholders: {
        name: string;
        type: 'customer' | 'investor' | 'team' | 'government' | 'ngo' | 'other';
        reaction: 'positive' | 'negative' | 'neutral';
        comment: string;
      }[];
      metricChanges: Partial<Metrics>;
      insight: string;
      successRate: number;
    };
  };
}

export interface FinalReport {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  observations: string[];
  scores: Metrics;
  roadmap: {
    step: string;
    action: string;
  }[];
}

export interface Prototype {
  id: string;
  type: 'HARDWARE' | 'SOFTWARE' | 'SERVICE DESIGN';
  title: string;
  problem: string;
  description: string;
  initialAccepted?: boolean;
}
