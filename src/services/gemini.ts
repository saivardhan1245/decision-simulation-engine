import { GoogleGenAI, Type } from "@google/genai";
import { StartupInfo, DecisionPoint, SimulationStep, FinalReport, Metrics } from "../types";

const getAIClient = () => {
  const primaryKey = process.env.GEMINI_API_KEY_PRIMARY;
  const secondaryKey = process.env.GEMINI_API_KEY_SECONDARY;
  const legacyKey = process.env.GEMINI_API_KEY;

  const key = primaryKey || legacyKey || secondaryKey;
  if (!key) {
    console.warn("No Gemini API key found in process.env");
  }
  return new GoogleGenAI({ apiKey: key || "dummy_key" });
};

let ai = getAIClient();

const callWithFallback = async (fn: (client: typeof ai) => Promise<any>): Promise<any> => {
  try {
    return await fn(ai);
  } catch (error: any) {
    const secondaryKey = process.env.GEMINI_API_KEY_SECONDARY;
    if (secondaryKey && ai.apiKey !== secondaryKey) {
      console.log("Primary Gemini key failed, switching to secondary...");
      ai = new GoogleGenAI({ apiKey: secondaryKey });
      return await fn(ai);
    }
    throw error;
  }
};

export const generateNextDecision = async (
  startup: StartupInfo,
  history: SimulationStep[]
): Promise<DecisionPoint> => {
  const prompt = `
    You are a startup mentor. Based on the following startup information and the journey so far, generate the NEXT critical decision point.
    
    Startup Info:
    - Name: ${startup.name}
    - Idea: ${startup.idea}
    - Stage: ${startup.stage}
    - Target Users: ${startup.targetUsers}
    - Budget: ${startup.budget}
    - Goals: ${startup.goals}
    
    Journey so far:
    ${history.map((h, i) => `Step ${i + 1}: Decision "${h.decision.title}" -> Selected "${h.customDecision || h.decision.options.find(o => o.id === h.selectedOptionId)?.label}"`).join('\n')}
    
    POLICY INTEGRATION:
    - Consider relevant government schemes (e.g., Startup India, PMFME, MSME subsidies) naturally in the context.
    
    Generate a new decision point. Decide if this should be the final decision point based on the complexity of the startup idea and the progress made (usually 3-7 steps total).
  `;

  const response = await callWithFallback(client => client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          context: { type: Type.STRING },
          isFinal: { type: Type.BOOLEAN, description: "Set to true if this is the last decision point for this simulation." },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ["id", "label", "description"],
            },
          },
        },
        required: ["id", "title", "context", "options", "isFinal"],
      },
    },
  }));

  return JSON.parse(response.text);
};

export const simulateOutcome = async (
  startup: StartupInfo,
  decision: DecisionPoint,
  optionId: string | 'custom',
  currentMetrics: Metrics,
  customInput?: string
): Promise<NonNullable<SimulationStep['outcome']>> => {
  const selectedOption = optionId === 'custom' ? { label: "Custom Decision", description: customInput } : decision.options.find(o => o.id === optionId);
  
  const prompt = `
    Simulate the outcome of this decision for the startup "${startup.name}".
    
    Decision: ${decision.title}
    Context: ${decision.context}
    Selected Option: ${selectedOption?.label} - ${selectedOption?.description}
    
    Current Metrics:
    - Impact: ${currentMetrics.impact}
    - Financials: ${currentMetrics.financials}
    - Risk: ${currentMetrics.risk}
    - Trust: ${currentMetrics.trust}
    
    POLICY INTEGRATION:
    - Integrate government schemes (Startup India, PMFME, etc.) naturally.
    - They should subtly reduce risk, improve financials, or increase trust.
    - Mention them in stakeholder reactions (e.g., "eligible for Startup India benefits") or insights (e.g., "can reduce cost through subsidy").
    - If a useful scheme is NOT used, mention it as a missed opportunity in the insight.
    
    Provide:
    1. Stakeholder reactions (at least 3).
    2. Metric changes (integers between -20 and +20).
    3. An AI insight explaining the consequences.
    4. A suggestion for a better alternative or a "pro tip".
    5. A success rate (integer 0-100) representing how optimal this decision was.
    
    CRITICAL: Be realistic. Not every decision is a win. If a decision is risky or poorly thought out, reflect that in the metrics, stakeholder reactions, and success rate.
  `;

  const response = await callWithFallback(client => client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      // ... same config ...
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          stakeholders: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["customer", "investor", "team", "government", "ngo", "other"] },
                reaction: { type: Type.STRING, enum: ["positive", "negative", "neutral"] },
                comment: { type: Type.STRING },
              },
              required: ["name", "type", "reaction", "comment"],
            },
          },
          metricChanges: {
            type: Type.OBJECT,
            properties: {
              impact: { type: Type.INTEGER },
              financials: { type: Type.INTEGER },
              risk: { type: Type.INTEGER },
              trust: { type: Type.INTEGER },
            },
          },
          insight: { type: Type.STRING },
          alternative: { type: Type.STRING },
          successRate: { type: Type.INTEGER, description: "0-100 percentage of success/optimality" },
        },
        required: ["stakeholders", "metricChanges", "insight", "alternative", "successRate"],
      },
    },
  }));

  return JSON.parse(response.text);
};

