// Represents the stage of the startup (early idea or working prototype)
export type StartupStage = 'idea' | 'prototype';

// Stores basic information provided by the user about their startup
export interface StartupInfo {
  name: string;        // Name of the startup
  idea: string;        // Core idea or problem being solved
  stage: StartupStage; // Current stage of the startup
  targetUsers: string; // Target audience or users
  budget: string;      // Available budget or funding details
  goals: string;       // Objectives the startup wants to achieve
}

// Represents a stakeholder involved in the simulation
export interface Stakeholder {
  name: string;                         // Name of the stakeholder
  role: string;                         // Role (Investor, Customer, Team, etc.)
  reaction: 'positive' | 'negative' | 'neutral'; // Stakeholder's reaction
  comment: string;                      // Feedback or opinion given by stakeholder
}

// Tracks key performance metrics of the startup during simulation
export interface Metrics {
  impact: number;      // Social or market impact score
  financials: number;  // Financial health score
  risk: number;        // Risk level score
  trust: number;       // Stakeholder trust score
}

// Represents a decision option available to the user
export interface Option {
  id: string;          // Unique identifier for the option
  text: string;        // Short label for the option
  description: string; // Detailed explanation of the option
}

// Represents a decision point (challenge) in the simulation
export interface DecisionPoint {
  id: string;          // Unique identifier for the decision point
  title: string;       // Title of the challenge
  scenario: string;    // Description of the situation/problem
  options: Option[];   // List of possible actions the user can take
}

// Represents the outcome after a decision is made
export interface SimulationOutcome {
  stakeholders: Stakeholder[]; // Reactions from different stakeholders
  metricsDelta: Metrics;       // Change in metrics after decision
  insight: string;             // Key takeaway from the decision
  alternative: string;         // Suggested alternative approach
}

// Final report generated after completing the simulation
export interface FinalReport {
  summary: string;           // Overall summary of the startup journey
  strengths: string[];       // Strengths identified in decisions
  weaknesses: string[];      // Weaknesses identified in decisions
  observations: string[];    // General observations and insights
  dashboard: {
    impact: number;         // Final impact score
    financials: number;     // Final financial score
    risk: number;           // Final risk score
    readiness: number;      // Overall readiness level
  };
  roadmap: {
    step: string;           // Step number or phase
    action: string;         // Recommended action for that step
  }[];
}
