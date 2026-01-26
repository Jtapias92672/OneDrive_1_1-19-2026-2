/**
 * FORGE Platform - Lambda Worker
 * Epic 9: Infrastructure
 * Task 9.4.6: Lambda + Bedrock Integration
 *
 * @description
 *   FORGE worker Lambda invoking Claude models on Bedrock.
 *   Supports convergence engine, parser, and CARS assessor modes.
 *
 * @environment
 *   - FORGE_COMPONENT: convergence-engine | parser | cars-assessor
 *   - BEDROCK_ENABLED: true
 *   - BEDROCK_REGION: us-east-1
 *   - BEDROCK_MODEL_SONNET: anthropic.claude-3-5-sonnet-*
 *   - BEDROCK_MODEL_HAIKU: anthropic.claude-3-5-haiku-*
 *   - BEDROCK_MODEL_OPUS: anthropic.claude-3-opus-*
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';

// ==============================================================================
// Types
// ==============================================================================

interface ForgeEvent {
  action: 'converge' | 'parse' | 'assess' | 'execute';
  payload: {
    prompt?: string;
    messages?: Message[];
    model?: 'sonnet' | 'haiku' | 'opus';
    maxTokens?: number;
    temperature?: number;
    budget?: number;
    sessionId?: string;
    context?: Record<string, unknown>;
  };
  metadata?: {
    traceId?: string;
    spanId?: string;
    userId?: string;
    tenantId?: string;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ForgeResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  metrics?: {
    duration: number;
    model: string;
    iterations?: number;
  };
}

interface BedrockResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ==============================================================================
// Configuration
// ==============================================================================

const CONFIG = {
  region: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
  component: process.env.FORGE_COMPONENT || 'generic',
  models: {
    sonnet: process.env.BEDROCK_MODEL_SONNET || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    haiku: process.env.BEDROCK_MODEL_HAIKU || 'anthropic.claude-3-5-haiku-20241022-v1:0',
    opus: process.env.BEDROCK_MODEL_OPUS || 'anthropic.claude-3-opus-20240229-v1:0',
  },
  defaults: {
    maxTokens: parseInt(process.env.MAX_TOKENS || '8192', 10),
    temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
    maxIterations: parseInt(process.env.MAX_ITERATIONS || '10', 10),
    timeout: parseInt(process.env.CONVERGENCE_TIMEOUT || '300000', 10),
    tokenBudget: parseInt(process.env.TOKEN_BUDGET || '50000', 10),
  },
};

// ==============================================================================
// Bedrock Client
// ==============================================================================

const bedrockClient = new BedrockRuntimeClient({
  region: CONFIG.region,
});

// ==============================================================================
// Bedrock Invocation
// ==============================================================================

async function invokeModel(
  messages: Message[],
  options: {
    model?: 'sonnet' | 'haiku' | 'opus';
    maxTokens?: number;
    temperature?: number;
    system?: string;
  } = {}
): Promise<{ response: string; usage: { inputTokens: number; outputTokens: number } }> {
  const modelId = CONFIG.models[options.model || 'sonnet'];

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: options.maxTokens || CONFIG.defaults.maxTokens,
    temperature: options.temperature ?? CONFIG.defaults.temperature,
    system: options.system || 'You are a helpful AI assistant.',
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: Buffer.from(body),
  });

  const response = await bedrockClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body)) as BedrockResponse;

  return {
    response: result.content[0]?.text || '',
    usage: {
      inputTokens: result.usage.input_tokens,
      outputTokens: result.usage.output_tokens,
    },
  };
}

// ==============================================================================
// Convergence Engine
// ==============================================================================

async function runConvergence(
  payload: ForgeEvent['payload']
): Promise<{ result: unknown; iterations: number; totalTokens: number }> {
  const messages: Message[] = payload.messages || [];
  const maxIterations = CONFIG.defaults.maxIterations;
  const tokenBudget = payload.budget || CONFIG.defaults.tokenBudget;

  let totalTokens = 0;
  let iterations = 0;
  let converged = false;
  let lastResult: unknown = null;

  while (iterations < maxIterations && totalTokens < tokenBudget && !converged) {
    iterations++;

    const { response, usage } = await invokeModel(messages, {
      model: payload.model || 'sonnet',
      maxTokens: payload.maxTokens,
      temperature: payload.temperature ?? 0.7,
      system: `You are a FORGE convergence worker. Your task is to iteratively refine responses until convergence criteria are met.`,
    });

    totalTokens += usage.inputTokens + usage.outputTokens;

    // Add assistant response to context
    messages.push({ role: 'assistant', content: response });

    // Check for convergence markers
    if (response.includes('[CONVERGED]') || response.includes('FINAL ANSWER:')) {
      converged = true;
      lastResult = response;
    } else {
      // Add continuation prompt
      messages.push({
        role: 'user',
        content: 'Continue refining. If complete, include [CONVERGED] in your response.',
      });
    }

    lastResult = response;
  }

  return {
    result: lastResult,
    iterations,
    totalTokens,
  };
}

// ==============================================================================
// Parser
// ==============================================================================

async function runParser(
  payload: ForgeEvent['payload']
): Promise<{ parsed: unknown; valid: boolean }> {
  const prompt = payload.prompt || '';

  const { response, usage } = await invokeModel(
    [{ role: 'user', content: prompt }],
    {
      model: 'haiku',
      maxTokens: 4096,
      temperature: 0,
      system: `You are a FORGE parser. Extract structured data from the input. Output valid JSON only.`,
    }
  );

  try {
    const parsed = JSON.parse(response);
    return { parsed, valid: true };
  } catch {
    return { parsed: response, valid: false };
  }
}

// ==============================================================================
// CARS Risk Assessor
// ==============================================================================

async function runCARSAssessment(
  payload: ForgeEvent['payload']
): Promise<{ riskLevel: string; score: number; factors: string[] }> {
  const prompt = payload.prompt || '';
  const context = payload.context || {};

  const { response } = await invokeModel(
    [
      {
        role: 'user',
        content: `Assess the risk of the following action in the FORGE platform:

Action: ${prompt}
Context: ${JSON.stringify(context)}

Respond with JSON containing:
- riskLevel: "low" | "medium" | "high" | "critical"
- score: 0.0 to 1.0
- factors: string[] of risk factors`,
      },
    ],
    {
      model: 'haiku',
      maxTokens: 1024,
      temperature: 0,
      system: `You are a CARS (Context-Aware Risk Scoring) assessor for the FORGE platform. Analyze actions for security risks including alignment faking, reward hacking, and privilege escalation.`,
    }
  );

  try {
    return JSON.parse(response);
  } catch {
    return {
      riskLevel: 'medium',
      score: 0.5,
      factors: ['Unable to parse risk assessment'],
    };
  }
}

// ==============================================================================
// Lambda Handler
// ==============================================================================

export async function handler(event: ForgeEvent): Promise<ForgeResponse> {
  const startTime = Date.now();
  const component = CONFIG.component;

  console.log(`[FORGE:${component}] Processing event:`, JSON.stringify({
    action: event.action,
    metadata: event.metadata,
  }));

  try {
    let result: unknown;
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let iterations: number | undefined;

    switch (event.action) {
      case 'converge': {
        const convergenceResult = await runConvergence(event.payload);
        result = convergenceResult.result;
        iterations = convergenceResult.iterations;
        usage.totalTokens = convergenceResult.totalTokens;
        break;
      }

      case 'parse': {
        result = await runParser(event.payload);
        break;
      }

      case 'assess': {
        result = await runCARSAssessment(event.payload);
        break;
      }

      case 'execute': {
        // Direct model invocation
        const messages = event.payload.messages || [
          { role: 'user' as const, content: event.payload.prompt || '' },
        ];
        const { response, usage: invokeUsage } = await invokeModel(messages, {
          model: event.payload.model,
          maxTokens: event.payload.maxTokens,
          temperature: event.payload.temperature,
        });
        result = response;
        usage = {
          inputTokens: invokeUsage.inputTokens,
          outputTokens: invokeUsage.outputTokens,
          totalTokens: invokeUsage.inputTokens + invokeUsage.outputTokens,
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${event.action}`);
    }

    const duration = Date.now() - startTime;

    console.log(`[FORGE:${component}] Completed in ${duration}ms`);

    return {
      success: true,
      result,
      usage,
      metrics: {
        duration,
        model: CONFIG.models[event.payload.model || 'sonnet'],
        iterations,
      },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[FORGE:${component}] Error:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
      metrics: {
        duration: Date.now() - startTime,
        model: CONFIG.models[event.payload?.model || 'sonnet'],
      },
    };
  }
}