export const simulateWhatIf = async (
  startup: StartupInfo,
  decision: DecisionPoint,
  optionIds: string[]
): Promise<SimulationStep['whatIfs']> => {
  const prompt = `
    Briefly simulate what would have happened if the startup "${startup.name}" had chosen these other options for the decision "${decision.title}".
    
    Options to simulate:
    ${decision.options.filter(o => optionIds.includes(o.id)).map(o => `- ${o.label}: ${o.description}`).join('\n')}
    
    POLICY INTEGRATION:
    - Mention relevant government schemes if they would have applied to these options.
    
    Provide a concise summary for each option including stakeholder reaction, metric impact, and a success rate (0-100).
  `;

  const response = await callWithFallback(client => client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          outcomes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                optionId: { type: Type.STRING },
                stakeholders: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ["customer", "investor", "team", "government", "ngo", "other"] },
                      reaction: { type: Type.STRING, enum: ["positive", "negative", "neutral"] },
                      comment: { type: Type.STRING },
                    },
                    required: ["name", "type", "reaction", "comment"],
                  },
                },
                metricChanges: {
                  type: Type.OBJECT,
                  properties: {
                    impact: { type: Type.INTEGER },
                    financials: { type: Type.INTEGER },
                    risk: { type: Type.INTEGER },
                    trust: { type: Type.INTEGER },
                  },
                },
                insight: { type: Type.STRING },
                successRate: { type: Type.INTEGER },
              },
              required: ["optionId", "stakeholders", "metricChanges", "insight", "successRate"],
            },
          },
        },
        required: ["outcomes"],
      },
    },
  }));

  const data = JSON.parse(response.text);
  const whatIfs: SimulationStep['whatIfs'] = {};
  data.outcomes.forEach((o: any) => {
    whatIfs[o.optionId] = {
      stakeholders: o.stakeholders,
      metricChanges: o.metricChanges,
      insight: o.insight,
      successRate: o.successRate
    };
  });
  return whatIfs;
};

export const generateFinalReport = async (
  startup: StartupInfo,
  history: SimulationStep[],
  finalMetrics: Metrics
): Promise<FinalReport> => {
  const prompt = `
    Generate a final simulation report for the startup "${startup.name}".
    
    Journey Summary:
    ${history.map((h, i) => `Step ${i + 1}: ${h.decision.title} -> ${h.customDecision || h.decision.options.find(o => o.id === h.selectedOptionId)?.label}`).join('\n')}
    
    Final Metrics:
    - Impact: ${finalMetrics.impact}
    - Financials: ${finalMetrics.financials}
    - Risk: ${finalMetrics.risk}
    - Trust: ${finalMetrics.trust}
    
    POLICY INTEGRATION:
    - Mention missed opportunities regarding government schemes (Startup India, PMFME, etc.) in the summary or observations.
    - Include roadmap steps for applying to relevant schemes.
    
    Provide a comprehensive summary, strengths, weaknesses, key observations, and a step-by-step personalized execution roadmap.
  `;

  const response = await callWithFallback(client => client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          observations: { type: Type.ARRAY, items: { type: Type.STRING } },
          scores: {
            type: Type.OBJECT,
            properties: {
              impact: { type: Type.INTEGER },
              financials: { type: Type.INTEGER },
              risk: { type: Type.INTEGER },
              trust: { type: Type.INTEGER },
            },
          },
          roadmap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step: { type: Type.STRING },
                action: { type: Type.STRING },
              },
              required: ["step", "action"],
            },
          },
        },
        required: ["summary", "strengths", "weaknesses", "observations", "scores", "roadmap"],
      },
    },
  }));

  return JSON.parse(response.text);
};
